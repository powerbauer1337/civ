#!/usr/bin/env ts-node
/**
 * Standalone security test runner for SPARC integration testing
 * This bypasses compilation issues and runs security validation directly
 */

import { securityTestSuite } from './SecurityTestSuite';

async function runSecurityTests() {
  console.log('🔐 SPARC Security Integration Testing');
  console.log('=====================================\n');

  try {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-super-long-secure';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only-different-and-secure';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.BCRYPT_ROUNDS = '10';
    process.env.RATE_LIMIT_MAX_REQUESTS = '100';
    process.env.RATE_LIMIT_WINDOW_MS = '900000';
    process.env.ENABLE_SECURITY_HEADERS = 'true';

    const results = await securityTestSuite.runAllTests();

    console.log('\n🏁 SECURITY TEST SUMMARY');
    console.log('========================');
    console.log(`✅ Passed: ${results.passed}/${results.passed + results.failed}`);
    console.log(`❌ Failed: ${results.failed}/${results.passed + results.failed}`);
    console.log(`🚨 Critical: ${results.critical}/${results.failed}`);

    if (results.critical > 0) {
      console.log('\n⚠️  CRITICAL SECURITY ISSUES DETECTED!');
      console.log('These must be resolved before production deployment.');
      process.exit(1);
    } else if (results.failed > 0) {
      console.log('\n⚠️  Some security tests failed.');
      console.log('Review and address these issues for optimal security.');
      process.exit(1);
    } else {
      console.log('\n🎉 All security tests passed!');
      console.log('System security validation complete.');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n💥 Security testing failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runSecurityTests();
}

export { runSecurityTests };