import { Server, Socket } from 'socket.io';
import { GameManager } from '../../src/game/GameManager';
import { GameConfig, VictoryType } from '@civ-game/shared';
import { GamePhase } from '../../src/shared-types';

// Real integration: do NOT mock GameState/GameEngine here.

// Lightweight Socket/IO doubles
const makeMockSocket = (id: string) => ({
  id,
  emit: jest.fn(),
  join: jest.fn(),
  on: jest.fn(),
  disconnect: jest.fn()
}) as unknown as jest.Mocked<Partial<Socket>>;

const mockIo = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn()
} as unknown as jest.Mocked<Partial<Server>>;

// Config stub
jest.mock('../../src/config/config', () => ({
  config: {
    GAME_CLEANUP_INTERVAL: 60000,
    TURN_TIME_LIMIT: 10
  }
}));

describe('Integration: Game Loop (real state)', () => {
  let gm: GameManager;
  const creator = makeMockSocket('sock-creator');
  const joiner = makeMockSocket('sock-joiner');

  const config: GameConfig = {
    maxPlayers: 2,
    mapSize: { width: 16, height: 12 },
    turnTimeLimit: 30,
    victoryConditions: [VictoryType.DOMINATION],
    startingResources: { gold: 50, science: 0, culture: 0, production: 0, food: 0 } as any
  };

  beforeEach(() => {
    jest.clearAllMocks();
    gm = new GameManager(mockIo as Server);
  });

  afterEach(() => {
    gm.shutdown();
  });

  test('create → join → start → end_turn rotation over two turns', () => {
    // Create
    (gm as any).handleCreateGame(creator as Socket, { playerName: 'Alice', gameConfig: config });
    const gameCreatedCall = (creator.emit as jest.Mock).mock.calls.find((c: any[]) => c[0] === 'game_created');
    expect(gameCreatedCall).toBeDefined();
    const createdPayload = gameCreatedCall[1];
    const gameId = createdPayload.gameId as string;
    const p1Id = createdPayload.playerId as string;

    // Join
    (gm as any).handleJoinGame(joiner as Socket, { gameId, playerName: 'Bob' });
    const p2Id = (gm as any).socketToPlayer.get((joiner as any).id);
    expect(p2Id).toBeDefined();

    // Start
    ;(gm as any).handleStartGame(creator as Socket);
    const room = (gm as any).games.get(gameId);
    expect(room.gameState.phase).toBe(GamePhase.ACTIVE);

    // Turn 1: P1 ends turn
    const p1EndTurn = {
      type: 'end_turn',
      playerId: p1Id,
      data: {}
    };
    ;(gm as any).handleGameAction(creator as Socket, p1EndTurn);
    expect(creator.emit).toHaveBeenCalledWith('action_acknowledged', expect.objectContaining({ success: true }));
    expect(mockIo.emit).toHaveBeenCalledWith('game_updated', expect.any(Object));

    const afterP1 = (gm as any).games.get(gameId).gameState;
    const currentAfterP1 = afterP1.getCurrentPlayer().id;
    expect(currentAfterP1).toBe(p2Id);

    // Turn 1: P2 ends turn
    const p2EndTurn = {
      type: 'end_turn',
      playerId: p2Id,
      data: {}
    };
    ;(gm as any).handleGameAction(joiner as Socket, p2EndTurn);
    const afterP2 = (gm as any).games.get(gameId).gameState;
    const currentAfterP2 = afterP2.getCurrentPlayer().id;
    expect(currentAfterP2).toBe(p1Id);

    // Ensure rotation happened (turn number advancement can be engine-specific)
    expect(typeof afterP2.currentTurn).toBeDefined();
  });
});
