// Global test setup
import { beforeAll, afterAll } from '@jest/globals';

// Custom matchers for testing
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidJWT(): R;
      toMatchApiResponse(): R;
      toBeValidUserId(): R;
      toBeValidGameId(): R;
      toHaveValidTimestamp(): R;
    }
  }
}

expect.extend({
  toBeValidJWT(received) {
    if (typeof received !== 'string') {
      return {
        message: () => `Expected JWT to be a string, received ${typeof received}`,
        pass: false,
      };
    }

    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*$/;
    const pass = jwtRegex.test(received);

    return {
      message: () => pass 
        ? `Expected ${received} not to be a valid JWT`
        : `Expected ${received} to be a valid JWT`,
      pass,
    };
  },
  toMatchApiResponse(received) {
    const pass = received && 
      typeof received === 'object' &&
      'success' in received &&
      typeof received.success === 'boolean';

    return {
      message: () => pass
        ? `Expected object not to match API response format`
        : `Expected object to match API response format with 'success' property`,
      pass,
    };
  },
  toBeValidUserId(received) {
    const pass = typeof received === 'string' && received.length > 0;

    return {
      message: () => pass
        ? `Expected ${received} not to be a valid user ID`
        : `Expected ${received} to be a valid user ID (non-empty string)`,
      pass,
    };
  },
  toBeValidGameId(received) {
    const pass = typeof received === 'string' && received.length > 0;

    return {
      message: () => pass
        ? `Expected ${received} not to be a valid game ID`
        : `Expected ${received} to be a valid game ID (non-empty string)`,
      pass,
    };
  },
  toHaveValidTimestamp(received) {
    const timestamp = received?.timestamp || received?.createdAt || received?.updatedAt;
    const pass = timestamp && !isNaN(new Date(timestamp).getTime());

    return {
      message: () => pass
        ? `Expected object not to have valid timestamp`
        : `Expected object to have valid timestamp property`,
      pass,
    };
  },
});

console.log('🧪 Setting up test environment...');

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-super-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only-different';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.BCRYPT_ROUNDS = '10';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.ENABLE_SECURITY_HEADERS = 'true';

beforeAll(async () => {
  console.log('✅ Test environment setup complete');
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  console.log('✅ Test environment cleanup complete');
});