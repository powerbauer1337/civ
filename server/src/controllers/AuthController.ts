import { Router, Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/config';
import { GameUtils } from '../shared-types';
import { validateRequest, commonSchemas } from '../middleware/validation';
import type { StringValue } from 'ms';

interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  lastLogin: Date;
  gamesPlayed: number;
  gamesWon: number;
}

interface AuthRequest extends Request {
  user?: User;
}

export class AuthController {
  public router: Router;
  private users: Map<string, User>; // In-memory store for demo

  constructor() {
    this.router = Router();
    this.users = new Map();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.post('/register', 
      validateRequest(commonSchemas.registerSchema), 
      this.register.bind(this)
    );
    this.router.post('/login', 
      validateRequest(commonSchemas.loginSchema), 
      this.login.bind(this)
    );
    this.router.post('/logout', this.authenticateToken.bind(this), this.logout.bind(this));
    this.router.get('/profile', this.authenticateToken.bind(this), this.getProfile.bind(this));
    this.router.put('/profile', 
      this.authenticateToken.bind(this), 
      validateRequest(commonSchemas.updateProfileSchema), 
      this.updateProfile.bind(this)
    );
    this.router.get('/verify', this.authenticateToken.bind(this), this.verifyToken.bind(this));
  }

  private async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password } = req.body;

      // Input validation is now handled by middleware
      // Additional custom validation if needed
      if (!GameUtils.validatePlayerName(username)) {
        res.status(400).json({ success: false, error: 'Invalid username format' });
        return;
      }

      // Check if user already exists
      const existingUser = Array.from(this.users.values()).find(
        u => u.username === username || u.email === email
      );

      if (existingUser) {
        res.status(409).json({ success: false, error: 'Username or email already exists' });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);

      // Create user
      const user: User = {
        id: GameUtils.generatePlayerId(),
        username,
        email,
        passwordHash,
        createdAt: new Date(),
        lastLogin: new Date(),
        gamesPlayed: 0,
        gamesWon: 0
      };

      this.users.set(user.id, user);

      // Generate JWT
      const options: SignOptions = { expiresIn: config.JWT_EXPIRES_IN as StringValue };
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        config.JWT_SECRET,
        options
      );

      // Return success response
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          gamesPlayed: user.gamesPlayed,
          gamesWon: user.gamesWon
        },
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  private async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      // Input validation is now handled by middleware

      // Find user
      const user = Array.from(this.users.values()).find(
        u => u.username === username || u.email === username
      );

      if (!user) {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
        return;
      }

      // Check password
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
        return;
      }

      // Update last login
      user.lastLogin = new Date();
      this.users.set(user.id, user);

      // For integration testing, use simple JWT creation
      const options: SignOptions = { expiresIn: config.JWT_EXPIRES_IN as StringValue };
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        config.JWT_SECRET,
        options
      );

      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          lastLogin: user.lastLogin,
          gamesPlayed: user.gamesPlayed,
          gamesWon: user.gamesWon
        },
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  private logout(req: AuthRequest, res: Response): void {
    // In a real implementation, you might want to blacklist the token
    res.json({ success: true, message: 'Logout successful' });
  }

  private getProfile(req: AuthRequest, res: Response): void {
    const user = req.user!;

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      winRate: user.gamesPlayed > 0 ? (user.gamesWon / user.gamesPlayed * 100).toFixed(1) : '0.0'
    });
  }

  private async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const { email, currentPassword, newPassword } = req.body;

      let updated = false;

      // Update email
      if (email && email !== user.email) {
        // Check if email is already taken
        const existingUser = Array.from(this.users.values()).find(
          u => u.id !== user.id && u.email === email
        );

        if (existingUser) {
          res.status(409).json({ success: false, error: 'Email already in use' });
          return;
        }

        user.email = email;
        updated = true;
      }

      // Update password
      if (currentPassword && newPassword) {
        const validCurrentPassword = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!validCurrentPassword) {
          res.status(400).json({ success: false, error: 'Current password is incorrect' });
          return;
        }

        // Password complexity validation is handled by middleware

        user.passwordHash = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);
        updated = true;
      }

      if (updated) {
        this.users.set(user.id, user);
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          gamesPlayed: user.gamesPlayed,
          gamesWon: user.gamesWon
        }
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  private verifyToken(req: AuthRequest, res: Response): void {
    // If we reach here, the token is valid (middleware handled verification)
    const user = req.user!;

    res.json({
      success: true,
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  }

  // Middleware for token authentication
  private authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ success: false, error: 'Access token required' });
      return;
    }

    jwt.verify(token, config.JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        res.status(401).json({ success: false, error: 'Invalid or expired token' });
        return;
      }

      // Find user
      const user = this.users.get(decoded.userId);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      req.user = user;
      next();
    });
  }

  // Method to update user game stats
  public updateUserStats(userId: string, won: boolean): void {
    const user = this.users.get(userId);
    if (user) {
      user.gamesPlayed++;
      if (won) {
        user.gamesWon++;
      }
      this.users.set(userId, user);
    }
  }

  // Method to get user by ID (for internal use)
  public getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  // Method to get all users (for admin purposes)
  public getAllUsers(): User[] {
    return Array.from(this.users.values()).map(user => ({
      ...user,
      passwordHash: '[REDACTED]' // Don't expose password hashes
    })) as User[];
  }
}
