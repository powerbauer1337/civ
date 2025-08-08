import { JwtPayload } from 'jsonwebtoken';

export interface AuthTokenPayload extends JwtPayload {
  userId: string;
  username: string;
  jti?: string;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  lastLogin: Date | null;
  isActive: boolean;
  profile: UserProfile;
}

export interface UserProfile {
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  achievements: string[];
  preferences: UserPreferences;
  loginCount?: number;
}

export interface UserPreferences {
  notifications: boolean;
  publicProfile: boolean;
  theme?: 'light' | 'dark';
  language?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: Omit<User, 'password'>;
}