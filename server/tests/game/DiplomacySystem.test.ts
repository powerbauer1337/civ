import { GameEngine } from '../../src/game/GameEngine';
import { GameAction, GameActionType, GameState, PlayerState, DiplomacyStatus } from '@civ-game/shared';

describe('Diplomacy System - Baseline', () => {
  let gameState: GameState;
  let p1: PlayerState;
  let p2: PlayerState;

  beforeEach(() => {
    p1 = {
      id: 'p1',
      userId: 'p1',
      name: 'Player 1',
      color: '#f00',
      civilization: 'Romans',
      resources: { food: 10, production: 10, gold: 10, science: 10, culture: 0, faith: 0 },
      technologies: [],
      cities: [],
      units: [],
      score: 0,
      isAlive: true,
      isActive: true
    };
    p2 = {
      id: 'p2',
      userId: 'p2',
      name: 'Player 2',
      color: '#0f0',
      civilization: 'Greeks',
      resources: { food: 10, production: 10, gold: 10, science: 10, culture: 0, faith: 0 },
      technologies: [],
      cities: [],
      units: [],
      score: 0,
      isAlive: true,
      isActive: true
    };

    gameState = {
      id: 'g1',
      gameId: 'g1',
      currentPlayer: 'p1',
      turn: 1,
      currentTurn: 1,
      phase: 'PLAYER_TURN' as any,
      map: {} as any,
      players: [p1, p2],
      cities: {},
      units: {},
      lastUpdate: new Date()
    };
  });

  test('should declare war between two players', () => {
    const action: GameAction = {
      type: GameActionType.DECLARE_WAR,
      payload: { playerId: 'p1', targetPlayerId: 'p2' }
    };
    const engine = new GameEngine();
    const result = engine.processAction(gameState, action);

    expect(result.success).toBe(true);
    const key = ['p1', 'p2'].sort().join('|');
    expect(result.newState!.diplomacy).toBeDefined();
    expect(result.newState!.diplomacy![key].status).toBe(DiplomacyStatus.WAR);
  });

  test('should offer and accept peace', () => {
    const engine = new GameEngine();

    // First declare war
    let action: GameAction = {
      type: GameActionType.DECLARE_WAR,
      payload: { playerId: 'p1', targetPlayerId: 'p2' }
    };
    let result = engine.processAction(gameState, action);
    expect(result.success).toBe(true);

    // Offer peace from p1 to p2
    action = {
      type: GameActionType.OFFER_PEACE,
      payload: { playerId: 'p1', targetPlayerId: 'p2' }
    };
    result = engine.processAction(gameState, action);
    expect(result.success).toBe(true);

    // Switch current player to p2 to accept
    gameState.currentPlayer = 'p2';
    action = {
      type: GameActionType.ACCEPT_PEACE,
      payload: { playerId: 'p2', withPlayerId: 'p1' }
    };
    result = engine.processAction(gameState, action);
    expect(result.success).toBe(true);

    const key = ['p1', 'p2'].sort().join('|');
    expect(result.newState!.diplomacy![key].status).toBe(DiplomacyStatus.PEACE);
  });
});
