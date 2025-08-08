// Server-side Game Types
export interface TestPlayer {
  id: string;
  username: string;
  civilization: string;
  score: number;
  isOnline: boolean;
  lastActivity?: Date;
}

export interface TestGame {
  id: string;
  name: string;
  status: 'waiting' | 'active' | 'ended';
  players: TestPlayer[];
  maxPlayers: number;
  currentTurn: number;
  createdAt: Date;
  lastActivity?: Date;
}

export interface GameAction {
  id: string;
  gameId: string;
  playerId: string;
  action: string;
  payload: any;
  timestamp: Date;
}

export interface GameStats {
  totalGames: number;
  activeGames: number;
  waitingGames: number;
  endedGames: number;
  totalPlayers: number;
  onlinePlayers: number;
  averagePlayersPerGame: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface GameListResponse {
  id: string;
  name: string;
  status: string;
  playerCount: number;
  maxPlayers: number;
  currentTurn: number;
  createdAt: string;
}

export interface CreateGameRequest {
  name: string;
  maxPlayers?: number;
}

export interface JoinGameRequest {
  username: string;
  civilization?: string;
}

export interface JoinGameResponse {
  message: string;
  game: {
    id: string;
    name: string;
    status: string;
    players: Array<{
      id: string;
      username: string;
      civilization: string;
    }>;
  };
  playerId: string;
}