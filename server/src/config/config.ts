import dotenv from 'dotenv';
import { z } from 'zod';
import crypto from 'crypto';

dotenv.config();

/**
 * Comprehensive environment validation schema
 * Ensures all configuration values are properly validated and secure
 */
const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  
  // Database Configuration - REQUIRED in production
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  
  // Authentication - JWT_SECRET is REQUIRED, no fallback
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters for security'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT refresh secret must be at least 32 characters for security'),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhdwy]$/).default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().regex(/^\d+[smhdwy]$/).default('7d'),
  
  // Game Configuration
  MAX_GAMES_PER_USER: z.coerce.number().int().min(1).max(10).default(3),
  GAME_CLEANUP_INTERVAL: z.coerce.number().int().min(60000).default(300000), // Min 1 minute
  TURN_TIME_LIMIT: z.coerce.number().int().min(30).max(3600).default(300), // 30s - 1h
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(60000).default(900000), // Min 1 minute
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(10).max(1000).default(100),
  RATE_LIMIT_STRICT_MODE: z.coerce.boolean().default(false),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Security
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters').optional(),
  ENABLE_SECURITY_HEADERS: z.coerce.boolean().default(true),
  ENABLE_CORS_CREDENTIALS: z.coerce.boolean().default(false),
  
  // Performance
  MAX_PLAYERS_PER_GAME: z.coerce.number().int().min(2).max(16).default(8),
  MAX_CONCURRENT_GAMES: z.coerce.number().int().min(1).max(1000).default(100),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().min(5000).max(60000).default(30000),
  
  // Features
  ENABLE_AI_PLAYERS: z.coerce.boolean().default(false),
  ENABLE_SPECTATORS: z.coerce.boolean().default(false),
  ENABLE_REPLAYS: z.coerce.boolean().default(false),
  
  // Development only
  ENABLE_DEBUG_ENDPOINTS: z.coerce.boolean().default(false),
  BYPASS_RATE_LIMITING: z.coerce.boolean().default(false)
});

/**
 * Generate secure development secrets if not provided
 * ONLY for development environment - production MUST provide all secrets
 */
function generateDevelopmentSecrets(env: any) {
  if (env.NODE_ENV === 'production') {
    return env; // Production must provide all secrets
  }
  
  const warnings: string[] = [];
  
  if (!env.JWT_SECRET) {
    env.JWT_SECRET = crypto.randomBytes(64).toString('hex');
    warnings.push('Generated JWT_SECRET for development - MUST set in production');
  }
  
  if (!env.JWT_REFRESH_SECRET) {
    env.JWT_REFRESH_SECRET = crypto.randomBytes(64).toString('hex');
    warnings.push('Generated JWT_REFRESH_SECRET for development - MUST set in production');
  }
  
  if (!env.SESSION_SECRET) {
    env.SESSION_SECRET = crypto.randomBytes(64).toString('hex');
    warnings.push('Generated SESSION_SECRET for development - MUST set in production');
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️  DEVELOPMENT MODE WARNINGS:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.warn('   - These secrets will change on each restart');
    console.warn('   - Set proper environment variables for production\n');
  }
  
  return env;
}

/**
 * Validate environment configuration
 * Throws detailed errors for missing or invalid configuration
 */
function validateEnvironment() {
  try {
    // Generate development secrets if needed
    const envWithSecrets = generateDevelopmentSecrets(process.env);
    
    // Validate all configuration
    const validatedEnv = envSchema.parse(envWithSecrets);
    
    // Additional production checks
    if (validatedEnv.NODE_ENV === 'production') {
      const productionChecks = [
        { check: process.env.JWT_SECRET, message: 'JWT_SECRET must be explicitly set in production' },
        { check: process.env.JWT_REFRESH_SECRET, message: 'JWT_REFRESH_SECRET must be explicitly set in production' },
        { check: process.env.DATABASE_URL, message: 'DATABASE_URL must be explicitly set in production' },
        { check: validatedEnv.JWT_SECRET !== 'your-super-secret-jwt-key-change-in-production', message: 'Default JWT_SECRET detected in production' }
      ];
      
      const failedChecks = productionChecks.filter(check => !check.check);
      if (failedChecks.length > 0) {
        console.error('🚨 PRODUCTION SECURITY ERRORS:');
        failedChecks.forEach(check => console.error(`   - ${check.message}`));
        throw new Error('Production environment validation failed - check security configuration');
      }
      
      console.log('✅ Production environment validation passed');
    }
    
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('🚨 ENVIRONMENT CONFIGURATION ERRORS:');
      error.errors.forEach(err => {
        console.error(`   - ${err.path.join('.')}: ${err.message}`);
      });
      console.error('\n💡 Check your .env file and environment variables\n');
    }
    throw error;
  }
}

// Validate and export configuration
export const config = validateEnvironment();

// Configuration summary for startup logging
export const getConfigSummary = () => ({
  environment: config.NODE_ENV,
  port: config.PORT,
  security: {
    bcryptRounds: config.BCRYPT_ROUNDS,
    jwtExpiresIn: config.JWT_EXPIRES_IN,
    jwtRefreshExpiresIn: config.JWT_REFRESH_EXPIRES_IN,
    securityHeadersEnabled: config.ENABLE_SECURITY_HEADERS,
    corsCredentials: config.ENABLE_CORS_CREDENTIALS
  },
  rateLimiting: {
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    maxRequests: config.RATE_LIMIT_MAX_REQUESTS,
    strictMode: config.RATE_LIMIT_STRICT_MODE
  },
  features: {
    aiPlayers: config.ENABLE_AI_PLAYERS,
    spectators: config.ENABLE_SPECTATORS,
    replays: config.ENABLE_REPLAYS,
    debugEndpoints: config.ENABLE_DEBUG_ENDPOINTS
  }
});

// Export validation utilities for testing
export { envSchema, validateEnvironment };