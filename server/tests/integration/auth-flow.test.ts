import request from 'supertest';
import express from 'express';
import { AuthController } from '../../src/controllers/AuthController';

describe('Authentication Flow Integration Tests', () => {
  let app: express.Application;
  let authController: AuthController;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    authController = new AuthController();
    app.use('/auth', authController.router);
  });

  describe('Complete User Registration and Login Flow', () => {
    const testUser = {
      username: 'integrationuser',
      email: 'integration@example.com',
      password: 'securepassword123'
    };

    it('should complete full user lifecycle: register -> login -> profile -> update -> logout', async () => {
      // Step 1: Register new user
      const registrationResponse = await request(app)
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      expect(registrationResponse.body.user.username).toBe(testUser.username);
      expect(registrationResponse.body.user.email).toBe(testUser.email);
      expect(registrationResponse.body.token).toBeValidJWT();

      const registrationToken = registrationResponse.body.token;
      const userId = registrationResponse.body.user.id;

      // Step 2: Verify token immediately after registration
      await request(app)
        .get('/auth/verify')
        .set('Authorization', `Bearer ${registrationToken}`)
        .expect(200);

      // Step 3: Login with username
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password
        })
        .expect(200);

      expect(loginResponse.body.user.username).toBe(testUser.username);
      expect(loginResponse.body.token).toBeValidJWT();

      const loginToken = loginResponse.body.token;

      // Step 4: Access profile with login token
      const profileResponse = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(profileResponse.body.id).toBe(userId);
      expect(profileResponse.body.username).toBe(testUser.username);
      expect(profileResponse.body.email).toBe(testUser.email);

      // Step 5: Update profile email
      const newEmail = 'updated@example.com';
      const updateResponse = await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${loginToken}`)
        .send({ email: newEmail })
        .expect(200);

      expect(updateResponse.body.user.email).toBe(newEmail);

      // Step 6: Verify updated profile
      const updatedProfileResponse = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(updatedProfileResponse.body.email).toBe(newEmail);

      // Step 7: Login with email (should work with updated email)
      await request(app)
        .post('/auth/login')
        .send({
          username: newEmail,
          password: testUser.password
        })
        .expect(200);

      // Step 8: Update password
      const newPassword = 'newsecurepassword456';
      await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${loginToken}`)
        .send({
          currentPassword: testUser.password,
          newPassword: newPassword
        })
        .expect(200);

      // Step 9: Login with new password
      const newPasswordLoginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: newPassword
        })
        .expect(200);

      expect(newPasswordLoginResponse.body.token).toBeValidJWT();

      // Step 10: Verify old password no longer works
      await request(app)
        .post('/auth/login')
        .send({
          username: testUser.username,
          password: testUser.password // old password
        })
        .expect(401);

      // Step 11: Logout
      await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${newPasswordLoginResponse.body.token}`)
        .expect(200);
    });
  });

  describe('Multiple Users Interaction', () => {
    const user1 = {
      username: 'user1',
      email: 'user1@example.com',
      password: 'password123'
    };

    const user2 = {
      username: 'user2',
      email: 'user2@example.com',
      password: 'password456'
    };

    it('should handle multiple users independently', async () => {
      // Register both users
      const user1Response = await request(app)
        .post('/auth/register')
        .send(user1)
        .expect(201);

      const user2Response = await request(app)
        .post('/auth/register')
        .send(user2)
        .expect(201);

      const user1Token = user1Response.body.token;
      const user2Token = user2Response.body.token;
      const user1Id = user1Response.body.user.id;
      const user2Id = user2Response.body.user.id;

      // Verify users have different IDs
      expect(user1Id).not.toBe(user2Id);

      // Both users should be able to access their profiles
      const user1Profile = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const user2Profile = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(user1Profile.body.username).toBe(user1.username);
      expect(user2Profile.body.username).toBe(user2.username);
      expect(user1Profile.body.id).toBe(user1Id);
      expect(user2Profile.body.id).toBe(user2Id);

      // User 1 token should not work for user 2's data and vice versa
      // This is implicitly tested since profile returns based on token

      // Update user 1's email to user 2's email should fail
      await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ email: user2.email })
        .expect(409);

      // Both users should be able to update their own profiles independently
      await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ email: 'user1-updated@example.com' })
        .expect(200);

      await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ email: 'user2-updated@example.com' })
        .expect(200);

      // Verify both updates worked
      const user1Updated = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      const user2Updated = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(user1Updated.body.email).toBe('user1-updated@example.com');
      expect(user2Updated.body.email).toBe('user2-updated@example.com');
    });
  });

  describe('Game Stats Integration', () => {
    it('should track game statistics correctly', async () => {
      // Register user
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'gameruser',
          email: 'gamer@example.com',
          password: 'password123'
        })
        .expect(201);

      const token = response.body.token;
      const userId = response.body.user.id;

      // Initially should have 0 games
      const initialProfile = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(initialProfile.body.gamesPlayed).toBe(0);
      expect(initialProfile.body.gamesWon).toBe(0);
      expect(initialProfile.body.winRate).toBe('0.0');

      // Simulate game results
      authController.updateUserStats(userId, true); // Win
      authController.updateUserStats(userId, false); // Loss
      authController.updateUserStats(userId, true); // Win
      authController.updateUserStats(userId, false); // Loss
      authController.updateUserStats(userId, true); // Win

      // Check updated stats
      const updatedProfile = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(updatedProfile.body.gamesPlayed).toBe(5);
      expect(updatedProfile.body.gamesWon).toBe(3);
      expect(updatedProfile.body.winRate).toBe('60.0'); // 3/5 * 100

      // Continue playing
      authController.updateUserStats(userId, true); // Win
      authController.updateUserStats(userId, true); // Win

      const finalProfile = await request(app)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(finalProfile.body.gamesPlayed).toBe(7);
      expect(finalProfile.body.gamesWon).toBe(5);
      expect(finalProfile.body.winRate).toBe('71.4'); // 5/7 * 100 rounded to 1 decimal
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent login attempts safely', async () => {
      const testUser = {
        username: 'concurrentuser',
        email: 'concurrent@example.com',
        password: 'password123'
      };

      // Register user first
      await request(app)
        .post('/auth/register')
        .send(testUser)
        .expect(201);

      // Make multiple concurrent login requests
      const loginPromises = Array(5).fill(null).map(() =>
        request(app)
          .post('/auth/login')
          .send({
            username: testUser.username,
            password: testUser.password
          })
      );

      const responses = await Promise.all(loginPromises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.token).toBeValidJWT();
        expect(response.body.user.username).toBe(testUser.username);
      });
    });

    it('should handle concurrent registration attempts with same email', async () => {
      const duplicateUser = {
        username: 'user',
        email: 'duplicate@example.com',
        password: 'password123'
      };

      // Make multiple concurrent registration requests with different usernames but same email
      const registrationPromises = Array(3).fill(null).map((_, index) =>
        request(app)
          .post('/auth/register')
          .send({
            username: `user${index}`,
            email: duplicateUser.email, // Same email
            password: duplicateUser.password
          })
      );

      const responses = await Promise.all(registrationPromises);

      // Only one should succeed (201), others should fail (409)
      const successCount = responses.filter(r => r.status === 201).length;
      const conflictCount = responses.filter(r => r.status === 409).length;

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(2);
    });
  });

  describe('Token Persistence and Validation', () => {
    it('should maintain token validity across requests', async () => {
      // Register user
      const response = await request(app)
        .post('/auth/register')
        .send({
          username: 'persistentuser',
          email: 'persistent@example.com',
          password: 'password123'
        })
        .expect(201);

      const token = response.body.token;

      // Use token multiple times over a period
      for (let i = 0; i < 5; i++) {
        await request(app)
          .get('/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        await request(app)
          .get('/auth/verify')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Token should still be valid for updates
      await request(app)
        .put('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'persistent-updated@example.com' })
        .expect(200);
    });
  });
});