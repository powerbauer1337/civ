import { GameManagerAI, GameRoom, CreateGameOptions } from '../../src/game/GameManagerAI';
import { Server as SocketIOServer } from 'socket.io';
import { GameState, GamePhase } from '../../src/shared-types';
import { GameEngine } from '../../src/game/GameEngine';
import { HexMap } from '../../src/game/HexMap';
import { AIPlayer, AIPersonality, AIDifficulty } from '../../src/game/AIPlayer';
import {
  GameConfig,
  PlayerInfo,
  GameAction,
  GameActionType,
  UnitType,
  VictoryType,
  GameUtils
} from '@civ-game/shared';

// Mock dependencies
jest.mock('socket.io');
jest.mock('../../src/game/GameEngine');
jest.mock('../../src/game/HexMap');
jest.mock('../../src/game/AIPlayer');
jest.mock('../../src/shared-types');
jest.mock('../../src/config/config', () => ({
  config: {
    GAME_CLEANUP_INTERVAL: 300000,
    AI_TURN_DELAY: 1000
  }
}));

// Mock GameUtils
jest.mock('@civ-game/shared', () => ({
  ...jest.requireActual('@civ-game/shared'),
  GameUtils: {
    createDefaultResources: jest.fn().mockReturnValue({
      gold: 50,
      production: 10,
      food: 20,
      science: 5,
      culture: 2
    }),
    getCivilizationColors: jest.fn().mockReturnValue([
      'blue', 'red', 'green', 'yellow', 'purple', 'orange'
    ]),
    getCivilizationNames: jest.fn().mockReturnValue([
      'Romans', 'Greeks', 'Egyptians', 'Babylonians', 'Chinese', 'Aztecs'
    ])
  }
}));

// Mock Socket interface
const createMockSocket = (id: string) => ({
  id,
  join: jest.fn(),
  leave: jest.fn(),
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
  on: jest.fn()
});

// Mock Socket.IO Server
const createMockServer = () => ({
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
  sockets: { sockets: new Map() }
});

// Mock GameState
const createMockGameState = (config?: Partial<GameState>) => ({
  id: 'game-123',
  players: [],
  currentPlayer: 0,
  currentTurn: 1,
  phase: GamePhase.LOBBY,
  board: [],
  config: {
    maxPlayers: 4,
    mapSize: { width: 20, height: 20 },
    victoryConditions: [VictoryType.DOMINATION],
    turnTimeLimit: 0,
    startingResources: GameUtils.createDefaultResources()
  },
  addPlayer: jest.fn(),
  getCurrentPlayer: jest.fn().mockReturnValue({ id: 'player-123', name: 'Test' }),
  ...config
});

// Mock GameEngine
const createMockGameEngine = () => ({
  processAction: jest.fn().mockReturnValue({ success: true }),
  endTurn: jest.fn(),
  checkVictoryConditions: jest.fn().mockReturnValue({ gameOver: false })
});

// Mock HexMap
const createMockHexMap = () => ({
  tiles: Array(20).fill(null).map(() => Array(20).fill(null).map(() => ({
    terrain: 'grassland',
    unit: null,
    city: null,
    resource: null
  })))
});

// Mock AIPlayer
const createMockAIPlayer = () => ({
  makeDecisions: jest.fn().mockReturnValue([
    {
      type: GameActionType.END_TURN,
      playerId: 'ai-player-1',
      data: {}
    }
  ]),
  updateVision: jest.fn(),
  setGameState: jest.fn(),
  getPersonality: jest.fn().mockReturnValue(AIPersonality.Balanced),
  getDifficulty: jest.fn().mockReturnValue(AIDifficulty.Normal)
});

describe('GameManagerAI', () => {
  let gameManager: GameManagerAI;
  let mockServer: any;
  let mockSocket: any;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock setInterval and clearInterval
    jest.spyOn(global, 'setInterval');
    jest.spyOn(global, 'clearInterval');
    jest.spyOn(global, 'setTimeout');
    jest.spyOn(global, 'clearTimeout');
    
    mockServer = createMockServer();
    mockSocket = createMockSocket('socket-123');
    
    // Mock constructors
    (GameState as jest.MockedClass<typeof GameState>).mockImplementation(
      (config) => createMockGameState() as any
    );
    (GameEngine as jest.MockedClass<typeof GameEngine>).mockImplementation(
      () => createMockGameEngine() as any
    );
    (HexMap as jest.MockedClass<typeof HexMap>).mockImplementation(
      () => createMockHexMap() as any
    );
    (AIPlayer as jest.MockedClass<typeof AIPlayer>).mockImplementation(
      () => createMockAIPlayer() as any
    );

    gameManager = new GameManagerAI(mockServer);
    
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    if (gameManager) {
      gameManager.shutdown();
    }
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with proper dependencies', () => {
      expect(gameManager).toBeDefined();
      expect(gameManager['io']).toBe(mockServer);
      expect(gameManager['games']).toBeDefined();
      expect(gameManager['playerToGame']).toBeDefined();
      expect(gameManager['socketToPlayer']).toBeDefined();
      expect(gameManager['cleanupInterval']).toBeDefined();
    });

    it('should set up cleanup interval', () => {
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 300000);
    });
  });

  describe('Socket Connection Handling', () => {
    it('should handle socket connection and register event handlers', () => {
      gameManager.handleConnection(mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith('create_game', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('join_game', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('leave_game', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('start_game', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('game_action', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('player_ready', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('request_game_state', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('create_single_player', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('set_ai_difficulty', expect.any(Function));
    });

    it('should handle socket disconnection', () => {
      // First simulate connection
      gameManager['socketToPlayer'].set(mockSocket.id, 'player-123');
      
      gameManager.handleDisconnection(mockSocket);

      expect(gameManager['socketToPlayer'].has(mockSocket.id)).toBe(false);
    });

    it('should handle disconnection of unknown socket', () => {
      gameManager.handleDisconnection(mockSocket);
      // Should not throw error and should complete silently
      expect(() => gameManager.handleDisconnection(mockSocket)).not.toThrow();
    });
  });

  describe('Single Player Game Creation', () => {
    const singlePlayerData = {
      playerName: 'TestPlayer',
      aiOpponents: 2,
      aiDifficulty: AIDifficulty.Normal,
      mapSize: 'medium' as const
    };

    it('should create single player game with AI opponents', () => {
      gameManager['handleCreateSinglePlayer'](mockSocket, singlePlayerData);

      expect(GameState).toHaveBeenCalled();
      expect(GameEngine).toHaveBeenCalled();
      expect(HexMap).toHaveBeenCalledWith(20, 20);
      expect(AIPlayer).toHaveBeenCalledTimes(2);
      expect(mockSocket.join).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('game_created', expect.objectContaining({
        gameId: expect.any(String),
        playerId: expect.any(String),
        singlePlayer: true,
        aiPlayers: expect.any(Array)
      }));
      
      // Verify game was added to manager
      expect(gameManager.getGameCount()).toBe(1);
    });

    it('should create different map sizes', () => {
      gameManager['handleCreateSinglePlayer'](mockSocket, {
        ...singlePlayerData,
        mapSize: 'small'
      });

      expect(HexMap).toHaveBeenCalledWith(15, 15);
    });

    it('should create large map', () => {
      gameManager['handleCreateSinglePlayer'](mockSocket, {
        ...singlePlayerData,
        mapSize: 'large'
      });

      expect(HexMap).toHaveBeenCalledWith(30, 30);
    });

    it('should create AI players with different personalities', () => {
      gameManager['handleCreateSinglePlayer'](mockSocket, {
        ...singlePlayerData,
        aiOpponents: 5
      });

      expect(AIPlayer).toHaveBeenCalledTimes(5);
      // Verify different personalities were used
      const aiPlayerCalls = (AIPlayer as jest.MockedClass<typeof AIPlayer>).mock.calls;
      const personalities = aiPlayerCalls.map(call => call[1]);
      expect(new Set(personalities).size).toBeGreaterThan(1);
    });

    it('should handle single player game creation errors', () => {
      (GameState as jest.MockedClass<typeof GameState>).mockImplementationOnce(() => {
        throw new Error('GameState creation failed');
      });

      gameManager['handleCreateSinglePlayer'](mockSocket, singlePlayerData);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to create single player game'
      });
    });
  });

  describe('AI Starting Resources', () => {
    it('should give reduced resources for Easy difficulty', () => {
      const resources = gameManager['getAIStartingResources'](AIDifficulty.Easy);
      const baseResources = GameUtils.createDefaultResources();
      
      expect(resources.gold).toBe(baseResources.gold * 0.8);
      expect(resources.production).toBe(baseResources.production * 0.8);
    });

    it('should give bonus resources for Hard difficulty', () => {
      const resources = gameManager['getAIStartingResources'](AIDifficulty.Hard);
      const baseResources = GameUtils.createDefaultResources();
      
      expect(resources.gold).toBe(baseResources.gold * 1.2);
      expect(resources.production).toBe(baseResources.production * 1.2);
      expect(resources.science).toBe(baseResources.science * 1.2);
    });

    it('should give maximum bonus resources for Insane difficulty', () => {
      const resources = gameManager['getAIStartingResources'](AIDifficulty.Insane);
      const baseResources = GameUtils.createDefaultResources();
      
      expect(resources.gold).toBe(baseResources.gold * 1.5);
      expect(resources.production).toBe(baseResources.production * 1.5);
      expect(resources.science).toBe(baseResources.science * 1.5);
      expect(resources.food).toBe(baseResources.food * 1.5);
    });

    it('should return default resources for Normal difficulty', () => {
      const resources = gameManager['getAIStartingResources'](AIDifficulty.Normal);
      const baseResources = GameUtils.createDefaultResources();
      
      expect(resources).toEqual(baseResources);
    });
  });

  describe('Game Action Processing', () => {
    let gameId: string;

    beforeEach(() => {
      // Set up a game
      gameManager['handleCreateSinglePlayer'](mockSocket, {
        playerName: 'TestPlayer',
        aiOpponents: 1,
        aiDifficulty: AIDifficulty.Normal
      });

      // Get the created game ID
      const games = Array.from(gameManager['games'].keys());
      gameId = games[0];

      // Set up player mapping
      gameManager['socketToPlayer'].set(mockSocket.id, 'player-123');
      gameManager['playerToGame'].set('player-123', gameId);

      // Mock current player
      const gameRoom = gameManager['games'].get(gameId);
      if (gameRoom) {
        gameRoom.gameState.getCurrentPlayer = jest.fn().mockReturnValue({ id: 'player-123' });
      }
    });

    it('should process valid game actions', async () => {
      const action: GameAction = {
        type: GameActionType.MOVE_UNIT,
        playerId: 'player-123',
        data: { unitId: 'unit-1', to: { x: 1, y: 1 } }
      };

      await gameManager['handleGameAction'](mockSocket, action);

      expect(mockServer.to).toHaveBeenCalledWith(gameId);
      expect(mockServer.emit).toHaveBeenCalledWith('game_state_updated', expect.any(Object));
    });

    it('should reject actions from unknown players', async () => {
      gameManager['socketToPlayer'].delete(mockSocket.id);

      const action: GameAction = {
        type: GameActionType.MOVE_UNIT,
        playerId: 'player-123',
        data: {}
      };

      await gameManager['handleGameAction'](mockSocket, action);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Player not found'
      });
    });

    it('should reject actions when not player turn', async () => {
      const gameRoom = gameManager['games'].get(gameId);
      if (gameRoom) {
        gameRoom.gameState.getCurrentPlayer = jest.fn().mockReturnValue({ id: 'other-player' });
      }

      const action: GameAction = {
        type: GameActionType.MOVE_UNIT,
        playerId: 'player-123',
        data: {}
      };

      await gameManager['handleGameAction'](mockSocket, action);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Not your turn'
      });
    });

    it('should process end turn actions and advance to next player', async () => {
      const action: GameAction = {
        type: GameActionType.END_TURN,
        playerId: 'player-123',
        data: {}
      };

      const processNextTurnSpy = jest.spyOn(gameManager as any, 'processNextTurn');
      processNextTurnSpy.mockImplementation(() => {});

      await gameManager['handleGameAction'](mockSocket, action);

      expect(processNextTurnSpy).toHaveBeenCalled();
    });
  });

  describe('AI Turn Processing', () => {
    let gameRoom: GameRoom;
    let gameId: string;

    beforeEach(() => {
      gameId = 'test-game-id';
      const mockAI = createMockAIPlayer();
      
      gameRoom = {
        gameState: createMockGameState(),
        gameEngine: createMockGameEngine(),
        players: new Map([['human-player', mockSocket], ['ai-player', 'AI']]),
        aiPlayers: new Map([['ai-player', mockAI as any]]),
        spectators: new Set(),
        lastActivity: new Date(),
        singlePlayer: true
      };

      gameManager['games'].set(gameId, gameRoom);
    });

    it('should process AI turn and make decisions', async () => {
      await gameManager['processAITurn'](gameRoom, gameId, 'ai-player');

      expect(mockServer.to).toHaveBeenCalledWith(gameId);
      expect(mockServer.emit).toHaveBeenCalledWith('ai_thinking', expect.objectContaining({
        playerId: 'ai-player'
      }));

      const aiPlayer = gameRoom.aiPlayers.get('ai-player');
      expect(aiPlayer?.makeDecisions).toHaveBeenCalledWith(gameRoom.gameState);
    });

    it('should broadcast AI actions to all players', async () => {
      const mockActions = [
        {
          type: GameActionType.MOVE_UNIT,
          playerId: 'ai-player',
          data: { unitId: 'unit-1', to: { x: 2, y: 2 } }
        }
      ];

      const aiPlayer = gameRoom.aiPlayers.get('ai-player');
      (aiPlayer?.makeDecisions as jest.Mock).mockReturnValue(mockActions);

      await gameManager['processAITurn'](gameRoom, gameId, 'ai-player');

      expect(mockServer.to).toHaveBeenCalledWith(gameId);
      expect(mockServer.emit).toHaveBeenCalledWith('ai_action', expect.objectContaining({
        playerId: 'ai-player',
        action: mockActions[0]
      }));
    });

    it('should handle AI errors gracefully', async () => {
      const aiPlayer = gameRoom.aiPlayers.get('ai-player');
      (aiPlayer?.makeDecisions as jest.Mock).mockImplementation(() => {
        throw new Error('AI decision failed');
      });

      const processNextTurnSpy = jest.spyOn(gameManager as any, 'processNextTurn');
      processNextTurnSpy.mockImplementation(() => {});

      await gameManager['processAITurn'](gameRoom, gameId, 'ai-player');

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processNextTurnSpy).toHaveBeenCalledWith(gameRoom, gameId);
    });

    it('should handle missing AI player', async () => {
      await gameManager['processAITurn'](gameRoom, gameId, 'nonexistent-ai');

      expect(consoleErrorSpy).toHaveBeenCalledWith('AI player not found: nonexistent-ai');
    });
  });

  describe('Turn Management', () => {
    let gameRoom: GameRoom;
    let gameId: string;

    beforeEach(() => {
      gameId = 'test-game-id';
      gameRoom = {
        gameState: {
          ...createMockGameState(),
          players: [
            { id: 'player-1', name: 'Human' },
            { id: 'ai-player-1', name: 'AI 1' }
          ],
          currentPlayer: 0,
          currentTurn: 1
        } as any,
        gameEngine: createMockGameEngine(),
        players: new Map([['player-1', mockSocket], ['ai-player-1', 'AI']]),
        aiPlayers: new Map([['ai-player-1', createMockAIPlayer() as any]]),
        spectators: new Set(),
        lastActivity: new Date(),
        singlePlayer: true
      };

      gameManager['games'].set(gameId, gameRoom);
    });

    it('should advance to next player and increment turn when cycling', async () => {
      await gameManager['processNextTurn'](gameRoom, gameId);

      expect(gameRoom.gameState.currentPlayer).toBe(1);
      expect(gameRoom.gameState.currentTurn).toBe(1);

      expect(mockServer.to).toHaveBeenCalledWith(gameId);
      expect(mockServer.emit).toHaveBeenCalledWith('turn_changed', expect.objectContaining({
        currentPlayer: 'ai-player-1',
        turn: gameRoom.gameState.currentTurn
      }));
    });

    it('should increment turn counter when reaching first player', async () => {
      gameRoom.gameState.currentPlayer = 1; // Start from AI player

      await gameManager['processNextTurn'](gameRoom, gameId);

      expect(gameRoom.gameState.currentPlayer).toBe(0);
      expect(gameRoom.gameState.currentTurn).toBe(2);
    });

    it('should trigger AI processing when next player is AI', async () => {
      const processAITurnSpy = jest.spyOn(gameManager as any, 'processAITurn');
      processAITurnSpy.mockImplementation(() => {});

      await gameManager['processNextTurn'](gameRoom, gameId);

      // Should set a timeout for AI processing
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('should clear existing AI timer before setting new one', async () => {
      gameRoom.aiProcessingTimer = setTimeout(() => {}, 500) as NodeJS.Timeout;

      await gameManager['processNextTurn'](gameRoom, gameId);

      expect(clearTimeout).toHaveBeenCalled();
    });
  });

  describe('Starting Unit Placement', () => {
    let gameState: any;

    beforeEach(() => {
      gameState = {
        players: [
          { id: 'player-1', units: [] },
          { id: 'player-2', units: [] }
        ],
        board: Array(20).fill(null).map(() => Array(20).fill(null).map(() => ({
          terrain: 'grassland',
          unit: null
        })))
      };
    });

    it('should place starting units for all players', () => {
      // Mock generateStartPositions to return valid positions
      jest.spyOn(gameManager as any, 'generateStartPositions').mockReturnValue([
        { x: 5, y: 5 }, { x: 10, y: 10 }
      ]);
      jest.spyOn(gameManager as any, 'getValidNeighbors').mockReturnValue([
        { q: 6, r: 5, s: -11 }
      ]);

      gameManager['placeStartingUnits'](gameState);

      // Each player should have 2 units (settler and warrior)
      expect(gameState.players[0].units.length).toBe(2);
      expect(gameState.players[1].units.length).toBe(2);

      // Check unit types
      const player1Units = gameState.players[0].units;
      expect(player1Units.some((unit: any) => unit.type === UnitType.SETTLER)).toBe(true);
      expect(player1Units.some((unit: any) => unit.type === UnitType.WARRIOR)).toBe(true);
    });
  });

  describe('Map Utilities', () => {
    let testMap: any[][];

    beforeEach(() => {
      testMap = Array(10).fill(null).map(() => Array(10).fill(null).map(() => ({
        terrain: 'grassland',
        unit: null
      })));
      
      // Add some water tiles
      testMap[0][0] = { terrain: 'ocean', unit: null };
      testMap[1][1] = { terrain: 'water', unit: null };
    });

    it('should generate starting positions for players', () => {
      const positions = gameManager['generateStartPositions'](testMap, 4);

      expect(positions).toHaveLength(4);
      positions.forEach(pos => {
        expect(pos).toHaveProperty('x');
        expect(pos).toHaveProperty('y');
        expect(pos.x).toBeGreaterThanOrEqual(0);
        expect(pos.y).toBeGreaterThanOrEqual(0);
        expect(pos.x).toBeLessThan(10);
        expect(pos.y).toBeLessThan(10);
      });
    });

    it('should find nearest land tile', () => {
      const landTile = gameManager['findNearestLandTile'](testMap, 0, 0);

      expect(landTile).toBeDefined();
      expect(landTile?.q).toBeGreaterThanOrEqual(0);
      expect(landTile?.r).toBeGreaterThanOrEqual(0);
      
      // Should not be water
      const tile = testMap[landTile!.r][landTile!.q];
      expect(tile.terrain).not.toBe('ocean');
      expect(tile.terrain).not.toBe('water');
    });

    it('should get valid neighbor positions', () => {
      const neighbors = gameManager['getValidNeighbors'](testMap, { x: 5, y: 5 } as any);

      expect(neighbors.length).toBeGreaterThan(0);
      neighbors.forEach(neighbor => {
        expect(neighbor.q).toBeGreaterThanOrEqual(0);
        expect(neighbor.r).toBeGreaterThanOrEqual(0);
        expect(neighbor.q).toBeLessThan(10);
        expect(neighbor.r).toBeLessThan(10);
        
        const tile = testMap[neighbor.r][neighbor.q];
        expect(tile.terrain).not.toBe('ocean');
        expect(tile.unit).toBeNull();
      });
    });
  });

  describe('Player Disconnect Handling', () => {
    let gameRoom: GameRoom;
    let gameId: string;

    beforeEach(() => {
      gameId = 'test-game-id';
      gameRoom = {
        gameState: createMockGameState(),
        gameEngine: createMockGameEngine(),
        players: new Map([['player-1', mockSocket]]),
        aiPlayers: new Map(),
        spectators: new Set(),
        lastActivity: new Date(),
        singlePlayer: true,
        aiProcessingTimer: setTimeout(() => {}, 1000) as NodeJS.Timeout
      };

      gameManager['games'].set(gameId, gameRoom);
      gameManager['playerToGame'].set('player-1', gameId);
    });

    it('should handle single player disconnect by pausing game', () => {
      gameManager['handlePlayerDisconnect']('player-1');

      expect(clearTimeout).toHaveBeenCalledWith(gameRoom.aiProcessingTimer);
      expect(gameManager['playerToGame'].has('player-1')).toBe(false);
    });

    it('should handle multiplayer disconnect by removing player', () => {
      gameRoom.singlePlayer = false;

      gameManager['handlePlayerDisconnect']('player-1');

      expect(gameRoom.players.has('player-1')).toBe(false);
      expect(mockServer.to).toHaveBeenCalledWith(gameId);
      expect(mockServer.emit).toHaveBeenCalledWith('player_disconnected', {
        playerId: 'player-1'
      });
    });
  });

  describe('Game State Serialization', () => {
    it('should serialize game state for transmission', () => {
      const gameState = {
        id: 'game-123',
        players: {
          'player-1': {
            id: 'player-1',
            name: 'Player 1',
            technologies: new Set(['writing', 'pottery'])
          }
        }
      };

      const serialized = gameManager['serializeGameState'](gameState as any);

      expect(serialized.players['player-1'].technologies).toEqual(['writing', 'pottery']);
    });
  });

  describe('Cleanup and Shutdown', () => {
    it('should cleanup inactive games', () => {
      const oldDate = new Date(Date.now() - 35 * 60 * 1000); // 35 minutes ago
      const gameRoom: GameRoom = {
        gameState: createMockGameState(),
        gameEngine: createMockGameEngine(),
        players: new Map([['player-1', mockSocket]]),
        aiPlayers: new Map(),
        spectators: new Set(),
        lastActivity: oldDate,
        singlePlayer: false,
        turnTimer: setTimeout(() => {}, 1000) as NodeJS.Timeout,
        aiProcessingTimer: setTimeout(() => {}, 1000) as NodeJS.Timeout
      };

      gameManager['games'].set('old-game', gameRoom);
      gameManager['playerToGame'].set('player-1', 'old-game');

      gameManager['cleanupInactiveGames']();

      expect(gameManager['games'].has('old-game')).toBe(false);
      expect(gameManager['playerToGame'].has('player-1')).toBe(false);
      expect(clearTimeout).toHaveBeenCalledWith(gameRoom.turnTimer);
      expect(clearTimeout).toHaveBeenCalledWith(gameRoom.aiProcessingTimer);
    });

    it('should shutdown and clear all resources', () => {
      const gameRoom: GameRoom = {
        gameState: createMockGameState(),
        gameEngine: createMockGameEngine(),
        players: new Map(),
        aiPlayers: new Map(),
        spectators: new Set(),
        lastActivity: new Date(),
        singlePlayer: true,
        turnTimer: setTimeout(() => {}, 1000) as NodeJS.Timeout,
        aiProcessingTimer: setTimeout(() => {}, 1000) as NodeJS.Timeout
      };

      gameManager['games'].set('test-game', gameRoom);
      gameManager['playerToGame'].set('player-1', 'test-game');
      gameManager['socketToPlayer'].set('socket-1', 'player-1');

      gameManager.shutdown();

      expect(clearInterval).toHaveBeenCalledWith(gameManager['cleanupInterval']);
      expect(clearTimeout).toHaveBeenCalledWith(gameRoom.turnTimer);
      expect(clearTimeout).toHaveBeenCalledWith(gameRoom.aiProcessingTimer);
      expect(gameManager['games'].size).toBe(0);
      expect(gameManager['playerToGame'].size).toBe(0);
      expect(gameManager['socketToPlayer'].size).toBe(0);
    });
  });

  describe('Game Statistics', () => {
    it('should return correct game count', () => {
      expect(gameManager.getGameCount()).toBe(0);

      gameManager['games'].set('game-1', {} as GameRoom);
      gameManager['games'].set('game-2', {} as GameRoom);

      expect(gameManager.getGameCount()).toBe(2);
    });

    it('should return correct active player count', () => {
      expect(gameManager.getActivePlayerCount()).toBe(0);

      gameManager['playerToGame'].set('player-1', 'game-1');
      gameManager['playerToGame'].set('player-2', 'game-1');

      expect(gameManager.getActivePlayerCount()).toBe(2);
    });
  });

  describe('Request Handlers', () => {
    let gameId: string;

    beforeEach(() => {
      gameId = 'test-game';
      const gameRoom: GameRoom = {
        gameState: createMockGameState(),
        gameEngine: createMockGameEngine(),
        players: new Map([['player-1', mockSocket]]),
        aiPlayers: new Map(),
        spectators: new Set(),
        lastActivity: new Date(),
        singlePlayer: false
      };

      gameManager['games'].set(gameId, gameRoom);
      gameManager['playerToGame'].set('player-1', gameId);
      gameManager['socketToPlayer'].set(mockSocket.id, 'player-1');
    });

    it('should handle game state requests', () => {
      gameManager['handleRequestGameState'](mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('game_state', expect.objectContaining({
        gameState: expect.any(Object)
      }));
    });

    it('should handle AI difficulty changes', () => {
      gameManager['handleSetAIDifficulty'](mockSocket, { difficulty: AIDifficulty.Hard });

      expect(mockSocket.emit).toHaveBeenCalledWith('ai_difficulty_updated', {
        difficulty: AIDifficulty.Hard
      });
    });

    it('should handle leave game requests', () => {
      const handlePlayerDisconnectSpy = jest.spyOn(gameManager as any, 'handlePlayerDisconnect');
      handlePlayerDisconnectSpy.mockImplementation(() => {});

      gameManager['handleLeaveGame'](mockSocket);

      expect(handlePlayerDisconnectSpy).toHaveBeenCalledWith('player-1');
    });
  });

  describe('Error Edge Cases', () => {
    it('should handle delay utility', async () => {
      const delayPromise = gameManager['delay'](100);
      
      // Fast-forward time by 100ms
      jest.advanceTimersByTime(100);
      
      await delayPromise;
      
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);
    });

    it('should validate game config', () => {
      const validConfig = {
        maxPlayers: 4,
        mapSize: { width: 20, height: 20 }
      } as GameConfig;

      const result = gameManager['validateGameConfig'](validConfig);
      expect(result).toBe(true);
    });

    it('should handle missing game for action processing', async () => {
      const action: GameAction = {
        type: GameActionType.MOVE_UNIT,
        playerId: 'player-123',
        data: {}
      };

      await gameManager['handleGameAction'](mockSocket, action);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Player not found'
      });
    });
  });
});