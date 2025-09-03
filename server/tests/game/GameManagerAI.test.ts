import { GameManagerAI, GameRoom, CreateGameOptions } from '../../src/game/GameManagerAI';
import { Server, Socket } from 'socket.io';
import { GameState, GamePhase } from '../../src/shared-types';
import { GameEngine } from '../../src/game/GameEngine';
import { AIPlayer, AIPersonality, AIDifficulty } from '../../src/game/AIPlayer';
import { GameConfig, PlayerInfo, GameAction, GameActionType } from '@civ-game/shared';

// Mock dependencies
jest.mock('socket.io');
jest.mock('../../src/game/GameEngine');
jest.mock('../../src/game/AIPlayer');
jest.mock('../../src/shared-types');
jest.mock('../../src/config/config', () => ({
  config: {
    AI_TURN_DELAY: 1000,
    TURN_TIMER_DURATION: 60000,
    GAME_CLEANUP_INTERVAL: 300000,
    MAX_IDLE_TIME: 1800000
  }
}));

const mockSocket = {
  id: 'socket-123',
  join: jest.fn(),
  leave: jest.fn(),
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
  broadcast: { to: jest.fn().mockReturnThis(), emit: jest.fn() }
} as unknown as Socket;

const mockServer = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
  sockets: { sockets: new Map() }
} as unknown as Server;

const mockGameState = {
  id: 'game-123',
  players: [],
  currentPlayer: 0,
  currentTurn: 1,
  phase: GamePhase.LOBBY,
  addPlayer: jest.fn(),
  removePlayer: jest.fn(),
  startGame: jest.fn(),
  serialize: jest.fn().mockReturnValue({ serializedData: true }),
  config: {
    mapSize: { width: 10, height: 10 },
    maxPlayers: 4,
    turnTimeLimit: 60,
    difficulty: 'normal',
    victoryConditions: ['conquest']
  }
} as unknown as GameState;

const mockGameEngine = {
  processAction: jest.fn().mockReturnValue({ success: true }),
  getCurrentPlayerActions: jest.fn().mockReturnValue([]),
  getGameStatus: jest.fn().mockReturnValue({ phase: 'active', winner: null }),
  checkVictoryConditions: jest.fn().mockReturnValue(null),
  endTurn: jest.fn()
} as unknown as GameEngine;

const mockAIPlayer = {
  makeDecisions: jest.fn().mockReturnValue([]),
  updateVision: jest.fn(),
  updateKnowledge: jest.fn(),
  setDifficulty: jest.fn(),
  getPersonality: jest.fn().mockReturnValue(AIPersonality.BALANCED),
  getDifficulty: jest.fn().mockReturnValue(AIDifficulty.NORMAL)
} as unknown as AIPlayer;

// Mock constructors
(GameState as jest.MockedClass<typeof GameState>).mockImplementation(() => mockGameState);
(GameEngine as jest.MockedClass<typeof GameEngine>).mockImplementation(() => mockGameEngine);
(AIPlayer as jest.MockedClass<typeof AIPlayer>).mockImplementation(() => mockAIPlayer);

describe('GameManagerAI', () => {
  let gameManager: GameManagerAI;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    gameManager = new GameManagerAI(mockServer);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Constructor', () => {
    it('should create GameManagerAI with proper initialization', () => {
      expect(gameManager).toBeDefined();
      expect(gameManager['io']).toBe(mockServer);
      expect(gameManager['games']).toBeDefined();
      expect(gameManager['playerToGame']).toBeDefined();
      expect(gameManager['socketToPlayer']).toBeDefined();
    });

    it('should set up cleanup interval', () => {
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 300000);
    });
  });

  describe('Game Creation', () => {
    const createGameOptions: CreateGameOptions = {
      playerName: 'TestPlayer',
      gameConfig: {
        mapSize: { width: 10, height: 10 },
        maxPlayers: 4,
        turnTimeLimit: 60,
        difficulty: 'normal',
        victoryConditions: ['conquest']
      } as GameConfig,
      singlePlayer: true,
      aiOpponents: 2,
      aiDifficulty: AIDifficulty.NORMAL
    };

    it('should create a new single-player game with AI opponents', () => {
      const gameId = gameManager.createGame(mockSocket, createGameOptions);

      expect(gameId).toBeDefined();
      expect(typeof gameId).toBe('string');
      expect(gameManager.getGameCount()).toBe(1);
      expect(GameState).toHaveBeenCalled();
      expect(GameEngine).toHaveBeenCalled();
    });

    it('should create a multiplayer game without AI opponents', () => {
      const multiplayerOptions = { ...createGameOptions, singlePlayer: false, aiOpponents: 0 };
      
      const gameId = gameManager.createGame(mockSocket, multiplayerOptions);

      expect(gameId).toBeDefined();
      expect(gameManager.getGameCount()).toBe(1);
    });

    it('should add AI players for single-player games', () => {
      const gameId = gameManager.createGame(mockSocket, createGameOptions);
      const gameRoom = gameManager['games'].get(gameId);

      expect(gameRoom).toBeDefined();
      expect(gameRoom?.aiPlayers.size).toBe(2); // aiOpponents: 2
      expect(AIPlayer).toHaveBeenCalledTimes(2);
    });

    it('should handle invalid game configuration', () => {
      const invalidOptions = { ...createGameOptions, gameConfig: null as any };
      
      expect(() => gameManager.createGame(mockSocket, invalidOptions)).toThrow();
    });
  });

  describe('Player Management', () => {
    let gameId: string;

    beforeEach(() => {
      const createGameOptions: CreateGameOptions = {
        playerName: 'TestPlayer',
        gameConfig: {
          mapSize: { width: 10, height: 10 },
          maxPlayers: 4,
          turnTimeLimit: 60,
          difficulty: 'normal',
          victoryConditions: ['conquest']
        } as GameConfig,
        singlePlayer: false
      };
      gameId = gameManager.createGame(mockSocket, createGameOptions);
    });

    it('should allow players to join existing games', () => {
      const newPlayer = { ...mockSocket, id: 'socket-456' } as Socket;
      const playerInfo: PlayerInfo = {
        id: 'player-456',
        name: 'Player2',
        civilization: 'romans',
        color: 'red'
      };

      const result = gameManager.joinGame(newPlayer, gameId, playerInfo);

      expect(result).toBe(true);
      expect(mockGameState.addPlayer).toHaveBeenCalledWith(playerInfo);
    });

    it('should prevent joining non-existent games', () => {
      const result = gameManager.joinGame(mockSocket, 'nonexistent-game', {} as PlayerInfo);

      expect(result).toBe(false);
    });

    it('should prevent joining full games', () => {
      // Simulate a full game
      const gameRoom = gameManager['games'].get(gameId);
      if (gameRoom) {
        gameRoom.gameState.players = new Array(4).fill({}).map((_, i) => ({ id: `player-${i}` }));
      }

      const result = gameManager.joinGame(mockSocket, gameId, {} as PlayerInfo);

      expect(result).toBe(false);
    });

    it('should handle player disconnection', () => {
      gameManager.handleDisconnection(mockSocket);

      // Should not crash and should handle gracefully
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('Game Starting', () => {
    let gameId: string;

    beforeEach(() => {
      const createGameOptions: CreateGameOptions = {
        playerName: 'TestPlayer',
        gameConfig: {
          mapSize: { width: 10, height: 10 },
          maxPlayers: 2,
          turnTimeLimit: 60,
          difficulty: 'normal',
          victoryConditions: ['conquest']
        } as GameConfig,
        singlePlayer: false
      };
      gameId = gameManager.createGame(mockSocket, createGameOptions);
    });

    it('should start game when enough players have joined', () => {
      const newPlayer = { ...mockSocket, id: 'socket-456' } as Socket;
      const playerInfo: PlayerInfo = {
        id: 'player-456',
        name: 'Player2',
        civilization: 'romans',
        color: 'red'
      };

      gameManager.joinGame(newPlayer, gameId, playerInfo);
      const result = gameManager.startGame(gameId);

      expect(result).toBe(true);
      expect(mockGameState.startGame).toHaveBeenCalled();
    });

    it('should not start game with insufficient players', () => {
      const result = gameManager.startGame(gameId);

      expect(result).toBe(false);
    });

    it('should not start already started game', () => {
      const gameRoom = gameManager['games'].get(gameId);
      if (gameRoom) {
        gameRoom.gameState.phase = GamePhase.ACTIVE;
      }

      const result = gameManager.startGame(gameId);

      expect(result).toBe(false);
    });
  });

  describe('Action Processing', () => {
    let gameId: string;

    beforeEach(() => {
      const createGameOptions: CreateGameOptions = {
        playerName: 'TestPlayer',
        gameConfig: {
          mapSize: { width: 10, height: 10 },
          maxPlayers: 2,
          turnTimeLimit: 60,
          difficulty: 'normal',
          victoryConditions: ['conquest']
        } as GameConfig,
        singlePlayer: true,
        aiOpponents: 1
      };
      gameId = gameManager.createGame(mockSocket, createGameOptions);
      
      // Start the game
      const gameRoom = gameManager['games'].get(gameId);
      if (gameRoom) {
        gameRoom.gameState.phase = GamePhase.ACTIVE;
      }
    });

    it('should process valid player actions', () => {
      const action: GameAction = {
        type: GameActionType.MOVE_UNIT,
        playerId: 'player-123',
        data: { unitId: 'unit-1', to: { x: 1, y: 1 } }
      };

      const result = gameManager.processAction(mockSocket, gameId, action);

      expect(result).toBe(true);
      expect(mockGameEngine.processAction).toHaveBeenCalledWith(action);
    });

    it('should reject actions from wrong players', () => {
      const action: GameAction = {
        type: GameActionType.MOVE_UNIT,
        playerId: 'wrong-player',
        data: { unitId: 'unit-1', to: { x: 1, y: 1 } }
      };

      const result = gameManager.processAction(mockSocket, gameId, action);

      expect(result).toBe(false);
    });

    it('should reject actions in non-active games', () => {
      const gameRoom = gameManager['games'].get(gameId);
      if (gameRoom) {
        gameRoom.gameState.phase = GamePhase.LOBBY;
      }

      const action: GameAction = {
        type: GameActionType.MOVE_UNIT,
        playerId: 'player-123',
        data: { unitId: 'unit-1', to: { x: 1, y: 1 } }
      };

      const result = gameManager.processAction(mockSocket, gameId, action);

      expect(result).toBe(false);
    });
  });

  describe('AI Processing', () => {
    let gameId: string;

    beforeEach(() => {
      const createGameOptions: CreateGameOptions = {
        playerName: 'TestPlayer',
        gameConfig: {
          mapSize: { width: 10, height: 10 },
          maxPlayers: 2,
          turnTimeLimit: 60,
          difficulty: 'normal',
          victoryConditions: ['conquest']
        } as GameConfig,
        singlePlayer: true,
        aiOpponents: 1,
        aiDifficulty: AIDifficulty.HARD
      };
      gameId = gameManager.createGame(mockSocket, createGameOptions);
      
      // Start the game
      const gameRoom = gameManager['games'].get(gameId);
      if (gameRoom) {
        gameRoom.gameState.phase = GamePhase.ACTIVE;
      }
    });

    it('should process AI turns automatically', () => {
      const gameRoom = gameManager['games'].get(gameId);
      expect(gameRoom).toBeDefined();

      // Simulate AI turn by calling processAITurn manually
      gameManager['processAITurn'](gameRoom!);

      expect(mockAIPlayer.makeDecisions).toHaveBeenCalled();
    });

    it('should handle AI decision making with multiple actions', () => {
      const mockActions = [
        { type: GameActionType.MOVE_UNIT, data: { unitId: 'unit-1', to: { x: 2, y: 2 } } },
        { type: GameActionType.END_TURN, data: {} }
      ];
      mockAIPlayer.makeDecisions.mockReturnValue(mockActions);

      const gameRoom = gameManager['games'].get(gameId);
      gameManager['processAITurn'](gameRoom!);

      expect(mockGameEngine.processAction).toHaveBeenCalledTimes(2);
    });

    it('should update AI knowledge after actions', () => {
      const gameRoom = gameManager['games'].get(gameId);
      gameManager['processAITurn'](gameRoom!);

      expect(mockAIPlayer.updateVision).toHaveBeenCalled();
      expect(mockAIPlayer.updateKnowledge).toHaveBeenCalled();
    });

    it('should handle AI errors gracefully', () => {
      mockAIPlayer.makeDecisions.mockImplementation(() => {
        throw new Error('AI decision error');
      });

      const gameRoom = gameManager['games'].get(gameId);
      expect(() => gameManager['processAITurn'](gameRoom!)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Turn Management', () => {
    let gameId: string;

    beforeEach(() => {
      const createGameOptions: CreateGameOptions = {
        playerName: 'TestPlayer',
        gameConfig: {
          mapSize: { width: 10, height: 10 },
          maxPlayers: 2,
          turnTimeLimit: 60,
          difficulty: 'normal',
          victoryConditions: ['conquest']
        } as GameConfig,
        singlePlayer: true,
        aiOpponents: 1
      };
      gameId = gameManager.createGame(mockSocket, createGameOptions);
    });

    it('should advance to next turn', () => {
      const gameRoom = gameManager['games'].get(gameId);
      gameManager['advanceToNextTurn'](gameRoom!);

      expect(mockGameEngine.endTurn).toHaveBeenCalled();
    });

    it('should start turn timer for human players', () => {
      const gameRoom = gameManager['games'].get(gameId);
      gameManager['startTurnTimer'](gameRoom!);

      expect(gameRoom?.turnTimer).toBeDefined();
    });

    it('should clear existing timers before starting new ones', () => {
      const gameRoom = gameManager['games'].get(gameId);
      gameRoom!.turnTimer = setTimeout(() => {}, 1000);
      
      gameManager['startTurnTimer'](gameRoom!);

      expect(clearTimeout).toHaveBeenCalled();
    });
  });

  describe('Victory Conditions', () => {
    let gameId: string;

    beforeEach(() => {
      const createGameOptions: CreateGameOptions = {
        playerName: 'TestPlayer',
        gameConfig: {
          mapSize: { width: 10, height: 10 },
          maxPlayers: 2,
          turnTimeLimit: 60,
          difficulty: 'normal',
          victoryConditions: ['conquest']
        } as GameConfig,
        singlePlayer: true,
        aiOpponents: 1
      };
      gameId = gameManager.createGame(mockSocket, createGameOptions);
    });

    it('should check for victory conditions after actions', () => {
      const gameRoom = gameManager['games'].get(gameId);
      gameManager['checkVictoryConditions'](gameRoom!);

      expect(mockGameEngine.checkVictoryConditions).toHaveBeenCalled();
    });

    it('should end game when victory condition is met', () => {
      mockGameEngine.checkVictoryConditions.mockReturnValue({
        type: 'conquest',
        winner: 'player-123'
      });

      const gameRoom = gameManager['games'].get(gameId);
      gameManager['checkVictoryConditions'](gameRoom!);

      expect(gameRoom?.gameState.phase).toBe(GamePhase.ENDED);
    });
  });

  describe('Game Room Management', () => {
    it('should get correct game count', () => {
      expect(gameManager.getGameCount()).toBe(0);

      const createGameOptions: CreateGameOptions = {
        playerName: 'TestPlayer',
        gameConfig: {
          mapSize: { width: 10, height: 10 },
          maxPlayers: 2,
          turnTimeLimit: 60,
          difficulty: 'normal',
          victoryConditions: ['conquest']
        } as GameConfig
      };
      
      gameManager.createGame(mockSocket, createGameOptions);
      expect(gameManager.getGameCount()).toBe(1);
    });

    it('should provide game statistics', () => {
      const stats = gameManager.getGameStats();

      expect(stats).toHaveProperty('totalGames');
      expect(stats).toHaveProperty('activeGames');
      expect(stats).toHaveProperty('playersOnline');
      expect(stats.totalGames).toBe(0);
      expect(stats.activeGames).toBe(0);
      expect(stats.playersOnline).toBe(0);
    });

    it('should cleanup inactive games', () => {
      const createGameOptions: CreateGameOptions = {
        playerName: 'TestPlayer',
        gameConfig: {
          mapSize: { width: 10, height: 10 },
          maxPlayers: 2,
          turnTimeLimit: 60,
          difficulty: 'normal',
          victoryConditions: ['conquest']
        } as GameConfig
      };
      
      const gameId = gameManager.createGame(mockSocket, createGameOptions);
      const gameRoom = gameManager['games'].get(gameId);
      
      // Simulate old game
      if (gameRoom) {
        gameRoom.lastActivity = new Date(Date.now() - 2000000); // 2000 seconds ago
      }

      gameManager['cleanupInactiveGames']();

      expect(gameManager.getGameCount()).toBe(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle operations on non-existent games', () => {
      const result = gameManager.processAction(mockSocket, 'nonexistent', {} as GameAction);
      expect(result).toBe(false);
    });

    it('should handle socket operations gracefully', () => {
      const invalidSocket = null as any;
      expect(() => gameManager.createGame(invalidSocket, {} as CreateGameOptions)).not.toThrow();
    });

    it('should handle AI creation failures', () => {
      (AIPlayer as jest.MockedClass<typeof AIPlayer>).mockImplementationOnce(() => {
        throw new Error('AI creation failed');
      });

      const createGameOptions: CreateGameOptions = {
        playerName: 'TestPlayer',
        gameConfig: {
          mapSize: { width: 10, height: 10 },
          maxPlayers: 2,
          turnTimeLimit: 60,
          difficulty: 'normal',
          victoryConditions: ['conquest']
        } as GameConfig,
        singlePlayer: true,
        aiOpponents: 1
      };

      expect(() => gameManager.createGame(mockSocket, createGameOptions)).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should handle cleanup interval errors', () => {
      const originalCleanup = gameManager['cleanupInactiveGames'];
      gameManager['cleanupInactiveGames'] = jest.fn().mockImplementation(() => {
        throw new Error('Cleanup error');
      });

      // Trigger cleanup interval
      jest.advanceTimersByTime(300000);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Spectator Management', () => {
    let gameId: string;

    beforeEach(() => {
      const createGameOptions: CreateGameOptions = {
        playerName: 'TestPlayer',
        gameConfig: {
          mapSize: { width: 10, height: 10 },
          maxPlayers: 2,
          turnTimeLimit: 60,
          difficulty: 'normal',
          victoryConditions: ['conquest']
        } as GameConfig
      };
      gameId = gameManager.createGame(mockSocket, createGameOptions);
    });

    it('should allow spectators to join games', () => {
      const spectatorSocket = { ...mockSocket, id: 'spectator-1' } as Socket;
      const result = gameManager.addSpectator(spectatorSocket, gameId);

      expect(result).toBe(true);
      const gameRoom = gameManager['games'].get(gameId);
      expect(gameRoom?.spectators.has(spectatorSocket)).toBe(true);
    });

    it('should remove spectators when they disconnect', () => {
      const spectatorSocket = { ...mockSocket, id: 'spectator-1' } as Socket;
      gameManager.addSpectator(spectatorSocket, gameId);

      gameManager.removeSpectator(spectatorSocket, gameId);

      const gameRoom = gameManager['games'].get(gameId);
      expect(gameRoom?.spectators.has(spectatorSocket)).toBe(false);
    });
  });
});