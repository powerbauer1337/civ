/**
 * Technology System Tests - Phase 2.2.1
 * Tests for enhanced technology database, prerequisites, and effects
 */

import { TECHNOLOGY_DATABASE, validateTechnologyPrerequisites, getAvailableTechnologies, calculateResearchCost } from '@civ-game/shared';
import { GameEngine } from '../../src/game/GameEngine';
import { GameState, PlayerState, GameAction, GameActionType } from '@civ-game/shared';

describe('Enhanced Technology System - Phase 2.2.1', () => {
  
  describe('Technology Database', () => {
    test('should have 25+ technologies in the database', () => {
      const techCount = Object.keys(TECHNOLOGY_DATABASE).length;
      expect(techCount).toBeGreaterThanOrEqual(25);
    });

    test('should have technologies spanning all eras', () => {
      const eras = new Set();
      Object.values(TECHNOLOGY_DATABASE).forEach(tech => {
        eras.add(tech.era);
      });
      
      expect(eras.size).toBeGreaterThanOrEqual(8); // All 8 eras
      expect(eras).toContain('ancient');
      expect(eras).toContain('information');
    });

    test('should have valid prerequisite chains', () => {
      Object.values(TECHNOLOGY_DATABASE).forEach(tech => {
        tech.prerequisites.forEach(prereq => {
          expect(TECHNOLOGY_DATABASE[prereq]).toBeDefined();
        });
      });
    });

    test('should have technology effects for most technologies', () => {
      const techsWithEffects = Object.values(TECHNOLOGY_DATABASE)
        .filter(tech => tech.effects && Object.keys(tech.effects).length > 0);
      
      // At least 80% of technologies should have effects
      expect(techsWithEffects.length / Object.keys(TECHNOLOGY_DATABASE).length)
        .toBeGreaterThan(0.8);
    });
  });

  describe('Prerequisite Validation', () => {
    test('should validate agriculture has no prerequisites', () => {
      const result = validateTechnologyPrerequisites('agriculture', []);
      expect(result.valid).toBe(true);
      expect(result.missingPrerequisites).toHaveLength(0);
    });

    test('should validate pottery requires agriculture', () => {
      const result = validateTechnologyPrerequisites('pottery', []);
      expect(result.valid).toBe(false);
      expect(result.missingPrerequisites).toContain('agriculture');
    });

    test('should validate pottery can be researched with agriculture', () => {
      const result = validateTechnologyPrerequisites('pottery', ['agriculture']);
      expect(result.valid).toBe(true);
      expect(result.missingPrerequisites).toHaveLength(0);
    });

    test('should validate complex prerequisite chains', () => {
      const result = validateTechnologyPrerequisites('mathematics', ['writing', 'pottery']);
      expect(result.valid).toBe(true);
    });
  });

  describe('Available Technologies', () => {
    test('should return only agriculture for new player', () => {
      const available = getAvailableTechnologies([]);
      const availableIds = available.map(tech => tech.id);
      
      expect(availableIds).toContain('agriculture');
      // Should not contain techs with prerequisites
      expect(availableIds).not.toContain('pottery');
      expect(availableIds).not.toContain('mathematics');
    });

    test('should return next tier technologies after research', () => {
      const available = getAvailableTechnologies(['agriculture']);
      const availableIds = available.map(tech => tech.id);
      
      expect(availableIds).toContain('pottery');
      expect(availableIds).toContain('animal_husbandry');
      expect(availableIds).not.toContain('agriculture'); // Already researched
    });
  });

  describe('Research Cost Calculation', () => {
    test('should calculate base costs correctly', () => {
      const agriculture = TECHNOLOGY_DATABASE['agriculture'];
      const cost = calculateResearchCost(agriculture);
      expect(cost).toBe(25);
    });

    test('should apply modifiers to research costs', () => {
      const agriculture = TECHNOLOGY_DATABASE['agriculture'];
      const cost = calculateResearchCost(agriculture, 1.5, 1.2);
      expect(cost).toBe(Math.round(25 * 1.5 * 1.2));
    });
  });

  describe('GameEngine Technology Processing', () => {
    let gameState: GameState;
    let mockPlayerState: PlayerState;

    beforeEach(() => {
      mockPlayerState = {
        id: 'player1',
        userId: 'player1',
        name: 'Test Player',
        color: '#FF0000',
        civilization: 'Romans',
        resources: { food: 10, production: 10, gold: 10, science: 50, culture: 5, faith: 0 },
        technologies: [],
        cities: [],
        units: [],
        score: 0,
        isAlive: true,
        isActive: true
      };

      gameState = {
        id: 'test-game',
        status: 'IN_PROGRESS' as any,
        currentPlayer: 'player1',
        currentTurn: 1,
        turn: 1,
        players: [mockPlayerState],
        map: {},
        phase: 'PLAYER_TURN' as any,
        winner: null,
        createdAt: new Date(),
        lastUpdate: new Date()
      };
    });

    test('should successfully research agriculture', () => {
      const action: GameAction = {
        type: GameActionType.RESEARCH_TECHNOLOGY,
        playerId: 'player1',
        payload: { playerId: 'player1', techId: 'agriculture' }
      };

      const gameEngine = new GameEngine();
      const result = gameEngine.processAction(gameState, action);

      expect(result.success).toBe(true);
      expect(result.newState).toBeDefined();
      
      const playerTech = result.newState!.players[0].technologies.find(t => t.techId === 'agriculture');
      expect(playerTech).toBeDefined();
      expect(playerTech!.progress).toBeGreaterThan(0);
    });

    test('should fail to research pottery without agriculture', () => {
      const action: GameAction = {
        type: GameActionType.RESEARCH_TECHNOLOGY,
        playerId: 'player1',
        payload: { playerId: 'player1', techId: 'pottery' }
      };

      const gameEngine = new GameEngine();
      const result = gameEngine.processAction(gameState, action);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing prerequisites');
    });

    test('should successfully research pottery after agriculture', () => {
      // First research agriculture
      mockPlayerState.technologies.push({
        techId: 'agriculture',
        isResearched: true,
        progress: 25
      });

      const action: GameAction = {
        type: GameActionType.RESEARCH_TECHNOLOGY,
        playerId: 'player1',
        payload: { playerId: 'player1', techId: 'pottery' }
      };

      const gameEngine = new GameEngine();
      const result = gameEngine.processAction(gameState, action);

      expect(result.success).toBe(true);
      
      const playerTech = result.newState!.players[0].technologies.find(t => t.techId === 'pottery');
      expect(playerTech).toBeDefined();
      expect(playerTech!.progress).toBeGreaterThan(0);
    });

    test('should fail with insufficient science', () => {
      mockPlayerState.resources.science = 0;

      const action: GameAction = {
        type: GameActionType.RESEARCH_TECHNOLOGY,
        playerId: 'player1',
        payload: { playerId: 'player1', techId: 'agriculture' }
      };

      const gameEngine = new GameEngine();
      const result = gameEngine.processAction(gameState, action);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient science points');
    });

    test('should apply technology effects when research completes', () => {
      mockPlayerState.resources.science = 100; // Enough to complete agriculture immediately

      const action: GameAction = {
        type: GameActionType.RESEARCH_TECHNOLOGY,
        playerId: 'player1',
        payload: { playerId: 'player1', techId: 'agriculture' }
      };

      const gameEngine = new GameEngine();
      const result = gameEngine.processAction(gameState, action);

      expect(result.success).toBe(true);
      
      const playerTech = result.newState!.players[0].technologies.find(t => t.techId === 'agriculture');
      expect(playerTech!.isResearched).toBe(true);
      
      // Check that resource bonus was applied (agriculture gives +1 food)
      expect(result.newState!.players[0].resources.food).toBeGreaterThan(10);
    });
  });
});