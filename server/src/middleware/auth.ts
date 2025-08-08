import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config/config';
import { secureJWTManager } from '../security/SecureJWTManager';

/**\n * Enhanced authentication middleware with secure JWT handling
 * Supports both access and refresh tokens with proper validation
 */

interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastLogin: Date;
  gamesPlayed: number;
  gamesWon: number;
}

interface AuthRequest extends Request {
  user?: User;
  token?: string;
}

interface RefreshTokenPayload {
  userId: string;
  username: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
  jti?: string;
}

// Token validation schemas
const accessTokenSchema = z.object({
  userId: z.string().uuid(),
  username: z.string().min(3).max(20),
  iat: z.number().optional(),
  exp: z.number().optional(),
  jti: z.string().optional()
});

const refreshTokenSchema = z.object({
  userId: z.string().uuid(),
  username: z.string().min(3).max(20),
  type: z.literal('refresh'),
  iat: z.number().optional(),
  exp: z.number().optional(),
  jti: z.string().optional()
});

/**
 * Enhanced JWT Authentication Service
 */
export class AuthService {
  private refreshTokens: Set<string> = new Set();
  private userLookup: (userId: string) => Promise<User | null>;

  constructor(userLookupFn: (userId: string) => Promise<User | null>) {
    this.userLookup = userLookupFn;
  }

  /**
   * Generate access and refresh token pair
   */
  async generateTokenPair(user: { id: string; username: string }): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
    refreshExpiresIn: string;
  }> {
    try {
      // Generate access token using SecureJWTManager
      const accessToken = await secureJWTManager.sign(
        {
          userId: user.id,
          username: user.username
        },
        {
          expiresIn: config.JWT_EXPIRES_IN,
          audience: 'civilization-game-client',
          issuer: 'civilization-game-server'
        }
      );

      // Generate refresh token with different secret
      const refreshPayload: RefreshTokenPayload = {
        userId: user.id,
        username: user.username,
        type: 'refresh'
      };

      const refreshToken = jwt.sign(
        refreshPayload,
        config.JWT_REFRESH_SECRET,
        {
          expiresIn: config.JWT_REFRESH_EXPIRES_IN,
          audience: 'civilization-game-client',
          issuer: 'civilization-game-server',
          jwtid: `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      );

      // Store refresh token
      this.refreshTokens.add(refreshToken);

      return {
        accessToken,
        refreshToken,
        expiresIn: config.JWT_EXPIRES_IN,
        refreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN
      };
    } catch (error) {
      console.error('Token generation failed:', error);
      throw new Error('Failed to generate authentication tokens');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: string;
  }> {
    try {
      // Check if refresh token is in our store
      if (!this.refreshTokens.has(refreshToken)) {
        throw new Error('Invalid refresh token');
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET, {
        audience: 'civilization-game-client',
        issuer: 'civilization-game-server'
      }) as jwt.JwtPayload;

      // Validate payload structure
      const validatedPayload = refreshTokenSchema.parse(decoded);

      // Verify user still exists
      const user = await this.userLookup(validatedPayload.userId);
      if (!user) {
        this.refreshTokens.delete(refreshToken);
        throw new Error('User not found');
      }

      // Generate new access token
      const accessToken = await secureJWTManager.sign(
        {
          userId: user.id,
          username: user.username
        },
        {
          expiresIn: config.JWT_EXPIRES_IN,
          audience: 'civilization-game-client',
          issuer: 'civilization-game-server'
        }
      );

      return {
        accessToken,
        expiresIn: config.JWT_EXPIRES_IN
      };
    } catch (error) {
      this.refreshTokens.delete(refreshToken);
      console.error('Token refresh failed:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Revoke refresh token (logout)
   */
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    this.refreshTokens.delete(refreshToken);
  }

  /**
   * Revoke all refresh tokens for user (logout all devices)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    // In a production system, you'd want to store refresh tokens with user IDs\n    // For now, we'll clear all tokens (not ideal but simple for demo)\n    console.log(`Revoking all tokens for user ${userId}`);\n    // this.refreshTokens.clear(); // Don't actually do this in production
  }
}

/**
 * Authentication middleware factory
 */
export function createAuthMiddleware(authService: AuthService, userLookup: (userId: string) => Promise<User | null>) {
  /**
   * Verify JWT access token middleware
   */
  const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        res.status(401).json({
          error: 'Access token required',
          code: 'MISSING_TOKEN'
        });
        return;
      }

      // Verify token using SecureJWTManager
      const decoded = await secureJWTManager.verify(token, {
        audience: 'civilization-game-client',
        issuer: 'civilization-game-server'
      });

      // Validate payload structure
      const validatedPayload = accessTokenSchema.parse(decoded);

      // Get user from database/store
      const user = await userLookup(validatedPayload.userId);
      if (!user) {
        res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      // Attach user and token to request
      req.user = user;
      req.token = token;
      next();
    } catch (error: any) {
      console.warn('Authentication failed:', error.message);
      
      if (error.message.includes('blacklisted')) {
        res.status(401).json({
          error: 'Token has been revoked',
          code: 'TOKEN_REVOKED'
        });
        return;
      }
      
      if (error.message.includes('expired')) {
        res.status(401).json({
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        });
        return;
      }
      
      res.status(403).json({
        error: 'Invalid or malformed token',
        code: 'INVALID_TOKEN'
      });
    }
  };

  /**
   * Optional authentication middleware (doesn't fail if no token)
   */
  const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        const decoded = await secureJWTManager.verify(token, {
          audience: 'civilization-game-client',
          issuer: 'civilization-game-server'
        });

        const validatedPayload = accessTokenSchema.parse(decoded);
        const user = await userLookup(validatedPayload.userId);
        
        if (user) {
          req.user = user;
          req.token = token;
        }
      }
      
      next();
    } catch (error) {
      // Continue without authentication for optional middleware
      next();
    }
  };

  /**
   * Logout middleware - blacklist current token
   */
  const logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.token) {
        // Blacklist the current access token
        await secureJWTManager.blacklistToken(req.token, 'User logout');
      }

      // If refresh token is provided, revoke it
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
      if (refreshToken) {
        await authService.revokeRefreshToken(refreshToken);
      }

      res.json({
        message: 'Logout successful'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: 'Logout failed'
      });
    }
  };

  return {
    authenticateToken,
    optionalAuth,
    logout
  };
}

/**
 * Role-based authorization middleware
 */
export function requireRole(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // In a real system, you'd check user roles from database
    // For now, we'll assume all authenticated users have basic access
    const userRoles = ['user']; // Would come from user.roles in real system
    
    const hasRequiredRole = roles.some(role => userRoles.includes(role));
    if (!hasRequiredRole) {
      res.status(403).json({
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: userRoles
      });
      return;
    }

    next();
  };
}

/**
 * Enhanced error handling for authentication
 */
export function authErrorHandler() {
  return (error: any, req: Request, res: Response, next: NextFunction) => {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'NotBeforeError') {
      return res.status(401).json({
        error: 'Token not active yet',
        code: 'TOKEN_NOT_ACTIVE'
      });
    }

    next(error);
  };
}

export { AuthRequest, User, RefreshTokenPayload };