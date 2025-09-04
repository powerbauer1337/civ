import { DatabaseManager } from '../../src/database/DatabaseManager';
import { GameState } from '../../src/shared-types';
import { Client } from 'pg';
import { logger } from '@civ-game/shared/utils';

// Mock dependencies
jest.mock('pg');
jest.mock('redis', () => ({
  createClient: jest.fn(),
}));
jest.mock('../../src/config/config', () => ({
  config: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379'
  }
}));

// Mock logger from shared utils
jest.mock('@civ-game/shared/utils', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock GameState static methods
jest.mock('../../src/shared-types', () => ({
  GameState: {
    deserialize: jest.fn()
  }
}));

const mockPgClient = {
  connect: jest.fn(),
  query: jest.fn(),
  end: jest.fn()
};

const mockRedisClient = {
  connect: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  disconnect: jest.fn()
};

(Client as jest.MockedClass<typeof Client>).mockImplementation(() => mockPgClient as any);

const Redis = require('redis');
Redis.createClient.mockReturnValue(mockRedisClient);

describe('DatabaseManager', () => {
  let databaseManager: DatabaseManager;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    databaseManager = new DatabaseManager();
  });

  describe('Constructor', () => {
    it('should create DatabaseManager with PostgreSQL and Redis clients', () => {
      expect(Client).toHaveBeenCalledWith({
        connectionString: 'postgresql://test:test@localhost:5432/test'
      });
      expect(Redis.createClient).toHaveBeenCalledWith({
        url: 'redis://localhost:6379'
      });
    });
  });

  describe('Initialization', () => {
    it('should initialize successfully with all connections', async () => {
      mockPgClient.connect.mockResolvedValue(undefined);
      mockPgClient.query.mockResolvedValue({ rows: [] });
      mockRedisClient.connect.mockResolvedValue(undefined);

      await databaseManager.initialize();

      expect(mockPgClient.connect).toHaveBeenCalled();
      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Connected to PostgreSQL');
      expect(mockLogger.info).toHaveBeenCalledWith('Connected to Redis');
      expect(mockLogger.info).toHaveBeenCalledWith('Database Manager initialized successfully');
    });

    it('should handle PostgreSQL connection failure', async () => {
      const error = new Error('PostgreSQL connection failed');
      mockPgClient.connect.mockRejectedValue(error);

      await expect(databaseManager.initialize()).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize Database Manager:', error);
    });

    it('should handle Redis connection failure', async () => {
      const error = new Error('Redis connection failed');
      mockPgClient.connect.mockResolvedValue(undefined);
      mockPgClient.query.mockResolvedValue({ rows: [] });
      mockRedisClient.connect.mockRejectedValue(error);

      await expect(databaseManager.initialize()).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize Database Manager:', error);
    });

    it('should create all required database tables', async () => {
      mockPgClient.connect.mockResolvedValue(undefined);
      mockPgClient.query.mockResolvedValue({ rows: [] });
      mockRedisClient.connect.mockResolvedValue(undefined);

      await databaseManager.initialize();

      // Should call query 5 times: users, games, game_players, game_actions, indexes
      expect(mockPgClient.query).toHaveBeenCalledTimes(5);
      expect(mockLogger.info).toHaveBeenCalledWith('Database tables created successfully');
    });
  });

  describe('User Operations', () => {
    beforeEach(async () => {
      // Initialize before each test
      mockPgClient.connect.mockResolvedValue(undefined);
      mockPgClient.query.mockResolvedValue({ rows: [] });
      mockRedisClient.connect.mockResolvedValue(undefined);
      await databaseManager.initialize();
      jest.clearAllMocks();
    });

    describe('createUser', () => {
      it('should create user with valid data', async () => {
        const userData = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          passwordHash: 'hashed_password'
        };

        mockPgClient.query.mockResolvedValue({ rows: [] });

        await databaseManager.createUser(userData);

        expect(mockPgClient.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO users'),
          ['user-123', 'testuser', 'test@example.com', 'hashed_password']
        );
      });

      it('should handle database errors during user creation', async () => {
        const userData = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          passwordHash: 'hashed_password'
        };

        const error = new Error('Duplicate key violation');
        mockPgClient.query.mockRejectedValue(error);

        await expect(databaseManager.createUser(userData)).rejects.toThrow(error);
      });
    });

    describe('getUserByUsername', () => {
      it('should retrieve user by username', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com'
        };

        mockPgClient.query.mockResolvedValue({ rows: [mockUser] });

        const result = await databaseManager.getUserByUsername('testuser');

        expect(result).toEqual(mockUser);
        expect(mockPgClient.query).toHaveBeenCalledWith(
          expect.stringMatching(/SELECT \* FROM users.*WHERE username = \$1 OR email = \$1/s),
          ['testuser']
        );
      });

      it('should retrieve user by email', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com'
        };

        mockPgClient.query.mockResolvedValue({ rows: [mockUser] });

        const result = await databaseManager.getUserByUsername('test@example.com');

        expect(result).toEqual(mockUser);
        expect(mockPgClient.query).toHaveBeenCalledWith(
          expect.stringMatching(/SELECT \* FROM users.*WHERE username = \$1 OR email = \$1/s),
          ['test@example.com']
        );
      });

      it('should return undefined for non-existent user', async () => {
        mockPgClient.query.mockResolvedValue({ rows: [] });

        const result = await databaseManager.getUserByUsername('nonexistent');

        expect(result).toBeUndefined();
      });
    });

    describe('getUserById', () => {
      it('should retrieve user by ID', async () => {
        const mockUser = {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com'
        };

        mockPgClient.query.mockResolvedValue({ rows: [mockUser] });

        const result = await databaseManager.getUserById('user-123');

        expect(result).toEqual(mockUser);
        expect(mockPgClient.query).toHaveBeenCalledWith(
          'SELECT * FROM users WHERE id = $1',
          ['user-123']
        );
      });

      it('should return undefined for non-existent user ID', async () => {
        mockPgClient.query.mockResolvedValue({ rows: [] });

        const result = await databaseManager.getUserById('nonexistent');

        expect(result).toBeUndefined();
      });
    });

    describe('updateUserStats', () => {
      it('should update user stats for a win', async () => {
        mockPgClient.query.mockResolvedValue({ rows: [] });

        await databaseManager.updateUserStats('user-123', true);

        expect(mockPgClient.query).toHaveBeenCalledWith(
          expect.stringMatching(/UPDATE users.*SET games_played = games_played \+ 1.*games_won = games_won \+ \$2/s),
          ['user-123', 1]
        );
      });

      it('should update user stats for a loss', async () => {
        mockPgClient.query.mockResolvedValue({ rows: [] });

        await databaseManager.updateUserStats('user-123', false);

        expect(mockPgClient.query).toHaveBeenCalledWith(
          expect.stringMatching(/UPDATE users.*SET games_played = games_played \+ 1.*games_won = games_won \+ \$2/s),
          ['user-123', 0]
        );
      });

      it('should handle database errors during stats update', async () => {
        const error = new Error('Database error');
        mockPgClient.query.mockRejectedValue(error);

        await expect(databaseManager.updateUserStats('user-123', true)).rejects.toThrow(error);
      });
    });
  });

  describe('Game Operations', () => {
    let mockGameState: GameState;

    beforeEach(async () => {
      // Initialize before each test
      mockPgClient.connect.mockResolvedValue(undefined);
      mockPgClient.query.mockResolvedValue({ rows: [] });
      mockRedisClient.connect.mockResolvedValue(undefined);
      await databaseManager.initialize();
      jest.clearAllMocks();

      mockGameState = {
        id: 'game-123',
        currentPlayer: 0,
        currentTurn: 1,
        phase: 'active',
        players: [{
          id: 'player-1',
          name: 'Player 1',
          units: [],
          cities: [],
          technologies: [],
          resources: { food: 0, production: 0, science: 0, gold: 0 }
        }],
        board: { tiles: [] },
        config: {
          mapSize: { width: 10, height: 10 },
          difficulty: 'normal',
          turnLimit: 500,
          victoryConditions: ['conquest']
        },
        createdAt: new Date('2023-01-01'),
        lastUpdate: new Date('2023-01-01')
      } as any;
    });

    describe('saveGame', () => {
      it('should save game state to database', async () => {
        mockPgClient.query.mockResolvedValue({ rows: [] });

        await databaseManager.saveGame(mockGameState);

        expect(mockPgClient.query).toHaveBeenCalled();
        // Should call INSERT/UPDATE for game and players (1 game + 1 player = 2 calls)
        expect(mockPgClient.query).toHaveBeenCalledTimes(2); // Game + Player
        // Check game insertion
        expect(mockPgClient.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO games'),
          expect.arrayContaining(['game-123'])
        );
      });

      it('should handle database errors during game save', async () => {
        const error = new Error('Database error');
        mockPgClient.query.mockRejectedValue(error);

        await expect(databaseManager.saveGame(mockGameState)).rejects.toThrow(error);
      });
    });

    describe('getGameById', () => {
      it('should retrieve game by ID', async () => {
        const mockGame = {
          id: 'game-123',
          config: { mapSize: { width: 10, height: 10 } },
          phase: 'active'
        };
        const mockPlayers = [{ id: 'player-1', username: 'testuser' }];

        mockPgClient.query
          .mockResolvedValueOnce({ rows: [mockGame] })    // Game query
          .mockResolvedValueOnce({ rows: mockPlayers });   // Players query

        const result = await databaseManager.getGameById('game-123');

        expect(result).toEqual({ ...mockGame, players: mockPlayers });
        expect(mockPgClient.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM games WHERE id = $1'),
          ['game-123']
        );
        expect(mockPgClient.query).toHaveBeenCalledTimes(2);
      });

      it('should return null for non-existent game', async () => {
        mockPgClient.query.mockResolvedValue({ rows: [] });

        const result = await databaseManager.getGameById('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('getGameHistory', () => {
      it('should retrieve user game history with default limit', async () => {
        const mockGames = [
          { id: 'game-1', created_at: '2023-01-01' },
          { id: 'game-2', created_at: '2023-01-02' }
        ];

        mockPgClient.query.mockResolvedValue({ rows: mockGames });

        const result = await databaseManager.getGameHistory('user-123');

        expect(result).toEqual(mockGames);
        expect(mockPgClient.query).toHaveBeenCalledWith(
          expect.stringContaining('JOIN game_players gp ON g.id = gp.game_id'),
          ['user-123', 20]
        );
      });

      it('should retrieve user game history with custom limit', async () => {
        const mockGames = [
          { id: 'game-1', created_at: '2023-01-01' }
        ];

        mockPgClient.query.mockResolvedValue({ rows: mockGames });

        const result = await databaseManager.getGameHistory('user-123', 5);

        expect(result).toEqual(mockGames);
        expect(mockPgClient.query).toHaveBeenCalledWith(
          expect.stringContaining('JOIN game_players gp ON g.id = gp.game_id'),
          ['user-123', 5]
        );
      });
    });

    describe('saveGameAction', () => {
      it('should save game action to database', async () => {
        const mockAction = {
          actionId: 'action-123',
          gameId: 'game-123',
          playerId: 'player-1',
          type: 'MOVE_UNIT',
          payload: { from: { x: 0, y: 0 }, to: { x: 1, y: 0 } },
          turnNumber: 1
        };

        mockPgClient.query.mockResolvedValue({ rows: [] });

        await databaseManager.saveGameAction(mockAction);

        expect(mockPgClient.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO game_actions'),
          [
            mockAction.actionId,
            mockAction.gameId,
            mockAction.playerId,
            mockAction.type,
            JSON.stringify(mockAction.payload),
            mockAction.turnNumber
          ]
        );
      });
    });

    describe('getGameActions', () => {
      it('should retrieve all game actions', async () => {
        const mockActions = [
          { id: 'action-1', action_type: 'MOVE_UNIT' },
          { id: 'action-2', action_type: 'END_TURN' }
        ];

        mockPgClient.query.mockResolvedValue({ rows: mockActions });

        const result = await databaseManager.getGameActions('game-123');

        expect(result).toEqual(mockActions);
        expect(mockPgClient.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM game_actions'),
          ['game-123']
        );
      });

      it('should retrieve game actions from specific turn', async () => {
        const mockActions = [
          { id: 'action-1', action_type: 'MOVE_UNIT', turn_number: 5 }
        ];

        mockPgClient.query.mockResolvedValue({ rows: mockActions });

        const result = await databaseManager.getGameActions('game-123', 5);

        expect(result).toEqual(mockActions);
        expect(mockPgClient.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM game_actions'),
          ['game-123', '5']
        );
      });
    });
  });

  describe('Redis Cache Operations', () => {
    beforeEach(async () => {
      // Initialize before each test
      mockPgClient.connect.mockResolvedValue(undefined);
      mockPgClient.query.mockResolvedValue({ rows: [] });
      mockRedisClient.connect.mockResolvedValue(undefined);
      await databaseManager.initialize();
      jest.clearAllMocks();
    });

    describe('cacheGameState', () => {
      it('should cache game state in Redis', async () => {
        const mockGameState = {
          serialize: () => ({ id: 'game-123', data: 'serialized' })
        } as GameState;
        
        mockRedisClient.setEx = jest.fn().mockResolvedValue('OK');

        await databaseManager.cacheGameState('game-123', mockGameState);

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          'game:game-123',
          3600,
          JSON.stringify({ id: 'game-123', data: 'serialized' })
        );
      });

      it('should handle Redis errors during caching', async () => {
        const mockGameState = {
          serialize: () => ({ id: 'game-123', data: 'serialized' })
        } as GameState;
        const error = new Error('Redis error');
        mockRedisClient.setEx = jest.fn().mockRejectedValue(error);

        await expect(databaseManager.cacheGameState('game-123', mockGameState)).rejects.toThrow(error);
      });
    });

    describe('getCachedGameState', () => {
      it('should retrieve cached game state from Redis', async () => {
        const cachedData = {
          id: 'game-123',
          currentPlayer: 0,
          currentTurn: 1
        };
        const mockGameState = { id: 'game-123', data: 'deserialized' } as any;

        mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));
        (GameState.deserialize as jest.Mock).mockReturnValue(mockGameState);

        const result = await databaseManager.getCachedGameState('game-123');

        expect(result).toEqual(mockGameState);
        expect(GameState.deserialize).toHaveBeenCalledWith(cachedData);
        expect(mockRedisClient.get).toHaveBeenCalledWith('game:game-123');
      });

      it('should return null for non-cached game', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        const result = await databaseManager.getCachedGameState('game-123');

        expect(result).toBeNull();
      });

      it('should handle JSON parsing errors', async () => {
        mockRedisClient.get.mockResolvedValue('invalid-json');

        const result = await databaseManager.getCachedGameState('game-123');

        expect(result).toBeNull();
      });
    });

    describe('removeCachedGameState', () => {
      it('should remove cached game state from Redis', async () => {
        mockRedisClient.del.mockResolvedValue(1);

        await databaseManager.removeCachedGameState('game-123');

        expect(mockRedisClient.del).toHaveBeenCalledWith('game:game-123');
      });
    });

    describe('Player Session Operations', () => {
      it('should set player session data', async () => {
        const sessionData = { gameId: 'game-123', status: 'active' };

        mockRedisClient.set.mockResolvedValue('OK');

        await databaseManager.setPlayerSession('player-1', sessionData);

        expect(mockRedisClient.set).toHaveBeenCalledWith(
          'session:player-1',
          JSON.stringify(sessionData),
          { EX: 1800 }
        );
      });

      it('should get player session data', async () => {
        const sessionData = { gameId: 'game-123', status: 'active' };

        mockRedisClient.get.mockResolvedValue(JSON.stringify(sessionData));

        const result = await databaseManager.getPlayerSession('player-1');

        expect(result).toEqual(sessionData);
        expect(mockRedisClient.get).toHaveBeenCalledWith('session:player-1');
      });

      it('should return null for non-existent session', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        const result = await databaseManager.getPlayerSession('player-1');

        expect(result).toBeNull();
      });

      it('should remove player session', async () => {
        mockRedisClient.del.mockResolvedValue(1);

        await databaseManager.removePlayerSession('player-1');

        expect(mockRedisClient.del).toHaveBeenCalledWith('session:player-1');
      });
    });
  });

  describe('Statistics Operations', () => {
    beforeEach(async () => {
      mockPgClient.connect.mockResolvedValue(undefined);
      mockPgClient.query.mockResolvedValue({ rows: [] });
      mockRedisClient.connect.mockResolvedValue(undefined);
      await databaseManager.initialize();
      jest.clearAllMocks();
    });

    describe('getGameStats', () => {
      it('should retrieve game statistics', async () => {
        const mockStats = {
          total_games: 100,
          active_games: 5,
          completed_games: 95
        };

        mockPgClient.query.mockResolvedValue({ rows: [mockStats] });

        const result = await databaseManager.getGameStats();

        expect(result).toEqual(mockStats);
        expect(mockPgClient.query).toHaveBeenCalledWith(
          expect.stringContaining('COUNT(*) as total_games')
        );
      });
    });

    describe('getUserStats', () => {
      it('should retrieve user statistics', async () => {
        const mockStats = {
          total_users: 50,
          active_users_today: 10,
          active_users_week: 25
        };

        mockPgClient.query.mockResolvedValue({ rows: [mockStats] });

        const result = await databaseManager.getUserStats();

        expect(result).toEqual(mockStats);
        expect(mockPgClient.query).toHaveBeenCalledWith(
          expect.stringContaining('COUNT(*) as total_users')
        );
      });
    });
  });

  describe('Cleanup Operations', () => {
    beforeEach(async () => {
      mockPgClient.connect.mockResolvedValue(undefined);
      mockPgClient.query.mockResolvedValue({ rows: [] });
      mockRedisClient.connect.mockResolvedValue(undefined);
      await databaseManager.initialize();
      jest.clearAllMocks();
    });

    describe('cleanupOldGames', () => {
      it('should cleanup old games with default 30 day limit', async () => {
        mockPgClient.query.mockResolvedValue({ rowCount: 5 });

        const result = await databaseManager.cleanupOldGames();

        expect(result).toBe(5);
        expect(mockPgClient.query).toHaveBeenCalledWith(
          expect.stringContaining("DELETE FROM games")
        );
      });

      it('should cleanup old games with custom day limit', async () => {
        mockPgClient.query.mockResolvedValue({ rowCount: 3 });

        const result = await databaseManager.cleanupOldGames(7);

        expect(result).toBe(3);
        expect(mockPgClient.query).toHaveBeenCalledWith(
          expect.stringContaining("DELETE FROM games")
        );
      });
    });

    describe('cleanupInactiveSessions', () => {
      it('should cleanup inactive sessions', async () => {
        // Mock Redis KEYS and DEL operations
        mockRedisClient.keys = jest.fn().mockResolvedValue(['session:old1', 'session:old2']);
        mockRedisClient.del = jest.fn().mockResolvedValue(2);

        await databaseManager.cleanupInactiveSessions();

        // Implementation details will depend on actual Redis cleanup logic
        expect(mockRedisClient.keys).toHaveBeenCalled();
      });
    });
  });

  describe('Disconnect Operations', () => {
    it('should disconnect from both PostgreSQL and Redis', async () => {
      mockPgClient.connect.mockResolvedValue(undefined);
      mockPgClient.query.mockResolvedValue({ rows: [] });
      mockRedisClient.connect.mockResolvedValue(undefined);
      await databaseManager.initialize();

      mockPgClient.end.mockResolvedValue(undefined);
      mockRedisClient.disconnect.mockResolvedValue(undefined);

      await databaseManager.disconnect();

      expect(mockPgClient.end).toHaveBeenCalled();
      expect(mockRedisClient.disconnect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Database Manager disconnected');
    });

    it('should handle errors during disconnect', async () => {
      mockPgClient.connect.mockResolvedValue(undefined);
      mockPgClient.query.mockResolvedValue({ rows: [] });
      mockRedisClient.connect.mockResolvedValue(undefined);
      await databaseManager.initialize();

      const error = new Error('Disconnect error');
      mockPgClient.end.mockRejectedValue(error);

      await expect(databaseManager.disconnect()).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith('Error disconnecting from Database Manager:', error);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle operations when not initialized', async () => {
      const uninitializedManager = new DatabaseManager();
      
      // Most operations should still work but might fail due to uninitialized state
      // This depends on the actual implementation behavior
      await expect(uninitializedManager.createUser({
        id: 'test',
        username: 'test',
        email: 'test@test.com',
        passwordHash: 'hash'
      })).rejects.toThrow();
    });

    it('should handle malformed JSON in Redis cache', async () => {
      mockPgClient.connect.mockResolvedValue(undefined);
      mockPgClient.query.mockResolvedValue({ rows: [] });
      mockRedisClient.connect.mockResolvedValue(undefined);
      await databaseManager.initialize();

      mockRedisClient.get.mockResolvedValue('invalid-json-{');

      const result = await databaseManager.getCachedGameState('game-123');

      expect(result).toBeNull();
    });

    it('should handle large game states in cache', async () => {
      mockPgClient.connect.mockResolvedValue(undefined);
      mockPgClient.query.mockResolvedValue({ rows: [] });
      mockRedisClient.connect.mockResolvedValue(undefined);
      await databaseManager.initialize();

      const largeGameState = {
        currentPlayer: 'player-1',
        currentTurn: 1,
        players: {},
        board: Array(1000).fill(Array(1000).fill({})) // Large board
      } as GameState;

      mockRedisClient.set.mockResolvedValue('OK');

      await expect(databaseManager.cacheGameState('game-123', largeGameState)).resolves.not.toThrow();
    });
  });
});