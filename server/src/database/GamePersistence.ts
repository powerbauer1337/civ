import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { GameState, PlayerInfo, GameAction } from '@civ-game/shared';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface SaveGameOptions {
  gameId: string;
  saveName?: string;
  saveType: 'auto' | 'manual' | 'checkpoint';
  playerId: string;
  gameState: GameState;
  mapData?: any;
}

export interface LoadGameOptions {
  gameId?: string;
  saveId?: number;
  playerId: string;
}

export interface PlayerStats {
  playerId: string;
  username: string;
  totalGames: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  eloRating: number;
  totalPlaytime: number;
  achievements: string[];
}

export interface GameStats {
  unitsBuilt: number;
  unitsLost: number;
  unitsKilled: number;
  citiesFounded: number;
  citiesCaptured: number;
  citiesLost: number;
  technologiesResearched: number;
  buildingsConstructed: number;
  tilesExplored: number;
  peakScore: number;
  peakMilitaryStrength: number;
  peakCityCount: number;
}

export class GamePersistence {
  private db: Database | null = null;
  private dbPath: string;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private actionBuffer: Map<string, GameAction[]> = new Map();
  
  constructor(dbPath: string = './data/civilization.db') {
    this.dbPath = dbPath;
  }

  /**
   * Initialize database connection and create tables
   */
  async initialize(): Promise<void> {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Open database connection
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      // Enable foreign keys
      await this.db.exec('PRAGMA foreign_keys = ON');

      // Read and execute schema
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        await this.db.exec(schema);
      }

      // Initialize default achievements
      await this.initializeAchievements();

      console.log('✅ Game persistence database initialized');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Save game state to database
   */
  async saveGame(options: SaveGameOptions): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Compress game state
      const compressedState = await this.compressData(options.gameState);
      const compressedMap = options.mapData ? 
        await this.compressData(options.mapData) : 
        await this.compressData(options.gameState.map);

      const saveResult = await this.db.run(
        `INSERT INTO game_saves (
          game_id, save_name, turn_number, save_type, 
          game_state, map_data, created_by, file_size
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          options.gameId,
          options.saveName || `Turn ${options.gameState.turn}`,
          options.gameState.turn,
          options.saveType,
          compressedState,
          compressedMap,
          options.playerId,
          compressedState.length + compressedMap.length
        ]
      );

      // Update game last activity
      await this.db.run(
        'UPDATE games SET last_activity = CURRENT_TIMESTAMP, turn_count = ? WHERE id = ?',
        [options.gameState.turn, options.gameId]
      );

      // Cleanup old auto-saves (keep last 5)
      if (options.saveType === 'auto') {
        await this.cleanupAutoSaves(options.gameId);
      }

      return saveResult.lastID!;
    } catch (error) {
      console.error('Failed to save game:', error);
      throw error;
    }
  }

  /**
   * Load game state from database
   */
  async loadGame(options: LoadGameOptions): Promise<GameState | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      let save;

      if (options.saveId) {
        // Load specific save
        save = await this.db.get(
          'SELECT * FROM game_saves WHERE id = ? AND created_by = ?',
          [options.saveId, options.playerId]
        );
      } else if (options.gameId) {
        // Load most recent save for game
        save = await this.db.get(
          `SELECT * FROM game_saves 
           WHERE game_id = ? 
           ORDER BY created_at DESC 
           LIMIT 1`,
          [options.gameId]
        );
      } else {
        return null;
      }

      if (!save) return null;

      // Decompress game state
      const gameState = await this.decompressData(save.game_state);
      const mapData = await this.decompressData(save.map_data);

      // Merge map data if stored separately
      if (mapData && !gameState.map) {
        gameState.map = mapData;
      }

      return gameState;
    } catch (error) {
      console.error('Failed to load game:', error);
      throw error;
    }
  }

  /**
   * Create a new game record
   */
  async createGame(
    gameState: GameState,
    hostPlayerId: string,
    gameMode: 'multiplayer' | 'singleplayer',
    difficulty?: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.run(
        `INSERT INTO games (
          id, name, host_player_id, map_width, map_height,
          max_players, game_mode, difficulty, victory_conditions,
          status, turn_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          gameState.id,
          `Game ${new Date().toLocaleDateString()}`,
          hostPlayerId,
          gameState.map[0].length,
          gameState.map.length,
          gameState.config.maxPlayers,
          gameMode,
          difficulty || null,
          JSON.stringify(gameState.config.victoryConditions),
          'setup',
          0
        ]
      );

      // Add participants
      for (const [playerId, player] of Object.entries(gameState.players)) {
        await this.addGameParticipant(gameState.id, playerId, player);
      }
    } catch (error) {
      console.error('Failed to create game record:', error);
      throw error;
    }
  }

  /**
   * Add a participant to a game
   */
  async addGameParticipant(
    gameId: string,
    playerId: string,
    playerInfo: PlayerInfo,
    isAI: boolean = false,
    aiPersonality?: string,
    aiDifficulty?: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      `INSERT INTO game_participants (
        game_id, player_id, civilization, color,
        is_ai, ai_personality, ai_difficulty, join_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        gameId,
        playerId,
        playerInfo.civilization,
        playerInfo.color,
        isAI ? 1 : 0,
        aiPersonality || null,
        aiDifficulty || null,
        0 // Will be updated based on join order
      ]
    );
  }

  /**
   * Record a game action for replay
   */
  async recordGameAction(
    gameId: string,
    action: GameAction,
    turnNumber: number,
    processingTime?: number,
    result?: any
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Buffer actions for batch insertion
    if (!this.actionBuffer.has(gameId)) {
      this.actionBuffer.set(gameId, []);
    }
    
    this.actionBuffer.get(gameId)!.push(action);

    // Flush buffer if it gets too large
    if (this.actionBuffer.get(gameId)!.length >= 10) {
      await this.flushActionBuffer(gameId);
    }

    // Also insert immediately for important actions
    if (action.type === 'END_TURN' || action.type === 'FOUND_CITY') {
      await this.db.run(
        `INSERT INTO game_actions (
          game_id, turn_number, action_index, player_id,
          action_type, action_data, processing_time, result
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          gameId,
          turnNumber,
          0,
          action.playerId,
          action.type,
          JSON.stringify(action.data),
          processingTime || 0,
          result ? JSON.stringify(result) : null
        ]
      );
    }
  }

  /**
   * Update player statistics
   */
  async updatePlayerStatistics(
    playerId: string,
    gameId: string,
    stats: Partial<GameStats>
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Check if record exists
    const existing = await this.db.get(
      'SELECT id FROM player_statistics WHERE player_id = ? AND game_id = ?',
      [playerId, gameId]
    );

    if (existing) {
      // Update existing stats
      const updates = Object.entries(stats)
        .map(([key, value]) => `${this.camelToSnake(key)} = ${this.camelToSnake(key)} + ?`)
        .join(', ');
      
      const values = Object.values(stats);
      values.push(playerId, gameId);

      await this.db.run(
        `UPDATE player_statistics SET ${updates} 
         WHERE player_id = ? AND game_id = ?`,
        values
      );
    } else {
      // Insert new record
      const columns = Object.keys(stats).map(k => this.camelToSnake(k));
      const placeholders = columns.map(() => '?');
      
      await this.db.run(
        `INSERT INTO player_statistics (player_id, game_id, ${columns.join(', ')})
         VALUES (?, ?, ${placeholders.join(', ')})`,
        [playerId, gameId, ...Object.values(stats)]
      );
    }
  }

  /**
   * Get player statistics
   */
  async getPlayerStats(playerId: string): Promise<PlayerStats | null> {
    if (!this.db) throw new Error('Database not initialized');

    const stats = await this.db.get(
      `SELECT 
        p.*,
        COUNT(DISTINCT pa.achievement_id) as achievement_count
       FROM players p
       LEFT JOIN player_achievements pa ON p.id = pa.player_id
       WHERE p.id = ?
       GROUP BY p.id`,
      [playerId]
    );

    if (!stats) return null;

    // Get achievements
    const achievements = await this.db.all(
      'SELECT achievement_id FROM player_achievements WHERE player_id = ?',
      [playerId]
    );

    return {
      playerId: stats.id,
      username: stats.username,
      totalGames: stats.total_games,
      gamesWon: stats.games_won,
      gamesLost: stats.games_lost,
      winRate: stats.total_games > 0 ? 
        (stats.games_won / stats.total_games) * 100 : 0,
      eloRating: stats.elo_rating,
      totalPlaytime: stats.total_playtime,
      achievements: achievements.map(a => a.achievement_id)
    };
  }

  /**
   * Get list of saved games for a player
   */
  async getSavedGames(playerId: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    return await this.db.all(
      `SELECT 
        gs.id,
        gs.game_id,
        gs.save_name,
        gs.turn_number,
        gs.save_type,
        gs.created_at,
        gs.file_size,
        g.name as game_name,
        g.status,
        g.game_mode,
        g.difficulty
       FROM game_saves gs
       JOIN games g ON gs.game_id = g.id
       WHERE gs.created_by = ?
       ORDER BY gs.created_at DESC
       LIMIT 50`,
      [playerId]
    );
  }

  /**
   * Delete a saved game
   */
  async deleteSave(saveId: number, playerId: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.run(
      'DELETE FROM game_saves WHERE id = ? AND created_by = ?',
      [saveId, playerId]
    );

    return result.changes! > 0;
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(season?: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const currentSeason = season || new Date().getFullYear().toString();

    return await this.db.all(
      `SELECT 
        l.*,
        p.username
       FROM leaderboards l
       JOIN players p ON l.player_id = p.id
       WHERE l.season = ?
       ORDER BY l.rank ASC
       LIMIT 100`,
      [currentSeason]
    );
  }

  /**
   * Update game completion
   */
  async completeGame(
    gameId: string,
    winnerId: string,
    victoryType: string
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run('BEGIN TRANSACTION');

    try {
      // Update game record
      await this.db.run(
        `UPDATE games 
         SET status = 'completed',
             winner_id = ?,
             victory_type = ?,
             completed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [winnerId, victoryType, gameId]
      );

      // Update player stats
      const participants = await this.db.all(
        'SELECT player_id FROM game_participants WHERE game_id = ? AND is_ai = 0',
        [gameId]
      );

      for (const participant of participants) {
        const isWinner = participant.player_id === winnerId;
        
        await this.db.run(
          `UPDATE players 
           SET total_games = total_games + 1,
               games_won = games_won + ?,
               games_lost = games_lost + ?
           WHERE id = ?`,
          [isWinner ? 1 : 0, isWinner ? 0 : 1, participant.player_id]
        );

        // Update ELO rating (simplified)
        if (isWinner) {
          await this.updateEloRating(participant.player_id, true);
        } else {
          await this.updateEloRating(participant.player_id, false);
        }
      }

      await this.db.run('COMMIT');
    } catch (error) {
      await this.db.run('ROLLBACK');
      throw error;
    }
  }

  /**
   * Enable auto-save for active games
   */
  enableAutoSave(interval: number = 300000): void { // 5 minutes default
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = setInterval(async () => {
      await this.performAutoSaves();
    }, interval);
  }

  /**
   * Disable auto-save
   */
  disableAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // Helper methods

  private async compressData(data: any): Promise<string> {
    const jsonStr = JSON.stringify(data);
    const compressed = await gzip(jsonStr);
    return compressed.toString('base64');
  }

  private async decompressData(data: string): Promise<any> {
    const buffer = Buffer.from(data, 'base64');
    const decompressed = await gunzip(buffer);
    return JSON.parse(decompressed.toString());
  }

  private async cleanupAutoSaves(gameId: string): Promise<void> {
    if (!this.db) return;

    await this.db.run(
      `DELETE FROM game_saves
       WHERE game_id = ? AND save_type = 'auto'
       AND id NOT IN (
         SELECT id FROM game_saves
         WHERE game_id = ? AND save_type = 'auto'
         ORDER BY created_at DESC
         LIMIT 5
       )`,
      [gameId, gameId]
    );
  }

  private async flushActionBuffer(gameId: string): Promise<void> {
    if (!this.db) return;
    
    const actions = this.actionBuffer.get(gameId);
    if (!actions || actions.length === 0) return;

    const stmt = await this.db.prepare(
      `INSERT INTO game_actions (
        game_id, turn_number, action_index, player_id,
        action_type, action_data
      ) VALUES (?, ?, ?, ?, ?, ?)`
    );

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      await stmt.run(
        gameId,
        0, // Turn number should be tracked properly
        i,
        action.playerId,
        action.type,
        JSON.stringify(action.data)
      );
    }

    await stmt.finalize();
    this.actionBuffer.set(gameId, []);
  }

  private async performAutoSaves(): Promise<void> {
    // This would be called by GameManager to save active games
    // Implementation depends on game manager integration
    console.log('Performing auto-saves for active games...');
  }

  private async updateEloRating(playerId: string, won: boolean): Promise<void> {
    if (!this.db) return;

    const K = 32; // ELO K-factor
    const expectedScore = 0.5; // Simplified - should calculate based on opponent
    const actualScore = won ? 1 : 0;
    const ratingChange = Math.round(K * (actualScore - expectedScore));

    await this.db.run(
      'UPDATE players SET elo_rating = elo_rating + ? WHERE id = ?',
      [ratingChange, playerId]
    );
  }

  private async initializeAchievements(): Promise<void> {
    if (!this.db) return;

    const achievements = [
      {
        id: 'first_city',
        name: 'Founder',
        description: 'Found your first city',
        category: 'Cities',
        points: 10
      },
      {
        id: 'first_victory',
        name: 'Victor',
        description: 'Win your first game',
        category: 'Victory',
        points: 50
      },
      {
        id: 'explorer',
        name: 'Explorer',
        description: 'Explore 100 tiles in a single game',
        category: 'Exploration',
        points: 20
      },
      {
        id: 'warmonger',
        name: 'Warmonger',
        description: 'Eliminate 50 enemy units',
        category: 'Combat',
        points: 30
      },
      {
        id: 'scientist',
        name: 'Scientist',
        description: 'Research all technologies',
        category: 'Technology',
        points: 40
      }
    ];

    for (const achievement of achievements) {
      await this.db.run(
        `INSERT OR IGNORE INTO achievements (
          id, name, description, category, points, requirement_data
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          achievement.id,
          achievement.name,
          achievement.description,
          achievement.category,
          achievement.points,
          JSON.stringify({})
        ]
      );
    }
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    this.disableAutoSave();
    
    // Flush any remaining action buffers
    for (const gameId of this.actionBuffer.keys()) {
      await this.flushActionBuffer(gameId);
    }
    
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}
