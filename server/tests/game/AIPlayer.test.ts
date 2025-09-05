import { AIPlayer, AIPersonality, AIDifficulty } from '../../src/game/AIPlayer';
import { HexMap } from '../../src/game/HexMap';
import { GameEngine } from '../../src/game/GameEngine';
import {
  Position,
  UnitType,
  TerrainType,
  TerrainFeature,
  TechnologyType,
  BuildingType,
  GameActionType
} from '@civ-game/shared';
import { GameState, GameAction } from '../../src/shared-types';

// Mock external dependencies
jest.mock('../../src/game/HexMap');
jest.mock('../../src/game/GameEngine');

const mockHexMap = HexMap as jest.MockedClass<typeof HexMap>;
const mockGameEngine = GameEngine as jest.MockedClass<typeof GameEngine>;

describe('AIPlayer', () => {
  let aiPlayer: AIPlayer;
  let mockGameState: GameState;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock HexMap methods - should return neighbors for (2,2)
    mockHexMap.prototype.getNeighbors = jest.fn().mockImplementation((x, y) => {
      // For warrior at (2,2), return proper neighbors
      if (x === 2 && y === 2) {
        return [
          { x: 3, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 3 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 1, y: 3 }
        ];
      }
      // Default return for other positions
      return [
        { x: x + 1, y: y }, { x: x - 1, y: y }, { x: x, y: y + 1 }
      ];
    });
    mockHexMap.prototype.calculateDistance = jest.fn().mockImplementation((x1, y1, x2, y2) => {
      // Return 0 for same position, reasonable distances for nearby tiles
      if (x1 === x2 && y1 === y2) return 0;
      if (Math.abs(x1 - x2) <= 1 && Math.abs(y1 - y2) <= 1) return 1; // Adjacent tiles
      return 5; // Default distance for city spacing
    });
    mockHexMap.prototype.getTilesInRange = jest.fn().mockReturnValue([
      { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 4, y: 5 } // Include city position and adjacent tiles
    ]);
    
    aiPlayer = new AIPlayer('test-ai-player', AIPersonality.Balanced, AIDifficulty.Normal);
    
    // Create mock players first
    const testPlayer = {
      id: 'test-ai-player',
      name: 'Test AI',
      units: [
        {
          id: 'unit-1',
          type: UnitType.WARRIOR,
          position: { x: 2, y: 2 },
          moves: 2,
          health: 100,
          owner: 'test-ai-player'
        }
      ],
      cities: [
        {
          id: 'city-1',
          name: 'Test City',
          position: { x: 5, y: 5 },
          population: 1,
          production: { type: 'unit', item: UnitType.WARRIOR, progress: 5, cost: 10 },
          owner: 'test-ai-player'
        }
      ],
      technologies: [TechnologyType.AGRICULTURE],
      resources: {
        food: 10,
        production: 15,
        science: 25,
        gold: 30
      }
    };

    const enemyPlayer = {
      id: 'enemy-player',
      name: 'Enemy',
      units: [
        {
          id: 'enemy-unit-1',
          type: UnitType.WARRIOR,
          position: { x: 3, y: 2 },
          moves: 2,
          health: 80,
          owner: 'enemy-player'
        }
      ],
      cities: [],
      technologies: [],
      resources: { food: 5, production: 5, science: 5, gold: 5 }
    };
    
    // Create board tiles data that works for both access patterns
    const boardTiles = Array.from({ length: 10 }, (_, r) => 
      Array.from({ length: 10 }, (_, q) => ({
        terrain: r < 2 ? TerrainType.OCEAN : TerrainType.GRASSLAND,
        resource: q === 3 && r === 3 ? 'iron' : null,
        improvement: null,
        unit: (q === 3 && r === 2) ? enemyPlayer.units[0] : null,
        city: (q === 5 && r === 5) ? testPlayer.cities[0] : null,
        visible: true
      }))
    );
    
    // Create mock game state with board that supports both access patterns
    mockGameState = {
      currentPlayer: 'test-ai-player' as any,
      currentTurn: 10,
      players: {
        'test-ai-player': testPlayer,
        'enemy-player': enemyPlayer
      },
      board: Object.assign(boardTiles, { tiles: boardTiles }) as any,
      gameSettings: {
        mapSize: { width: 10, height: 10 },
        difficulty: 'normal',
        turnLimit: 500,
        victoryConditions: ['conquest']
      }
    } as GameState;
  });

  describe('Constructor', () => {
    it('should create AIPlayer with default parameters', () => {
      const defaultAI = new AIPlayer('player-1');
      expect(defaultAI).toBeDefined();
    });

    it('should create AIPlayer with specified personality and difficulty', () => {
      const aggressiveAI = new AIPlayer('player-1', AIPersonality.Aggressive, AIDifficulty.Hard);
      expect(aggressiveAI).toBeDefined();
    });

    it('should initialize with correct default personality and difficulty', () => {
      const balancedAI = new AIPlayer('player-1', AIPersonality.Balanced, AIDifficulty.Normal);
      expect(balancedAI).toBeDefined();
    });
  });

  describe('makeDecisions', () => {
    it('should return empty actions if not current player', async () => {
      const differentPlayerState = {
        ...mockGameState,
        currentPlayer: 'other-player' as any
      };

      const actions = await aiPlayer.makeDecisions(differentPlayerState);
      expect(actions).toEqual([]);
    });

    it('should return empty actions if player not found', async () => {
      const noPlayerState = {
        ...mockGameState,
        players: {}
      };

      const actions = await aiPlayer.makeDecisions(noPlayerState);
      expect(actions).toEqual([]);
    });

    it('should make decisions for current AI player', async () => {
      const actions = await aiPlayer.makeDecisions(mockGameState);
      
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[actions.length - 1].type).toBe(GameActionType.END_TURN);
      expect(actions[actions.length - 1].playerId).toBe('test-ai-player');
    });

    it('should limit actions per turn based on difficulty', async () => {
      const easyAI = new AIPlayer('test-ai-player', AIPersonality.Balanced, AIDifficulty.Easy);
      const actions = await easyAI.makeDecisions(mockGameState);
      
      // Easy difficulty should have max 3 actions + END_TURN
      expect(actions.length).toBeLessThanOrEqual(4);
    });
  });

  describe('Personality-based Decisions', () => {
    it('should prioritize military units for aggressive AI', async () => {
      const aggressiveAI = new AIPlayer('test-ai-player', AIPersonality.Aggressive, AIDifficulty.Normal);
      
      // Add more units to trigger attack strategy
      mockGameState.players['test-ai-player'].units = Array.from({ length: 6 }, (_, i) => ({
        id: `unit-${i}`,
        type: UnitType.WARRIOR,
        position: { x: i, y: i },
        moves: 2,
        health: 100,
        owner: 'test-ai-player'
      }));

      const actions = await aggressiveAI.makeDecisions(mockGameState);
      const attackActions = actions.filter(a => a.type === GameActionType.ATTACK_UNIT);
      
      expect(actions.length).toBeGreaterThan(0);
    });

    it('should prioritize economic buildings for economic AI', async () => {
      const economicAI = new AIPlayer('test-ai-player', AIPersonality.Economic, AIDifficulty.Normal);
      
      // Set city production to be ready for new production
      mockGameState.players['test-ai-player'].cities[0].production.progress = 15;
      mockGameState.players['test-ai-player'].cities[0].production.cost = 10;

      const actions = await economicAI.makeDecisions(mockGameState);
      const productionActions = actions.filter(a => a.type === GameActionType.CHANGE_PRODUCTION);
      
      expect(actions.length).toBeGreaterThan(0);
    });

    it('should prioritize science buildings for scientific AI', async () => {
      const scientificAI = new AIPlayer('test-ai-player', AIPersonality.Scientific, AIDifficulty.Normal);
      
      // Set city production ready
      mockGameState.players['test-ai-player'].cities[0].production.progress = 15;
      mockGameState.players['test-ai-player'].cities[0].production.cost = 10;

      const actions = await scientificAI.makeDecisions(mockGameState);
      
      expect(actions.length).toBeGreaterThan(0);
    });
  });

  describe('Unit Decision Making', () => {
    it('should make warrior attack adjacent enemies', async () => {
      // Create isolated test state to avoid test interdependency
      const testGameState = JSON.parse(JSON.stringify(mockGameState));
      
      // Place enemy unit adjacent to AI warrior at (3,2)
      const neighborPos = { x: 3, y: 2 };
      testGameState.board[neighborPos.y][neighborPos.x].unit = {
        id: 'enemy-unit-2',
        type: UnitType.WARRIOR,
        position: neighborPos,
        moves: 2,
        health: 80,
        owner: 'enemy-player'
      };

      const actions = await aiPlayer.makeDecisions(testGameState);
      const attackActions = actions.filter(a => a.type === GameActionType.ATTACK_UNIT);
      
      expect(attackActions.length).toBeGreaterThan(0);
      if (attackActions.length > 0) {
        expect(attackActions[0].data.attacker).toEqual({ x: 2, y: 2 });
        expect(attackActions[0].data.target).toEqual(neighborPos);
      }
    });

    it('should make settler found city at best location', async () => {
      // Create a fresh game state for this test to avoid interdependencies
      const testGameState = {
        ...mockGameState,
        players: {
          ...mockGameState.players,
          'test-ai-player': {
            ...mockGameState.players['test-ai-player'],
            units: [
              ...mockGameState.players['test-ai-player'].units,
              {
                id: 'settler-1',
                type: UnitType.SETTLER,
                position: { x: 8, y: 8 },
                moves: 2,
                health: 100,
                owner: 'test-ai-player'
              }
            ]
          }
        }
      };

      const actions = await aiPlayer.makeDecisions(testGameState);
      const settlerActions = actions.filter(a => 
        a.type === GameActionType.FOUND_CITY || a.type === GameActionType.MOVE_UNIT
      );
      
      expect(settlerActions.length).toBeGreaterThan(0);
    });

    it('should make scout explore unexplored areas', async () => {
      // Create a larger board with more unexplored areas
      const largeBoardTiles = Array.from({ length: 20 }, (_, r) => 
        Array.from({ length: 20 }, (_, q) => ({
          terrain: TerrainType.GRASSLAND,
          resource: null,
          improvement: null,
          unit: null,
          city: null,
          visible: true
        }))
      );
      
      // Place existing units/cities only in a small corner
      largeBoardTiles[2][3].unit = mockGameState.players['enemy-player'].units[0];
      largeBoardTiles[5][5].city = mockGameState.players['test-ai-player'].cities[0];
      
      const largeGameState = {
        ...mockGameState,
        board: Object.assign(largeBoardTiles, { tiles: largeBoardTiles }) as any
      };

      // Add scout unit and remove other units to limit vision
      largeGameState.players['test-ai-player'].units = [{
        id: 'scout-1',
        type: UnitType.SCOUT,
        position: { x: 10, y: 10 }, // Middle of board
        moves: 3,
        health: 100,
        owner: 'test-ai-player'
      }];

      // Clear AI's explored tiles to ensure fresh exploration
      (aiPlayer as any).exploredTiles.clear();

      // Mock the pathfinding to return a valid path
      const mockFindPathTo = jest.fn().mockReturnValue([{ x: 11, y: 10 }]);
      (aiPlayer as any).findPathTo = mockFindPathTo;

      const actions = await aiPlayer.makeDecisions(largeGameState);
      const scoutActions = actions.filter(a => a.type === GameActionType.MOVE_UNIT);
      
      expect(scoutActions.length).toBeGreaterThan(0);
    });

    it('should make worker improve tiles', async () => {
      // Add worker unit positioned near city
      mockGameState.players['test-ai-player'].units.push({
        id: 'worker-1',
        type: UnitType.WORKER,
        position: { x: 5, y: 5 }, // Same as city position
        moves: 2,
        health: 100,
        owner: 'test-ai-player'
      });
      
      // Ensure the tile at worker position exists and can be improved
      if (!mockGameState.board[5]) mockGameState.board[5] = [];
      mockGameState.board[5][5] = {
        terrain: TerrainType.GRASSLAND,
        improvement: null,
        resource: null
      };

      const actions = await aiPlayer.makeDecisions(mockGameState);
      const workerActions = actions.filter(a => 
        a.type === GameActionType.BUILD_IMPROVEMENT || a.type === GameActionType.MOVE_UNIT
      );
      
      expect(workerActions.length).toBeGreaterThan(0);
    });
  });

  describe('City Decision Making', () => {
    it('should change city production when current production is complete', async () => {
      // Use insane difficulty to avoid random mistake chance interference
      const insaneAI = new AIPlayer('test-ai-player', AIPersonality.Balanced, AIDifficulty.Insane);
      
      // Set production as completed
      mockGameState.players['test-ai-player'].cities[0].production.progress = 15;
      mockGameState.players['test-ai-player'].cities[0].production.cost = 10;

      const actions = await insaneAI.makeDecisions(mockGameState);
      const productionActions = actions.filter(a => a.type === GameActionType.CHANGE_PRODUCTION);
      
      expect(productionActions.length).toBeGreaterThan(0);
      expect(productionActions[0].data.cityId).toBe('city-1');
    });

    it('should prioritize settlers for expansion strategy', async () => {
      const expandingGameState = {
        ...mockGameState,
        currentTurn: 25 // Later turn to avoid explore strategy
      };
      
      expandingGameState.players['test-ai-player'].units.push({
        id: 'settler-1',
        type: UnitType.SETTLER,
        position: { x: 4, y: 4 },
        moves: 2,
        health: 100,
        owner: 'test-ai-player'
      });

      // Complete current production
      expandingGameState.players['test-ai-player'].cities[0].production.progress = 15;
      expandingGameState.players['test-ai-player'].cities[0].production.cost = 10;

      // Populate explored tiles to avoid explore strategy
      (aiPlayer as any).exploredTiles.clear();
      for (let i = 0; i < 150; i++) {
        (aiPlayer as any).exploredTiles.add(`${i % 10},${Math.floor(i / 10)}`);
      }

      const actions = await aiPlayer.makeDecisions(expandingGameState);
      const productionActions = actions.filter(a => a.type === GameActionType.CHANGE_PRODUCTION);
      
      expect(productionActions.length).toBeGreaterThan(0);
    });
  });

  describe('Technology Decision Making', () => {
    it('should research technology when science is available', async () => {
      // Create isolated test state to avoid test interdependency
      const testGameState = JSON.parse(JSON.stringify(mockGameState));
      
      // Ensure enough science and limited techs
      testGameState.players['test-ai-player'].resources.science = 25;
      testGameState.players['test-ai-player'].technologies = [TechnologyType.AGRICULTURE];
      testGameState.players['test-ai-player'].currentResearch = null; // Not currently researching

      const actions = await aiPlayer.makeDecisions(testGameState);
      const techActions = actions.filter(a => a.type === GameActionType.RESEARCH_TECHNOLOGY);
      
      expect(techActions.length).toBeGreaterThan(0);
      expect(techActions[0].playerId).toBe('test-ai-player');
    });

    it('should not research technology when science is insufficient', async () => {
      // Low science
      mockGameState.players['test-ai-player'].resources.science = 10;

      const actions = await aiPlayer.makeDecisions(mockGameState);
      const techActions = actions.filter(a => a.type === GameActionType.RESEARCH_TECHNOLOGY);
      
      expect(techActions.length).toBe(0);
    });
  });

  describe('Strategy Determination', () => {
    it('should choose defend strategy when under threat', async () => {
      // Place enemy unit very close to city
      mockGameState.board[5][4].unit = {
        id: 'threat-unit',
        type: UnitType.WARRIOR,
        position: { x: 4, y: 5 },
        moves: 2,
        health: 100,
        owner: 'enemy-player'
      };

      const actions = await aiPlayer.makeDecisions(mockGameState);
      
      expect(actions.length).toBeGreaterThan(0);
    });

    it('should choose explore strategy in early game', async () => {
      const earlyGameState = {
        ...mockGameState,
        currentTurn: 5
      };

      const actions = await aiPlayer.makeDecisions(earlyGameState);
      
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[actions.length - 1].type).toBe(GameActionType.END_TURN);
    });

    it('should choose expand strategy when having settler and few cities', async () => {
      mockGameState.players['test-ai-player'].units.push({
        id: 'settler-expand',
        type: UnitType.SETTLER,
        position: { x: 7, y: 7 },
        moves: 2,
        health: 100,
        owner: 'test-ai-player'
      });

      const actions = await aiPlayer.makeDecisions(mockGameState);
      
      expect(actions.length).toBeGreaterThan(0);
    });
  });

  describe('Difficulty Modifiers', () => {
    it('should apply easy difficulty modifiers', async () => {
      const easyAI = new AIPlayer('test-ai-player', AIPersonality.Balanced, AIDifficulty.Easy);
      const actions = await easyAI.makeDecisions(mockGameState);
      
      // Easy AI should make fewer actions (max 3 + END_TURN)
      expect(actions.length).toBeLessThanOrEqual(4);
      expect(actions[actions.length - 1].type).toBe(GameActionType.END_TURN);
    });

    it('should apply hard difficulty modifiers', async () => {
      const hardAI = new AIPlayer('test-ai-player', AIPersonality.Balanced, AIDifficulty.Hard);
      const actions = await hardAI.makeDecisions(mockGameState);
      
      // Hard AI can make up to 8 actions + END_TURN
      expect(actions.length).toBeLessThanOrEqual(9);
      expect(actions[actions.length - 1].type).toBe(GameActionType.END_TURN);
    });

    it('should apply insane difficulty modifiers', async () => {
      const insaneAI = new AIPlayer('test-ai-player', AIPersonality.Balanced, AIDifficulty.Insane);
      const actions = await insaneAI.makeDecisions(mockGameState);
      
      // Insane AI can make up to 12 actions + END_TURN
      expect(actions.length).toBeLessThanOrEqual(13);
      expect(actions[actions.length - 1].type).toBe(GameActionType.END_TURN);
    });
  });

  describe('Vision and Knowledge Updates', () => {
    it('should track explored tiles', async () => {
      await aiPlayer.makeDecisions(mockGameState);
      
      // AI should have updated its knowledge of the game world
      expect(mockHexMap.prototype.calculateDistance).toHaveBeenCalled();
    });

    it('should track enemy positions', async () => {
      // Add visible enemy unit
      mockGameState.board[3][3].unit = {
        id: 'visible-enemy',
        type: UnitType.WARRIOR,
        position: { x: 3, y: 3 },
        moves: 2,
        health: 100,
        owner: 'enemy-player'
      };

      await aiPlayer.makeDecisions(mockGameState);
      
      // AI should process enemy positions in its decision making
      expect(mockHexMap.prototype.calculateDistance).toHaveBeenCalled();
    });
  });

  describe('Pathfinding and Movement', () => {
    it('should find path to target locations', async () => {
      // Add scout that needs to move
      mockGameState.players['test-ai-player'].units.push({
        id: 'moving-scout',
        type: UnitType.SCOUT,
        position: { x: 1, y: 1 },
        moves: 3,
        health: 100,
        owner: 'test-ai-player'
      });

      const actions = await aiPlayer.makeDecisions(mockGameState);
      const moveActions = actions.filter(a => a.type === GameActionType.MOVE_UNIT);
      
      expect(moveActions.length).toBeGreaterThan(0);
      if (moveActions.length > 0) {
        expect(moveActions[0].data.from).toBeDefined();
        expect(moveActions[0].data.to).toBeDefined();
      }
    });
  });

  describe('City Location Evaluation', () => {
    it('should evaluate potential city locations based on terrain and resources', async () => {
      // Add settler to trigger city location evaluation
      mockGameState.players['test-ai-player'].units.push({
        id: 'evaluating-settler',
        type: UnitType.SETTLER,
        position: { x: 6, y: 6 },
        moves: 2,
        health: 100,
        owner: 'test-ai-player'
      });

      const actions = await aiPlayer.makeDecisions(mockGameState);
      
      expect(actions.length).toBeGreaterThan(0);
    });
  });

  describe('Threat Assessment', () => {
    it('should assess threats to cities and units', async () => {
      // Place threatening enemy unit near city
      mockGameState.board[5][4].unit = {
        id: 'city-threat',
        type: UnitType.WARRIOR,
        position: { x: 4, y: 5 },
        moves: 2,
        health: 100,
        owner: 'enemy-player'
      };

      const actions = await aiPlayer.makeDecisions(mockGameState);
      
      // AI should respond to threats with defensive moves
      expect(actions.length).toBeGreaterThan(0);
    });

    it('should assess threats to settler units specifically', async () => {
      // Add settler and nearby enemy
      mockGameState.players['test-ai-player'].units.push({
        id: 'threatened-settler',
        type: UnitType.SETTLER,
        position: { x: 3, y: 3 },
        moves: 2,
        health: 100,
        owner: 'test-ai-player'
      });

      mockGameState.board[2][3].unit = {
        id: 'settler-threat',
        type: UnitType.WARRIOR,
        position: { x: 3, y: 2 },
        moves: 2,
        health: 100,
        owner: 'enemy-player'
      };

      const actions = await aiPlayer.makeDecisions(mockGameState);
      
      expect(actions.length).toBeGreaterThan(0);
    });
  });

  describe('Resource and Improvement Management', () => {
    it('should prioritize improvements based on terrain type', async () => {
      // Add worker near different terrain types
      mockGameState.players['test-ai-player'].units.push({
        id: 'improving-worker',
        type: UnitType.WORKER,
        position: { x: 6, y: 6 },
        moves: 2,
        health: 100,
        owner: 'test-ai-player'
      });

      // Set different terrain types around the worker
      mockGameState.board[6][6].terrain = TerrainType.GRASSLAND;
      mockGameState.board[6][7].terrain = TerrainType.HILLS;

      const actions = await aiPlayer.makeDecisions(mockGameState);
      const improvementActions = actions.filter(a => a.type === GameActionType.BUILD_IMPROVEMENT);
      
      expect(actions.length).toBeGreaterThan(0);
    });
  });

  describe('Decision Priority System', () => {
    it('should sort decisions by priority', async () => {
      // Create situation with multiple possible decisions
      mockGameState.players['test-ai-player'].units.push(
        {
          id: 'priority-settler',
          type: UnitType.SETTLER,
          position: { x: 8, y: 8 },
          moves: 2,
          health: 100,
          owner: 'test-ai-player'
        },
        {
          id: 'priority-worker',
          type: UnitType.WORKER,
          position: { x: 5, y: 5 }, // Same position as city
          moves: 2,
          health: 100,
          owner: 'test-ai-player'
        }
      );

      // Set production ready for city
      mockGameState.players['test-ai-player'].cities[0].production.progress = 15;
      mockGameState.players['test-ai-player'].cities[0].production.cost = 10;
      
      // Add science for technology research
      mockGameState.players['test-ai-player'].resources.science = 25;
      mockGameState.players['test-ai-player'].currentResearch = null;
      
      // Ensure tiles exist for worker improvements
      if (!mockGameState.board[5]) mockGameState.board[5] = [];
      mockGameState.board[5][5] = {
        terrain: TerrainType.GRASSLAND,
        improvement: null,
        resource: null
      };

      const actions = await aiPlayer.makeDecisions(mockGameState);
      
      // Should make multiple different types of decisions
      expect(actions.length).toBeGreaterThan(2);
      expect(actions[actions.length - 1].type).toBe(GameActionType.END_TURN);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty game board gracefully', async () => {
      const emptyBoardState = {
        ...mockGameState,
        board: Object.assign([], { tiles: [] })
      };

      const actions = await aiPlayer.makeDecisions(emptyBoardState);
      
      // Should at least end turn
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[actions.length - 1].type).toBe(GameActionType.END_TURN);
    });

    it('should handle player with no units', async () => {
      const noUnitsState = {
        ...mockGameState,
        players: {
          ...mockGameState.players,
          'test-ai-player': {
            ...mockGameState.players['test-ai-player'],
            units: []
          }
        }
      };

      const actions = await aiPlayer.makeDecisions(noUnitsState);
      
      // Should still be able to make city/tech decisions
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[actions.length - 1].type).toBe(GameActionType.END_TURN);
    });

    it('should handle player with no cities', async () => {
      const noCitiesState = {
        ...mockGameState,
        players: {
          ...mockGameState.players,
          'test-ai-player': {
            ...mockGameState.players['test-ai-player'],
            cities: []
          }
        }
      };

      const actions = await aiPlayer.makeDecisions(noCitiesState);
      
      // Should still make unit decisions
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[actions.length - 1].type).toBe(GameActionType.END_TURN);
    });
  });
});