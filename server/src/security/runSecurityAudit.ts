#!/usr/bin/env node

/**
 * SPARC Security Audit Runner
 * Comprehensive security validation for production deployment
 */

import { securityTestSuite } from './SecurityTestSuite';
import { secureJWTManager } from './SecureJWTManager';

async function runSecurityAudit(): Promise<void> {
  console.log('🚀 SPARC Civilization Game - Security Audit');
  console.log('=' .repeat(50));
  console.log('Running comprehensive security validation...\n');

  try {
    // Initialize JWT Manager if not already done
    await secureJWTManager.initialize();

    // Run complete security test suite
    const results = await securityTestSuite.runAllTests();

    // Determine overall security status
    const overallStatus = results.critical === 0 ? 'SECURE' : 'VULNERABLE';
    const statusEmoji = results.critical === 0 ? '🛡️' : '🚨';

    console.log(`\n${statusEmoji} OVERALL SECURITY STATUS: ${overallStatus}`);

    if (results.critical > 0) {
      console.log('\n⚠️  CRITICAL SECURITY ISSUES DETECTED:');
      console.log('   - Production deployment is NOT RECOMMENDED');
      console.log('   - Fix all critical issues before proceeding');
      console.log('   - Review security configuration');
      throw new Error('Critical security issues detected');
    } else if (results.failed > 0) {
      console.log('\n⚠️  Some security improvements needed:');
      console.log('   - Production deployment possible but not optimal');
      console.log('   - Consider addressing remaining issues');
      console.log('   - Monitor security status regularly');
      return;
    } else {
      console.log('\n🎉 All security tests passed!');
      console.log('   - System meets security requirements');
      console.log('   - Safe for production deployment');
      console.log('   - Continue regular security monitoring');
      return;
    }
  } catch (error) {
    console.error('\n❌ Security audit failed:', error);
    console.log('\n🛠️  Troubleshooting steps:');
    console.log('   1. Ensure all environment variables are set');
    console.log('   2. Verify JWT Manager initialization');
    console.log('   3. Check database connectivity');
    console.log('   4. Review server configuration');
    throw error;
  }
}

// Run audit if called directly
if (require.main === module) {
  runSecurityAudit();
}

export { runSecurityAudit };
