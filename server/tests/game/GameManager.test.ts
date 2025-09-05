import { GameManager, GameRoom } from '../../src/game/GameManager';
import { Server, Socket } from 'socket.io';
import { GameConfig, PlayerInfo, GameUtils, VictoryType, GameActionType } from '@civ-game/shared';
import { GamePhase } from '../../src/shared-types';
import { GameAction } from '@civ-game/shared/dist/types/GameTypes';
import { GameState } from '../../src/shared-types';
import { v4 as uuidv4 } from 'uuid';

// Mock Socket.IO
const mockSocket = {
  id: 'test-socket-id',
  emit: jest.fn(),
  join: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn()
} as jest.Mocked<Partial<Socket>>;

const mockIo = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn()
} as jest.Mocked<Partial<Server>>;

// Mock GameState
jest.mock('../../src/shared-types', () => ({
  GameState: jest.fn().mockImplementation((config: GameConfig) => ({
    id: uuidv4(),
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
    serialize: jest.fn().mockReturnValue({ phase: GamePhase.LOBBY })
  })),
  GamePhase: {
    LOBBY: 'lobby',
    ACTIVE: 'active',
    ENDED: 'ended'
  }
}));

// Mock GameEngine
jest.mock('../../src/game/GameEngine', () => ({
  GameEngine: jest.fn().mockImplementation(() => ({}))
}));

// Mock GameUtils
jest.mock('@civ-game/shared', () => ({
  ...jest.requireActual('@civ-game/shared'),
  GameUtils: {
    generatePlayerId: jest.fn(() => `player-${Date.now()}`),
    getCivilizationColors: jest.fn(() => ['red', 'blue', 'green', 'yellow']),
    getCivilizationNames: jest.fn(() => ['Rome', 'Egypt', 'Greece', 'China']),
    createDefaultResources: jest.fn(() => ({ gold: 100, science: 50, culture: 25 })),
    calculateScore: jest.fn(() => 100)
  },
  VictoryType: {
    DOMINATION: 'domination',
    SCIENCE: 'science',
    CULTURE: 'culture'
  },
  GameActionType: {
    END_TURN: 'end_turn',
    MOVE_UNIT: 'move_unit',
    BUILD_CITY: 'build_city'
  }
}));

// Mock config
jest.mock('../../src/config/config', () => ({
  config: {
    GAME_CLEANUP_INTERVAL: 60000
  }
}));

// Mock setInterval and clearInterval
const mockSetInterval = jest.fn();
const mockClearInterval = jest.fn();
global.setInterval = mockSetInterval;
global.clearInterval = mockClearInterval;

describe('GameManager', () => {
  let gameManager: GameManager;
  let mockGameState: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetInterval.mockClear();
    mockClearInterval.mockClear();
    gameManager = new GameManager(mockIo as Server);
    
    // Reset GameState mock
    mockGameState = {
      id: 'test-game-id',
      config: { maxPlayers: 4 },
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
      serialize: jest.fn().mockReturnValue({ phase: GamePhase.LOBBY })
    };
    
    (GameState as jest.Mock).mockImplementation(() => mockGameState);
  });

  afterEach(() => {
    if (gameManager) {
      gameManager.shutdown();
    }
  });

  describe('Constructor and Initialization', () => {
    test('should create GameManager instance', () => {
      expect(gameManager).toBeDefined();
      expect(gameManager).toBeInstanceOf(GameManager);
    });

    test('should initialize with empty game maps', () => {
      expect(gameManager.getGameCount()).toBe(0);
      expect(gameManager.getActivePlayerCount()).toBe(0);
    });

    test('should start cleanup interval on construction', () => {
      // Cleanup interval is started in constructor
      expect(mockSetInterval).toHaveBeenCalled();
    });
  });

  describe('Connection Handling', () => {
    test('should register socket event handlers on connection', () => {
      gameManager.handleConnection(mockSocket as Socket);
      
      expect(mockSocket.on).toHaveBeenCalledWith('create_game', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('join_game', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('leave_game', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('start_game', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('game_action', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('player_ready', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('request_game_state', expect.any(Function));
    });

    test('should handle disconnection properly', () => {
      const playerId = 'test-player-id';
      
      // Simulate player connection
      (gameManager as any).socketToPlayer.set(mockSocket.id, playerId);
      
      gameManager.handleDisconnection(mockSocket as Socket);
      
      expect((gameManager as any).socketToPlayer.has(mockSocket.id)).toBe(false);
    });
  });

  describe('Game Creation', () => {
    const validGameConfig: GameConfig = {
      maxPlayers: 4,
      mapSize: { width: 20, height: 20 },
      turnTimeLimit: 60,
      victoryConditions: [VictoryType.DOMINATION],
      startingResources: { gold: 100, science: 50, culture: 25 }
    };

    const validCreateGameData = {
      playerName: 'Test Player',
      gameConfig: validGameConfig
    };

    test('should create game successfully with valid data', () => {
      const handleCreateGame = (gameManager as any).handleCreateGame.bind(gameManager);
      
      handleCreateGame(mockSocket, validCreateGameData);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('game_created', expect.objectContaining({
        gameId: expect.any(String),
        playerId: expect.any(String),
        gameState: expect.any(Object)
      }));
      expect(mockSocket.join).toHaveBeenCalled();
      expect(gameManager.getGameCount()).toBe(1);
    });

    test('should reject invalid game configuration', () => {
      const invalidConfig = { ...validGameConfig, maxPlayers: 1 }; // Too few players
      const invalidData = { ...validCreateGameData, gameConfig: invalidConfig };
      
      const handleCreateGame = (gameManager as any).handleCreateGame.bind(gameManager);
      handleCreateGame(mockSocket, invalidData);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 
        expect.objectContaining({ message: 'Invalid game configuration' }));
    });

    test('should handle game creation errors gracefully', () => {
      // Mock GameState constructor to throw
      (GameState as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      
      const handleCreateGame = (gameManager as any).handleCreateGame.bind(gameManager);
      handleCreateGame(mockSocket, validCreateGameData);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 
        expect.objectContaining({ message: 'Failed to create game' }));
    });
  });

  describe('Game Joining', () => {
    let gameId: string;
    
    beforeEach(() => {
      // Create a test game
      gameId = 'test-game-id';
      const gameRoom: GameRoom = {
        id: gameId,
        name: 'Test Game',
        gameState: mockGameState,
        game: {} as any,
        players: new Map(),
        maxPlayers: 4,
        status: 'waiting',
        gameMode: 'multiplayer',
        spectators: new Set(),
        lastActivity: new Date()
      };
      
      (gameManager as any).games.set(gameId, gameRoom);
    });

    test('should allow player to join existing game', () => {
      const joinData = { gameId, playerName: 'New Player' };
      
      const handleJoinGame = (gameManager as any).handleJoinGame.bind(gameManager);
      handleJoinGame(mockSocket, joinData);
      
      expect(mockGameState.addPlayer).toHaveBeenCalled();
      expect(mockSocket.join).toHaveBeenCalledWith(gameId);
      expect(mockIo.to).toHaveBeenCalledWith(gameId);
      expect(mockIo.emit).toHaveBeenCalledWith('player_joined', expect.any(Object));
    });

    test('should reject joining non-existent game', () => {
      const joinData = { gameId: 'non-existent', playerName: 'New Player' };
      
      const handleJoinGame = (gameManager as any).handleJoinGame.bind(gameManager);
      handleJoinGame(mockSocket, joinData);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 
        expect.objectContaining({ message: 'Game not found' }));
    });

    test('should reject joining game that already started', () => {
      mockGameState.phase = GamePhase.ACTIVE;
      const joinData = { gameId, playerName: 'New Player' };
      
      const handleJoinGame = (gameManager as any).handleJoinGame.bind(gameManager);
      handleJoinGame(mockSocket, joinData);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 
        expect.objectContaining({ message: 'Game already started' }));
    });

    test('should reject joining full game', () => {
      const gameRoom = (gameManager as any).games.get(gameId);
      gameRoom.players.set('player-1', {} as Socket);
      gameRoom.players.set('player-2', {} as Socket);
      gameRoom.players.set('player-3', {} as Socket);
      gameRoom.players.set('player-4', {} as Socket);
      
      const joinData = { gameId, playerName: 'New Player' };
      
      const handleJoinGame = (gameManager as any).handleJoinGame.bind(gameManager);
      handleJoinGame(mockSocket, joinData);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 
        expect.objectContaining({ message: 'Game is full' }));
    });
  });

  describe('Game Starting', () => {
    let gameId: string;
    let playerId: string;
    
    beforeEach(() => {
      gameId = 'test-game-id';
      playerId = 'player-1';
      
      const gameRoom: GameRoom = {
        id: gameId,
        name: 'Test Game',
        gameState: {
          ...mockGameState,
          players: [{ id: playerId, name: 'Test Player' }, { id: 'player-2', name: 'Player 2' }]
        },
        game: {} as any,
        players: new Map(),
        maxPlayers: 4,
        status: 'waiting',
        gameMode: 'multiplayer',
        spectators: new Set(),
        lastActivity: new Date()
      };
      
      (gameManager as any).games.set(gameId, gameRoom);
      (gameManager as any).playerToGame.set(playerId, gameId);
      (gameManager as any).socketToPlayer.set(mockSocket.id, playerId);
    });

    test('should start game successfully with valid conditions', () => {
      const handleStartGame = (gameManager as any).handleStartGame.bind(gameManager);
      handleStartGame(mockSocket);
      
      expect(mockGameState.startGame).toHaveBeenCalled();
      expect(mockIo.to).toHaveBeenCalledWith(gameId);
      expect(mockIo.emit).toHaveBeenCalledWith('game_started', expect.any(Object));
    });

    test('should reject start game from non-creator', () => {
      const nonCreatorId = 'player-2';
      (gameManager as any).socketToPlayer.set(mockSocket.id, nonCreatorId);
      (gameManager as any).playerToGame.set(nonCreatorId, gameId);
      
      const handleStartGame = (gameManager as any).handleStartGame.bind(gameManager);
      handleStartGame(mockSocket);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 
        expect.objectContaining({ message: 'Only game creator can start the game' }));
    });

    test('should reject start game with insufficient players', () => {
      const gameRoom = (gameManager as any).games.get(gameId);
      gameRoom.gameState.players = [{ id: playerId, name: 'Test Player' }]; // Only 1 player
      
      const handleStartGame = (gameManager as any).handleStartGame.bind(gameManager);
      handleStartGame(mockSocket);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 
        expect.objectContaining({ message: 'Need at least 2 players to start' }));
    });
  });

  describe('Turn Timer', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('starts a turn timer when scheduled', () => {
      const shortConfig = {
        maxPlayers: 2,
        mapSize: { width: 12, height: 12 },
        turnTimeLimit: 1, // seconds
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 100, science: 0, culture: 0 } as any
      };

      const handleCreateGame = (gameManager as any).handleCreateGame.bind(gameManager);
      handleCreateGame(mockSocket, { playerName: 'Host', gameConfig: shortConfig });

      const created = (mockSocket.emit as jest.Mock).mock.calls.find((c: any[]) => c[0] === 'game_created');
      const gameId = created[1].gameId as string;

      const room = (gameManager as any).games.get(gameId);
      // Directly schedule timer to avoid relying on mocked startGame
      (gameManager as any).startTurnTimer(gameId);
      expect(room.turnTimer).toBeDefined();
    });

    test('emits turn_timeout when timer expires and restarts timer', () => {
      const shortConfig = {
        maxPlayers: 2,
        mapSize: { width: 12, height: 12 },
        turnTimeLimit: 1,
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 100, science: 0, culture: 0 } as any
      };

      const handleCreateGame = (gameManager as any).handleCreateGame.bind(gameManager);
      handleCreateGame(mockSocket, { playerName: 'Host', gameConfig: shortConfig });
      const created = (mockSocket.emit as jest.Mock).mock.calls.find((c: any[]) => c[0] === 'game_created');
      const gameId = created[1].gameId as string;

      const joiner = { ...mockSocket, id: 'sock-joiner', emit: jest.fn(), join: jest.fn(), on: jest.fn() } as any;
      const handleJoinGame = (gameManager as any).handleJoinGame.bind(gameManager);
      handleJoinGame(joiner, { gameId, playerName: 'P2' });

      const spyStart = jest.spyOn(gameManager as any, 'startTurnTimer');
      const room = (gameManager as any).games.get(gameId);
      room.gameState.phase = GamePhase.ACTIVE;
      (gameManager as any).startTurnTimer(gameId);

      // Advance time to trigger timeout
      jest.advanceTimersByTime(1000);

      expect((mockIo.to as jest.Mock)).toHaveBeenCalledWith(gameId);
      expect((mockIo.emit as jest.Mock)).toHaveBeenCalledWith('turn_timeout', expect.any(Object));
      // Timer should be scheduled again for next turn
      expect(spyStart).toHaveBeenCalled();
    });

    test('non-END_TURN successful action resets timer', () => {
      const shortConfig = {
        maxPlayers: 2,
        mapSize: { width: 12, height: 12 },
        turnTimeLimit: 5,
        victoryConditions: [VictoryType.DOMINATION],
        startingResources: { gold: 100, science: 0, culture: 0 } as any
      };

      const handleCreateGame = (gameManager as any).handleCreateGame.bind(gameManager);
      handleCreateGame(mockSocket, { playerName: 'Host', gameConfig: shortConfig });
      const created = (mockSocket.emit as jest.Mock).mock.calls.find((c: any[]) => c[0] === 'game_created');
      const gameId = created[1].gameId as string;

      const joiner = { ...mockSocket, id: 'sock-joiner', emit: jest.fn(), join: jest.fn(), on: jest.fn() } as any;
      const handleJoinGame = (gameManager as any).handleJoinGame.bind(gameManager);
      handleJoinGame(joiner, { gameId, playerName: 'P2' });

      const room = (gameManager as any).games.get(gameId);
      room.gameState.phase = GamePhase.ACTIVE;
      (gameManager as any).startTurnTimer(gameId);

      const spyReset = jest.spyOn(gameManager as any, 'resetTurnTimer');

      // Fabricate a non-END_TURN action that "succeeds" under mocked GameState
      const playerId = 'player-1';
      (gameManager as any).socketToPlayer.set(mockSocket.id, playerId);
      (gameManager as any).playerToGame.set(playerId, gameId);
      const moveAction = { type: (GameActionType as any).MOVE_UNIT, playerId, data: { unitId: 'u1', from: { x: 0, y: 0 }, to: { x: 0, y: 1 } } } as any;

      (gameManager as any).handleGameAction(mockSocket as any, moveAction);

      expect(spyReset).toHaveBeenCalledWith(gameId);
    });
  });
  describe('Game Action Processing', () => {
    let gameId: string;
    let playerId: string;
    let gameAction: GameAction;
    
    beforeEach(() => {
      gameId = 'test-game-id';
      playerId = 'player-1';
      
      gameAction = {
        type: GameActionType.MOVE_UNIT,
        playerId,
        data: { unitId: 'unit-1', destination: { q: 1, r: 1 } },
        timestamp: Date.now(),
        actionId: uuidv4()
      };
      
      const gameRoom: GameRoom = {
        id: gameId,
        name: 'Test Game',
        gameState: {
          ...mockGameState,
          phase: GamePhase.ACTIVE
        },
        game: {} as any,
        players: new Map(),
        maxPlayers: 4,
        status: 'in_progress',
        gameMode: 'multiplayer',
        spectators: new Set(),
        lastActivity: new Date()
      };
      
      (gameManager as any).games.set(gameId, gameRoom);
      (gameManager as any).playerToGame.set(playerId, gameId);
      (gameManager as any).socketToPlayer.set(mockSocket.id, playerId);
    });

    test('should process valid game action successfully', () => {
      const handleGameAction = (gameManager as any).handleGameAction.bind(gameManager);
      handleGameAction(mockSocket, gameAction);
      
      expect(mockGameState.executeAction).toHaveBeenCalledWith(gameAction);
      expect(mockSocket.emit).toHaveBeenCalledWith('action_acknowledged', expect.any(Object));
      expect(mockIo.to).toHaveBeenCalledWith(gameId);
      expect(mockIo.emit).toHaveBeenCalledWith('game_updated', expect.any(Object));
    });

    test('should reject action from wrong player', () => {
      gameAction.playerId = 'different-player';
      
      const handleGameAction = (gameManager as any).handleGameAction.bind(gameManager);
      handleGameAction(mockSocket, gameAction);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 
        expect.objectContaining({ message: 'Invalid player ID in action' }));
    });

    test('should reject action when game is not active', () => {
      const gameRoom = (gameManager as any).games.get(gameId);
      gameRoom.gameState.phase = GamePhase.LOBBY;
      
      const handleGameAction = (gameManager as any).handleGameAction.bind(gameManager);
      handleGameAction(mockSocket, gameAction);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 
        expect.objectContaining({ message: 'Game is not active' }));
    });

    test('should reject action when it is not player\'s turn', () => {
      mockGameState.getCurrentPlayer.mockReturnValue({ id: 'different-player' });
      
      const handleGameAction = (gameManager as any).handleGameAction.bind(gameManager);
      handleGameAction(mockSocket, gameAction);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 
        expect.objectContaining({ message: 'Not your turn' }));
    });

    test('should handle failed action execution', () => {
      mockGameState.executeAction.mockReturnValue(false);
      
      const handleGameAction = (gameManager as any).handleGameAction.bind(gameManager);
      handleGameAction(mockSocket, gameAction);
      
      expect(mockSocket.emit).toHaveBeenCalledWith('action_failed', expect.any(Object));
    });
  });

  describe('Room Management', () => {
    test('should create room with valid options', async () => {
      const options = {
        name: 'Test Room',
        maxPlayers: 4,
        gameMode: 'multiplayer' as const,
        mapSize: { width: 20, height: 20 }
      };
      
      const room = await gameManager.createRoom(options);
      
      expect(room.name).toBe('Test Room');
      expect(room.maxPlayers).toBe(4);
      expect(room.gameMode).toBe('multiplayer');
      expect(room.status).toBe('waiting');
    });

    test('should get active rooms', async () => {
      const room1 = await gameManager.createRoom({
        name: 'Active Room',
        maxPlayers: 2,
        gameMode: 'multiplayer',
        mapSize: { width: 20, height: 20 }
      });
      
      room1.status = 'in_progress';
      
      const activeRooms = gameManager.getActiveRooms();
      expect(activeRooms).toHaveLength(1);
      expect(activeRooms[0].name).toBe('Active Room');
    });

    test('should get room by ID', async () => {
      const room = await gameManager.createRoom({
        name: 'Test Room',
        maxPlayers: 2,
        gameMode: 'multiplayer',
        mapSize: { width: 20, height: 20 }
      });
      
      const retrievedRoom = gameManager.getRoom(room.id);
      expect(retrievedRoom).toBeDefined();
      expect(retrievedRoom?.name).toBe('Test Room');
    });
  });

  describe('Cleanup and Maintenance', () => {
    test('should cleanup test games', () => {
      // Create test games
      const testGameId1 = 'test-game-1';
      const testGameId2 = 'performance-test-2';
      const regularGameId = 'regular-game';
      
      const createTestGameRoom = (id: string) => ({
        id,
        name: `Game ${id}`,
        gameState: mockGameState,
        game: {} as any,
        players: new Map(),
        maxPlayers: 4,
        status: 'waiting' as const,
        gameMode: 'multiplayer' as const,
        spectators: new Set(),
        lastActivity: new Date()
      });
      
      (gameManager as any).games.set(testGameId1, createTestGameRoom(testGameId1));
      (gameManager as any).games.set(testGameId2, createTestGameRoom(testGameId2));
      (gameManager as any).games.set(regularGameId, createTestGameRoom(regularGameId));
      
      const removedGames = gameManager.cleanupTestGames();
      
      expect(removedGames).toHaveLength(2);
      expect(removedGames).toContain(testGameId1);
      expect(removedGames).toContain(testGameId2);
      expect((gameManager as any).games.has(regularGameId)).toBe(true);
    });

    test('should cleanup old games', () => {
      const oldGameId = 'old-game';
      const newGameId = 'new-game';
      
      const oldGameRoom = {
        id: oldGameId,
        name: 'Old Game',
        gameState: { ...mockGameState, createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) }, // 25 hours ago
        game: {} as any,
        players: new Map(),
        maxPlayers: 4,
        status: 'waiting' as const,
        gameMode: 'multiplayer' as const,
        spectators: new Set(),
        lastActivity: new Date()
      };
      
      const newGameRoom = {
        id: newGameId,
        name: 'New Game',
        gameState: { ...mockGameState, createdAt: new Date() }, // Now
        game: {} as any,
        players: new Map(),
        maxPlayers: 4,
        status: 'waiting' as const,
        gameMode: 'multiplayer' as const,
        spectators: new Set(),
        lastActivity: new Date()
      };
      
      (gameManager as any).games.set(oldGameId, oldGameRoom);
      (gameManager as any).games.set(newGameId, newGameRoom);
      
      const removedGames = gameManager.cleanupOldGames(24); // Remove games older than 24 hours
      
      expect(removedGames).toHaveLength(1);
      expect(removedGames).toContain(oldGameId);
      expect((gameManager as any).games.has(newGameId)).toBe(true);
    });

    test('should shutdown properly', () => {
      gameManager.shutdown();
      
      expect(gameManager.getGameCount()).toBe(0);
      expect(gameManager.getActivePlayerCount()).toBe(0);
    });
  });

  describe('Statistics and Queries', () => {
    beforeEach(() => {
      // Create test games with different phases
      const createGameRoom = (id: string, phase: GamePhase, playerCount: number) => ({
        id,
        name: `Game ${id}`,
        gameState: { 
          ...mockGameState, 
          id,
          phase,
          createdAt: new Date()
        },
        game: {} as any,
        players: new Map(Array.from({ length: playerCount }, (_, i) => [`player-${i}`, {} as Socket])),
        maxPlayers: 4,
        status: 'waiting' as const,
        gameMode: 'multiplayer' as const,
        spectators: new Set(),
        lastActivity: new Date()
      });
      
      (gameManager as any).games.set('game-1', createGameRoom('game-1', GamePhase.LOBBY, 2));
      (gameManager as any).games.set('game-2', createGameRoom('game-2', GamePhase.ACTIVE, 3));
      (gameManager as any).games.set('test-game-3', createGameRoom('test-game-3', GamePhase.ENDED, 1));
    });

    test('should get filtered game list with pagination', () => {
      const result = gameManager.getFilteredGameList({
        page: 1,
        limit: 2,
        filter: 'all',
        hideTestGames: false
      });
      
      expect(result.games).toHaveLength(2);
      expect(result.totalGames).toBe(3);
      expect(result.hasMore).toBe(true);
    });

    test('should filter out test games when requested', () => {
      const result = gameManager.getFilteredGameList({
        hideTestGames: true
      });
      
      expect(result.games).toHaveLength(2);
      expect(result.games.every(game => !game.id.includes('test'))).toBe(true);
    });

    test('should filter by game status', () => {
      const activeGames = gameManager.getFilteredGameList({
        filter: 'active'
      });
      
      expect(activeGames.games).toHaveLength(1);
      expect(activeGames.games[0].id).toBe('game-2');
    });

    test('should get game state by ID', () => {
      const gameState = gameManager.getGameState('game-1');
      expect(gameState).toBeDefined();
      expect(gameState?.id).toBe('game-1');
    });
  });

  describe('Lobby Events', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Prepare some games in different phases
      const makeRoom = (id: string, phase: GamePhase, players: number) => ({
        id,
        name: `Room ${id}`,
        gameState: { ...mockGameState, id, phase, createdAt: new Date() },
        game: {} as any,
        players: new Map(Array.from({ length: players }, (_, i) => [`p-${i}`, {} as Socket])),
        maxPlayers: 8,
        status: 'waiting' as const,
        gameMode: 'multiplayer' as const,
        spectators: new Set(),
        lastActivity: new Date()
      });
      (gameManager as any).games.set('lobby-1', makeRoom('lobby-1', GamePhase.LOBBY, 1));
      (gameManager as any).games.set('active-1', makeRoom('active-1', GamePhase.ACTIVE, 2));
    });

    test('should register lobby event handlers', () => {
      gameManager.handleConnection(mockSocket as Socket);
      expect(mockSocket.on).toHaveBeenCalledWith('list_games', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('lobby_stats', expect.any(Function));
    });

    test('list_games should emit paginated game list', () => {
      gameManager.handleConnection(mockSocket as Socket);
      const listGamesHandler = (mockSocket.on as jest.Mock).mock.calls.find((c: any[]) => c[0] === 'list_games')[1];
      listGamesHandler({ limit: 5, page: 1, filter: 'all' });

      expect(mockSocket.emit).toHaveBeenCalledWith('games_list', expect.objectContaining({
        games: expect.any(Array),
        totalGames: expect.any(Number),
        hasMore: expect.any(Boolean)
      }));
    });

    test('lobby_stats should emit counts', () => {
      gameManager.handleConnection(mockSocket as Socket);
      const lobbyStatsHandler = (mockSocket.on as jest.Mock).mock.calls.find((c: any[]) => c[0] === 'lobby_stats')[1];
      lobbyStatsHandler();
      expect(mockSocket.emit).toHaveBeenCalledWith('lobby_stats', expect.objectContaining({
        activeGames: expect.any(Number),
        activePlayers: expect.any(Number)
      }));
    });
  });
});
