import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config/config';
import { GameUtils } from '@civ-game/shared';

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
    this.router.post('/register', this.register.bind(this));
    this.router.post('/login', this.login.bind(this));
    this.router.post('/logout', this.authenticateToken, this.logout.bind(this));
    this.router.get('/profile', this.authenticateToken, this.getProfile.bind(this));
    this.router.put('/profile', this.authenticateToken, this.updateProfile.bind(this));
    this.router.get('/verify', this.authenticateToken, this.verifyToken.bind(this));
  }

  private async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password } = req.body;

      // Validate input
      if (!username || !email || !password) {
        res.status(400).json({ error: 'Username, email, and password are required' });
        return;
      }

      if (!GameUtils.validatePlayerName(username)) {
        res.status(400).json({ error: 'Invalid username format' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters' });
        return;
      }

      // Check if user already exists
      const existingUser = Array.from(this.users.values()).find(
        u => u.username === username || u.email === email
      );

      if (existingUser) {
        res.status(409).json({ error: 'Username or email already exists' });
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
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN }
      );

      // Return success response
      res.status(201).json({
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
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
      }

      // Find user
      const user = Array.from(this.users.values()).find(
        u => u.username === username || u.email === username
      );

      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Check password
      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Update last login
      user.lastLogin = new Date();
      this.users.set(user.id, user);

      // Generate JWT
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN }
      );

      res.json({
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
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private logout(req: AuthRequest, res: Response): void {
    // In a real implementation, you might want to blacklist the token
    res.json({ message: 'Logout successful' });
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
          res.status(409).json({ error: 'Email already in use' });
          return;
        }

        user.email = email;
        updated = true;
      }

      // Update password
      if (currentPassword && newPassword) {
        const validCurrentPassword = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!validCurrentPassword) {
          res.status(400).json({ error: 'Current password is incorrect' });
          return;
        }

        if (newPassword.length < 6) {
          res.status(400).json({ error: 'New password must be at least 6 characters' });
          return;
        }

        user.passwordHash = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);
        updated = true;
      }

      if (updated) {
        this.users.set(user.id, user);
      }

      res.json({
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
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private verifyToken(req: AuthRequest, res: Response): void {
    // If we reach here, the token is valid (middleware handled verification)
    const user = req.user!;
    
    res.json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  }

  // Middleware for token authentication
  private authenticateToken(req: AuthRequest, res: Response, next: Function): void {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    jwt.verify(token, config.JWT_SECRET, (err: any, decoded: any) => {
      if (err) {
        res.status(403).json({ error: 'Invalid or expired token' });
        return;
      }

      // Find user
      const user = this.users.get(decoded.userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
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