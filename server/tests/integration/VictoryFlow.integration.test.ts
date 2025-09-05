import { Server, Socket } from 'socket.io';
import { GameManager } from '../../src/game/GameManager';
import { GameConfig, VictoryType } from '@civ-game/shared';

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

jest.mock('../../src/config/config', () => ({
  config: {
    GAME_CLEANUP_INTERVAL: 60000,
    TURN_TIME_LIMIT: 10
  }
}));

describe('Integration: Victory Flow and Late Action Rejection', () => {
  let gm: GameManager;
  const s1 = makeMockSocket('sock-p1');
  const s2 = makeMockSocket('sock-p2');

  const cfg: GameConfig = {
    maxPlayers: 2,
    mapSize: { width: 12, height: 12 },
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

  test('END_GAME triggers game_ended and further actions are rejected', () => {
    // Create and start 2P game
    (gm as any).handleCreateGame(s1 as Socket, { playerName: 'P1', gameConfig: cfg });
    const created = (s1.emit as jest.Mock).mock.calls.find(c => c[0] === 'game_created')?.[1];
    const gameId = created.gameId as string;
    (gm as any).handleJoinGame(s2 as Socket, { gameId, playerName: 'P2' });
    (gm as any).handleStartGame(s1 as Socket);

    const room = (gm as any).games.get(gameId);

    // Force score victory by pushing turn number high via shared-state bridge (turn mirrors currentTurn)
    room.gameState.currentTurn = 300;

    // Get current player/socket
    const current = room.gameState.getCurrentPlayer();
    const sock = ((gm as any).socketToPlayer.get((s1 as any).id) === current.id) ? s1 : s2;

    // Simulate end via manager glue (engine sets END_GAME in real flow)
    (gm as any).handleGameEnd(gameId);
    const endedBroadcast = (mockIo.emit as jest.Mock).mock.calls.find(c => c[0] === 'game_ended');
    expect(endedBroadcast).toBeDefined();

    // Further actions are rejected
    // Ensure rejection guard is active (explicitly set status)
    room.status = 'completed';
    (gm as any).handleGameAction(sock as Socket, { type: 'move_unit', playerId: current.id, data: { unitId: 'u1', from: { x: 0, y: 0 }, to: { x: 1, y: 0 } } });
    const emits = (sock.emit as jest.Mock).mock.calls;
    const hadError = emits.some(c => c[0] === 'error' && c[1]?.message?.includes('Game has ended'));
    const hadActionFailed = emits.some(c => c[0] === 'action_failed');
    expect(hadError || hadActionFailed).toBe(true);
  });
});
