import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { config } from '../config/config';

/**
 * Comprehensive input validation middleware using Zod schemas
 * Provides sanitization, validation, and security checks for all API endpoints
 */

// Common validation schemas
export const commonSchemas = {
  // User authentication schemas
  registerSchema: z.object({
    body: z.object({
      username: z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must be at most 20 characters')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
        .transform(val => val.toLowerCase().trim()),
      email: z.string()
        .email('Invalid email format')
        .max(254, 'Email too long')
        .transform(val => val.toLowerCase().trim()),
      password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password too long')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
               'Password must contain at least one uppercase, lowercase, number, and special character')
    })
  }),

  loginSchema: z.object({
    body: z.object({
      username: z.string()
        .min(1, 'Username is required')
        .max(254, 'Username too long')
        .transform(val => val.toLowerCase().trim()),
      password: z.string()
        .min(1, 'Password is required')
        .max(128, 'Password too long')
    })
  }),

  updateProfileSchema: z.object({
    body: z.object({
      email: z.string()
        .email('Invalid email format')
        .max(254, 'Email too long')
        .transform(val => val.toLowerCase().trim())
        .optional(),
      currentPassword: z.string().max(128).optional(),
      newPassword: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password too long')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
               'Password must contain at least one uppercase, lowercase, number, and special character')
        .optional()
    }).refine(data => {
      // If newPassword is provided, currentPassword must also be provided
      return !data.newPassword || (data.newPassword && data.currentPassword);
    }, {
      message: 'Current password is required when changing password',
      path: ['currentPassword']
    })
  }),

  // Game configuration schemas
  gameConfigSchema: z.object({
    body: z.object({
      name: z.string()
        .min(1, 'Game name is required')
        .max(50, 'Game name too long')
        .transform(val => val.trim()),
      maxPlayers: z.number()
        .int()
        .min(2, 'At least 2 players required')
        .max(config.MAX_PLAYERS_PER_GAME, `Maximum ${config.MAX_PLAYERS_PER_GAME} players allowed`),
      isPrivate: z.boolean().default(false),
      turnTimeLimit: z.number()
        .int()
        .min(30, 'Minimum turn time is 30 seconds')
        .max(3600, 'Maximum turn time is 1 hour')
        .default(config.TURN_TIME_LIMIT),
      mapType: z.enum(['small', 'medium', 'large']).default('medium'),
      difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate')
    })
  }),

  // ID parameter validation
  gameIdSchema: z.object({
    params: z.object({
      id: z.string().uuid('Invalid game ID format')
    })
  }),

  userIdSchema: z.object({
    params: z.object({
      id: z.string().uuid('Invalid user ID format')
    })
  })
};

/**
 * Generic validation middleware factory
 */
export function validateRequest<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params
      });

      // Replace request data with validated/sanitized data
      req.body = result.body || req.body;
      req.query = result.query || req.query;
      req.params = result.params || req.params;

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          received: err.received
        }));

        return res.status(400).json({
          error: 'Validation failed',
          details: errorMessages
        });
      }

      console.error('Validation middleware error:', error);
      return res.status(500).json({
        error: 'Internal server error during validation'
      });
    }
  };
}

/**
 * Advanced rate limiting with different tiers
 */
export class AdvancedRateLimiter {
  private authLimiter: RateLimiterMemory;
  private apiLimiter: RateLimiterMemory;
  private strictLimiter: RateLimiterMemory;

  constructor() {
    // Authentication endpoints - stricter limits
    this.authLimiter = new RateLimiterMemory({
      keyAlias: 'ip',
      points: 5, // Number of requests
      duration: 300, // Per 5 minutes
      blockDuration: 900, // Block for 15 minutes
    });

    // General API endpoints
    this.apiLimiter = new RateLimiterMemory({
      keyAlias: 'ip',
      points: config.RATE_LIMIT_MAX_REQUESTS,
      duration: config.RATE_LIMIT_WINDOW_MS / 1000,
      blockDuration: 300, // Block for 5 minutes
    });

    // Strict rate limiting for sensitive endpoints
    this.strictLimiter = new RateLimiterMemory({
      keyAlias: 'ip',
      points: 2, // Only 2 requests
      duration: 600, // Per 10 minutes
      blockDuration: 1800, // Block for 30 minutes
    });
  }

  // Middleware for authentication endpoints
  public authRateLimit() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (config.BYPASS_RATE_LIMITING && config.NODE_ENV === 'development') {
        return next();
      }

      try {
        await this.authLimiter.consume(req.ip);
        next();
      } catch (rejRes: any) {
        const remainingPoints = rejRes?.remainingPoints || 0;
        const msBeforeNext = rejRes?.msBeforeNext || 0;

        res.set({
          'Retry-After': Math.round(msBeforeNext / 1000) || 1,
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': remainingPoints,
          'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString()
        });

        return res.status(429).json({
          error: 'Too many authentication attempts',
          message: 'Please wait before trying again',
          retryAfter: Math.round(msBeforeNext / 1000)
        });
      }
    };
  }

  // Middleware for general API endpoints
  public apiRateLimit() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (config.BYPASS_RATE_LIMITING && config.NODE_ENV === 'development') {
        return next();
      }

      try {
        await this.apiLimiter.consume(req.ip);
        next();
      } catch (rejRes: any) {
        const remainingPoints = rejRes?.remainingPoints || 0;
        const msBeforeNext = rejRes?.msBeforeNext || 0;

        res.set({
          'Retry-After': Math.round(msBeforeNext / 1000) || 1,
          'X-RateLimit-Limit': config.RATE_LIMIT_MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': remainingPoints.toString(),
          'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString()
        });

        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests from this IP',
          retryAfter: Math.round(msBeforeNext / 1000)
        });
      }
    };
  }

  // Middleware for strict rate limiting
  public strictRateLimit() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (config.BYPASS_RATE_LIMITING && config.NODE_ENV === 'development') {
        return next();
      }

      try {
        await this.strictLimiter.consume(req.ip);
        next();
      } catch (rejRes: any) {
        const remainingPoints = rejRes?.remainingPoints || 0;
        const msBeforeNext = rejRes?.msBeforeNext || 0;

        res.set({
          'Retry-After': Math.round(msBeforeNext / 1000) || 1,
          'X-RateLimit-Limit': '2',
          'X-RateLimit-Remaining': remainingPoints.toString(),
          'X-RateLimit-Reset': new Date(Date.now() + msBeforeNext).toISOString()
        });

        return res.status(429).json({
          error: 'Strict rate limit exceeded',
          message: 'This endpoint has strict limits for security',
          retryAfter: Math.round(msBeforeNext / 1000)
        });
      }
    };
  }
}

/**
 * Security headers middleware
 */
export function securityHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (config.ENABLE_SECURITY_HEADERS) {
      // Security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      
      // Content Security Policy
      res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "connect-src 'self' ws: wss:; " +
        "img-src 'self' data: https:; " +
        "font-src 'self';"
      );
    }
    next();
  };
}

/**
 * Request sanitization middleware
 */
export function sanitizeRequest() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Remove null bytes
    const sanitizeString = (str: string): string => {
      return str.replace(/\0/g, '');
    };

    // Recursively sanitize object
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeString(obj);
      }
      if (typeof obj === 'object' && obj !== null) {
        const sanitized: any = Array.isArray(obj) ? [] : {};
        for (const key in obj) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
        return sanitized;
      }
      return obj;
    };

    // Sanitize request body, query, and params
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  };
}

/**
 * Error handling middleware for validation
 */
export function validationErrorHandler() {
  return (error: any, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errorMessages
      });
    }

    // Don't expose internal errors in production
    if (config.NODE_ENV === 'production') {
      console.error('Internal server error:', error);
      return res.status(500).json({
        error: 'Internal server error'
      });
    }

    next(error);
  };
}

// Create rate limiter instance
export const rateLimiter = new AdvancedRateLimiter();