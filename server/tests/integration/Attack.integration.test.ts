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

describe('Integration: Basic attack action acknowledgement', () => {
  let gm: GameManager;
  const s1 = makeMockSocket('sock-p1');
  const s2 = makeMockSocket('sock-p2');

  const cfg: GameConfig = {
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

  test('attack_unit yields ack or failure response', () => {
    // Create and start
    (gm as any).handleCreateGame(s1 as Socket, { playerName: 'P1', gameConfig: cfg });
    const created = (s1.emit as jest.Mock).mock.calls.find(c => c[0] === 'game_created')?.[1];
    const gameId = created.gameId as string;
    (gm as any).handleJoinGame(s2 as Socket, { gameId, playerName: 'P2' });
    (gm as any).handleStartGame(s1 as Socket);

    const room = (gm as any).games.get(gameId);
    const current = room.gameState.getCurrentPlayer();
    const me = (room.gameState.players as any[]).find((p: any) => p.id === current.id);
    const other = (room.gameState.players as any[]).find((p: any) => p.id !== current.id);

    const myUnit = me?.units?.[0];
    const enemyUnit = other?.units?.[0];
    expect(myUnit && enemyUnit).toBeTruthy();

    const sock = ((gm as any).socketToPlayer.get((s1 as any).id) === current.id) ? s1 : s2;
    (gm as any).handleGameAction(sock as Socket, {
      type: 'attack_unit',
      playerId: current.id,
      data: { attackerId: myUnit?.id, targetId: enemyUnit?.id }
    });

    const emits = (sock.emit as jest.Mock).mock.calls.filter((c: any[]) => c[0] === 'action_acknowledged' || c[0] === 'action_failed');
    expect(emits.length).toBeGreaterThan(0);
  });
});

