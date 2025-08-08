import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthController } from '../../src/controllers/AuthController';
import { config } from '../../src/config/config';

describe('AuthController', () => {
  let app: express.Application;
  let authController: AuthController;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    authController = new AuthController();
    app.use('/auth', authController.router);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    const validRegistrationData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(201);

      expect(response.body).toMatchApiResponse();
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toEqual(
        expect.objectContaining({
          username: validRegistrationData.username,
          email: validRegistrationData.email,
          gamesPlayed: 0,
          gamesWon: 0
        })
      );
      expect(response.body.user.id).toBeValidUserId();
      expect(response.body.token).toBeValidJWT();
    });

    it('should return 400 when username is missing', async () => {
      const invalidData = { ...validRegistrationData };
      delete (invalidData as any).username;

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchApiResponse();
      expect(response.body.error).toBe('Username, email, and password are required');
    });

    it('should return 400 when email is missing', async () => {
      const invalidData = { ...validRegistrationData };
      delete (invalidData as any).email;

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchApiResponse();
      expect(response.body.error).toBe('Username, email, and password are required');
    });

    it('should return 400 when password is missing', async () => {
      const invalidData = { ...validRegistrationData };
      delete (invalidData as any).password;

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchApiResponse();
      expect(response.body.error).toBe('Username, email, and password are required');
    });

    it('should return 400 when password is too short', async () => {
      const invalidData = { ...validRegistrationData, password: '123' };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchApiResponse();
      expect(response.body.error).toBe('Password must be at least 6 characters');
    });

    it('should return 409 when username already exists', async () => {
      // Register first user
      await request(app)
        .post('/auth/register')
        .send(validRegistrationData);

      // Try to register with same username
      const duplicateData = {
        ...validRegistrationData,
        email: 'different@example.com'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(duplicateData)
        .expect(409);

      expect(response.body).toMatchApiResponse();
      expect(response.body.error).toBe('Username or email already exists');
    });

    it('should return 409 when email already exists', async () => {
      // Register first user
      await request(app)
        .post('/auth/register')
        .send(validRegistrationData);

      // Try to register with same email
      const duplicateData = {
        ...validRegistrationData,
        username: 'differentuser'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(duplicateData)
        .expect(409);

      expect(response.body).toMatchApiResponse();
      expect(response.body.error).toBe('Username or email already exists');
    });

    it('should hash the password before storing', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(201);

      const user = authController.getUser(response.body.user.id);
      expect(user?.passwordHash).toBeDefined();
      expect(user?.passwordHash).not.toBe(validRegistrationData.password);
      
      // Verify password can be compared
      const isValid = await bcrypt.compare(validRegistrationData.password, user!.passwordHash);
      expect(isValid).toBe(true);
    });

    it('should generate a valid JWT token', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send(validRegistrationData)
        .expect(201);

      const decoded = jwt.verify(response.body.token, config.JWT_SECRET) as any;
      expect(decoded.userId).toBe(response.body.user.id);
      expect(decoded.username).toBe(validRegistrationData.username);
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });

  describe('POST /auth/login', () => {
    const userData = {
      username: 'loginuser',
      email: 'login@example.com',
      password: 'password123'
    };

    beforeEach(async () => {
      // Register user for login tests
      await request(app)
        .post('/auth/register')
        .send(userData);
    });

    it('should login with username successfully', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: userData.username,
          password: userData.password
        })
        .expect(200);

      expect(response.body).toMatchApiResponse();
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user.username).toBe(userData.username);
      expect(response.body.token).toBeValidJWT();
    });

    it('should login with email successfully', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(response.body).toMatchApiResponse();
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.token).toBeValidJWT();
    });

    it('should return 400 when username is missing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          password: userData.password
        })
        .expect(400);

      expect(response.body).toMatchApiResponse();
      expect(response.body.error).toBe('Username and password are required');
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: userData.username
        })
        .expect(400);

      expect(response.body).toMatchApiResponse();
      expect(response.body.error).toBe('Username and password are required');
    });

    it('should return 401 when user does not exist', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'nonexistent',
          password: userData.password
        })
        .expect(401);

      expect(response.body).toMatchApiResponse();
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should return 401 when password is incorrect', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: userData.username,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toMatchApiResponse();
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should update lastLogin timestamp on successful login', async () => {
      const beforeLogin = new Date();
      
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: userData.username,
          password: userData.password
        })
        .expect(200);

      const afterLogin = new Date();
      const lastLogin = new Date(response.body.user.lastLogin);
      
      expect(lastLogin.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
      expect(lastLogin.getTime()).toBeLessThanOrEqual(afterLogin.getTime());
    });
  });

  describe('GET /auth/profile', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'profileuser',
          email: 'profile@example.com',
          password: 'password123'
        });
      
      authToken = response.body.token;
      userId = response.body.user.id;
    });

    it('should return user profile when authenticated', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          id: userId,
          username: 'profileuser',
          email: 'profile@example.com',
          gamesPlayed: 0,
          gamesWon: 0,
          winRate: '0.0'
        })
      );
    });

    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .expect(401);

      expect(response.body).toMatchApiResponse();
      expect(response.body.error).toBe('Access token required');
    });

    it('should return 403 when invalid token provided', async () => {
      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body).toMatchApiResponse();
      expect(response.body.error).toBe('Invalid or expired token');
    });

    it('should calculate win rate correctly', async () => {
      // Update user stats
      authController.updateUserStats(userId, true); // Win
      authController.updateUserStats(userId, false); // Loss
      authController.updateUserStats(userId, true); // Win

      const response = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.gamesPlayed).toBe(3);
      expect(response.body.gamesWon).toBe(2);
      expect(response.body.winRate).toBe('66.7');
    });
  });

  describe('PUT /auth/profile', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'updateuser',
          email: 'update@example.com',
          password: 'password123'
        });
      
      authToken = response.body.token;
      userId = response.body.user.id;
    });

    it('should update email successfully', async () => {
      const newEmail = 'newemail@example.com';
      
      const response = await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: newEmail })
        .expect(200);

      expect(response.body).toMatchApiResponse();
      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.user.email).toBe(newEmail);
    });

    it('should update password successfully', async () => {
      const response = await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'newpassword123'
        })
        .expect(200);

      expect(response.body).toMatchApiResponse();
      expect(response.body.message).toBe('Profile updated successfully');
      
      // Verify can login with new password
      await request(app)
        .post('/auth/login')
        .send({
          username: 'updateuser',
          password: 'newpassword123'
        })
        .expect(200);
    });

    it('should return 409 when email already exists', async () => {
      // Register another user
      await request(app)
        .post('/auth/register')
        .send({
          username: 'otheruser',
          email: 'other@example.com',
          password: 'password123'
        });

      const response = await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'other@example.com' })
        .expect(409);

      expect(response.body).toMatchApiResponse();
      expect(response.body.error).toBe('Email already in use');
    });

    it('should return 400 when current password is incorrect', async () => {
      const response = await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        })
        .expect(400);

      expect(response.body).toMatchApiResponse();
      expect(response.body.error).toBe('Current password is incorrect');
    });

    it('should return 400 when new password is too short', async () => {
      const response = await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPassword: 'password123',
          newPassword: '123'
        })
        .expect(400);

      expect(response.body).toMatchApiResponse();
      expect(response.body.error).toBe('New password must be at least 6 characters');
    });
  });

  describe('GET /auth/verify', () => {
    let authToken: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'verifyuser',
          email: 'verify@example.com',
          password: 'password123'
        });
      
      authToken = response.body.token;
    });

    it('should verify valid token', async () => {
      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual({
        valid: true,
        user: expect.objectContaining({
          username: 'verifyuser',
          email: 'verify@example.com'
        })
      });
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body).toMatchApiResponse();
      expect(response.body.error).toBe('Invalid or expired token');
    });
  });

  describe('POST /auth/logout', () => {
    let authToken: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'logoutuser',
          email: 'logout@example.com',
          password: 'password123'
        });
      
      authToken = response.body.token;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchApiResponse();
      expect(response.body.message).toBe('Logout successful');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect(401);

      expect(response.body).toMatchApiResponse();
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('Helper methods', () => {
    it('should update user stats correctly', () => {
      // Register a user first
      const user = {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        createdAt: new Date(),
        lastLogin: new Date(),
        gamesPlayed: 0,
        gamesWon: 0
      };
      
      // Manually add to controller for testing
      (authController as any).users.set(user.id, user);

      // Test winning
      authController.updateUserStats(user.id, true);
      let updatedUser = authController.getUser(user.id);
      expect(updatedUser?.gamesPlayed).toBe(1);
      expect(updatedUser?.gamesWon).toBe(1);

      // Test losing
      authController.updateUserStats(user.id, false);
      updatedUser = authController.getUser(user.id);
      expect(updatedUser?.gamesPlayed).toBe(2);
      expect(updatedUser?.gamesWon).toBe(1);
    });

    it('should get all users without password hashes', () => {
      const users = authController.getAllUsers();
      users.forEach(user => {
        expect(user.passwordHash).toBe('[REDACTED]');
      });
    });
  });
});