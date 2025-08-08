import { config } from '../src/config/config';

export default async function globalSetup() {
  console.log('🧪 Setting up test environment...');
  
  // Set test-specific configuration
  process.env.NODE_ENV = 'test';
  process.env.PORT = '0'; // Use random available port
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.BCRYPT_ROUNDS = '4';
  process.env.LOG_LEVEL = 'error';
  
  // Disable external connections in tests
  process.env.REDIS_ENABLED = 'false';
  process.env.DATABASE_ENABLED = 'false';
  
  console.log('✅ Test environment setup complete');
}