import { secureJWTManager } from './SecureJWTManager';
import { config } from '../config/config';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * Comprehensive Security Test Suite
 * Validates all security implementations and configurations
 */

interface SecurityTestResult {
  testName: string;
  passed: boolean;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class SecurityTestSuite {
  private results: SecurityTestResult[] = [];

  /**
   * Run complete security test suite
   */
  async runAllTests(): Promise<{
    passed: number;
    failed: number;
    critical: number;
    results: SecurityTestResult[];
  }> {
    console.log('🔍 Running SPARC Security Test Suite...\n');

    // Environment and configuration tests
    await this.testEnvironmentSecurity();
    await this.testJWTConfiguration();
    await this.testPasswordSecurity();

    // JWT Manager tests
    await this.testJWTManagerInitialization();
    await this.testTokenGeneration();
    await this.testTokenVerification();
    await this.testTokenBlacklisting();
    await this.testKeyRotation();

    // Input validation tests
    await this.testInputValidation();
    
    // Rate limiting tests
    await this.testRateLimitingConfig();

    // Generate summary
    const summary = this.generateSummary();
    this.printResults();
    
    return summary;
  }

  /**
   * Test environment security configuration
   */
  private async testEnvironmentSecurity(): Promise<void> {
    // Test 1: No hardcoded secrets in production
    if (config.NODE_ENV === 'production') {
      const hasDefaultSecret = config.JWT_SECRET === 'your-super-secret-jwt-key-change-in-production';
      this.addResult({
        testName: 'Production JWT Secret',
        passed: !hasDefaultSecret,
        message: hasDefaultSecret 
          ? 'CRITICAL: Default JWT secret detected in production' 
          : 'JWT secret properly configured for production',
        severity: 'critical'
      });
    }

    // Test 2: JWT secret strength
    const jwtSecretStrength = config.JWT_SECRET.length >= 32;
    this.addResult({
      testName: 'JWT Secret Strength',
      passed: jwtSecretStrength,
      message: jwtSecretStrength 
        ? `JWT secret is ${config.JWT_SECRET.length} characters (✓ >= 32)`
        : `JWT secret is ${config.JWT_SECRET.length} characters (✗ < 32)`,
      severity: 'high'
    });

    // Test 3: Refresh secret different from access secret
    const secretsDifferent = config.JWT_SECRET !== config.JWT_REFRESH_SECRET;
    this.addResult({
      testName: 'JWT Secrets Separation',
      passed: secretsDifferent,
      message: secretsDifferent 
        ? 'JWT and refresh secrets are properly separated'
        : 'CRITICAL: JWT and refresh secrets are identical',
      severity: 'critical'
    });

    // Test 4: Security headers enabled
    this.addResult({
      testName: 'Security Headers',
      passed: config.ENABLE_SECURITY_HEADERS,
      message: config.ENABLE_SECURITY_HEADERS 
        ? 'Security headers enabled'
        : 'Security headers disabled',
      severity: 'medium'
    });
  }

  /**
   * Test JWT configuration security
   */
  private async testJWTConfiguration(): Promise<void> {
    // Test token expiration times
    const shortAccessToken = this.parseTimeString(config.JWT_EXPIRES_IN) <= 60 * 60; // <= 1 hour
    this.addResult({
      testName: 'Access Token Expiration',
      passed: shortAccessToken,
      message: shortAccessToken 
        ? `Access token expires in ${config.JWT_EXPIRES_IN} (✓ short-lived)`
        : `Access token expires in ${config.JWT_EXPIRES_IN} (✗ too long)`,
      severity: 'medium'
    });

    const reasonableRefreshToken = this.parseTimeString(config.JWT_REFRESH_EXPIRES_IN) <= 30 * 24 * 60 * 60; // <= 30 days
    this.addResult({
      testName: 'Refresh Token Expiration',
      passed: reasonableRefreshToken,
      message: reasonableRefreshToken 
        ? `Refresh token expires in ${config.JWT_REFRESH_EXPIRES_IN} (✓ reasonable)`
        : `Refresh token expires in ${config.JWT_REFRESH_EXPIRES_IN} (✗ too long)`,
      severity: 'medium'
    });
  }

  /**
   * Test password security configuration
   */
  private async testPasswordSecurity(): Promise<void> {
    const bcryptRoundsSecure = config.BCRYPT_ROUNDS >= 10;
    this.addResult({
      testName: 'Bcrypt Rounds',
      passed: bcryptRoundsSecure,
      message: bcryptRoundsSecure 
        ? `Bcrypt rounds: ${config.BCRYPT_ROUNDS} (✓ secure)`
        : `Bcrypt rounds: ${config.BCRYPT_ROUNDS} (✗ too low, minimum 10)`,
      severity: 'high'
    });
  }

  /**
   * Test JWT Manager initialization
   */
  private async testJWTManagerInitialization(): Promise<void> {
    try {
      const keyInfo = secureJWTManager.getKeyInfo();
      
      this.addResult({
        testName: 'JWT Manager Active Keys',
        passed: keyInfo.totalKeys > 0,
        message: keyInfo.totalKeys > 0 
          ? `JWT Manager has ${keyInfo.totalKeys} active keys`
          : 'JWT Manager has no active keys',
        severity: 'critical'
      });

      this.addResult({
        testName: 'JWT Manager Current Key',
        passed: keyInfo.currentKeyId !== null,
        message: keyInfo.currentKeyId 
          ? `Current key ID: ${keyInfo.currentKeyId}`
          : 'No current key set',
        severity: 'critical'
      });
    } catch (error) {
      this.addResult({
        testName: 'JWT Manager Initialization',
        passed: false,
        message: `JWT Manager initialization failed: ${(error as Error).message}`,
        severity: 'critical'
      });
    }
  }

  /**
   * Test token generation
   */
  private async testTokenGeneration(): Promise<void> {
    try {
      const testPayload = {
        userId: crypto.randomUUID(),
        username: 'testuser'
      };

      const token = await secureJWTManager.sign(testPayload);
      
      this.addResult({
        testName: 'Token Generation',
        passed: typeof token === 'string' && token.length > 0,
        message: 'JWT token generation successful',
        severity: 'critical'
      });

      // Verify token structure
      const decoded = jwt.decode(token, { complete: true });
      const hasJTI = decoded && typeof decoded === 'object' && (decoded.payload as any).jti;
      
      this.addResult({
        testName: 'Token JTI (JWT ID)',
        passed: !!hasJTI,
        message: hasJTI 
          ? 'JWT tokens include unique JTI for blacklisting'
          : 'JWT tokens missing JTI - blacklisting unavailable',
        severity: 'high'
      });
    } catch (error) {
      this.addResult({
        testName: 'Token Generation',
        passed: false,
        message: `Token generation failed: ${(error as Error).message}`,
        severity: 'critical'
      });
    }
  }

  /**
   * Test token verification
   */
  private async testTokenVerification(): Promise<void> {
    try {
      const testPayload = {
        userId: crypto.randomUUID(),
        username: 'testuser'
      };

      const token = await secureJWTManager.sign(testPayload);
      const verified = await secureJWTManager.verify(token);
      
      const verificationValid = verified.userId === testPayload.userId && 
                               verified.username === testPayload.username;
      
      this.addResult({
        testName: 'Token Verification',
        passed: verificationValid,
        message: verificationValid 
          ? 'JWT token verification successful'
          : 'JWT token verification failed',
        severity: 'critical'
      });
    } catch (error) {
      this.addResult({
        testName: 'Token Verification',
        passed: false,
        message: `Token verification failed: ${(error as Error).message}`,
        severity: 'critical'
      });
    }
  }

  /**
   * Test token blacklisting
   */
  private async testTokenBlacklisting(): Promise<void> {
    try {
      const testPayload = {
        userId: crypto.randomUUID(),
        username: 'testuser'
      };

      const token = await secureJWTManager.sign(testPayload);
      
      // Verify token works initially
      await secureJWTManager.verify(token);
      
      // Blacklist the token
      await secureJWTManager.blacklistToken(token, 'Test blacklisting');
      
      // Try to verify blacklisted token
      let blacklistWorking = false;
      try {
        await secureJWTManager.verify(token);
      } catch (error) {
        blacklistWorking = (error as Error).message.includes('blacklisted');
      }
      
      this.addResult({
        testName: 'Token Blacklisting',
        passed: blacklistWorking,
        message: blacklistWorking 
          ? 'Token blacklisting working correctly'
          : 'Token blacklisting failed - security risk',
        severity: 'high'
      });
    } catch (error) {
      this.addResult({
        testName: 'Token Blacklisting',
        passed: false,
        message: `Token blacklisting test failed: ${(error as Error).message}`,
        severity: 'high'
      });
    }
  }

  /**
   * Test key rotation functionality
   */
  private async testKeyRotation(): Promise<void> {
    try {
      const initialKeyInfo = secureJWTManager.getKeyInfo();
      const initialKeyCount = initialKeyInfo.totalKeys;
      const initialCurrentKey = initialKeyInfo.currentKeyId;
      
      // Perform key rotation
      await secureJWTManager.rotateKeys();
      
      const postRotationKeyInfo = secureJWTManager.getKeyInfo();
      const newKeyCount = postRotationKeyInfo.totalKeys;
      const newCurrentKey = postRotationKeyInfo.currentKeyId;
      
      const rotationWorked = newKeyCount > initialKeyCount && 
                           newCurrentKey !== initialCurrentKey;
      
      this.addResult({
        testName: 'Key Rotation',
        passed: rotationWorked,
        message: rotationWorked 
          ? `Key rotation successful: ${initialKeyCount} → ${newKeyCount} keys`
          : 'Key rotation failed',
        severity: 'medium'
      });
    } catch (error) {
      this.addResult({
        testName: 'Key Rotation',
        passed: false,
        message: `Key rotation test failed: ${(error as Error).message}`,
        severity: 'medium'
      });
    }
  }

  /**
   * Test input validation configuration
   */
  private async testInputValidation(): Promise<void> {
    // Test that validation schemas exist
    try {
      const { commonSchemas } = await import('../middleware/validation');
      
      const schemasExist = !!(commonSchemas.registerSchema && 
                           commonSchemas.loginSchema && 
                           commonSchemas.updateProfileSchema);
      
      this.addResult({
        testName: 'Input Validation Schemas',
        passed: schemasExist,
        message: schemasExist 
          ? 'Input validation schemas properly configured'
          : 'Input validation schemas missing',
        severity: 'high'
      });
    } catch (error) {
      this.addResult({
        testName: 'Input Validation Schemas',
        passed: false,
        message: `Input validation test failed: ${(error as Error).message}`,
        severity: 'high'
      });
    }
  }

  /**
   * Test rate limiting configuration
   */
  private async testRateLimitingConfig(): Promise<void> {
    const rateLimitingConfigured = config.RATE_LIMIT_MAX_REQUESTS > 0 && 
                                  config.RATE_LIMIT_WINDOW_MS > 0;
    
    this.addResult({
      testName: 'Rate Limiting Configuration',
      passed: rateLimitingConfigured,
      message: rateLimitingConfigured 
        ? `Rate limiting: ${config.RATE_LIMIT_MAX_REQUESTS} req/${config.RATE_LIMIT_WINDOW_MS}ms`
        : 'Rate limiting not properly configured',
      severity: 'medium'
    });
  }

  /**
   * Helper: Parse time string to seconds
   */
  private parseTimeString(timeStr: string): number {
    const unit = timeStr.slice(-1);
    const value = parseInt(timeStr.slice(0, -1));
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      case 'w': return value * 7 * 24 * 60 * 60;
      case 'y': return value * 365 * 24 * 60 * 60;
      default: return 0;
    }
  }

  /**
   * Add test result
   */
  private addResult(result: SecurityTestResult): void {
    this.results.push(result);
  }

  /**
   * Generate test summary
   */
  private generateSummary(): {
    passed: number;
    failed: number;
    critical: number;
    results: SecurityTestResult[];
  } {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const critical = this.results.filter(r => !r.passed && r.severity === 'critical').length;

    return { passed, failed, critical, results: this.results };
  }

  /**
   * Print formatted test results
   */
  private printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 SPARC Security Test Results');
    console.log('='.repeat(60));

    const summary = this.generateSummary();
    
    // Overall summary
    console.log(`\n📊 Summary: ${summary.passed} passed, ${summary.failed} failed`);
    if (summary.critical > 0) {
      console.log(`🚨 CRITICAL ISSUES: ${summary.critical} must be fixed immediately`);
    }

    // Group results by severity
    const critical = this.results.filter(r => r.severity === 'critical');
    const high = this.results.filter(r => r.severity === 'high');
    const medium = this.results.filter(r => r.severity === 'medium');
    const low = this.results.filter(r => r.severity === 'low');

    // Print critical issues first
    if (critical.length > 0) {
      console.log('\n🚨 CRITICAL SECURITY ISSUES:');
      critical.forEach(result => {
        const status = result.passed ? '✅' : '❌';
        console.log(`   ${status} ${result.testName}: ${result.message}`);
      });
    }

    // Print high severity issues
    if (high.length > 0) {
      console.log('\n⚠️  HIGH SEVERITY ISSUES:');
      high.forEach(result => {
        const status = result.passed ? '✅' : '❌';
        console.log(`   ${status} ${result.testName}: ${result.message}`);
      });
    }

    // Print medium severity issues
    if (medium.length > 0) {
      console.log('\n🔶 MEDIUM SEVERITY ISSUES:');
      medium.forEach(result => {
        const status = result.passed ? '✅' : '❌';
        console.log(`   ${status} ${result.testName}: ${result.message}`);
      });
    }

    // Print low severity issues
    if (low.length > 0) {
      console.log('\n🔷 LOW SEVERITY ISSUES:');
      low.forEach(result => {
        const status = result.passed ? '✅' : '❌';
        console.log(`   ${status} ${result.testName}: ${result.message}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    
    // Security recommendations
    if (summary.failed > 0) {
      console.log('\n🛠️  SECURITY RECOMMENDATIONS:');
      console.log('   1. Fix all CRITICAL issues immediately');
      console.log('   2. Address HIGH severity issues before production');
      console.log('   3. Review MEDIUM severity issues for security improvements');
      console.log('   4. Consider LOW severity issues for defense in depth');
    } else {
      console.log('\n🎉 All security tests passed! System is secure.');
    }

    console.log('\n');
  }
}

// Export singleton for easy testing
export const securityTestSuite = new SecurityTestSuite();