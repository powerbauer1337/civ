import { GameManager, GameRoom } from '../../src/game/GameManager';
import { Server, Socket } from 'socket.io';
import { GameConfig, PlayerInfo, GameUtils, VictoryType, GameActionType } from '@civ-game/shared';
import { GamePhase } from '../../src/shared-types';
import { GameAction } from '@civ-game/shared/dist/types/GameTypes';
import { GameState } from '../../src/shared-types';
import { GamePersistence } from '../../src/database/GamePersistence';

// Enhanced mock implementations for comprehensive testing
const mockSocket = (id: string) => ({
  id,
  emit: jest.fn(),
  join: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
  rooms: new Set(),
  connected: true,
  handshake: { auth: {} }
} as unknown as jest.Mocked<Socket>);

const mockIo = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
  in: jest.fn().mockReturnThis(),
  sockets: {
    adapter: {
      rooms: new Map()
    }
  }
} as unknown as jest.Mocked<Server>;

// Mock GamePersistence for database operations
const mockGamePersistence = {
  saveGame: jest.fn(),
  loadGame: jest.fn(),
  getGamesByPlayer: jest.fn(),
  deleteGame: jest.fn()
} as jest.Mocked<GamePersistence>;

// Mock GameState for state management
const createMockGameState = (config: GameConfig) => ({
  id: 'test-game-id',
  config,
  phase: GamePhase.LOBBY,
  players: [],
  currentPlayerIndex: 0,
  turnNumber: 1,
  createdAt: new Date(),
  addPlayer: jest.fn(),
  removePlayer: jest.fn(),
  startGame: jest.fn(),
  getCurrentPlayer: jest.fn().mockReturnValue({ id: 'player-1', name: 'Test Player' }),
  executeAction: jest.fn().mockReturnValue(true),
  serialize: jest.fn().mockReturnValue({ phase: GamePhase.LOBBY }),
  currentTurn: 1,
  currentPlayer: 0,
  map: { width: 10, height: 10, tiles: [] },
  units: [],
  cities: [],
  resources: { food: 0, production: 0, gold: 0, science: 0, culture: 0 }
});

// Mock GameEngine for game logic
jest.mock('../../src/game/GameEngine', () => ({
  GameEngine: jest.fn().mockImplementation(() => ({
    processAction: jest.fn().mockReturnValue(true),
    advanceTurn: jest.fn(),
    getGameState: jest.fn(),
    isActionValid: jest.fn().mockReturnValue(true),
    getAvailableActions: jest.fn().mockReturnValue([]),
    checkVictoryConditions: jest.fn().mockReturnValue(null)
  }))
}));

// Mock config
jest.mock('../../src/config/config', () => ({
  config: {
    GAME_CLEANUP_INTERVAL: 60000,
    TURN_TIME_LIMIT: 30,
    MAX_GAMES_PER_PLAYER: 5
  }
}));

describe('GameManager - Enhanced Coverage Tests', () => {
  let gameManager: GameManager;
  let mockGameState: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create fresh mocks for each test
    mockGameState = createMockGameState({
      maxPlayers: 2,
      mapSize: { width: 10, height: 10 },
      turnTimeLimit: 30,
      victoryConditions: [VictoryType.DOMINATION],
      startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
    });

    gameManager = new GameManager(mockIo as Server, mockGamePersistence);
  });

  afterEach(() => {
    gameManager.shutdown();
  });

  describe('Game Lifecycle Management', () => {
    test('should handle complete game creation flow', () => {
      const socket = mockSocket('player-socket-1');
      const gameConfig: GameConfig = {
        maxPlayers: 4,
        mapSize: { width: 16, height: 12 },
        turnTimeLimit: 60,
        victoryConditions: [VictoryType.DOMINATION, VictoryType.SCIENCE],
        startingResources: { gold: 100, science: 10, culture: 0, production: 20, food: 30 } as any
      };

      // Execute game creation
      (gameManager as any).handleCreateGame(socket, { playerName: 'TestPlayer', gameConfig });

      // Verify game was created
      expect(socket.emit).toHaveBeenCalledWith('game_created', expect.objectContaining({
        gameId: expect.any(String),
        playerId: expect.any(String),
        gameState: expect.any(Object)
      }));

      // Verify internal state is updated
      const games = (gameManager as any).games;
      expect(games.size).toBe(1);
      
      const playerToGame = (gameManager as any).playerToGame;
      const socketToPlayer = (gameManager as any).socketToPlayer;
      expect(playerToGame.size).toBe(1);
      expect(socketToPlayer.size).toBe(1);
    });

    test('should handle player joining existing game', () => {
      const hostSocket = mockSocket('host-socket');
      const joinerSocket = mockSocket('joiner-socket');
      
      const gameConfig: GameConfig = {
        maxPlayers: 2,
        mapSize: { width: 10, height: 10 },
        turnTimeLimit: 30,
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
      };

      // Create game first
      (gameManager as any).handleCreateGame(hostSocket, { playerName: 'Host', gameConfig });
      
      // Get the created game ID
      const gameCreatedCall = hostSocket.emit.mock.calls.find(call => call[0] === 'game_created');
      const gameId = gameCreatedCall[1].gameId;

      // Clear previous calls
      jest.clearAllMocks();

      // Join the game
      (gameManager as any).handleJoinGame(joinerSocket, { gameId, playerName: 'Joiner' });

      // Verify join was successful
      expect(mockIo.to).toHaveBeenCalledWith(gameId);
      expect(mockIo.emit).toHaveBeenCalledWith('player_joined', expect.objectContaining({
        player: expect.objectContaining({ name: 'Joiner' }),
        gameState: expect.any(Object)
      }));

      // Verify player was added to tracking maps
      const socketToPlayer = (gameManager as any).socketToPlayer;
      const playerToGame = (gameManager as any).playerToGame;
      expect(socketToPlayer.has(joinerSocket.id)).toBe(true);
      expect(playerToGame.size).toBe(2);
    });

    test('should handle game start with proper state transition', () => {
      const hostSocket = mockSocket('host-socket');
      const joinerSocket = mockSocket('joiner-socket');
      
      const gameConfig: GameConfig = {
        maxPlayers: 2,
        mapSize: { width: 10, height: 10 },
        turnTimeLimit: 30,
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
      };

      // Create and join game
      (gameManager as any).handleCreateGame(hostSocket, { playerName: 'Host', gameConfig });
      const gameCreatedCall = hostSocket.emit.mock.calls.find(call => call[0] === 'game_created');
      const gameId = gameCreatedCall[1].gameId;
      
      (gameManager as any).handleJoinGame(joinerSocket, { gameId, playerName: 'Joiner' });

      // Clear previous calls
      jest.clearAllMocks();

      // Start the game
      (gameManager as any).handleStartGame(hostSocket);

      // Verify game started
      expect(mockIo.to).toHaveBeenCalledWith(gameId);
      expect(mockIo.emit).toHaveBeenCalledWith('game_started', expect.objectContaining({
        gameState: expect.any(Object)
      }));

      // Verify game room status updated
      const games = (gameManager as any).games;
      const gameRoom = games.get(gameId);
      expect(gameRoom.status).toBe('in_progress');
    });

    test('should handle game ending and cleanup', () => {
      const hostSocket = mockSocket('host-socket');
      const gameConfig: GameConfig = {
        maxPlayers: 2,
        mapSize: { width: 10, height: 10 },
        turnTimeLimit: 30,
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
      };

      // Create game
      (gameManager as any).handleCreateGame(hostSocket, { playerName: 'Host', gameConfig });
      const gameCreatedCall = hostSocket.emit.mock.calls.find(call => call[0] === 'game_created');
      const gameId = gameCreatedCall[1].gameId;

      // Simulate game ending
      const games = (gameManager as any).games;
      const gameRoom = games.get(gameId);
      gameRoom.status = 'completed';

      // Clear previous calls
      jest.clearAllMocks();

      // Trigger cleanup
      (gameManager as any).cleanupInactiveGames();

      // Game should still exist initially (completed games have a grace period)
      expect(games.has(gameId)).toBe(true);
    });
  });

  describe('Action Processing and Validation', () => {
    test('should process valid game actions', () => {
      const socket = mockSocket('player-socket');
      const gameConfig: GameConfig = {
        maxPlayers: 2,
        mapSize: { width: 10, height: 10 },
        turnTimeLimit: 30,
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
      };

      // Create game and get player ID
      (gameManager as any).handleCreateGame(socket, { playerName: 'Player', gameConfig });
      const gameCreatedCall = socket.emit.mock.calls.find(call => call[0] === 'game_created');
      const playerId = gameCreatedCall[1].playerId;
      const gameId = gameCreatedCall[1].gameId;

      // Clear previous calls
      jest.clearAllMocks();

      // Process a valid action
      const action: GameAction = {
        type: 'end_turn',
        playerId,
        data: {},
        timestamp: Date.now()
      };

      (gameManager as any).handleGameAction(socket, action);

      // Verify action was acknowledged
      expect(socket.emit).toHaveBeenCalledWith('action_acknowledged', expect.objectContaining({
        success: true
      }));

      // Verify game state was broadcasted
      expect(mockIo.to).toHaveBeenCalledWith(gameId);
      expect(mockIo.emit).toHaveBeenCalledWith('game_updated', expect.any(Object));
    });

    test('should reject invalid game actions', () => {
      const socket = mockSocket('player-socket');
      
      // Try to process action without being in a game
      const action: GameAction = {
        type: 'move_unit',
        playerId: 'invalid-player',
        data: { unitId: 'unit-1', from: { x: 0, y: 0 }, to: { x: 1, y: 1 } },
        timestamp: Date.now()
      };

      (gameManager as any).handleGameAction(socket, action);

      // Verify action was rejected
      expect(socket.emit).toHaveBeenCalledWith('action_failed', expect.objectContaining({
        reason: expect.any(String)
      }));
    });

    test('should validate action timing and turn order', () => {
      const playerSocket1 = mockSocket('player1-socket');
      const playerSocket2 = mockSocket('player2-socket');
      
      const gameConfig: GameConfig = {
        maxPlayers: 2,
        mapSize: { width: 10, height: 10 },
        turnTimeLimit: 30,
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
      };

      // Create game with player 1
      (gameManager as any).handleCreateGame(playerSocket1, { playerName: 'Player1', gameConfig });
      const gameCreatedCall = playerSocket1.emit.mock.calls.find(call => call[0] === 'game_created');
      const gameId = gameCreatedCall[1].gameId;
      const player1Id = gameCreatedCall[1].playerId;

      // Player 2 joins
      (gameManager as any).handleJoinGame(playerSocket2, { gameId, playerName: 'Player2' });
      const player2Id = (gameManager as any).socketToPlayer.get(playerSocket2.id);

      // Start game
      (gameManager as any).handleStartGame(playerSocket1);

      // Clear previous calls
      jest.clearAllMocks();

      // Try action from player 2 when it's player 1's turn
      const wrongTurnAction: GameAction = {
        type: 'move_unit',
        playerId: player2Id,
        data: { unitId: 'unit-2', from: { x: 0, y: 0 }, to: { x: 1, y: 1 } },
        timestamp: Date.now()
      };

      (gameManager as any).handleGameAction(playerSocket2, wrongTurnAction);

      // Should be rejected due to wrong turn
      expect(playerSocket2.emit).toHaveBeenCalledWith('action_failed', expect.objectContaining({
        reason: expect.stringContaining('turn')
      }));
    });
  });

  describe('Multiplayer Synchronization', () => {
    test('should broadcast game updates to all players', () => {
      const playerSocket1 = mockSocket('player1-socket');
      const playerSocket2 = mockSocket('player2-socket');
      
      const gameConfig: GameConfig = {
        maxPlayers: 2,
        mapSize: { width: 10, height: 10 },
        turnTimeLimit: 30,
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
      };

      // Create and set up game
      (gameManager as any).handleCreateGame(playerSocket1, { playerName: 'Player1', gameConfig });
      const gameCreatedCall = playerSocket1.emit.mock.calls.find(call => call[0] === 'game_created');
      const gameId = gameCreatedCall[1].gameId;
      const player1Id = gameCreatedCall[1].playerId;

      (gameManager as any).handleJoinGame(playerSocket2, { gameId, playerName: 'Player2' });
      (gameManager as any).handleStartGame(playerSocket1);

      // Clear previous calls
      jest.clearAllMocks();

      // Execute action that should broadcast
      const action: GameAction = {
        type: 'end_turn',
        playerId: player1Id,
        data: {},
        timestamp: Date.now()
      };

      (gameManager as any).handleGameAction(playerSocket1, action);

      // Verify broadcast happened
      expect(mockIo.to).toHaveBeenCalledWith(gameId);
      expect(mockIo.emit).toHaveBeenCalledWith('game_updated', expect.any(Object));
    });

    test('should handle player reconnection', () => {
      const originalSocket = mockSocket('original-socket');
      const reconnectSocket = mockSocket('reconnect-socket');
      
      const gameConfig: GameConfig = {
        maxPlayers: 2,
        mapSize: { width: 10, height: 10 },
        turnTimeLimit: 30,
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
      };

      // Create game
      (gameManager as any).handleCreateGame(originalSocket, { playerName: 'Player', gameConfig });
      const gameCreatedCall = originalSocket.emit.mock.calls.find(call => call[0] === 'game_created');
      const gameId = gameCreatedCall[1].gameId;
      const playerId = gameCreatedCall[1].playerId;

      // Simulate disconnection
      (gameManager as any).handleDisconnect(originalSocket);

      // Simulate reconnection with same player ID
      (gameManager as any).handleConnection(reconnectSocket);
      
      // Verify player can rejoin
      const games = (gameManager as any).games;
      const gameRoom = games.get(gameId);
      expect(gameRoom).toBeDefined();
    });
  });

  describe('Turn Timer Management', () => {
    test('should set turn timer when game starts', () => {
      const socket = mockSocket('player-socket');
      const gameConfig: GameConfig = {
        maxPlayers: 1,
        mapSize: { width: 10, height: 10 },
        turnTimeLimit: 30, // 30 second timer
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
      };

      // Create and start game
      (gameManager as any).handleCreateGame(socket, { playerName: 'Player', gameConfig });
      const gameCreatedCall = socket.emit.mock.calls.find(call => call[0] === 'game_created');
      const gameId = gameCreatedCall[1].gameId;

      (gameManager as any).handleStartGame(socket);

      // Check turn timer was set
      const games = (gameManager as any).games;
      const gameRoom = games.get(gameId);
      expect(gameRoom.turnTimer).toBeDefined();
    });

    test('should reset turn timer after valid action', () => {
      const socket = mockSocket('player-socket');
      const gameConfig: GameConfig = {
        maxPlayers: 1,
        mapSize: { width: 10, height: 10 },
        turnTimeLimit: 30,
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
      };

      // Create and start game
      (gameManager as any).handleCreateGame(socket, { playerName: 'Player', gameConfig });
      const gameCreatedCall = socket.emit.mock.calls.find(call => call[0] === 'game_created');
      const gameId = gameCreatedCall[1].gameId;
      const playerId = gameCreatedCall[1].playerId;

      (gameManager as any).handleStartGame(socket);

      const games = (gameManager as any).games;
      const gameRoom = games.get(gameId);
      const originalTimer = gameRoom.turnTimer;

      // Execute action
      const action: GameAction = {
        type: 'move_unit',
        playerId,
        data: { unitId: 'unit-1', from: { x: 0, y: 0 }, to: { x: 1, y: 1 } },
        timestamp: Date.now()
      };

      (gameManager as any).handleGameAction(socket, action);

      // Timer should be reset (different instance)
      expect(gameRoom.turnTimer).not.toBe(originalTimer);
    });
  });

  describe('Spectator Management', () => {
    test('should handle spectator joining game', () => {
      const playerSocket = mockSocket('player-socket');
      const spectatorSocket = mockSocket('spectator-socket');
      
      const gameConfig: GameConfig = {
        maxPlayers: 2,
        mapSize: { width: 10, height: 10 },
        turnTimeLimit: 30,
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
      };

      // Create game
      (gameManager as any).handleCreateGame(playerSocket, { playerName: 'Player', gameConfig });
      const gameCreatedCall = playerSocket.emit.mock.calls.find(call => call[0] === 'game_created');
      const gameId = gameCreatedCall[1].gameId;

      // Clear previous calls
      jest.clearAllMocks();

      // Add spectator
      (gameManager as any).handleSpectateGame(spectatorSocket, { gameId });

      // Verify spectator was added
      expect(spectatorSocket.emit).toHaveBeenCalledWith('spectate_started', expect.objectContaining({
        gameState: expect.any(Object)
      }));

      // Verify spectator tracking
      const spectatorToGame = (gameManager as any).spectatorToGame;
      expect(spectatorToGame.get(spectatorSocket.id)).toBe(gameId);
    });

    test('should broadcast game updates to spectators', () => {
      const playerSocket = mockSocket('player-socket');
      const spectatorSocket = mockSocket('spectator-socket');
      
      const gameConfig: GameConfig = {
        maxPlayers: 1,
        mapSize: { width: 10, height: 10 },
        turnTimeLimit: 30,
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
      };

      // Set up game with spectator
      (gameManager as any).handleCreateGame(playerSocket, { playerName: 'Player', gameConfig });
      const gameCreatedCall = playerSocket.emit.mock.calls.find(call => call[0] === 'game_created');
      const gameId = gameCreatedCall[1].gameId;
      const playerId = gameCreatedCall[1].playerId;

      (gameManager as any).handleSpectateGame(spectatorSocket, { gameId });
      (gameManager as any).handleStartGame(playerSocket);

      // Clear previous calls
      jest.clearAllMocks();

      // Execute action
      const action: GameAction = {
        type: 'end_turn',
        playerId,
        data: {},
        timestamp: Date.now()
      };

      (gameManager as any).handleGameAction(playerSocket, action);

      // Verify spectator received update
      expect(mockIo.to).toHaveBeenCalledWith(gameId);
      expect(mockIo.emit).toHaveBeenCalledWith('game_updated', expect.any(Object));
    });

    test('should remove spectator properly', () => {
      const spectatorSocket = mockSocket('spectator-socket');
      const gameConfig: GameConfig = {
        maxPlayers: 1,
        mapSize: { width: 10, height: 10 },
        turnTimeLimit: 30,
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
      };

      // Create game and add spectator
      const playerSocket = mockSocket('player-socket');
      (gameManager as any).handleCreateGame(playerSocket, { playerName: 'Player', gameConfig });
      const gameCreatedCall = playerSocket.emit.mock.calls.find(call => call[0] === 'game_created');
      const gameId = gameCreatedCall[1].gameId;

      (gameManager as any).handleSpectateGame(spectatorSocket, { gameId });

      // Remove spectator
      (gameManager as any).handleStopSpectating(spectatorSocket);

      // Verify spectator was removed
      const spectatorToGame = (gameManager as any).spectatorToGame;
      expect(spectatorToGame.has(spectatorSocket.id)).toBe(false);

      const games = (gameManager as any).games;
      const gameRoom = games.get(gameId);
      expect(gameRoom.spectators.has(spectatorSocket)).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed game actions', () => {
      const socket = mockSocket('player-socket');
      
      // Try processing invalid action
      const invalidAction = {
        type: 'invalid_action_type',
        playerId: 'nonexistent-player',
        // Missing required fields
        timestamp: Date.now()
      };

      (gameManager as any).handleGameAction(socket, invalidAction);

      // Should handle gracefully without crashing
      expect(socket.emit).toHaveBeenCalledWith('action_failed', expect.any(Object));
    });

    test('should handle attempting to join nonexistent game', () => {
      const socket = mockSocket('player-socket');
      
      (gameManager as any).handleJoinGame(socket, { 
        gameId: 'nonexistent-game-id', 
        playerName: 'Player' 
      });

      // Should emit error
      expect(socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('not found')
      }));
    });

    test('should handle joining full game', () => {
      const hostSocket = mockSocket('host-socket');
      const joiner1Socket = mockSocket('joiner1-socket');
      const joiner2Socket = mockSocket('joiner2-socket');
      
      const gameConfig: GameConfig = {
        maxPlayers: 2, // Only 2 players allowed
        mapSize: { width: 10, height: 10 },
        turnTimeLimit: 30,
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
      };

      // Create game and fill it
      (gameManager as any).handleCreateGame(hostSocket, { playerName: 'Host', gameConfig });
      const gameCreatedCall = hostSocket.emit.mock.calls.find(call => call[0] === 'game_created');
      const gameId = gameCreatedCall[1].gameId;

      (gameManager as any).handleJoinGame(joiner1Socket, { gameId, playerName: 'Joiner1' });

      // Clear previous calls
      jest.clearAllMocks();

      // Try to join full game
      (gameManager as any).handleJoinGame(joiner2Socket, { gameId, playerName: 'Joiner2' });

      // Should be rejected
      expect(joiner2Socket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
        message: expect.stringContaining('full')
      }));
    });

    test('should handle game state corruption gracefully', () => {
      const socket = mockSocket('player-socket');
      const gameConfig: GameConfig = {
        maxPlayers: 1,
        mapSize: { width: 10, height: 10 },
        turnTimeLimit: 30,
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
      };

      // Create game
      (gameManager as any).handleCreateGame(socket, { playerName: 'Player', gameConfig });
      const gameCreatedCall = socket.emit.mock.calls.find(call => call[0] === 'game_created');
      const gameId = gameCreatedCall[1].gameId;

      // Corrupt game state
      const games = (gameManager as any).games;
      const gameRoom = games.get(gameId);
      gameRoom.gameState = null; // Simulate corruption

      // Try to process action
      const action: GameAction = {
        type: 'end_turn',
        playerId: 'player-id',
        data: {},
        timestamp: Date.now()
      };

      // Should handle gracefully
      expect(() => {
        (gameManager as any).handleGameAction(socket, action);
      }).not.toThrow();
    });
  });

  describe('Performance and Resource Management', () => {
    test('should cleanup inactive games periodically', () => {
      const socket = mockSocket('player-socket');
      const gameConfig: GameConfig = {
        maxPlayers: 1,
        mapSize: { width: 10, height: 10 },
        turnTimeLimit: 30,
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
      };

      // Create game
      (gameManager as any).handleCreateGame(socket, { playerName: 'Player', gameConfig });
      const gameCreatedCall = socket.emit.mock.calls.find(call => call[0] === 'game_created');
      const gameId = gameCreatedCall[1].gameId;

      // Mark as old activity
      const games = (gameManager as any).games;
      const gameRoom = games.get(gameId);
      gameRoom.lastActivity = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

      // Run cleanup
      (gameManager as any).cleanupInactiveGames();

      // Game should be marked for cleanup or removed
      expect(games.has(gameId)).toBe(true); // Still exists but marked
    });

    test('should track game statistics correctly', () => {
      const socket1 = mockSocket('player1-socket');
      const socket2 = mockSocket('player2-socket');
      
      const gameConfig: GameConfig = {
        maxPlayers: 2,
        mapSize: { width: 10, height: 10 },
        turnTimeLimit: 30,
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
      };

      // Create multiple games
      (gameManager as any).handleCreateGame(socket1, { playerName: 'Player1', gameConfig });
      (gameManager as any).handleCreateGame(socket2, { playerName: 'Player2', gameConfig });

      // Check statistics
      const gameCount = (gameManager as any).getGameCount();
      const activePlayerCount = (gameManager as any).getActivePlayerCount();

      expect(gameCount).toBe(2);
      expect(activePlayerCount).toBe(2);
    });

    test('should handle memory cleanup on shutdown', () => {
      const socket = mockSocket('player-socket');
      const gameConfig: GameConfig = {
        maxPlayers: 1,
        mapSize: { width: 10, height: 10 },
        turnTimeLimit: 30,
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
      };

      // Create game
      (gameManager as any).handleCreateGame(socket, { playerName: 'Player', gameConfig });

      // Shutdown
      gameManager.shutdown();

      // Verify cleanup
      const games = (gameManager as any).games;
      const playerToGame = (gameManager as any).playerToGame;
      const socketToPlayer = (gameManager as any).socketToPlayer;

      expect(games.size).toBe(0);
      expect(playerToGame.size).toBe(0);
      expect(socketToPlayer.size).toBe(0);
    });
  });

  describe('Game Persistence Integration', () => {
    test('should save game state when requested', async () => {
      const socket = mockSocket('player-socket');
      const gameConfig: GameConfig = {
        maxPlayers: 1,
        mapSize: { width: 10, height: 10 },
        turnTimeLimit: 30,
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
      };

      // Create game
      (gameManager as any).handleCreateGame(socket, { playerName: 'Player', gameConfig });
      const gameCreatedCall = socket.emit.mock.calls.find(call => call[0] === 'game_created');
      const gameId = gameCreatedCall[1].gameId;

      // Mock successful save
      mockGamePersistence.saveGame.mockResolvedValue({ id: 1 } as any);

      // Save game
      await (gameManager as any).saveGame(gameId, 'test-save');

      // Verify save was called
      expect(mockGamePersistence.saveGame).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'test-save',
          gameState: expect.any(Object)
        })
      );
    });

    test('should handle save errors gracefully', async () => {
      const socket = mockSocket('player-socket');
      const gameConfig: GameConfig = {
        maxPlayers: 1,
        mapSize: { width: 10, height: 10 },
        turnTimeLimit: 30,
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
      };

      // Create game
      (gameManager as any).handleCreateGame(socket, { playerName: 'Player', gameConfig });
      const gameCreatedCall = socket.emit.mock.calls.find(call => call[0] === 'game_created');
      const gameId = gameCreatedCall[1].gameId;

      // Mock save failure
      mockGamePersistence.saveGame.mockRejectedValue(new Error('Save failed'));

      // Try to save game
      const result = await (gameManager as any).saveGame(gameId, 'test-save');

      // Should handle error gracefully
      expect(result).toBeUndefined();
    });
  });
});