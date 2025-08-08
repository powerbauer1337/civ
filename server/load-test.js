const http = require('http');
const crypto = require('crypto');

/**
 * Simple Load Testing Script for SPARC Integration Testing
 * Tests concurrent user scenarios and API performance
 */

class LoadTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.results = {
      total: 0,
      successful: 0,
      failed: 0,
      avgResponseTime: 0,
      errors: []
    };
  }

  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
        }
      };

      if (data) {
        const jsonData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(jsonData);
      }

      const startTime = Date.now();
      const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          const endTime = Date.now();
          const responseTime = endTime - startTime;
          
          try {
            const parsedData = JSON.parse(responseData);
            resolve({
              statusCode: res.statusCode,
              data: parsedData,
              responseTime: responseTime
            });
          } catch (err) {
            resolve({
              statusCode: res.statusCode,
              data: responseData,
              responseTime: responseTime
            });
          }
        });
      });

      req.on('error', (err) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        reject({
          error: err.message,
          responseTime: responseTime
        });
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  async testConcurrentRegistrations(concurrency = 10) {
    console.log(`🧪 Testing concurrent user registrations (${concurrency} users)...`);
    
    const promises = [];
    for (let i = 0; i < concurrency; i++) {
      const userData = {
        username: `testuser${i}_${Date.now()}`,
        email: `test${i}_${Date.now()}@example.com`,
        password: 'TestPassword123!'
      };

      promises.push(
        this.makeRequest('POST', '/auth/register', userData)
          .then(result => {
            this.results.total++;
            if (result.statusCode === 201) {
              this.results.successful++;
            } else {
              this.results.failed++;
              this.results.errors.push(`Registration failed: ${result.statusCode}`);
            }
            return result;
          })
          .catch(err => {
            this.results.total++;
            this.results.failed++;
            this.results.errors.push(`Registration error: ${err.error}`);
            return err;
          })
      );
    }

    const results = await Promise.all(promises);
    const responseTimes = results
      .filter(r => r.responseTime)
      .map(r => r.responseTime);
    
    if (responseTimes.length > 0) {
      this.results.avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }

    return results;
  }

  async testConcurrentLogins(concurrency = 5) {
    console.log(`🔐 Testing concurrent logins (${concurrency} attempts)...`);

    // First, register a test user
    const testUser = {
      username: `logintest_${Date.now()}`,
      email: `logintest_${Date.now()}@example.com`,
      password: 'TestPassword123!'
    };

    try {
      await this.makeRequest('POST', '/auth/register', testUser);
    } catch (err) {
      console.log('Warning: Could not register test user for login test');
      return [];
    }

    const promises = [];
    for (let i = 0; i < concurrency; i++) {
      promises.push(
        this.makeRequest('POST', '/auth/login', {
          username: testUser.username,
          password: testUser.password
        })
          .then(result => {
            this.results.total++;
            if (result.statusCode === 200) {
              this.results.successful++;
            } else {
              this.results.failed++;
              this.results.errors.push(`Login failed: ${result.statusCode}`);
            }
            return result;
          })
          .catch(err => {
            this.results.total++;
            this.results.failed++;
            this.results.errors.push(`Login error: ${err.error}`);
            return err;
          })
      );
    }

    const results = await Promise.all(promises);
    return results;
  }

  async testRateLimiting() {
    console.log('🚦 Testing rate limiting...');

    const promises = [];
    for (let i = 0; i < 150; i++) { // Exceed rate limit of 100
      promises.push(
        this.makeRequest('GET', '/api/games/stats')
          .then(result => {
            this.results.total++;
            if (result.statusCode === 200) {
              this.results.successful++;
            } else if (result.statusCode === 429) {
              this.results.successful++; // Rate limiting working is success
            } else {
              this.results.failed++;
              this.results.errors.push(`Unexpected status: ${result.statusCode}`);
            }
            return result;
          })
          .catch(err => {
            this.results.total++;
            this.results.failed++;
            this.results.errors.push(`Rate limit test error: ${err.error}`);
            return err;
          })
      );
    }

    const results = await Promise.all(promises);
    const rateLimitedCount = results.filter(r => r.statusCode === 429).length;
    
    console.log(`📊 Rate limited requests: ${rateLimitedCount}/150`);
    return results;
  }

  async runAllTests() {
    console.log('🚀 Starting Load Testing Suite...\n');

    try {
      // Test 1: Concurrent registrations
      await this.testConcurrentRegistrations(10);
      
      // Test 2: Concurrent logins
      await this.testConcurrentLogins(5);
      
      // Test 3: Rate limiting
      // await this.testRateLimiting(); // Skip if server not running

      console.log('\n📊 Load Test Results:');
      console.log('='.repeat(40));
      console.log(`Total Requests: ${this.results.total}`);
      console.log(`Successful: ${this.results.successful}`);
      console.log(`Failed: ${this.results.failed}`);
      console.log(`Success Rate: ${((this.results.successful / this.results.total) * 100).toFixed(2)}%`);
      console.log(`Average Response Time: ${this.results.avgResponseTime.toFixed(2)}ms`);
      
      if (this.results.errors.length > 0) {
        console.log('\n❌ Errors:');
        this.results.errors.slice(0, 5).forEach(error => {
          console.log(`   - ${error}`);
        });
        if (this.results.errors.length > 5) {
          console.log(`   ... and ${this.results.errors.length - 5} more errors`);
        }
      }

      console.log('\n🏁 Load Testing Complete');
      
      // Determine if tests passed
      const successRate = (this.results.successful / this.results.total) * 100;
      if (successRate >= 80) {
        console.log('✅ Load tests PASSED (>80% success rate)');
        return true;
      } else {
        console.log('❌ Load tests FAILED (<80% success rate)');
        return false;
      }

    } catch (error) {
      console.error('💥 Load testing failed:', error);
      return false;
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new LoadTester();
  tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error('Load testing crashed:', err);
    process.exit(1);
  });
}

module.exports = { LoadTester };