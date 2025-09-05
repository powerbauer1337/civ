import { Server, Socket } from 'socket.io';
import { GameManager } from '../../src/game/GameManager';
import { GamePhase } from '../../src/shared-types';

// Lightweight Socket/IO doubles (no real network)
const makeMockSocket = (id: string) => ({
  id,
  emit: jest.fn(),
  join: jest.fn(),
  on: jest.fn(),
  leave: jest.fn()
}) as unknown as jest.Mocked<Partial<Socket>>;

const makeMockIo = () => ({
  to: jest.fn().mockReturnThis(),
  emit: jest.fn()
}) as unknown as jest.Mocked<Partial<Server>>;

describe('Spectator-readonly enforcement (integration-lite)', () => {
  const io = makeMockIo();
  const gm = new GameManager(io as Server);
  const playerSock = makeMockSocket('sock-p1');
  const specSock = makeMockSocket('sock-spec');

  const cfg = {
    maxPlayers: 4,
    mapSize: { width: 16, height: 12 },
    turnTimeLimit: 30,
    victoryConditions: ['domination'],
    startingResources: { gold: 100, science: 30, culture: 10 }
  } as any;

  afterAll(() => gm.shutdown());

  it('rejects actions from sockets not mapped to a player', () => {
    // Create a game and map player socket
    (gm as any).handleCreateGame(playerSock as Socket, { playerName: 'Host', gameConfig: cfg });
    const gameId = Array.from((gm as any).games.keys())[0];

    // Start game with only host (expect error on start, so add a quick joiner)
    const joinerSock = makeMockSocket('sock-p2');
    (gm as any).handleJoinGame(joinerSock as Socket, { gameId, playerName: 'P2' });
    (gm as any).handleStartGame(playerSock as Socket);

    // Sanity
    const room = (gm as any).games.get(gameId);
    expect(room.gameState.phase).toBe(GamePhase.ACTIVE);

    // Spectator joins as spectator (not a player mapping)
    (gm as any).handleSpectateGame(specSock as Socket, { gameId });

    // Attempt to send a game_action from spectator socket
    (gm as any).handleGameAction(specSock as Socket, {
      type: 'end_turn',
      playerId: 'someone',
      data: {},
      timestamp: Date.now(),
      actionId: 'action-1'
    });

    // Expect server to emit an error to that socket
    expect(specSock.emit).toHaveBeenCalledWith('error', expect.objectContaining({ message: 'Player not found' }));
  });
});
