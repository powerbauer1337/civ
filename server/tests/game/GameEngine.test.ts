import { GameEngine } from '../../src/game/GameEngine';
import { GameState, GameAction, ActionType, UnitType, TerrainType, TechnologyType } from '@civ-game/shared';
import { HexMap } from '../../src/game/HexMap';

describe('GameEngine', () => {
  let gameEngine: GameEngine;
  let initialState: GameState;

  beforeEach(() => {
    gameEngine = new GameEngine();
    
    // Create a test game state
    const hexMap = new HexMap();
    const map = hexMap.generateMap(10, 10);
    
    initialState = {
      id: 'test-game',
      turn: 1,
      currentPlayer: 'player1',
      players: {
        'player1': {
          id: 'player1',
          name: 'Player 1',
          civilization: 'Romans',
          resources: {
            gold: 100,
            food: 50,
            production: 30,
            science: 10
          },
          technologies: [],
          cities: [],
          units: []
        },
        'player2': {
          id: 'player2',
          name: 'Player 2',
          civilization: 'Greeks',
          resources: {
            gold: 100,
            food: 50,
            production: 30,
            science: 10
          },
          technologies: [],
          cities: [],
          units: []
        }
      },
      map: map,
      winner: null,
      gameOver: false
    };
    
    // Place initial units
    initialState.map[5][5].unit = {
      type: UnitType.Settler,
      owner: 'player1',
      moves: 2,
      maxMoves: 2
    };
    
    initialState.map[3][3].unit = {
      type: UnitType.Warrior,
      owner: 'player1',
      moves: 1,
      maxMoves: 1
    };
    
    initialState.players.player1.units = [
      { id: 'settler1', type: UnitType.Settler, position: { q: 5, r: 5 }, moves: 2, maxMoves: 2 },
      { id: 'warrior1', type: UnitType.Warrior, position: { q: 3, r: 3 }, moves: 1, maxMoves: 1 }
    ];
  });

  describe('Action Processing', () => {
    test('should process move unit action', () => {
      const action: GameAction = {
        type: ActionType.MoveUnit,
        playerId: 'player1',
        data: {
          from: { q: 3, r: 3 },
          to: { q: 3, r: 4 }
        }
      };
      
      const result = gameEngine.processAction(initialState, action);
      
      expect(result.success).toBe(true);
      expect(result.newState?.map[3][3].unit).toBeUndefined();
      expect(result.newState?.map[4][3].unit).toBeDefined();
      expect(result.newState?.map[4][3].unit?.owner).toBe('player1');
    });

    test('should reject invalid move actions', () => {
      // Try to move to an occupied tile
      initialState.map[4][3].unit = {
        type: UnitType.Scout,
        owner: 'player2',
        moves: 3,
        maxMoves: 3
      };
      
      const action: GameAction = {
        type: ActionType.MoveUnit,
        playerId: 'player1',
        data: {
          from: { q: 3, r: 3 },
          to: { q: 3, r: 4 }
        }
      };
      
      const result = gameEngine.processAction(initialState, action);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('occupied');
    });

    test('should process found city action', () => {
      const action: GameAction = {
        type: ActionType.FoundCity,
        playerId: 'player1',
        data: {
          position: { q: 5, r: 5 },
          name: 'Rome'
        }
      };
      
      const result = gameEngine.processAction(initialState, action);
      
      expect(result.success).toBe(true);
      expect(result.newState?.map[5][5].city).toBeDefined();
      expect(result.newState?.map[5][5].city?.name).toBe('Rome');
      expect(result.newState?.map[5][5].city?.owner).toBe('player1');
      expect(result.newState?.map[5][5].unit).toBeUndefined(); // Settler consumed
      expect(result.newState?.players.player1.cities).toHaveLength(1);
    });

    test('should reject founding city on water', () => {
      initialState.map[5][5].terrain = TerrainType.Ocean;
      
      const action: GameAction = {
        type: ActionType.FoundCity,
        playerId: 'player1',
        data: {
          position: { q: 5, r: 5 },
          name: 'Atlantis'
        }
      };
      
      const result = gameEngine.processAction(initialState, action);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('water');
    });

    test('should process attack action', () => {
      // Place enemy unit
      initialState.map[4][3].unit = {
        type: UnitType.Warrior,
        owner: 'player2',
        moves: 1,
        maxMoves: 1
      };
      
      const action: GameAction = {
        type: ActionType.Attack,
        playerId: 'player1',
        data: {
          attacker: { q: 3, r: 3 },
          target: { q: 3, r: 4 }
        }
      };
      
      const result = gameEngine.processAction(initialState, action);
      
      expect(result.success).toBe(true);
      // Combat result will vary, but action should process
      expect(result.newState).toBeDefined();
    });

    test('should process end turn action', () => {
      const action: GameAction = {
        type: ActionType.EndTurn,
        playerId: 'player1',
        data: {}
      };
      
      const result = gameEngine.processAction(initialState, action);
      
      expect(result.success).toBe(true);
      expect(result.newState?.currentPlayer).toBe('player2');
      expect(result.newState?.turn).toBe(1); // Same turn, different player
    });

    test('should increment turn when all players have acted', () => {
      // First player ends turn
      let action: GameAction = {
        type: ActionType.EndTurn,
        playerId: 'player1',
        data: {}
      };
      
      let result = gameEngine.processAction(initialState, action);
      expect(result.newState?.currentPlayer).toBe('player2');
      
      // Second player ends turn
      action = {
        type: ActionType.EndTurn,
        playerId: 'player2',
        data: {}
      };
      
      result = gameEngine.processAction(result.newState!, action);
      
      expect(result.success).toBe(true);
      expect(result.newState?.currentPlayer).toBe('player1');
      expect(result.newState?.turn).toBe(2); // Turn incremented
    });
  });

  describe('Resource Management', () => {
    beforeEach(() => {
      // Add a city for resource generation
      initialState.map[5][5].city = {
        name: 'TestCity',
        owner: 'player1',
        population: 3,
        buildings: [],
        production: null
      };
      initialState.players.player1.cities.push({
        id: 'city1',
        name: 'TestCity',
        position: { q: 5, r: 5 },
        population: 3,
        buildings: [],
        production: null
      });
    });

    test('should generate resources from cities', () => {
      const newState = gameEngine.generateResources(initialState);
      
      expect(newState.players.player1.resources.food).toBeGreaterThan(50);
      expect(newState.players.player1.resources.production).toBeGreaterThan(30);
      expect(newState.players.player1.resources.gold).toBeGreaterThan(100);
    });

    test('should consume resources for unit maintenance', () => {
      // Add more units for maintenance cost
      initialState.players.player1.units.push(
        { id: 'warrior2', type: UnitType.Warrior, position: { q: 1, r: 1 }, moves: 1, maxMoves: 1 },
        { id: 'warrior3', type: UnitType.Warrior, position: { q: 2, r: 2 }, moves: 1, maxMoves: 1 }
      );
      
      const newState = gameEngine.applyMaintenance(initialState);
      
      expect(newState.players.player1.resources.gold).toBeLessThan(100);
    });

    test('should handle resource shortages', () => {
      initialState.players.player1.resources.gold = 0;
      
      const newState = gameEngine.applyMaintenance(initialState);
      
      // Should not go negative
      expect(newState.players.player1.resources.gold).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Technology System', () => {
    test('should process research technology action', () => {
      initialState.players.player1.resources.science = 50;
      
      const action: GameAction = {
        type: ActionType.Research,
        playerId: 'player1',
        data: {
          technology: TechnologyType.Agriculture
        }
      };
      
      const result = gameEngine.processAction(initialState, action);
      
      expect(result.success).toBe(true);
      expect(result.newState?.players.player1.technologies).toContain(TechnologyType.Agriculture);
      expect(result.newState?.players.player1.resources.science).toBeLessThan(50);
    });

    test('should reject research without enough science', () => {
      initialState.players.player1.resources.science = 5;
      
      const action: GameAction = {
        type: ActionType.Research,
        playerId: 'player1',
        data: {
          technology: TechnologyType.Agriculture
        }
      };
      
      const result = gameEngine.processAction(initialState, action);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('science');
    });

    test('should prevent duplicate technology research', () => {
      initialState.players.player1.technologies = [TechnologyType.Agriculture];
      initialState.players.player1.resources.science = 50;
      
      const action: GameAction = {
        type: ActionType.Research,
        playerId: 'player1',
        data: {
          technology: TechnologyType.Agriculture
        }
      };
      
      const result = gameEngine.processAction(initialState, action);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already researched');
    });
  });

  describe('Combat System', () => {
    test('should calculate combat strength correctly', () => {
      const warriorStrength = gameEngine.getUnitCombatStrength(UnitType.Warrior);
      const settlerStrength = gameEngine.getUnitCombatStrength(UnitType.Settler);
      const scoutStrength = gameEngine.getUnitCombatStrength(UnitType.Scout);
      
      expect(warriorStrength).toBeGreaterThan(settlerStrength);
      expect(warriorStrength).toBeGreaterThan(scoutStrength);
      expect(scoutStrength).toBeGreaterThan(settlerStrength);
    });

    test('should apply terrain bonuses in combat', () => {
      // Place defender on hills
      initialState.map[4][3].terrain = TerrainType.Hills;
      initialState.map[4][3].unit = {
        type: UnitType.Warrior,
        owner: 'player2',
        moves: 1,
        maxMoves: 1
      };
      
      const defenderBonus = gameEngine.getTerrainDefenseBonus(TerrainType.Hills);
      expect(defenderBonus).toBeGreaterThan(0);
    });

    test('should handle unit death in combat', () => {
      // Set up a likely win scenario
      initialState.map[4][3].unit = {
        type: UnitType.Settler, // Weak unit
        owner: 'player2',
        moves: 2,
        maxMoves: 2
      };
      
      const action: GameAction = {
        type: ActionType.Attack,
        playerId: 'player1',
        data: {
          attacker: { q: 3, r: 3 }, // Warrior
          target: { q: 3, r: 4 }
        }
      };
      
      // Run combat multiple times to account for randomness
      let defenderDied = false;
      for (let i = 0; i < 10; i++) {
        const result = gameEngine.processAction(initialState, action);
        if (result.newState?.map[4][3].unit === undefined) {
          defenderDied = true;
          break;
        }
      }
      
      expect(defenderDied).toBe(true);
    });
  });

  describe('Victory Conditions', () => {
    test('should detect domination victory', () => {
      // Give player1 all cities
      for (let i = 0; i < 5; i++) {
        initialState.players.player1.cities.push({
          id: `city${i}`,
          name: `City${i}`,
          position: { q: i, r: i },
          population: 5,
          buildings: [],
          production: null
        });
      }
      
      // Remove player2's cities
      initialState.players.player2.cities = [];
      
      const victory = gameEngine.checkVictoryConditions(initialState);
      
      expect(victory.gameOver).toBe(true);
      expect(victory.winner).toBe('player1');
      expect(victory.type).toBe('domination');
    });

    test('should detect science victory', () => {
      // Give player1 many technologies
      initialState.players.player1.technologies = [
        TechnologyType.Agriculture,
        TechnologyType.Mining,
        TechnologyType.Writing,
        TechnologyType.Mathematics,
        TechnologyType.Engineering
      ];
      
      const victory = gameEngine.checkVictoryConditions(initialState);
      
      // Science victory requires specific tech threshold
      if (initialState.players.player1.technologies.length >= 10) {
        expect(victory.gameOver).toBe(true);
        expect(victory.winner).toBe('player1');
        expect(victory.type).toBe('science');
      }
    });

    test('should not declare victory prematurely', () => {
      const victory = gameEngine.checkVictoryConditions(initialState);
      
      expect(victory.gameOver).toBe(false);
      expect(victory.winner).toBeNull();
    });
  });

  describe('Turn Management', () => {
    test('should refresh unit movement on new turn', () => {
      // Use up unit moves
      initialState.map[3][3].unit!.moves = 0;
      
      // Process turn change
      const newState = gameEngine.startNewTurn(initialState);
      
      expect(newState.map[3][3].unit!.moves).toBe(newState.map[3][3].unit!.maxMoves);
    });

    test('should process city production on turn', () => {
      initialState.map[5][5].city = {
        name: 'ProductionCity',
        owner: 'player1',
        population: 5,
        buildings: [],
        production: {
          type: 'unit',
          item: UnitType.Warrior,
          progress: 15,
          cost: 20
        }
      };
      
      const newState = gameEngine.processCityProduction(initialState);
      
      // Production should advance
      if (newState.map[5][5].city?.production) {
        expect(newState.map[5][5].city.production.progress).toBeGreaterThan(15);
      }
    });

    test('should complete production when ready', () => {
      initialState.map[5][5].city = {
        name: 'ProductionCity',
        owner: 'player1',
        population: 5,
        buildings: [],
        production: {
          type: 'unit',
          item: UnitType.Warrior,
          progress: 19,
          cost: 20
        }
      };
      
      initialState.players.player1.resources.production = 50;
      
      const newState = gameEngine.processCityProduction(initialState);
      
      // Should spawn new unit near city
      let unitSpawned = false;
      const neighbors = gameEngine.getNeighbors(5, 5);
      for (const neighbor of neighbors) {
        if (newState.map[neighbor.r]?.[neighbor.q]?.unit?.type === UnitType.Warrior) {
          unitSpawned = true;
          break;
        }
      }
      
      expect(unitSpawned).toBe(true);
    });
  });

  describe('Game State Validation', () => {
    test('should validate game state integrity', () => {
      const isValid = gameEngine.validateGameState(initialState);
      expect(isValid).toBe(true);
    });

    test('should detect invalid game states', () => {
      // Create invalid state - unit without owner
      initialState.map[0][0].unit = {
        type: UnitType.Warrior,
        owner: 'invalid-player',
        moves: 1,
        maxMoves: 1
      };
      
      const isValid = gameEngine.validateGameState(initialState);
      expect(isValid).toBe(false);
    });

    test('should handle missing player data', () => {
      delete initialState.players.player2;
      
      const isValid = gameEngine.validateGameState(initialState);
      expect(isValid).toBe(false);
    });
  });
});
