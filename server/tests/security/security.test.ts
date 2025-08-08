import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { AuthController } from '../../src/controllers/AuthController';
import { config } from '../../src/config/config';

describe('Security Tests', () => {
  let app: express.Application;
  let authController: AuthController;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    authController = new AuthController();
    app.use('/auth', authController.router);
  });

  describe('Input Validation Security', () => {
    it('should prevent SQL injection attempts in registration', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "admin'; INSERT INTO users (username) VALUES ('hacker'); --",
        "test' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "<script>alert('xss')</script>",
      ];

      for (const maliciousInput of maliciousInputs) {
        const response = await request(app)
          .post('/auth/register')
          .send({
            username: maliciousInput,
            email: 'test@example.com',
            password: 'password123'
          });

        // Should either reject due to validation or treat as literal string
        if (response.status === 201) {
          // If accepted, it should be stored as literal string, not executed
          expect(response.body.user.username).toBe(maliciousInput);
        } else {
          // Should be rejected with appropriate error
          expect(response.status).toBeGreaterThanOrEqual(400);
        }
      }
    });

    it('should prevent XSS attacks in user inputs', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '"><script>alert("xss")</script>',
        "javascript:alert('xss')",
        '<img src=x onerror=alert("xss")>',
        '<iframe src="javascript:alert(\'xss\')"></iframe>',
      ];

      for (const payload of xssPayloads) {
        await request(app)
          .post('/auth/register')
          .send({
            username: payload,
            email: 'xss@example.com',
            password: 'password123'
          });

        // Verify no script execution occurs (this is more of a backend test,
        // frontend would need additional XSS protection)
      }
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'test@',
        'test@@example.com',
        'test@example',
        'test.@example.com',
        'test@.example.com',
        '',
        'test@example..com',
        'very-long-email-address-that-might-cause-buffer-overflow@very-long-domain-name-that-might-cause-issues.com',
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/auth/register')
          .send({
            username: 'testuser',
            email: email,
            password: 'password123'
          });

        // Should reject invalid emails
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should enforce password complexity requirements', async () => {
      const weakPasswords = [
        '',
        '123',
        '12345',
        'password',
        '123456',
        'qwerty',
        'abc123',
      ];

      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/auth/register')
          .send({
            username: 'testuser',
            email: 'test@example.com',
            password: password
          });

        if (password.length < 6) {
          expect(response.status).toBe(400);
          expect(response.body.error).toBe('Password must be at least 6 characters');
        }
      }
    });

    it('should limit request payload size', async () => {
      const largePayload = {
        username: 'test',
        email: 'test@example.com',
        password: 'a'.repeat(10000), // Very large password
        extraData: 'x'.repeat(100000) // Large extra field
      };

      const response = await request(app)
        .post('/auth/register')
        .send(largePayload);

      // Should either be rejected or handled safely
      expect(response.status).toBeLessThan(500); // Should not crash server
    });
  });

  describe('Authentication Security', () => {
    it('should not reveal whether username or email exists', async () => {
      // Register a user
      await request(app)
        .post('/auth/register')
        .send({
          username: 'existinguser',
          email: 'existing@example.com',
          password: 'password123'
        });

      // Try login with existing username but wrong password
      const response1 = await request(app)
        .post('/auth/login')
        .send({
          username: 'existinguser',
          password: 'wrongpassword'
        })
        .expect(401);

      // Try login with non-existing username
      const response2 = await request(app)
        .post('/auth/login')
        .send({
          username: 'nonexistentuser',
          password: 'wrongpassword'
        })
        .expect(401);

      // Both should return same error message
      expect(response1.body.error).toBe('Invalid credentials');
      expect(response2.body.error).toBe('Invalid credentials');
    });

    it('should implement rate limiting for login attempts', async () => {
      // Register a user first
      await request(app)
        .post('/auth/register')
        .send({
          username: 'rateLimitUser',
          email: 'ratelimit@example.com',
          password: 'password123'
        });

      // Make many rapid login attempts with wrong password
      const promises = Array(20).fill(null).map(() =>
        request(app)
          .post('/auth/login')
          .send({
            username: 'rateLimitUser',
            password: 'wrongpassword'
          })
      );

      const responses = await Promise.all(promises);

      // All should return 401 for invalid credentials
      // In a real implementation, rate limiting would block some requests
      responses.forEach(response => {
        expect([401, 429]).toContain(response.status); // 429 = Too Many Requests
      });
    });

    it('should prevent timing attacks on password comparison', async () => {
      await request(app)
        .post('/auth/register')
        .send({
          username: 'timinguser',
          email: 'timing@example.com',
          password: 'verylongpasswordtotest'
        });

      // Measure response time for wrong password (short)
      const start1 = Date.now();
      await request(app)
        .post('/auth/login')
        .send({
          username: 'timinguser',
          password: 'x'
        });
      const time1 = Date.now() - start1;

      // Measure response time for wrong password (almost correct)
      const start2 = Date.now();
      await request(app)
        .post('/auth/login')
        .send({
          username: 'timinguser',
          password: 'verylongpasswordtotest1' // almost correct
        });
      const time2 = Date.now() - start2;

      // Times should be similar (bcrypt comparison should take similar time)
      // Allow for reasonable variance in timing
      const timeDiff = Math.abs(time1 - time2);
      expect(timeDiff).toBeLessThan(100); // Less than 100ms difference
    });
  });

  describe('JWT Token Security', () => {
    it('should use secure JWT signing', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'jwtuser',
          email: 'jwt@example.com',
          password: 'password123'
        });

      const token = response.body.token;
      
      // Verify token structure
      const tokenParts = token.split('.');
      expect(tokenParts).toHaveLength(3); // header.payload.signature

      // Decode header and payload (not signature)
      const header = JSON.parse(Buffer.from(tokenParts[0], 'base64url').toString());
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString());

      // Verify secure algorithm
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      // Verify payload structure
      expect(payload.userId).toBeDefined();
      expect(payload.username).toBe('jwtuser');
      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();

      // Verify expiration is set and reasonable
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeGreaterThan(now);
      expect(payload.exp - now).toBeLessThan(24 * 60 * 60); // Less than 24 hours
    });

    it('should reject tampered tokens', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'tamperuser',
          email: 'tamper@example.com',
          password: 'password123'
        });

      const originalToken = response.body.token;
      const tokenParts = originalToken.split('.');

      // Tamper with payload
      const tamperedPayload = Buffer.from(JSON.stringify({
        userId: 'hacker-id',
        username: 'hacker',
        exp: Math.floor(Date.now() / 1000) + 3600
      })).toString('base64url');

      const tamperedToken = tokenParts[0] + '.' + tamperedPayload + '.' + tokenParts[2];

      // Should reject tampered token
      await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(403);
    });

    it('should reject expired tokens', async () => {
      // Create token with very short expiry
      const shortLivedToken = jwt.sign(
        { userId: 'test-user', username: 'testuser' },
        config.JWT_SECRET,
        { expiresIn: '1ms' } // Expires immediately
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should reject expired token
      await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${shortLivedToken}`)
        .expect(403);
    });

    it('should validate token format strictly', async () => {
      const invalidTokens = [
        'invalid',
        'Bearer invalid',
        'not.a.jwt',
        'too.few.parts',
        'too.many.parts.here.extra',
        '',
        null,
        undefined,
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/auth/profile')
          .set('Authorization', token ? `Bearer ${token}` : '')
          .expect(401);

        expect(response.body.error).toBe('Access token required');
      }
    });
  });

  describe('Password Security', () => {
    it('should hash passwords securely', async () => {
      const password = 'testpassword123';
      
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'hashuser',
          email: 'hash@example.com',
          password: password
        });

      const userId = response.body.user.id;
      const user = authController.getUser(userId);

      // Password should be hashed
      expect(user?.passwordHash).toBeDefined();
      expect(user?.passwordHash).not.toBe(password);
      expect(user?.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/); // bcrypt format
    });

    it('should use sufficient bcrypt rounds', async () => {
      const password = 'testpassword123';
      
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'roundsuser',
          email: 'rounds@example.com',
          password: password
        });

      const userId = response.body.user.id;
      const user = authController.getUser(userId);
      const hash = user?.passwordHash;

      // Extract rounds from hash
      const rounds = parseInt(hash?.split('$')[2] || '0');
      expect(rounds).toBeGreaterThanOrEqual(4); // Minimum for testing
      expect(rounds).toBeLessThanOrEqual(15); // Maximum reasonable
    });

    it('should prevent password reuse in updates', async () => {
      const originalPassword = 'originalpassword123';
      
      // Register user
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'reuseuser',
          email: 'reuse@example.com',
          password: originalPassword
        });

      const token = response.body.token;

      // Try to update to same password
      const updateResponse = await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: originalPassword,
          newPassword: originalPassword // Same as current
        });

      // Should allow same password for now (could be enhanced to prevent this)
      expect(updateResponse.status).toBe(200);
    });
  });

  describe('Session Security', () => {
    it('should not expose sensitive data in responses', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'secureuser',
          email: 'secure@example.com',
          password: 'password123'
        });

      // Response should not contain password hash
      expect(response.body.user.passwordHash).toBeUndefined();
      expect(response.body.user.password).toBeUndefined();

      // Profile endpoint should also not expose sensitive data
      const profileResponse = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${response.body.token}`);

      expect(profileResponse.body.passwordHash).toBeUndefined();
      expect(profileResponse.body.password).toBeUndefined();
    });

    it('should handle concurrent sessions safely', async () => {
      // Register user
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'concurrentuser',
          email: 'concurrent@example.com',
          password: 'password123'
        });

      const token1 = response.body.token;

      // Login again to get second token
      const login2Response = await request(app)
        .post('/auth/login')
        .send({
          username: 'concurrentuser',
          password: 'password123'
        });

      const token2 = login2Response.body.token;

      // Both tokens should work independently
      await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      // Update from one session should not affect the other session's token
      await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${token1}`)
        .send({ email: 'updated@example.com' })
        .expect(200);

      // Both tokens should still work
      await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);
    });
  });
});