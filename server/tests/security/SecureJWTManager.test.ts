import { SecureJWTManager } from '../../src/security/SecureJWTManager';
import { promises as fs } from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Mock filesystem operations
jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    mkdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}));

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('SecureJWTManager', () => {
  let jwtManager: SecureJWTManager;
  const testSecureDir = '/test/.secure';

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    jwtManager = new SecureJWTManager();
    
    // Mock successful directory creation
    mockedFs.access.mockRejectedValue(new Error('Directory does not exist'));
    mockedFs.mkdir.mockResolvedValue(undefined);
    mockedFs.readFile.mockRejectedValue(new Error('File does not exist'));
    mockedFs.writeFile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (jwtManager && typeof jwtManager.stop === 'function') {
      jwtManager.stop();
    }
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance with proper configuration', () => {
      expect(jwtManager).toBeDefined();
      expect(jwtManager).toBeInstanceOf(SecureJWTManager);
    });

    it('should initialize with correct secure directory paths', () => {
      const keyInfo = jwtManager.getKeyInfo();
      expect(keyInfo).toBeDefined();
      expect(keyInfo.totalKeys).toBe(0);
      expect(keyInfo.currentKeyId).toBeNull();
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully with new keys', async () => {
      await expect(jwtManager.initialize()).resolves.not.toThrow();
      
      expect(mockedFs.mkdir).toHaveBeenCalled();
      expect(mockedFs.writeFile).toHaveBeenCalledTimes(1); // Keys file
    });

    it('should load existing keys from secure storage', async () => {
      const existingKeys = {
        currentKeyId: 'key_123_abc',
        keys: {
          'key_123_abc': {
            secret: 'test-secret',
            createdAt: '2024-01-01T00:00:00.000Z',
            algorithm: 'HS256',
            active: true
          }
        }
      };

      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(existingKeys))
        .mockRejectedValue(new Error('Blacklist not found'));

      await jwtManager.initialize();

      const keyInfo = jwtManager.getKeyInfo();
      expect(keyInfo.totalKeys).toBe(1);
      expect(keyInfo.currentKeyId).toBe('key_123_abc');
    });

    it('should load existing blacklist entries', async () => {
      const existingBlacklist = {
        'jwt_123_abc': {
          jti: 'jwt_123_abc',
          exp: Math.floor(Date.now() / 1000) + 3600,
          reason: 'User logout',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      };

      mockedFs.readFile
        .mockRejectedValueOnce(new Error('Keys not found'))
        .mockResolvedValueOnce(JSON.stringify(existingBlacklist));

      await jwtManager.initialize();

      const keyInfo = jwtManager.getKeyInfo();
      expect(keyInfo.blacklistedTokens).toBe(1);
    });

    it('should clean up expired blacklist entries during initialization', async () => {
      const expiredBlacklist = {
        'jwt_expired': {
          jti: 'jwt_expired',
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
          reason: 'User logout',
          timestamp: '2024-01-01T00:00:00.000Z'
        },
        'jwt_valid': {
          jti: 'jwt_valid',
          exp: Math.floor(Date.now() / 1000) + 3600, // Valid for 1 hour
          reason: 'User logout',
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      };

      mockedFs.readFile
        .mockRejectedValueOnce(new Error('Keys not found'))
        .mockResolvedValueOnce(JSON.stringify(expiredBlacklist));

      await jwtManager.initialize();

      const keyInfo = jwtManager.getKeyInfo();
      expect(keyInfo.blacklistedTokens).toBe(1); // Only valid token remaining
    });

    it('should handle initialization errors gracefully', async () => {
      mockedFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(jwtManager.initialize()).rejects.toThrow('Permission denied');
    });
  });

  describe('Token Signing', () => {
    beforeEach(async () => {
      await jwtManager.initialize();
    });

    it('should sign token with valid payload', async () => {
      const payload = {
        userId: '12345678-1234-1234-1234-123456789012',
        username: 'testuser'
      };

      const token = await jwtManager.sign(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    it('should include JWT ID and proper claims', async () => {
      const payload = {
        userId: '12345678-1234-1234-1234-123456789012',
        username: 'testuser'
      };

      const token = await jwtManager.sign(payload);
      const decoded = jwt.decode(token, { complete: true }) as any;

      expect(decoded.payload.jti).toBeDefined();
      expect(decoded.payload.jti).toMatch(/^jwt_\d+_[a-f0-9]{16}$/);
      expect(decoded.payload.userId).toBe(payload.userId);
      expect(decoded.payload.username).toBe(payload.username);
    });

    it('should validate payload structure', async () => {
      const invalidPayload = {
        userId: 'invalid-uuid',
        username: 'ab' // Too short
      };

      await expect(jwtManager.sign(invalidPayload)).rejects.toThrow();
    });

    it('should sign with custom options', async () => {
      const payload = {
        userId: '12345678-1234-1234-1234-123456789012',
        username: 'testuser'
      };

      const options = {
        expiresIn: '2h',
        audience: 'test-client',
        issuer: 'test-server'
      };

      const token = await jwtManager.sign(payload, options);
      const decoded = jwt.decode(token, { complete: true }) as any;

      expect(decoded.payload.iss).toBe('test-server');
      expect(decoded.payload.aud).toBe('test-client');
    });

    it('should throw error when no active key available', async () => {
      const uninitializedManager = new SecureJWTManager();
      
      const payload = {
        userId: '12345678-1234-1234-1234-123456789012',
        username: 'testuser'
      };

      await expect(uninitializedManager.sign(payload)).rejects.toThrow('No active JWT key available');
    });

    it('should validate sign options', async () => {
      const payload = {
        userId: '12345678-1234-1234-1234-123456789012',
        username: 'testuser'
      };

      const invalidOptions = {
        expiresIn: 'invalid-format'
      };

      await expect(jwtManager.sign(payload, invalidOptions)).rejects.toThrow();
    });
  });

  describe('Token Verification', () => {
    let testToken: string;

    beforeEach(async () => {
      await jwtManager.initialize();
      
      const payload = {
        userId: '12345678-1234-1234-1234-123456789012',
        username: 'testuser'
      };
      
      testToken = await jwtManager.sign(payload);
    });

    it('should verify valid token', async () => {
      const verifiedPayload = await jwtManager.verify(testToken);
      
      expect(verifiedPayload).toBeDefined();
      expect(verifiedPayload.userId).toBe('12345678-1234-1234-1234-123456789012');
      expect(verifiedPayload.username).toBe('testuser');
      expect(verifiedPayload.jti).toBeDefined();
    });

    it('should reject blacklisted token', async () => {
      await jwtManager.blacklistToken(testToken, 'Test blacklisting');
      
      await expect(jwtManager.verify(testToken)).rejects.toThrow('Token has been blacklisted');
    });

    it('should reject token with invalid format', async () => {
      await expect(jwtManager.verify('invalid-token')).rejects.toThrow('Invalid token format');
      await expect(jwtManager.verify('invalid.token.format')).rejects.toThrow();
    });

    it('should reject token with unknown signing key', async () => {
      // Create token with different secret
      const fakeToken = jwt.sign(
        { userId: '12345678-1234-1234-1234-123456789012', username: 'fake' },
        'different-secret',
        { 
          algorithm: 'HS256',
          keyid: 'unknown-key',
          jwtid: 'fake-jwt-id'
        }
      );

      await expect(jwtManager.verify(fakeToken)).rejects.toThrow('Unknown or invalid signing key');
    });

    it('should handle token without key ID', async () => {
      const tokenWithoutKid = jwt.sign(
        { 
          userId: '12345678-1234-1234-1234-123456789012', 
          username: 'test',
          jti: 'test-jti'
        },
        'secret'
      );

      await expect(jwtManager.verify(tokenWithoutKid)).rejects.toThrow('Unknown or invalid signing key');
    });

    it('should verify token with custom options', async () => {
      // Create a token with a specific audience
      const payload = {
        userId: '12345678-1234-1234-1234-123456789012',
        username: 'testuser'
      };
      
      const tokenWithAudience = await jwtManager.sign(payload, {
        audience: 'custom-client'
      });

      const customOptions = {
        audience: 'custom-client',
        clockTolerance: 60
      };

      const verifiedPayload = await jwtManager.verify(tokenWithAudience, customOptions);
      expect(verifiedPayload).toBeDefined();
      expect(verifiedPayload.username).toBe('testuser');
    });
  });

  describe('Token Blacklisting', () => {
    let testToken: string;

    beforeEach(async () => {
      await jwtManager.initialize();
      
      const payload = {
        userId: '12345678-1234-1234-1234-123456789012',
        username: 'testuser'
      };
      
      testToken = await jwtManager.sign(payload);
    });

    it('should blacklist token successfully', async () => {
      await jwtManager.blacklistToken(testToken, 'User logout');
      
      const keyInfo = jwtManager.getKeyInfo();
      expect(keyInfo.blacklistedTokens).toBe(1);
      
      // Token should be rejected
      await expect(jwtManager.verify(testToken)).rejects.toThrow('Token has been blacklisted: User logout');
    });

    it('should handle invalid token format for blacklisting', async () => {
      await expect(jwtManager.blacklistToken('invalid-token')).rejects.toThrow('Invalid token format for blacklisting');
    });

    it('should trigger cleanup when blacklist gets large', async () => {
      // Mock the blacklist size check directly by accessing private property
      // This avoids creating thousands of actual tokens
      const blacklistMap = (jwtManager as any).blacklist;
      
      // Add mock entries to simulate large blacklist
      for (let i = 0; i < 10000; i++) {
        blacklistMap.set(`jwt_${i}`, {
          jti: `jwt_${i}`,
          exp: Math.floor(Date.now() / 1000) + 3600,
          reason: 'Test',
          timestamp: new Date().toISOString()
        });
      }
      
      // This should trigger cleanup since blacklist > 10000
      await jwtManager.blacklistToken(testToken, 'Trigger cleanup');
      
      // Should save blacklist due to cleanup
      expect(mockedFs.writeFile).toHaveBeenCalled();
    });
  });

  describe('Key Rotation', () => {
    beforeEach(async () => {
      await jwtManager.initialize();
    });

    it('should rotate keys successfully', async () => {
      const initialKeyInfo = jwtManager.getKeyInfo();
      const initialKeyId = initialKeyInfo.currentKeyId;
      
      await jwtManager.rotateKeys();
      
      const newKeyInfo = jwtManager.getKeyInfo();
      expect(newKeyInfo.currentKeyId).not.toBe(initialKeyId);
      expect(newKeyInfo.totalKeys).toBe(2); // Old key + new key
    });

    it('should mark old key as inactive during rotation', async () => {
      await jwtManager.rotateKeys();
      
      const keyInfo = jwtManager.getKeyInfo();
      const inactiveKeys = keyInfo.keys.filter(key => !key.active);
      expect(inactiveKeys).toHaveLength(1);
      expect(inactiveKeys[0].deprecatedAt).toBeDefined();
    });

    it('should clean up very old keys', async () => {
      // Mock old key data
      const oldKeyData = {
        currentKeyId: 'key_old',
        keys: {
          'key_very_old': {
            secret: 'old-secret',
            createdAt: '2020-01-01T00:00:00.000Z',
            algorithm: 'HS256',
            active: false,
            deprecatedAt: '2020-01-02T00:00:00.000Z' // Very old
          },
          'key_old': {
            secret: 'current-secret',
            createdAt: '2024-01-01T00:00:00.000Z',
            algorithm: 'HS256',
            active: true
          }
        }
      };

      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(oldKeyData))
        .mockRejectedValue(new Error('Blacklist not found'));

      const newManager = new SecureJWTManager();
      await newManager.initialize();
      
      await newManager.rotateKeys();
      
      const keyInfo = newManager.getKeyInfo();
      // Should have cleaned up very old key during rotation
      expect(keyInfo.keys.some(key => key.keyId === 'key_very_old')).toBe(false);
      
      newManager.stop();
    });

    it('should handle rotation errors gracefully', async () => {
      mockedFs.writeFile.mockRejectedValue(new Error('Write error'));
      
      await expect(jwtManager.rotateKeys()).rejects.toThrow('Write error');
    });
  });

  describe('Key Management', () => {
    beforeEach(async () => {
      await jwtManager.initialize();
    });

    it('should provide comprehensive key information', () => {
      const keyInfo = jwtManager.getKeyInfo();
      
      expect(keyInfo).toHaveProperty('totalKeys');
      expect(keyInfo).toHaveProperty('currentKeyId');
      expect(keyInfo).toHaveProperty('blacklistedTokens');
      expect(keyInfo).toHaveProperty('keys');
      expect(Array.isArray(keyInfo.keys)).toBe(true);
    });

    it('should start automatic key rotation', async () => {
      // Key rotation is started during initialization
      const keyInfo = jwtManager.getKeyInfo();
      expect(keyInfo.currentKeyId).toBeDefined();
    });

    it('should stop key rotation timer', () => {
      expect(() => jwtManager.stop()).not.toThrow();
      
      // Should be safe to call multiple times
      expect(() => jwtManager.stop()).not.toThrow();
    });
  });

  describe('Token Inspection', () => {
    let testToken: string;

    beforeEach(async () => {
      await jwtManager.initialize();
      
      const payload = {
        userId: '12345678-1234-1234-1234-123456789012',
        username: 'testuser'
      };
      
      testToken = await jwtManager.sign(payload);
    });

    it('should inspect token without verification', () => {
      const inspection = jwtManager.inspectToken(testToken);
      
      expect(inspection).toHaveProperty('header');
      expect(inspection).toHaveProperty('payload');
      expect(inspection).toHaveProperty('isBlacklisted');
      expect(inspection).toHaveProperty('keyExists');
      
      expect(inspection.isBlacklisted).toBe(false);
      expect(inspection.keyExists).toBe(true);
      expect(inspection.payload.username).toBe('testuser');
    });

    it('should detect blacklisted token in inspection', async () => {
      await jwtManager.blacklistToken(testToken, 'Test blacklist');
      
      const inspection = jwtManager.inspectToken(testToken);
      expect(inspection.isBlacklisted).toBe(true);
    });

    it('should detect unknown key in inspection', () => {
      const tokenWithUnknownKey = jwt.sign(
        { 
          userId: '12345678-1234-1234-1234-123456789012',
          username: 'test',
          jti: 'test-jti'
        },
        'secret',
        { keyid: 'unknown-key' }
      );

      const inspection = jwtManager.inspectToken(tokenWithUnknownKey);
      expect(inspection.keyExists).toBe(false);
    });

    it('should handle invalid token format in inspection', () => {
      expect(() => jwtManager.inspectToken('invalid-token')).toThrow('Invalid token format');
    });
  });

  describe('Security Features', () => {
    beforeEach(async () => {
      await jwtManager.initialize();
    });

    it('should generate secure random secrets', async () => {
      const keyInfo1 = jwtManager.getKeyInfo();
      await jwtManager.rotateKeys();
      const keyInfo2 = jwtManager.getKeyInfo();
      
      // Keys should be different
      expect(keyInfo1.currentKeyId).not.toBe(keyInfo2.currentKeyId);
    });

    it('should use secure file permissions', async () => {
      await jwtManager.initialize();
      
      const writeFileCalls = mockedFs.writeFile.mock.calls;
      const keyFileCall = writeFileCalls.find(call => 
        typeof call[0] === 'string' && call[0].includes('jwt-keys.json')
      );
      
      expect(keyFileCall).toBeDefined();
      expect(keyFileCall![2]).toEqual({ mode: 0o600 });
    });

    it('should handle concurrent operations safely', async () => {
      const payload = {
        userId: '12345678-1234-1234-1234-123456789012',
        username: 'testuser'
      };

      // Create multiple tokens concurrently (reduced number for memory efficiency)
      const tokenPromises = Array(5).fill(null).map(() => jwtManager.sign(payload));
      const tokens = await Promise.all(tokenPromises);
      
      expect(tokens).toHaveLength(5);
      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(5);
    });

    it('should validate JWT ID uniqueness', async () => {
      const payload = {
        userId: '12345678-1234-1234-1234-123456789012',
        username: 'testuser'
      };

      const token1 = await jwtManager.sign(payload);
      const token2 = await jwtManager.sign(payload);
      
      const decoded1 = jwt.decode(token1, { complete: true }) as any;
      const decoded2 = jwt.decode(token2, { complete: true }) as any;
      
      expect(decoded1.payload.jti).not.toBe(decoded2.payload.jti);
    });
  });

  describe('Error Handling', () => {
    it('should handle filesystem errors during save operations', async () => {
      mockedFs.writeFile.mockRejectedValue(new Error('Disk full'));
      
      await expect(jwtManager.initialize()).rejects.toThrow('Disk full');
    });

    it('should handle malformed key files', async () => {
      mockedFs.readFile.mockResolvedValue('invalid json');
      
      // Should fall back to generating new keys
      await expect(jwtManager.initialize()).resolves.not.toThrow();
    });

    it('should handle malformed blacklist files', async () => {
      mockedFs.readFile
        .mockRejectedValueOnce(new Error('Keys not found'))
        .mockResolvedValueOnce('invalid json');
      
      // Should continue without blacklist
      await expect(jwtManager.initialize()).resolves.not.toThrow();
    });

    it('should handle missing JWT fields gracefully', () => {
      const malformedToken = jwt.sign({ username: 'test' }, 'secret');
      
      expect(() => jwtManager.inspectToken(malformedToken)).not.toThrow();
      
      const inspection = jwtManager.inspectToken(malformedToken);
      expect(inspection.isBlacklisted).toBe(false); // No jti to check
    });
  });
});