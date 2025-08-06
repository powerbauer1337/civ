import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001'),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  
  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/civgame',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Authentication
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  
  // Game Configuration
  MAX_GAMES_PER_USER: parseInt(process.env.MAX_GAMES_PER_USER || '3'),
  GAME_CLEANUP_INTERVAL: parseInt(process.env.GAME_CLEANUP_INTERVAL || '300000'), // 5 minutes
  TURN_TIME_LIMIT: parseInt(process.env.TURN_TIME_LIMIT || '300'), // 5 minutes
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Security
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12'),
  
  // Performance
  MAX_PLAYERS_PER_GAME: parseInt(process.env.MAX_PLAYERS_PER_GAME || '8'),
  MAX_CONCURRENT_GAMES: parseInt(process.env.MAX_CONCURRENT_GAMES || '100'),
  
  // Features
  ENABLE_AI_PLAYERS: process.env.ENABLE_AI_PLAYERS === 'true',
  ENABLE_SPECTATORS: process.env.ENABLE_SPECTATORS === 'true',
  ENABLE_REPLAYS: process.env.ENABLE_REPLAYS === 'true'
};