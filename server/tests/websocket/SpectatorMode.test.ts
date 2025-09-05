import { SocketHandler } from '../../src/websocket/SocketHandler';
import { Server, Socket } from 'socket.io';
import GameService from '../../src/services/GameService';

// Mock Socket.IO Server and Socket
const mockSocket = {
  id: 'spectator-socket-id',
  emit: jest.fn(),
  join: jest.fn(),
  to: jest.fn().mockReturnThis(),
  on: jest.fn(),
  disconnect: jest.fn()
} as unknown as jest.Mocked<Partial<Socket>>;

const mockIo = {
  on: jest.fn(),
  to: jest.fn().mockReturnThis(),
  emit: jest.fn()
} as unknown as jest.Mocked<Partial<Server>>;

// Mock GameService
const mockGameService = {
  getGame: jest.fn(),
  getPlayer: jest.fn(),
  setPlayerOnlineStatus: jest.fn(),
  processGameAction: jest.fn(),
  updatePlayerActivity: jest.fn()
} as unknown as jest.Mocked<GameService>;

// Mock logger
jest.mock('@civ-game/shared/utils', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    log: jest.fn()
  }
}));

describe('SocketHandler - Spectator Mode', () => {
  let socketHandler: SocketHandler;
  let onConnection: (socket: Socket) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockIo.on as jest.Mock).mockImplementation((event: string, handler: Function) => {
      if (event === 'connection') {
        onConnection = handler as (socket: Socket) => void;
      }
    });

    socketHandler = new SocketHandler(mockIo as unknown as Server, mockGameService);
  });

  test('registers join_spectator handler on connection', () => {
    onConnection(mockSocket as unknown as Socket);
    expect((mockSocket.on as jest.Mock)).toHaveBeenCalledWith('join_spectator', expect.any(Function));
  });

  test('joins room and acknowledges spectator join when game exists', () => {
    onConnection(mockSocket as unknown as Socket);
    const calls = (mockSocket.on as jest.Mock).mock.calls;
    const [, joinSpectatorHandler] = calls.find((c: any[]) => c[0] === 'join_spectator');

    // Mock game present
    (mockGameService.getGame as jest.Mock).mockReturnValue({ id: 'game-1' });

    joinSpectatorHandler({ gameId: 'game-1', displayName: 'Alice' });

    expect(mockSocket.join).toHaveBeenCalledWith('game-1');
    expect(mockSocket.emit).toHaveBeenCalledWith('spectator_joined', expect.objectContaining({
      gameId: 'game-1',
      displayName: 'Alice'
    }));
  });

  test('emits error if game not found', () => {
    onConnection(mockSocket as unknown as Socket);
    const calls = (mockSocket.on as jest.Mock).mock.calls;
    const [, joinSpectatorHandler] = calls.find((c: any[]) => c[0] === 'join_spectator');

    (mockGameService.getGame as jest.Mock).mockReturnValue(undefined);

    joinSpectatorHandler({ gameId: 'missing' });

    expect(mockSocket.emit).toHaveBeenCalledWith('error', {
      message: 'Game not found',
      type: 'join_spectator_error'
    });
    expect(mockSocket.join).not.toHaveBeenCalled();
  });

  test('handles internal errors gracefully', () => {
    onConnection(mockSocket as unknown as Socket);
    const calls = (mockSocket.on as jest.Mock).mock.calls;
    const [, joinSpectatorHandler] = calls.find((c: any[]) => c[0] === 'join_spectator');

    (mockGameService.getGame as jest.Mock).mockImplementation(() => { throw new Error('db'); });

    joinSpectatorHandler({ gameId: 'game-1' });

    expect(mockSocket.emit).toHaveBeenCalledWith('error', {
      message: 'Failed to join as spectator',
      type: 'join_spectator_error'
    });
  });
});

