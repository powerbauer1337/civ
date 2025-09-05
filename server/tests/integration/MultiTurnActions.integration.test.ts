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

describe('Integration: Multi-turn core actions sequence', () => {
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

  const setup = () => {
    (gm as any).handleCreateGame(s1 as Socket, { playerName: 'P1', gameConfig: cfg });
    const created = (s1.emit as jest.Mock).mock.calls.find(c => c[0] === 'game_created')?.[1];
    const gameId = created.gameId as string;
    (gm as any).handleJoinGame(s2 as Socket, { gameId, playerName: 'P2' });
    (gm as any).handleStartGame(s1 as Socket);
    const room = (gm as any).games.get(gameId);
    return { gameId, room };
  };

  test('research → end_turn → found_city → end_turn across two turns', () => {
    const { gameId, room } = setup();

    // Turn A: research tech then end turn
    let current = room.gameState.getCurrentPlayer();
    let sock = ((gm as any).socketToPlayer.get((s1 as any).id) === current.id) ? s1 : s2;
    (gm as any).handleGameAction(sock as Socket, { type: 'research_technology', playerId: current.id, data: { techId: 'agriculture' } });
    (gm as any).handleGameAction(sock as Socket, { type: 'end_turn', playerId: current.id, data: {} });

    // Turn B: found city then end turn
    current = room.gameState.getCurrentPlayer();
    sock = ((gm as any).socketToPlayer.get((s1 as any).id) === current.id) ? s1 : s2;
    const player = (room.gameState.players as any[]).find((p: any) => p.id === current.id);
    const settler = player?.units?.find((x: any) => String(x.type).toLowerCase().includes('settler'));
    if (settler) {
      (gm as any).handleGameAction(sock as Socket, { type: 'found_city', playerId: current.id, data: { settlerId: settler.id, location: { x: settler.position.x, y: settler.position.y }, cityName: 'MT-Capital' } });
    }
    (gm as any).handleGameAction(sock as Socket, { type: 'end_turn', playerId: current.id, data: {} });

    // Assertions: events occurred
    const serverBroadcasts = (mockIo.emit as jest.Mock).mock.calls.filter(c => c[0] === 'game_updated');
    expect(serverBroadcasts.length).toBeGreaterThan(0);
    // Turn should have advanced at least once
    expect(room.gameState.currentTurn).toBeGreaterThanOrEqual(2);
  });
});

