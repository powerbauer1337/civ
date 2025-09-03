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
    (secureJWTManager.verify as jest.Mock) = jest.fn();
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
          code: 'MISSING_TOKEN'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should reject request with malformed authorization header', async () => {
        mockReq.headers = { authorization: 'InvalidFormat' };

        await authMiddleware.authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Access token required',
          code: 'MISSING_TOKEN'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should authenticate valid token successfully', async () => {
        const validToken = 'valid.jwt.token';
        const validUserId = '123e4567-e89b-12d3-a456-426614174000';
        const mockUser = {
          id: validUserId,
          username: 'testuser',
          email: 'test@example.com'
        };
        const mockTokenPayload = {
          userId: validUserId,
          username: 'testuser'
        };

        mockReq.headers = { authorization: `Bearer ${validToken}` };
        (secureJWTManager.verify as jest.Mock).mockResolvedValue(mockTokenPayload);
        mockUserLookup.mockResolvedValue(mockUser);

        await authMiddleware.authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(secureJWTManager.verify).toHaveBeenCalledWith(validToken, {
          audience: 'civilization-game-client',
          issuer: 'civilization-game-server'
        });
        expect(mockUserLookup).toHaveBeenCalledWith(validUserId);
        expect(mockReq.user).toEqual(mockUser);
        expect(mockReq.token).toEqual(validToken);
        expect(mockNext).toHaveBeenCalled();
      });

      test('should reject invalid token', async () => {
        const invalidToken = 'invalid.jwt.token';
        mockReq.headers = { authorization: `Bearer ${invalidToken}` };
        (secureJWTManager.verify as jest.Mock).mockRejectedValue(new Error('Invalid token'));

        await authMiddleware.authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Invalid or malformed token',
          code: 'INVALID_TOKEN'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should reject token for non-existent user', async () => {
        const validToken = 'valid.jwt.token';
        const validUserId = '123e4567-e89b-12d3-a456-426614174000';
        const mockTokenPayload = {
          userId: validUserId,
          username: 'testuser'
        };

        mockReq.headers = { authorization: `Bearer ${validToken}` };
        (secureJWTManager.verify as jest.Mock).mockResolvedValue(mockTokenPayload);
        mockUserLookup.mockResolvedValue(null);

        await authMiddleware.authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      test('should handle database errors gracefully', async () => {
        const validToken = 'valid.jwt.token';
        const validUserId = '123e4567-e89b-12d3-a456-426614174000';
        const mockTokenPayload = {
          userId: validUserId,
          username: 'testuser'
        };

        mockReq.headers = { authorization: `Bearer ${validToken}` };
        (secureJWTManager.verify as jest.Mock).mockResolvedValue(mockTokenPayload);
        mockUserLookup.mockRejectedValue(new Error('Database connection failed'));

        await authMiddleware.authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith({
          error: 'Invalid or malformed token',
          code: 'INVALID_TOKEN'
        });
        expect(mockNext).not.toHaveBeenCalled();
      });
    });
  });

  describe('requireRole', () => {
    test('should allow access for user with required role', () => {
      const middleware = requireRole(['user']);
      mockReq.user = { id: '123e4567-e89b-12d3-a456-426614174000', roles: ['user'] };

      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should deny access for user without required role', () => {
      const middleware = requireRole(['admin']);
      mockReq.user = { id: '123e4567-e89b-12d3-a456-426614174000', roles: ['user'] };

      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: ['admin'],
        current: ['user']
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should deny access for unauthenticated user', () => {
      const middleware = requireRole(['user']);
      mockReq.user = undefined;

      middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

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
      const error = { name: 'JsonWebTokenError' };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    });

    test('should handle TokenExpiredError', () => {
      const error = { name: 'TokenExpiredError' };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    });

    test('should handle NotBeforeError', () => {
      const error = { name: 'NotBeforeError' };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token not active yet',
        code: 'TOKEN_NOT_ACTIVE'
      });
    });

    test('should pass non-JWT errors to next middleware', () => {
      const error = new Error('Some other error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});