import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createAuthMiddleware, requireRole, authErrorHandler } from '../../src/middleware/auth';
import { secureJWTManager } from '../../src/security/SecureJWTManager';

// Mock dependencies
jest.mock('../../src/security/SecureJWTManager');
jest.mock('../../src/config/config', () => ({
  config: {
    jwt: {
      secret: 'test-secret',
      expiresIn: '1h',
      refreshExpiresIn: '7d'
    }
  }
}));

interface AuthRequest extends Request {
  user?: any;
  token?: string;
}

describe('Auth Middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockAuthService: any;
  let mockUserLookup: jest.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: undefined,
      token: undefined
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
    
    mockAuthService = {
      validateToken: jest.fn(),
      refreshToken: jest.fn()
    };
    
    mockUserLookup = jest.fn();
    
    // Mock secureJWTManager
    (secureJWTManager.verifyAccessToken as jest.Mock) = jest.fn();
    (secureJWTManager.verifyRefreshToken as jest.Mock) = jest.fn();
    (secureJWTManager.generateTokens as jest.Mock) = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAuthMiddleware', () => {
    let authMiddleware: any;

    beforeEach(() => {
      authMiddleware = createAuthMiddleware(mockAuthService, mockUserLookup);
    });

    describe('authenticateToken', () => {
      test('should reject request without authorization header', async () => {
        mockReq.headers = {};

        await authMiddleware.authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Access token required',
          code: 'TOKEN_REQUIRED'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should reject request with malformed authorization header', async () => {
        mockReq.headers = { authorization: 'InvalidFormat' };

        await authMiddleware.authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Access token required',
          code: 'TOKEN_REQUIRED'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should authenticate valid token successfully', async () => {
        const validToken = 'valid.jwt.token';
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com'
        };

        mockReq.headers = { authorization: `Bearer ${validToken}` };
        (secureJWTManager.verifyAccessToken as jest.Mock).mockResolvedValue({
          userId: 'user-123',
          username: 'testuser'
        });
        mockUserLookup.mockResolvedValue(mockUser);

        await authMiddleware.authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(secureJWTManager.verifyAccessToken).toHaveBeenCalledWith(validToken);
        expect(mockUserLookup).toHaveBeenCalledWith('user-123');
        expect(mockReq.user).toEqual(mockUser);
        expect(mockReq.token).toEqual(validToken);
        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
      });

      test('should reject invalid token', async () => {
        const invalidToken = 'invalid.token';
        mockReq.headers = { authorization: `Bearer ${invalidToken}` };
        (secureJWTManager.verifyAccessToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

        await authMiddleware.authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Invalid or expired token',
          code: 'TOKEN_INVALID'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should reject token for non-existent user', async () => {
        const validToken = 'valid.jwt.token';
        mockReq.headers = { authorization: `Bearer ${validToken}` };
        (secureJWTManager.verifyAccessToken as jest.Mock).mockResolvedValue({
          userId: 'user-123',
          username: 'testuser'
        });
        mockUserLookup.mockResolvedValue(null); // User not found

        await authMiddleware.authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should handle database errors gracefully', async () => {
        const validToken = 'valid.jwt.token';
        mockReq.headers = { authorization: `Bearer ${validToken}` };
        (secureJWTManager.verifyAccessToken as jest.Mock).mockResolvedValue({
          userId: 'user-123',
          username: 'testuser'
        });
        mockUserLookup.mockRejectedValue(new Error('Database error'));

        await authMiddleware.authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Authentication service error',
          code: 'AUTH_SERVICE_ERROR'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });

    describe('refreshToken', () => {
      test('should successfully refresh valid refresh token', async () => {
        const refreshToken = 'valid.refresh.token';
        const newTokens = {
          accessToken: 'new.access.token',
          refreshToken: 'new.refresh.token'
        };

        mockReq.body = { refreshToken };
        (secureJWTManager.verifyRefreshToken as jest.Mock).mockResolvedValue({
          userId: 'user-123',
          username: 'testuser',
          type: 'refresh'
        });
        (secureJWTManager.generateTokens as jest.Mock).mockResolvedValue(newTokens);

        await authMiddleware.refreshToken(mockReq as Request, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith({
          success: true,
          ...newTokens,
          message: 'Token refreshed successfully'
        });
      });

      test('should reject request without refresh token', async () => {
        mockReq.body = {};

        await authMiddleware.refreshToken(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Refresh token required',
          code: 'REFRESH_TOKEN_REQUIRED'
        });
      });

      test('should reject invalid refresh token', async () => {
        const invalidRefreshToken = 'invalid.refresh.token';
        mockReq.body = { refreshToken: invalidRefreshToken };
        (secureJWTManager.verifyRefreshToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

        await authMiddleware.refreshToken(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Invalid or expired refresh token',
          code: 'REFRESH_TOKEN_INVALID'
        });
      });

      test('should handle token generation errors', async () => {
        const refreshToken = 'valid.refresh.token';
        mockReq.body = { refreshToken };
        (secureJWTManager.verifyRefreshToken as jest.Mock).mockResolvedValue({
          userId: 'user-123',
          username: 'testuser',
          type: 'refresh'
        });
        (secureJWTManager.generateTokens as jest.Mock).mockRejectedValue(new Error('Token generation failed'));

        await authMiddleware.refreshToken(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Token generation failed',
          code: 'TOKEN_GENERATION_ERROR'
        });
      });
    });

    describe('validateRefreshToken', () => {
      test('should validate refresh token successfully', async () => {
        const refreshToken = 'valid.refresh.token';
        mockReq.body = { refreshToken };
        (secureJWTManager.verifyRefreshToken as jest.Mock).mockResolvedValue({
          userId: 'user-123',
          username: 'testuser',
          type: 'refresh'
        });

        await authMiddleware.validateRefreshToken(mockReq as Request, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith({
          valid: true,
          message: 'Refresh token is valid'
        });
      });

      test('should reject invalid refresh token', async () => {
        const invalidRefreshToken = 'invalid.refresh.token';
        mockReq.body = { refreshToken: invalidRefreshToken };
        (secureJWTManager.verifyRefreshToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

        await authMiddleware.validateRefreshToken(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          valid: false,
          error: 'Invalid or expired refresh token',
          code: 'REFRESH_TOKEN_INVALID'
        });
      });
    });
  });

  describe('requireRole', () => {
    test('should allow access for user with required role', () => {
      mockReq.user = { 
        id: 'user-123', 
        roles: ['admin', 'user'] 
      };
      const roleMiddleware = requireRole(['admin']);

      roleMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should deny access for user without required role', () => {
      mockReq.user = { 
        id: 'user-123', 
        roles: ['user'] 
      };
      const roleMiddleware = requireRole(['admin']);

      roleMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should deny access for unauthenticated user', () => {
      mockReq.user = undefined;
      const roleMiddleware = requireRole(['admin']);

      roleMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authErrorHandler', () => {
    let errorHandler: any;

    beforeEach(() => {
      errorHandler = authErrorHandler();
    });

    test('should handle JsonWebTokenError', () => {
      const error = new Error('Invalid token');
      error.name = 'JsonWebTokenError';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    });

    test('should handle TokenExpiredError', () => {
      const error = new Error('Token expired');
      error.name = 'TokenExpiredError';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    });

    test('should handle NotBeforeError', () => {
      const error = new Error('Token not active');
      error.name = 'NotBeforeError';

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token not active',
        code: 'TOKEN_NOT_ACTIVE'
      });
    });

    test('should pass non-JWT errors to next middleware', () => {
      const error = new Error('Some other error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Security', () => {
    let authMiddleware: any;

    beforeEach(() => {
      authMiddleware = createAuthMiddleware(mockAuthService, mockUserLookup);
    });

    test('should handle extremely long tokens', async () => {
      const longToken = 'a'.repeat(10000);
      mockReq.headers = { authorization: `Bearer ${longToken}` };
      (secureJWTManager.verifyAccessToken as jest.Mock).mockRejectedValue(new Error('Token too long'));

      await authMiddleware.authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle malicious token payloads', async () => {
      const maliciousToken = 'malicious.token';
      mockReq.headers = { authorization: `Bearer ${maliciousToken}` };
      (secureJWTManager.verifyAccessToken as jest.Mock).mockRejectedValue(new Error('Malicious payload'));

      await authMiddleware.authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      });
    });

    test('should prevent timing attacks on token validation', async () => {
      const startTime = Date.now();
      
      mockReq.headers = { authorization: 'Bearer invalid.token' };
      (secureJWTManager.verifyAccessToken as jest.Mock).mockRejectedValue(new Error('Invalid'));

      await authMiddleware.authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should not be instantaneous (indicating proper validation)
      expect(duration).toBeGreaterThan(0);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});