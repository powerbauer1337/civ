import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';

/**
 * Secure JWT Management System for TypeScript server
 * Implements enterprise-grade JWT security with key rotation and blacklisting
 */

interface JWTKeyInfo {
  secret: string;
  createdAt: string;
  algorithm: string;
  active: boolean;
  deprecatedAt?: string;
}

interface JWTPayload {
  userId: string;
  username: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  jti?: string;
}

interface TokenBlacklistEntry {
  jti: string;
  exp: number;
  reason: string;
  timestamp: string;
}

// Validation schemas
const jwtPayloadSchema = z.object({
  userId: z.string().uuid(),
  username: z.string().min(3).max(20),
  iat: z.number().optional(),
  exp: z.number().optional(),
  iss: z.string().optional(),
  aud: z.string().optional(),
  jti: z.string().optional()
});

const signOptionsSchema = z.object({
  expiresIn: z.string().regex(/^\d+[smhdwy]$/).default('7d'),
  audience: z.string().optional(),
  issuer: z.string().default('civilization-game-server'),
  jwtid: z.string().optional(),
  subject: z.string().optional(),
  noTimestamp: z.boolean().default(false),
  header: z.record(z.any()).optional()
});

export class SecureJWTManager {
  private keys: Map<string, JWTKeyInfo> = new Map();
  private blacklist: Map<string, TokenBlacklistEntry> = new Map();
  private readonly keyRotationInterval: number = 24 * 60 * 60 * 1000; // 24 hours
  private readonly keyStorePath: string;
  private readonly blacklistPath: string;
  private currentKeyId: string | null = null;
  private rotationTimer: NodeJS.Timeout | null = null;

  constructor() {
    const secureDir = path.join(process.cwd(), '.secure');
    this.keyStorePath = path.join(secureDir, 'jwt-keys.json');
    this.blacklistPath = path.join(secureDir, 'token-blacklist.json');
  }

  /**
   * Initialize JWT Manager with secure key generation
   */
  async initialize(): Promise<void> {
    try {
      await this.ensureSecureDirectory();
      await this.loadOrGenerateKeys();
      await this.loadBlacklist();
      this.startKeyRotation();
      
      console.log('SecureJWTManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SecureJWTManager:', error);
      throw error;
    }
  }

  /**
   * Ensure secure directory exists with proper permissions
   */
  private async ensureSecureDirectory(): Promise<void> {
    const secureDir = path.dirname(this.keyStorePath);
    try {
      await fs.access(secureDir);
    } catch {
      await fs.mkdir(secureDir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Generate cryptographically secure JWT secret
   */
  private generateSecureSecret(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Generate unique key ID
   */
  private generateKeyId(): string {
    return `key_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Generate unique JWT ID
   */
  private generateJWTId(): string {
    return `jwt_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  /**
   * Load existing keys or generate new ones
   */
  private async loadOrGenerateKeys(): Promise<void> {
    try {
      const keyData = await fs.readFile(this.keyStorePath, 'utf8');
      const parsedKeys = JSON.parse(keyData);
      
      for (const [keyId, keyInfo] of Object.entries(parsedKeys.keys)) {
        this.keys.set(keyId, keyInfo as JWTKeyInfo);
      }
      
      this.currentKeyId = parsedKeys.currentKeyId;
      console.log(`Loaded ${this.keys.size} JWT keys from secure storage`);
    } catch (error) {
      // Generate initial key set
      await this.generateInitialKeys();
    }
  }

  /**
   * Load token blacklist
   */
  private async loadBlacklist(): Promise<void> {
    try {
      const blacklistData = await fs.readFile(this.blacklistPath, 'utf8');
      const parsedBlacklist = JSON.parse(blacklistData);
      
      for (const [jti, entry] of Object.entries(parsedBlacklist)) {
        this.blacklist.set(jti, entry as TokenBlacklistEntry);
      }
      
      // Clean up expired entries
      await this.cleanupBlacklist();
      console.log(`Loaded ${this.blacklist.size} blacklisted tokens`);
    } catch (error) {
      // No existing blacklist, start fresh
      console.log('No existing token blacklist found, starting fresh');
    }
  }

  /**
   * Generate initial key set for first-time setup
   */
  private async generateInitialKeys(): Promise<void> {
    const keyId = this.generateKeyId();
    const secret = this.generateSecureSecret();
    
    const keyInfo: JWTKeyInfo = {
      secret,
      createdAt: new Date().toISOString(),
      algorithm: 'HS256',
      active: true
    };

    this.keys.set(keyId, keyInfo);
    this.currentKeyId = keyId;
    
    await this.saveKeys();
    console.log('Generated initial JWT key set');
  }

  /**
   * Save keys to secure storage
   */
  private async saveKeys(): Promise<void> {
    const keyData = {
      currentKeyId: this.currentKeyId,
      keys: Object.fromEntries(this.keys),
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(
      this.keyStorePath, 
      JSON.stringify(keyData, null, 2), 
      { mode: 0o600 }
    );
  }

  /**
   * Save blacklist to secure storage
   */
  private async saveBlacklist(): Promise<void> {
    const blacklistData = Object.fromEntries(this.blacklist);
    
    await fs.writeFile(
      this.blacklistPath,
      JSON.stringify(blacklistData, null, 2),
      { mode: 0o600 }
    );
  }

  /**
   * Sign JWT token with current key
   */
  async sign(payload: Partial<JWTPayload>, options: Partial<z.infer<typeof signOptionsSchema>> = {}): Promise<string> {
    if (!this.currentKeyId || !this.keys.has(this.currentKeyId)) {
      throw new Error('No active JWT key available');
    }

    // Validate payload
    const validatedPayload = jwtPayloadSchema.parse(payload);
    
    // Validate options
    const validatedOptions = signOptionsSchema.parse(options);

    const keyInfo = this.keys.get(this.currentKeyId)!;
    const jwtId = this.generateJWTId();
    
    const tokenPayload = {
      ...validatedPayload,
      jti: jwtId
    };

    const tokenOptions: jwt.SignOptions = {
      algorithm: keyInfo.algorithm as jwt.Algorithm,
      expiresIn: validatedOptions.expiresIn,
      issuer: validatedOptions.issuer,
      audience: validatedOptions.audience,
      jwtid: jwtId,
      keyid: this.currentKeyId,
      ...validatedOptions
    };

    const token = jwt.sign(tokenPayload, keyInfo.secret, tokenOptions);
    
    console.log('JWT token signed', { 
      keyId: this.currentKeyId, 
      jwtId,
      expiresIn: tokenOptions.expiresIn 
    });
    
    return token;
  }

  /**
   * Verify JWT token with key rotation support
   */
  async verify(token: string, options: jwt.VerifyOptions = {}): Promise<JWTPayload> {
    // Check blacklist first
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.payload.jti) {
      throw new Error('Invalid token format');
    }

    if (this.blacklist.has(decoded.payload.jti)) {
      const entry = this.blacklist.get(decoded.payload.jti)!;
      throw new Error(`Token has been blacklisted: ${entry.reason}`);
    }

    const keyId = decoded.header.kid;
    if (!keyId || !this.keys.has(keyId)) {
      throw new Error('Unknown or invalid signing key');
    }

    const keyInfo = this.keys.get(keyId)!;
    
    const verifyOptions: jwt.VerifyOptions = {
      algorithms: [keyInfo.algorithm as jwt.Algorithm],
      issuer: 'civilization-game-server',
      audience: 'civilization-game-client',
      clockTolerance: 30, // 30 seconds clock tolerance
      ...options
    };

    try {
      const payload = jwt.verify(token, keyInfo.secret, verifyOptions) as jwt.JwtPayload;
      
      // Validate payload structure
      const validatedPayload = jwtPayloadSchema.parse(payload);
      
      console.log('JWT token verified', { 
        keyId, 
        jwtId: payload.jti,
        userId: validatedPayload.userId 
      });
      
      return validatedPayload;
    } catch (error) {
      console.warn('JWT verification failed', { 
        error: (error as Error).message, 
        keyId 
      });
      throw error;
    }
  }

  /**
   * Blacklist a token (for logout or security breach)
   */
  async blacklistToken(token: string, reason: string = 'User logout'): Promise<void> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.payload.jti || !decoded.payload.exp) {
      throw new Error('Invalid token format for blacklisting');
    }

    const entry: TokenBlacklistEntry = {
      jti: decoded.payload.jti,
      exp: decoded.payload.exp,
      reason,
      timestamp: new Date().toISOString()
    };

    this.blacklist.set(decoded.payload.jti, entry);
    await this.saveBlacklist();
    
    console.log('Token blacklisted', { jti: decoded.payload.jti, reason });
    
    // Clean up if blacklist gets too large
    if (this.blacklist.size > 10000) {
      await this.cleanupBlacklist();
    }
  }

  /**
   * Clean up expired tokens from blacklist
   */
  private async cleanupBlacklist(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const initialSize = this.blacklist.size;
    let removedCount = 0;

    for (const [jti, entry] of this.blacklist) {
      if (entry.exp < now) {
        this.blacklist.delete(jti);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      await this.saveBlacklist();
      console.log(`Cleaned up ${removedCount} expired tokens from blacklist`);
    }
  }

  /**
   * Rotate JWT signing keys
   */
  async rotateKeys(): Promise<void> {
    try {
      console.log('Starting JWT key rotation');
      
      // Generate new key
      const newKeyId = this.generateKeyId();
      const newSecret = this.generateSecureSecret();
      
      const newKeyInfo: JWTKeyInfo = {
        secret: newSecret,
        createdAt: new Date().toISOString(),
        algorithm: 'HS256',
        active: true
      };

      // Mark old key as inactive but keep it for verification
      if (this.currentKeyId) {
        const oldKey = this.keys.get(this.currentKeyId);
        if (oldKey) {
          oldKey.active = false;
          oldKey.deprecatedAt = new Date().toISOString();
        }
      }

      // Add new key and make it current
      this.keys.set(newKeyId, newKeyInfo);
      this.currentKeyId = newKeyId;

      // Clean up very old keys (older than 30 days)
      this.cleanupOldKeys();

      await this.saveKeys();
      console.log('JWT key rotation completed', { 
        newKeyId, 
        totalKeys: this.keys.size 
      });
    } catch (error) {
      console.error('JWT key rotation failed:', error);
      throw error;
    }
  }

  /**
   * Clean up keys older than 30 days
   */
  private cleanupOldKeys(): void {
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const keysToRemove: string[] = [];

    for (const [keyId, keyInfo] of this.keys) {
      if (keyInfo.deprecatedAt) {
        const deprecatedDate = new Date(keyInfo.deprecatedAt);
        if (deprecatedDate < cutoffDate) {
          keysToRemove.push(keyId);
        }
      }
    }

    keysToRemove.forEach(keyId => {
      this.keys.delete(keyId);
      console.log('Removed old JWT key', { keyId });
    });

    if (keysToRemove.length > 0) {
      console.log(`Cleaned up ${keysToRemove.length} old JWT keys`);
    }
  }

  /**
   * Start automatic key rotation
   */
  private startKeyRotation(): void {
    this.rotationTimer = setInterval(async () => {
      try {
        await this.rotateKeys();
      } catch (error) {
        console.error('Automatic key rotation failed:', error);
      }
    }, this.keyRotationInterval);

    console.log('JWT key rotation started', { 
      intervalHours: this.keyRotationInterval / (1000 * 60 * 60) 
    });
  }

  /**
   * Stop key rotation (for graceful shutdown)
   */
  stop(): void {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
      console.log('JWT key rotation stopped');
    }
  }

  /**
   * Get key information for monitoring
   */
  getKeyInfo(): {
    totalKeys: number;
    currentKeyId: string | null;
    blacklistedTokens: number;
    keys: Array<{
      keyId: string;
      createdAt: string;
      active: boolean;
      deprecatedAt?: string;
    }>;
  } {
    return {
      totalKeys: this.keys.size,
      currentKeyId: this.currentKeyId,
      blacklistedTokens: this.blacklist.size,
      keys: Array.from(this.keys.entries()).map(([keyId, info]) => ({
        keyId,
        createdAt: info.createdAt,
        active: info.active,
        deprecatedAt: info.deprecatedAt
      }))
    };
  }

  /**
   * Validate token without verification (for inspection)
   */
  inspectToken(token: string): {
    header: jwt.JwtHeader;
    payload: jwt.JwtPayload;
    isBlacklisted: boolean;
    keyExists: boolean;
  } {
    const decoded = jwt.decode(token, { complete: true });
    
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Invalid token format');
    }

    const isBlacklisted = decoded.payload.jti ? this.blacklist.has(decoded.payload.jti) : false;
    const keyExists = decoded.header.kid ? this.keys.has(decoded.header.kid) : false;

    return {
      header: decoded.header,
      payload: decoded.payload,
      isBlacklisted,
      keyExists
    };
  }
}

// Export singleton instance
export const secureJWTManager = new SecureJWTManager();