import { GameEngine } from '../../src/game/GameEngine';
import { GameAction, GameActionType, GameState, PlayerState, DiplomacyStatus, Unit, UnitType } from '@civ-game/shared';
import { HexMap } from '../../src/game/HexMap';

describe('Diplomacy - Alliance acceptance and combat restrictions', () => {
  let gameState: GameState;
  let p1: PlayerState;
  let p2: PlayerState;

  beforeEach(() => {
    p1 = {
      id: 'p1', userId: 'p1', name: 'P1', color: '#f00', civilization: 'Romans',
      resources: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 },
      technologies: [], cities: [], units: [], score: 0, isAlive: true, isActive: true
    };
    p2 = {
      id: 'p2', userId: 'p2', name: 'P2', color: '#0f0', civilization: 'Greeks',
      resources: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 },
      technologies: [], cities: [], units: [], score: 0, isAlive: true, isActive: true
    };

    const map = new HexMap(3, 3);
    const attacker: Unit = {
      id: 'u1', type: UnitType.WARRIOR, name: 'A', playerId: 'p1', x: 1, y: 1,
      movement: 2, maxMovement: 2, health: 100, maxHealth: 100, strength: 10, experience: 0, promotions: [], status: []
    };
    const target: Unit = {
      id: 'u2', type: UnitType.WARRIOR, name: 'B', playerId: 'p2', x: 1, y: 2,
      movement: 2, maxMovement: 2, health: 100, maxHealth: 100, strength: 10, experience: 0, promotions: [], status: []
    };

    map.getTile(1, 1)!.unit = attacker;
    map.getTile(1, 2)!.unit = target;

    gameState = {
      id: 'g1', gameId: 'g1', currentPlayer: 'p1', turn: 1, currentTurn: 1,
      phase: 'PLAYER_TURN' as any, map: map.serialize(), players: [p1, p2],
      cities: {}, units: { u1: attacker, u2: target }, lastUpdate: new Date(),
      diplomacy: {}
    };
  });

  test('propose and accept alliance establishes ALLIANCE status', () => {
    const engine = new GameEngine();
    let result = engine.processAction(gameState, { type: GameActionType.PROPOSE_ALLIANCE, payload: { playerId: 'p1', targetPlayerId: 'p2' } } as GameAction);
    expect(result.success).toBe(true);
    // Switch to p2 and accept
    gameState.currentPlayer = 'p2';
    result = engine.processAction(gameState, { type: GameActionType.ACCEPT_ALLIANCE, payload: { playerId: 'p2', withPlayerId: 'p1' } } as GameAction);
    expect(result.success).toBe(true);
    const key = ['p1', 'p2'].sort().join('|');
    expect(result.newState!.diplomacy![key].status).toBe(DiplomacyStatus.ALLIANCE);
  });

  test('attack blocked when relation is PEACE', () => {
    // Set peace relation
    gameState.diplomacy!['p1|p2'] = { a: 'p1', b: 'p2', status: DiplomacyStatus.PEACE, sinceTurn: 1, lastUpdated: new Date() };
    const engine = new GameEngine();
    const result = engine.processAction(gameState, { type: GameActionType.ATTACK_UNIT, payload: { attackerId: 'u1', targetId: 'u2' } } as GameAction);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/peace or alliance/);
  });
});

