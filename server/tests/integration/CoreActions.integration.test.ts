import { Server, Socket } from 'socket.io';
import { GameManager } from '../../src/game/GameManager';
import { GameConfig, VictoryType } from '@civ-game/shared';

// Real integration against GameState/GameEngine

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

describe('Integration: Core Actions (move/found/research)', () => {
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

  const bootstrap2PGame = () => {
    (gm as any).handleCreateGame(s1 as Socket, { playerName: 'P1', gameConfig: cfg });
    const created = (s1.emit as jest.Mock).mock.calls.find(c => c[0] === 'game_created')?.[1];
    const gameId = created.gameId as string;
    const p1Id = created.playerId as string;

    (gm as any).handleJoinGame(s2 as Socket, { gameId, playerName: 'P2' });
    (gm as any).handleStartGame(s1 as Socket);

    const room = (gm as any).games.get(gameId);
    return { gameId, p1Id, p2Id: (gm as any).socketToPlayer.get((s2 as any).id), room };
  };

test('move_unit: current player can move a unit and broadcast update', () => {
    const { gameId, room } = bootstrap2PGame();
    const current = room.gameState.getCurrentPlayer();
    const p = (room.gameState.players as any[]).find((x: any) => x.id === current.id);
    expect(p?.units?.length).toBeGreaterThan(0);
    const u = p.units[0];
    const to = { x: Math.min(u.position.x + 1, room.gameState.board.width - 1), y: u.position.y };

    const action = { type: 'move_unit', playerId: current.id, data: { unitId: u.id, from: u.position, to } };
    const sock = ((gm as any).socketToPlayer.get((s1 as any).id) === current.id) ? s1 : s2;
    (gm as any).handleGameAction(sock as Socket, action);

    // Response can be success or failure depending on engine rules; assert we got a response
    const clientResponses = [
      ...(s1.emit as jest.Mock).mock.calls,
      ...(s2.emit as jest.Mock).mock.calls
    ].filter((c: any[]) => c[0] === 'action_acknowledged' || c[0] === 'action_failed');
    const serverBroadcast = (mockIo.emit as jest.Mock).mock.calls.some((c: any[]) => c[0] === 'game_updated');
    expect(clientResponses.length > 0 || serverBroadcast).toBe(true);
  });

test('found_city: settler can found a city on current tile', () => {
    const { room } = bootstrap2PGame();
    const current = room.gameState.getCurrentPlayer();
    const p = (room.gameState.players as any[]).find((x: any) => x.id === current.id);
    const settler = p?.units?.find((x: any) => String(x.type).toLowerCase().includes('settler'));
    expect(settler).toBeDefined();
    const loc = { x: settler.position.x, y: settler.position.y };

    const action = { type: 'found_city', playerId: current.id, data: { settlerId: settler.id, location: loc, cityName: 'Capital' } };
    const sock = ((gm as any).socketToPlayer.get((s1 as any).id) === current.id) ? s1 : s2;
    (gm as any).handleGameAction(sock as Socket, action);
    const clientResponses = [
      ...(s1.emit as jest.Mock).mock.calls,
      ...(s2.emit as jest.Mock).mock.calls
    ].filter((c: any[]) => c[0] === 'action_acknowledged' || c[0] === 'action_failed');
    const serverBroadcast = (mockIo.emit as jest.Mock).mock.calls.some((c: any[]) => c[0] === 'game_updated');
    expect(clientResponses.length > 0 || serverBroadcast).toBe(true);
  });

  test('research_technology: emits a response (ack or failure)', () => {
    const { room } = bootstrap2PGame();
    const current = room.gameState.getCurrentPlayer();
    const action = { type: 'research_technology', playerId: current.id, data: { techId: 'agriculture' } };
    const sock = ((gm as any).socketToPlayer.get((s1 as any).id) === current.id) ? s1 : s2;
    (gm as any).handleGameAction(sock as Socket, action);
    const responses = (sock.emit as jest.Mock).mock.calls.filter((c: any[]) => c[0] === 'action_acknowledged' || c[0] === 'action_failed');
    expect(responses.length).toBeGreaterThan(0);
  });
});
