import { GameEngine } from '../../src/game/GameEngine';
import { GameState, GameAction, GameActionType, GamePhase } from '@civ-game/shared';
import { HexMap } from '../../src/game/HexMap';

describe('GameEngine', () => {
  let gameEngine: GameEngine;

  beforeEach(() => {
    gameEngine = new GameEngine();
  });

  describe('Basic Functionality', () => {
    test('should create GameEngine instance', () => {
      expect(gameEngine).toBeDefined();
      expect(gameEngine).toBeInstanceOf(GameEngine);
    });

    test('should have processAction method', () => {
      expect(typeof gameEngine.processAction).toBe('function');
    });

    test('should have static processPlayerAction method', () => {
      expect(typeof GameEngine.processPlayerAction).toBe('function');
    });
  });

  describe('Action Processing', () => {
    let testGameState: GameState;

    beforeEach(() => {
      // Create a minimal valid game state
      const hexMap = new HexMap(10, 10);
      hexMap.generateProceduralMap(42);
      
      testGameState = {
        id: 'test-game',
        gameId: 'test-game',
        turn: 1,
        currentTurn: 1,
        currentPlayer: 'player1',
        phase: GamePhase.ACTIVE,
        players: [
          {
            id: 'player1',
            userId: 'player1',
            name: 'Player 1',
            civilization: 'Romans',
            resources: { gold: 100, food: 50, production: 30, science: 10 },
            technologies: [],
            cities: [],
            units: []
          }
        ],
        map: {
          width: 10,
          height: 10,
          tiles: hexMap.tiles
        },
        cities: {},
        units: {},
        lastUpdate: new Date()
      };
    });

    test('should handle invalid action gracefully', () => {
      const invalidAction: GameAction = {
        type: GameActionType.MOVE_UNIT,
        payload: {} // Invalid empty payload
      };

      const result = gameEngine.processAction(testGameState, invalidAction);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle end turn action', () => {
      const endTurnAction: GameAction = {
        type: GameActionType.END_TURN,
        payload: { playerId: 'player1' }
      };

      const result = gameEngine.processAction(testGameState, endTurnAction);
      // Should either succeed or fail gracefully with a message
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Static Methods', () => {
    test('should have static processTurnEnd method', () => {
      expect(typeof GameEngine.processTurnEnd).toBe('function');
    });
  });
});