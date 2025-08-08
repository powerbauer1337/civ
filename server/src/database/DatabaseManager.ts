import { Client } from 'pg';
import Redis from 'redis';
import { config } from '../config/config';
import { GameState } from '../shared-types';

export class DatabaseManager {
  private pgClient: Client;
  private redisClient: ReturnType<typeof Redis.createClient>;
  private isInitialized: boolean = false;

  constructor() {
    // Initialize PostgreSQL client
    this.pgClient = new Client({
      connectionString: config.DATABASE_URL
    });

    // Initialize Redis client
    this.redisClient = Redis.createClient({
      url: config.REDIS_URL
    });
  }

  public async initialize(): Promise<void> {
    try {
      // Connect to PostgreSQL
      await this.pgClient.connect();
      console.log('Connected to PostgreSQL');

      // Create tables if they don't exist
      await this.createTables();

      // Connect to Redis
      await this.redisClient.connect();
      console.log('Connected to Redis');

      this.isInitialized = true;
      console.log('Database Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Database Manager:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        games_played INTEGER DEFAULT 0,
        games_won INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createGamesTable = `
      CREATE TABLE IF NOT EXISTS games (
        id VARCHAR(255) PRIMARY KEY,
        config JSONB NOT NULL,
        phase VARCHAR(50) NOT NULL,
        current_turn INTEGER DEFAULT 1,
        current_player INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        winner_id VARCHAR(255)
      );
    `;

    const createGamePlayersTable = `
      CREATE TABLE IF NOT EXISTS game_players (
        game_id VARCHAR(255) REFERENCES games(id) ON DELETE CASCADE,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        player_index INTEGER NOT NULL,
        civilization VARCHAR(100) NOT NULL,
        color VARCHAR(20) NOT NULL,
        final_score INTEGER DEFAULT 0,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (game_id, user_id)
      );
    `;

    const createGameActionsTable = `
      CREATE TABLE IF NOT EXISTS game_actions (
        id VARCHAR(255) PRIMARY KEY,
        game_id VARCHAR(255) REFERENCES games(id) ON DELETE CASCADE,
        player_id VARCHAR(255) NOT NULL,
        action_type VARCHAR(100) NOT NULL,
        payload JSONB NOT NULL,
        turn_number INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_games_phase ON games(phase);
      CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);
      CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
      CREATE INDEX IF NOT EXISTS idx_game_players_user_id ON game_players(user_id);
      CREATE INDEX IF NOT EXISTS idx_game_actions_game_id ON game_actions(game_id);
      CREATE INDEX IF NOT EXISTS idx_game_actions_turn ON game_actions(game_id, turn_number);
    `;

    await this.pgClient.query(createUsersTable);
    await this.pgClient.query(createGamesTable);
    await this.pgClient.query(createGamePlayersTable);
    await this.pgClient.query(createGameActionsTable);
    await this.pgClient.query(createIndexes);

    console.log('Database tables created successfully');
  }

  // User operations
  public async createUser(userData: {
    id: string;
    username: string;
    email: string;
    passwordHash: string;
  }): Promise<void> {
    const query = `
      INSERT INTO users (id, username, email, password_hash)
      VALUES ($1, $2, $3, $4)
    `;
    
    await this.pgClient.query(query, [
      userData.id,
      userData.username,
      userData.email,
      userData.passwordHash
    ]);
  }

  public async getUserByUsername(username: string): Promise<any> {
    const query = `
      SELECT * FROM users 
      WHERE username = $1 OR email = $1
    `;
    
    const result = await this.pgClient.query(query, [username]);
    return result.rows[0];
  }

  public async getUserById(userId: string): Promise<any> {
    const query = `SELECT * FROM users WHERE id = $1`;
    const result = await this.pgClient.query(query, [userId]);
    return result.rows[0];
  }

  public async updateUserStats(userId: string, won: boolean): Promise<void> {
    const query = `
      UPDATE users 
      SET games_played = games_played + 1,
          games_won = games_won + $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    await this.pgClient.query(query, [userId, won ? 1 : 0]);
  }

  // Game operations  
  public async saveGame(gameState: GameState): Promise<void> {
    const query = `
      INSERT INTO games (id, config, phase, current_turn, current_player, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (id) 
      DO UPDATE SET 
        phase = $3,
        current_turn = $4,
        current_player = $5,
        updated_at = $7
    `;

    await this.pgClient.query(query, [
      gameState.id,
      JSON.stringify(gameState.config),
      gameState.phase,
      gameState.currentTurn,
      gameState.currentPlayer,
      gameState.createdAt,
      gameState.lastUpdate
    ]);

    // Save players
    for (let i = 0; i < gameState.players.length; i++) {
      const player = gameState.players[i];
      await this.saveGamePlayer(gameState.id, player, i);
    }
  }

  private async saveGamePlayer(gameId: string, player: any, index: number): Promise<void> {
    const query = `
      INSERT INTO game_players (game_id, user_id, player_index, civilization, color, final_score)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (game_id, user_id)
      DO UPDATE SET 
        final_score = $6
    `;

    await this.pgClient.query(query, [
      gameId,
      player.id,
      index,
      player.civilization,
      player.color,
      player.score
    ]);
  }

  public async getGameById(gameId: string): Promise<any> {
    const gameQuery = `SELECT * FROM games WHERE id = $1`;
    const playersQuery = `
      SELECT gp.*, u.username 
      FROM game_players gp 
      JOIN users u ON gp.user_id = u.id 
      WHERE gp.game_id = $1 
      ORDER BY gp.player_index
    `;

    const gameResult = await this.pgClient.query(gameQuery, [gameId]);
    const playersResult = await this.pgClient.query(playersQuery, [gameId]);

    if (gameResult.rows.length === 0) {
      return null;
    }

    return {
      ...gameResult.rows[0],
      players: playersResult.rows
    };
  }

  public async getGameHistory(userId: string, limit: number = 20): Promise<any[]> {
    const query = `
      SELECT g.*, gp.final_score, gp.civilization, gp.color,
             CASE WHEN g.winner_id = gp.user_id THEN true ELSE false END as won
      FROM games g
      JOIN game_players gp ON g.id = gp.game_id
      WHERE gp.user_id = $1 AND g.phase = 'ended'
      ORDER BY g.ended_at DESC
      LIMIT $2
    `;

    const result = await this.pgClient.query(query, [userId, limit]);
    return result.rows;
  }

  // Game action operations
  public async saveGameAction(action: any): Promise<void> {
    const query = `
      INSERT INTO game_actions (id, game_id, player_id, action_type, payload, turn_number)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await this.pgClient.query(query, [
      action.actionId,
      action.gameId,
      action.playerId,
      action.type,
      JSON.stringify(action.payload),
      action.turnNumber || 1
    ]);
  }

  public async getGameActions(gameId: string, fromTurn?: number): Promise<any[]> {
    let query = `
      SELECT * FROM game_actions 
      WHERE game_id = $1
    `;
    const params = [gameId];

    if (fromTurn !== undefined) {
      query += ` AND turn_number >= $2`;
      params.push(fromTurn.toString());
    }

    query += ` ORDER BY created_at ASC`;

    const result = await this.pgClient.query(query, params);
    return result.rows.map(row => ({
      ...row,
      payload: JSON.parse(row.payload)
    }));
  }

  // Redis operations for active game states
  public async cacheGameState(gameId: string, gameState: GameState): Promise<void> {
    if (!this.isInitialized) return;
    
    const key = `game:${gameId}`;
    const serialized = JSON.stringify(gameState.serialize());
    
    // Cache for 1 hour
    await this.redisClient.setEx(key, 3600, serialized);
  }

  public async getCachedGameState(gameId: string): Promise<GameState | null> {
    if (!this.isInitialized) return null;
    
    const key = `game:${gameId}`;
    const cached = await this.redisClient.get(key);
    
    if (!cached) return null;
    
    try {
      const data = JSON.parse(cached);
      return GameState.deserialize(data);
    } catch (error) {
      console.error('Error deserializing cached game state:', error);
      return null;
    }
  }

  public async removeCachedGameState(gameId: string): Promise<void> {
    if (!this.isInitialized) return;
    
    const key = `game:${gameId}`;
    await this.redisClient.del(key);
  }

  // Player session management
  public async setPlayerSession(playerId: string, sessionData: any): Promise<void> {
    if (!this.isInitialized) return;
    
    const key = `session:${playerId}`;
    const serialized = JSON.stringify(sessionData);
    
    // Session expires in 24 hours
    await this.redisClient.setEx(key, 86400, serialized);
  }

  public async getPlayerSession(playerId: string): Promise<any | null> {
    if (!this.isInitialized) return null;
    
    const key = `session:${playerId}`;
    const cached = await this.redisClient.get(key);
    
    return cached ? JSON.parse(cached) : null;
  }

  public async removePlayerSession(playerId: string): Promise<void> {
    if (!this.isInitialized) return;
    
    const key = `session:${playerId}`;
    await this.redisClient.del(key);
  }

  // Analytics and statistics
  public async getGameStats(): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_games,
        COUNT(CASE WHEN phase = 'lobby' THEN 1 END) as lobby_games,
        COUNT(CASE WHEN phase = 'active' THEN 1 END) as active_games,
        COUNT(CASE WHEN phase = 'ended' THEN 1 END) as completed_games,
        AVG(EXTRACT(EPOCH FROM (ended_at - created_at))/60) as avg_game_duration_minutes
      FROM games
    `;

    const result = await this.pgClient.query(query);
    return result.rows[0];
  }

  public async getUserStats(): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_users,
        SUM(games_played) as total_games_played,
        AVG(games_played) as avg_games_per_user,
        AVG(CASE WHEN games_played > 0 THEN games_won::float / games_played ELSE 0 END) as avg_win_rate
      FROM users
    `;

    const result = await this.pgClient.query(query);
    return result.rows[0];
  }

  // Cleanup operations
  public async cleanupOldGames(daysOld: number = 30): Promise<number> {
    const query = `
      DELETE FROM games 
      WHERE created_at < NOW() - INTERVAL '$1 days'
      AND phase = 'ended'
    `;

    const result = await this.pgClient.query(query, [daysOld]);
    return result.rowCount || 0;
  }

  public async cleanupInactiveSessions(): Promise<void> {
    if (!this.isInitialized) return;

    // This would scan all session keys and remove expired ones
    // In a production environment, you'd want a more efficient approach
    const keys = await this.redisClient.keys('session:*');
    
    for (const key of keys) {
      const ttl = await this.redisClient.ttl(key);
      if (ttl === -1) {
        // Key has no expiration, remove it
        await this.redisClient.del(key);
      }
    }
  }

  public async disconnect(): Promise<void> {
    if (this.pgClient) {
      await this.pgClient.end();
      console.log('PostgreSQL connection closed');
    }

    if (this.redisClient && this.isInitialized) {
      await this.redisClient.quit();
      console.log('Redis connection closed');
    }

    this.isInitialized = false;
  }

  public isConnected(): boolean {
    return this.isInitialized;
  }
}