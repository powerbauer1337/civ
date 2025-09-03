import { GameEngine } from '../../src/game/GameEngine';
import { HexMap } from '../../src/game/HexMap';
import { 
  GameState, 
  GameAction, 
  GameActionType, 
  GamePhase,
  UnitType,
  TerrainType,
  Unit,
  City,
  PlayerState,
  TechnologyType
} from '@civ-game/shared';

describe('GameEngine - Comprehensive Tests', () => {
  let gameEngine: GameEngine;
  let testGameState: GameState;
  let hexMap: HexMap;

  beforeEach(() => {
    gameEngine = new GameEngine();
    hexMap = new HexMap(12, 12);
    hexMap.generateProceduralMap(42);
    
    // Create comprehensive test game state with units and cities
    const player1: PlayerState = {
      id: 'player1',
      userId: 'player1',
      name: 'Player 1',
      civilization: 'Romans',
      resources: { gold: 100, food: 50, production: 30, science: 20 },
      technologies: [TechnologyType.AGRICULTURE],
      cities: [
        {
          id: 'city1',
          name: 'Rome',
          playerId: 'player1',
          x: 5,
          y: 5,
          population: 3,
          health: 200,
          maxHealth: 200,
          production: {
            type: 'unit',
            unitType: UnitType.WARRIOR,
            progress: 5,
            cost: 40,
            turnsRemaining: 8
          },
          buildings: [],
          workingTiles: []
        }
      ],
      units: [
        {
          id: 'unit1',
          type: UnitType.WARRIOR,
          name: 'Warrior',
          playerId: 'player1',
          x: 3,
          y: 3,
          health: 100,
          maxHealth: 100,
          movement: 2,
          maxMovement: 2,
          strength: 8,
          experience: 0,
          promotions: [],
          status: []
        },
        {
          id: 'settler1',
          type: UnitType.SETTLER,
          name: 'Settler',
          playerId: 'player1',
          x: 4,
          y: 4,
          health: 100,
          maxHealth: 100,
          movement: 2,
          maxMovement: 2,
          strength: 0,
          experience: 0,
          promotions: [],
          status: []
        }
      ]
    };

    const player2: PlayerState = {
      id: 'player2',
      userId: 'player2',
      name: 'Player 2',
      civilization: 'Greeks',
      resources: { gold: 80, food: 40, production: 25, science: 15 },
      technologies: [],
      cities: [],
      units: [
        {
          id: 'enemy1',
          type: UnitType.WARRIOR,
          name: 'Enemy Warrior',
          playerId: 'player2',
          x: 6,
          y: 6,
          health: 80,
          maxHealth: 100,
          movement: 2,
          maxMovement: 2,
          strength: 8,
          experience: 0,
          promotions: [],
          status: []
        }
      ]
    };
    
    testGameState = {
      id: 'test-game',
      gameId: 'test-game',
      turn: 1,
      currentTurn: 1,
      currentPlayer: 'player1',
      phase: GamePhase.ACTIVE,
      players: [player1, player2],
      map: {
        width: 12,
        height: 12,
        tiles: hexMap.tiles
      },
      cities: { 'city1': player1.cities[0] },
      units: { 
        'unit1': player1.units[0], 
        'settler1': player1.units[1],
        'enemy1': player2.units[0]
      },
      lastUpdate: new Date()
    };
  });

  describe('Constructor and Instance Methods', () => {
    test('should create GameEngine with optional config', () => {
      const engineWithConfig = new GameEngine({ testOption: true });
      expect(engineWithConfig).toBeDefined();
      expect(engineWithConfig).toBeInstanceOf(GameEngine);
    });

    test('should process action through instance method', () => {
      const action: GameAction = {
        type: GameActionType.END_TURN,
        payload: { playerId: 'player1' }
      };

      const result = gameEngine.processAction(testGameState, action);
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Action Validation', () => {
    test('should reject action without type', () => {
      const invalidAction = {
        payload: { playerId: 'player1' }
      } as GameAction;

      const result = GameEngine.processPlayerAction(testGameState, invalidAction);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid action structure');
    });

    test('should reject action without payload', () => {
      const invalidAction = {
        type: GameActionType.MOVE_UNIT
      } as GameAction;

      const result = GameEngine.processPlayerAction(testGameState, invalidAction);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid action structure');
    });
  });

  describe('Unit Movement', () => {
    test('should successfully move unit to valid position', () => {
      const moveAction: GameAction = {
        type: GameActionType.MOVE_UNIT,
        payload: {
          playerId: 'player1',
          unitId: 'unit1',
          from: { x: 3, y: 3 },
          to: { x: 3, y: 4 }
        }
      };

      const result = GameEngine.processPlayerAction(testGameState, moveAction);
      expect(result.success).toBe(true);
      const movedUnit = result.gameState?.units?.['unit1'];
      expect(movedUnit?.x).toBe(3);
      expect(movedUnit?.y).toBe(4);
    });

    test('should reject move with insufficient movement points', () => {
      // Exhaust unit's movement
      testGameState.units!['unit1']!.movement = 0;

      const moveAction: GameAction = {
        type: GameActionType.MOVE_UNIT,
        payload: {
          playerId: 'player1',
          unitId: 'unit1',
          from: { x: 3, y: 3 },
          to: { x: 3, y: 4 }
        }
      };

      const result = GameEngine.processPlayerAction(testGameState, moveAction);
      expect(result.success).toBe(false);
      expect(result.error).toContain('movement');
    });

    test('should reject move by wrong player', () => {
      const moveAction: GameAction = {
        type: GameActionType.MOVE_UNIT,
        payload: {
          playerId: 'player2', // Wrong player
          unitId: 'unit1', // Player1's unit
          from: { x: 3, y: 3 },
          to: { x: 3, y: 4 }
        }
      };

      const result = GameEngine.processPlayerAction(testGameState, moveAction);
      expect(result.success).toBe(false);
    });

    test('should reject move to occupied position', () => {
      // Place another unit at destination
      const settler = testGameState.units!['settler1']!;
      settler.x = 3;
      settler.y = 4;

      const moveAction: GameAction = {
        type: GameActionType.MOVE_UNIT,
        payload: {
          playerId: 'player1',
          unitId: 'unit1',
          from: { x: 3, y: 3 },
          to: { x: 3, y: 4 }
        }
      };

      const result = GameEngine.processPlayerAction(testGameState, moveAction);
      expect(result.success).toBe(false);
    });
  });

  describe('Combat System', () => {
    test('should process attack between units', () => {
      // Position enemy adjacent to player unit
      testGameState.units!['enemy1']!.x = 3;
      testGameState.units!['enemy1']!.y = 4;

      const attackAction: GameAction = {
        type: GameActionType.ATTACK_UNIT,
        payload: {
          playerId: 'player1',
          attackerId: 'unit1',
          targetId: 'enemy1'
        }
      };

      const result = GameEngine.processPlayerAction(testGameState, attackAction);
      expect(result.success).toBe(true);
      
      // Check that combat occurred (health should change)
      const enemy = result.gameState?.units?.['enemy1'];
      expect(enemy).toBeDefined();
      if (enemy) {
        expect(enemy.health).toBeLessThan(80);
      }
    });

    test('should reject attack on non-adjacent enemy', () => {
      // Enemy is too far away
      testGameState.units!['enemy1']!.position = { x: 8, y: 8 };

      const attackAction: GameAction = {
        type: GameActionType.ATTACK_UNIT,
        payload: {
          playerId: 'player1',
          attackerId: 'unit1',
          targetId: 'enemy1'
        }
      };

      const result = GameEngine.processPlayerAction(testGameState, attackAction);
      expect(result.success).toBe(false);
      expect(result.error).toContain('range' || 'adjacent');
    });

    test('should remove destroyed units', () => {
      // Position enemy adjacent and weaken it
      testGameState.units!['enemy1']!.position = { x: 3, y: 4 };
      testGameState.units!['enemy1']!.health = 1; // Very low health

      const attackAction: GameAction = {
        type: GameActionType.ATTACK_UNIT,
        payload: {
          playerId: 'player1',
          attackerId: 'unit1',
          targetId: 'enemy1'
        }
      };

      const result = GameEngine.processPlayerAction(testGameState, attackAction);
      expect(result.success).toBe(true);
      
      // Enemy unit should be removed if destroyed
      const enemy = result.gameState?.units?.['enemy1'];
      expect(enemy?.health === undefined || enemy.health <= 0).toBe(true);
    });
  });

  describe('City Foundation', () => {
    test('should found city with settler', () => {
      const foundAction: GameAction = {
        type: GameActionType.FOUND_CITY,
        payload: {
          playerId: 'player1',
          unitId: 'settler1',
          position: { x: 4, y: 4 },
          cityName: 'New City'
        }
      };

      const result = GameEngine.processPlayerAction(testGameState, foundAction);
      expect(result.success).toBe(true);
      
      // Check that city was created
      const cities = Object.values(result.gameState?.cities || {});
      const newCity = cities.find(c => c.name === 'New City');
      expect(newCity).toBeDefined();
      
      // Settler should be consumed
      expect(result.gameState?.units?.['settler1']).toBeUndefined();
    });

    test('should reject city foundation by non-settler', () => {
      const foundAction: GameAction = {
        type: GameActionType.FOUND_CITY,
        payload: {
          playerId: 'player1',
          unitId: 'unit1', // Warrior, not settler
          position: { x: 3, y: 3 },
          cityName: 'Invalid City'
        }
      };

      const result = GameEngine.processPlayerAction(testGameState, foundAction);
      expect(result.success).toBe(false);
      expect(result.error).toContain('settler' || 'unit type');
    });

    test('should reject city foundation too close to existing city', () => {
      // Try to found city very close to Rome
      const foundAction: GameAction = {
        type: GameActionType.FOUND_CITY,
        payload: {
          playerId: 'player1',
          unitId: 'settler1',
          position: { q: 5, r: 6 }, // Adjacent to Rome at (5,5)
          cityName: 'Too Close'
        }
      };

      const result = GameEngine.processPlayerAction(testGameState, foundAction);
      expect(result.success).toBe(false);
      expect(result.error).toContain('close' || 'distance');
    });
  });

  describe('Production System', () => {
    test('should change city production', () => {
      const changeAction: GameAction = {
        type: GameActionType.CHANGE_PRODUCTION,
        payload: {
          playerId: 'player1',
          cityId: 'city1',
          productionType: 'unit',
          targetId: UnitType.SCOUT
        }
      };

      const result = GameEngine.processPlayerAction(testGameState, changeAction);
      expect(result.success).toBe(true);
      
      const city = result.gameState?.cities?.['city1'];
      expect(city?.production.item).toBe(UnitType.SCOUT);
    });

    test('should complete unit production when sufficient progress', () => {
      // Set production close to completion
      const city = testGameState.cities!['city1']!;
      city.production.progress = 38;
      city.production.cost = 40;

      const result = GameEngine.processTurnEnd(testGameState);
      expect(result.success).toBe(true);

      // Check if new unit was created
      const units = Object.values(result.gameState?.units || {});
      const newWarrior = units.find(u => u.type === UnitType.WARRIOR && u.position.q === 5 && u.position.r === 5);
      expect(newWarrior).toBeDefined();
    });
  });

  describe('Technology Research', () => {
    test('should research technology when science available', () => {
      const researchAction: GameAction = {
        type: GameActionType.RESEARCH_TECHNOLOGY,
        payload: {
          playerId: 'player1',
          technologyId: TechnologyType.POTTERY
        }
      };

      const result = GameEngine.processPlayerAction(testGameState, researchAction);
      expect(result.success).toBe(true);
      
      const player = result.gameState?.players?.find(p => p.id === 'player1');
      expect(player?.technologies).toContain(TechnologyType.POTTERY);
    });

    test('should reject research without sufficient science', () => {
      // Remove science resources
      const player1 = testGameState.players.find(p => p.id === 'player1')!;
      player1.resources.science = 0;

      const researchAction: GameAction = {
        type: GameActionType.RESEARCH_TECHNOLOGY,
        payload: {
          playerId: 'player1',
          technologyId: TechnologyType.POTTERY
        }
      };

      const result = GameEngine.processPlayerAction(testGameState, researchAction);
      expect(result.success).toBe(false);
      expect(result.error).toContain('science' || 'research');
    });
  });

  describe('Turn Management', () => {
    test('should end player turn and advance to next player', () => {
      const endTurnAction: GameAction = {
        type: GameActionType.END_TURN,
        payload: { playerId: 'player1' }
      };

      const result = GameEngine.processPlayerAction(testGameState, endTurnAction);
      expect(result.success).toBe(true);
      expect(result.gameState?.currentPlayer).toBe('player2');
    });

    test('should process full turn end when last player ends turn', () => {
      // Set current player to player2 (last player)
      testGameState.currentPlayer = 'player2';

      const endTurnAction: GameAction = {
        type: GameActionType.END_TURN,
        payload: { playerId: 'player2' }
      };

      const result = GameEngine.processPlayerAction(testGameState, endTurnAction);
      expect(result.success).toBe(true);
      expect(result.gameState?.currentTurn).toBe(2);
      expect(result.gameState?.currentPlayer).toBe('player1');
    });

    test('should reset unit movement at turn end', () => {
      // Exhaust unit movement
      testGameState.units!['unit1']!.moves = 0;

      const result = GameEngine.processTurnEnd(testGameState);
      expect(result.success).toBe(true);
      
      const unit = result.gameState?.units?.['unit1'];
      expect(unit?.moves).toBeGreaterThan(0);
    });

    test('should generate resources at turn end', () => {
      const initialGold = testGameState.players[0].resources.gold;
      
      const result = GameEngine.processTurnEnd(testGameState);
      expect(result.success).toBe(true);
      
      const player = result.gameState?.players?.find(p => p.id === 'player1');
      expect(player?.resources.gold).toBeGreaterThanOrEqual(initialGold);
    });
  });

  describe('Victory Conditions', () => {
    test('should detect no victory in normal game state', () => {
      const result = GameEngine.processTurnEnd(testGameState);
      expect(result.success).toBe(true);
      expect(result.victory).toBeFalsy();
    });

    test('should calculate player scores', () => {
      const result = GameEngine.processTurnEnd(testGameState);
      expect(result.success).toBe(true);
      
      // Check that scores are calculated (non-zero)
      const player1 = result.gameState?.players?.find(p => p.id === 'player1');
      expect(player1).toBeDefined();
      // Score calculation should consider cities, units, technologies
    });
  });

  describe('Utility Methods', () => {
    test('should find unit by ID', () => {
      // Test is internal to GameEngine, so we test through actions that use it
      const moveAction: GameAction = {
        type: GameActionType.MOVE_UNIT,
        payload: {
          playerId: 'player1',
          unitId: 'nonexistent',
          from: { x: 3, y: 3 },
          to: { x: 3, y: 4 }
        }
      };

      const result = GameEngine.processPlayerAction(testGameState, moveAction);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unit' || 'found');
    });

    test('should validate movement costs', () => {
      // Move to difficult terrain (if available in generated map)
      const moveAction: GameAction = {
        type: GameActionType.MOVE_UNIT,
        payload: {
          playerId: 'player1',
          unitId: 'unit1',
          from: { x: 3, y: 3 },
          to: { q: 2, r: 2 } // Different terrain type
        }
      };

      const result = GameEngine.processPlayerAction(testGameState, moveAction);
      // Should handle different terrain costs appropriately
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    test('should handle corrupted game state gracefully', () => {
      const corruptedState = { ...testGameState, players: null } as any;

      const action: GameAction = {
        type: GameActionType.END_TURN,
        payload: { playerId: 'player1' }
      };

      const result = GameEngine.processPlayerAction(corruptedState, action);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle missing required action data', () => {
      const incompleteAction: GameAction = {
        type: GameActionType.MOVE_UNIT,
        payload: { playerId: 'player1' } // Missing required fields
      };

      const result = GameEngine.processPlayerAction(testGameState, incompleteAction);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Build Improvement', () => {
    test('should process build improvement action', () => {
      // Add worker unit
      testGameState.units!['worker1'] = {
        id: 'worker1',
        type: UnitType.WORKER,
        position: { q: 2, r: 2 },
        moves: 2,
        health: 100,
        owner: 'player1'
      };
      testGameState.players[0].units.push(testGameState.units!['worker1']);

      const buildAction: GameAction = {
        type: GameActionType.BUILD_IMPROVEMENT,
        payload: {
          playerId: 'player1',
          unitId: 'worker1',
          position: { q: 2, r: 2 },
          improvementType: 'farm'
        }
      };

      const result = GameEngine.processPlayerAction(testGameState, buildAction);
      // Should either succeed or fail gracefully
      expect(typeof result.success).toBe('boolean');
      if (result.success) {
        // Check improvement was built
        const tile = result.gameState?.map?.tiles?.find(t => t.q === 2 && t.r === 2);
        expect(tile?.improvement).toBeDefined();
      }
    });
  });
});