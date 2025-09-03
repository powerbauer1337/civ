import { SocketHandler } from '../../src/websocket/SocketHandler';
import { Server, Socket } from 'socket.io';
import GameService from '../../src/services/GameService';

// Mock Socket.IO Server and Socket
const mockSocket = {
  id: 'test-socket-id',
  emit: jest.fn(),
  join: jest.fn(),
  to: jest.fn().mockReturnThis(),
  on: jest.fn(),
  disconnect: jest.fn()
} as jest.Mocked<Partial<Socket>>;

const mockIo = {
  on: jest.fn(),
  to: jest.fn().mockReturnThis(),
  emit: jest.fn()
} as jest.Mocked<Partial<Server>>;

// Mock GameService
const mockGameService = {
  getGame: jest.fn(),
  getPlayer: jest.fn(),
  setPlayerOnlineStatus: jest.fn(),
  processGameAction: jest.fn(),
  updatePlayerActivity: jest.fn()
} as jest.Mocked<GameService>;

// Mock console.log to avoid cluttering test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});

describe('SocketHandler', () => {
  let socketHandler: SocketHandler;
  let mockSocketSetupCallback: (socket: Socket) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Capture the connection handler
    (mockIo.on as jest.Mock).mockImplementation((event: string, handler: Function) => {
      if (event === 'connection') {
        mockSocketSetupCallback = handler;
      }
    });

    socketHandler = new SocketHandler(mockIo as Server, mockGameService);
  });

  describe('Constructor and Setup', () => {
    test('should initialize and set up socket events', () => {
      expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('Socket Connection Handling', () => {
    beforeEach(() => {
      mockSocketSetupCallback(mockSocket as Socket);
    });

    test('should log client connection', () => {
      expect(console.log).toHaveBeenCalledWith('🔌 WebSocket client connected: test-socket-id');
    });

    test('should send welcome message on connection', () => {
      expect(mockSocket.emit).toHaveBeenCalledWith('welcome', {
        message: 'Connected to Civilization Game Server',
        timestamp: expect.any(String),
        socketId: 'test-socket-id'
      });
    });

    test('should set up game event listeners', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('join_game', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('game_action', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('chat_message', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('player_activity', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });
  });

  describe('Join Game Handling', () => {
    let joinGameHandler: Function;
    
    beforeEach(() => {
      mockSocketSetupCallback(mockSocket as Socket);
      // Extract the join_game handler
      const onCalls = (mockSocket.on as jest.Mock).mock.calls;
      const joinGameCall = onCalls.find(call => call[0] === 'join_game');
      joinGameHandler = joinGameCall[1];
    });

    test('should successfully join game when game and player exist', () => {
      const mockGame = {
        id: 'game-123',
        status: 'waiting',
        players: [
          { id: 'player-1', username: 'Player1', civilization: 'Rome' }
        ]
      };
      const mockPlayer = { id: 'player-1', username: 'Player1' };

      mockGameService.getGame.mockReturnValue(mockGame);
      mockGameService.getPlayer.mockReturnValue(mockPlayer);

      joinGameHandler({ gameId: 'game-123', playerId: 'player-1' });

      expect(mockSocket.join).toHaveBeenCalledWith('game-123');
      expect(mockGameService.setPlayerOnlineStatus).toHaveBeenCalledWith('player-1', true);
      expect(mockSocket.emit).toHaveBeenCalledWith('game_joined', {
        gameId: 'game-123',
        message: 'Successfully joined game room'
      });
      expect(mockSocket.to).toHaveBeenCalledWith('game-123');
    });

    test('should emit error when game not found', () => {
      mockGameService.getGame.mockReturnValue(null);
      mockGameService.getPlayer.mockReturnValue({ id: 'player-1', username: 'Player1' });

      joinGameHandler({ gameId: 'game-123', playerId: 'player-1' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Game or player not found',
        type: 'join_game_error'
      });
      expect(mockSocket.join).not.toHaveBeenCalled();
    });

    test('should emit error when player not found', () => {
      const mockGame = { id: 'game-123', status: 'waiting', players: [] };
      mockGameService.getGame.mockReturnValue(mockGame);
      mockGameService.getPlayer.mockReturnValue(null);

      joinGameHandler({ gameId: 'game-123', playerId: 'player-1' });

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Game or player not found',
        type: 'join_game_error'
      });
    });

    test('should broadcast game_started when active game reaches minimum players', () => {
      const mockGame = {
        id: 'game-123',
        status: 'active',
        players: [
          { id: 'player-1', username: 'Player1', civilization: 'Rome' },
          { id: 'player-2', username: 'Player2', civilization: 'Egypt' }
        ]
      };
      const mockPlayer = { id: 'player-1', username: 'Player1' };

      mockGameService.getGame.mockReturnValue(mockGame);
      mockGameService.getPlayer.mockReturnValue(mockPlayer);

      joinGameHandler({ gameId: 'game-123', playerId: 'player-1' });

      expect(mockIo.to).toHaveBeenCalledWith('game-123');
      expect(mockIo.emit).toHaveBeenCalledWith('game_started', {
        gameId: 'game-123',
        players: mockGame.players.map(p => ({
          id: p.id,
          username: p.username,
          civilization: p.civilization
        }))
      });
    });

    test('should handle join game error gracefully', () => {
      mockGameService.getGame.mockImplementation(() => {
        throw new Error('Database error');
      });

      joinGameHandler({ gameId: 'game-123', playerId: 'player-1' });

      expect(console.error).toHaveBeenCalledWith('Error joining game:', expect.any(Error));
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to join game',
        type: 'join_game_error'
      });
    });
  });

  describe('Game Action Handling', () => {
    let gameActionHandler: Function;
    
    beforeEach(() => {
      mockSocketSetupCallback(mockSocket as Socket);
      const onCalls = (mockSocket.on as jest.Mock).mock.calls;
      const gameActionCall = onCalls.find(call => call[0] === 'game_action');
      gameActionHandler = gameActionCall[1];
    });

    test('should process valid game action successfully', () => {
      mockGameService.processGameAction.mockReturnValue(true);

      const actionData = {
        gameId: 'game-123',
        playerId: 'player-1',
        action: 'move_unit',
        payload: { unitId: 'unit-1', to: { q: 1, r: 1 } }
      };

      gameActionHandler(actionData);

      expect(mockGameService.processGameAction).toHaveBeenCalledWith(
        'game-123',
        'player-1',
        'move_unit',
        { unitId: 'unit-1', to: { q: 1, r: 1 } }
      );

      expect(mockSocket.to).toHaveBeenCalledWith('game-123');
      expect(mockSocket.emit).toHaveBeenCalledWith('game_update', {
        action: 'move_unit',
        playerId: 'player-1',
        payload: { unitId: 'unit-1', to: { q: 1, r: 1 } },
        timestamp: expect.any(String)
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('action_acknowledged', {
        action: 'move_unit',
        success: true,
        timestamp: expect.any(String)
      });
    });

    test('should handle failed game action', () => {
      mockGameService.processGameAction.mockReturnValue(false);

      const actionData = {
        gameId: 'game-123',
        playerId: 'player-1',
        action: 'invalid_action',
        payload: {}
      };

      gameActionHandler(actionData);

      expect(mockSocket.emit).toHaveBeenCalledWith('action_acknowledged', {
        action: 'invalid_action',
        success: false,
        error: 'Failed to process action',
        timestamp: expect.any(String)
      });

      // Should not broadcast to other players
      expect(mockSocket.to).not.toHaveBeenCalled();
    });

    test('should handle game action processing error', () => {
      mockGameService.processGameAction.mockImplementation(() => {
        throw new Error('Processing error');
      });

      const actionData = {
        gameId: 'game-123',
        playerId: 'player-1',
        action: 'move_unit',
        payload: {}
      };

      gameActionHandler(actionData);

      expect(console.error).toHaveBeenCalledWith('Error processing game action:', expect.any(Error));
      expect(mockSocket.emit).toHaveBeenCalledWith('action_acknowledged', {
        action: 'move_unit',
        success: false,
        error: 'Internal server error',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Chat Message Handling', () => {
    let chatMessageHandler: Function;
    
    beforeEach(() => {
      mockSocketSetupCallback(mockSocket as Socket);
      const onCalls = (mockSocket.on as jest.Mock).mock.calls;
      const chatMessageCall = onCalls.find(call => call[0] === 'chat_message');
      chatMessageHandler = chatMessageCall[1];
    });

    test('should broadcast valid chat message', () => {
      const mockPlayer = { id: 'player-1', username: 'Player1' };
      mockGameService.getPlayer.mockReturnValue(mockPlayer);

      const messageData = {
        gameId: 'game-123',
        playerId: 'player-1',
        message: '  Hello everyone!  '
      };

      chatMessageHandler(messageData);

      expect(mockGameService.getPlayer).toHaveBeenCalledWith('player-1');
      expect(mockIo.to).toHaveBeenCalledWith('game-123');
      expect(mockIo.emit).toHaveBeenCalledWith('chat_message', {
        playerId: 'player-1',
        username: 'Player1',
        message: 'Hello everyone!',
        timestamp: expect.any(String)
      });
    });

    test('should emit error when player not found for chat', () => {
      mockGameService.getPlayer.mockReturnValue(null);

      const messageData = {
        gameId: 'game-123',
        playerId: 'player-1',
        message: 'Hello!'
      };

      chatMessageHandler(messageData);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Player not found',
        type: 'chat_error'
      });
    });

    test('should handle chat message processing error', () => {
      mockGameService.getPlayer.mockImplementation(() => {
        throw new Error('Database error');
      });

      const messageData = {
        gameId: 'game-123',
        playerId: 'player-1',
        message: 'Hello!'
      };

      chatMessageHandler(messageData);

      expect(console.error).toHaveBeenCalledWith('Error processing chat message:', expect.any(Error));
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to send message',
        type: 'chat_error'
      });
    });
  });

  describe('Player Activity Handling', () => {
    let playerActivityHandler: Function;
    
    beforeEach(() => {
      mockSocketSetupCallback(mockSocket as Socket);
      const onCalls = (mockSocket.on as jest.Mock).mock.calls;
      const playerActivityCall = onCalls.find(call => call[0] === 'player_activity');
      playerActivityHandler = playerActivityCall[1];
    });

    test('should update player activity successfully', () => {
      const activityData = { playerId: 'player-1' };

      playerActivityHandler(activityData);

      expect(mockGameService.updatePlayerActivity).toHaveBeenCalledWith('player-1');
    });

    test('should handle player activity update error silently', () => {
      // Clear previous mocks to avoid interference from setup calls
      jest.clearAllMocks();
      
      mockGameService.updatePlayerActivity.mockImplementation(() => {
        throw new Error('Activity update error');
      });

      const activityData = { playerId: 'player-1' };

      playerActivityHandler(activityData);

      expect(console.error).toHaveBeenCalledWith('Error updating player activity:', expect.any(Error));
      // Should not emit any error to socket - fails silently
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });

  describe('Disconnect Handling', () => {
    let disconnectHandler: Function;
    
    beforeEach(() => {
      mockSocketSetupCallback(mockSocket as Socket);
      const onCalls = (mockSocket.on as jest.Mock).mock.calls;
      const disconnectCall = onCalls.find(call => call[0] === 'disconnect');
      disconnectHandler = disconnectCall[1];
    });

    test('should log client disconnection', () => {
      disconnectHandler('transport close');

      expect(console.log).toHaveBeenCalledWith(
        '🔌 WebSocket client disconnected: test-socket-id, reason: transport close'
      );
    });

    test('should handle different disconnect reasons', () => {
      const reasons = ['client namespace disconnect', 'server namespace disconnect', 'transport error'];
      
      reasons.forEach(reason => {
        jest.clearAllMocks();
        disconnectHandler(reason);
        
        expect(console.log).toHaveBeenCalledWith(
          `🔌 WebSocket client disconnected: test-socket-id, reason: ${reason}`
        );
      });
    });
  });

  describe('Broadcasting Utility Methods', () => {
    beforeEach(() => {
      mockSocketSetupCallback(mockSocket as Socket);
    });

    test('should broadcast to specific game', () => {
      const testData = { message: 'Game update' };

      socketHandler.broadcastToGame('game-123', 'game_update', testData);

      expect(mockIo.to).toHaveBeenCalledWith('game-123');
      expect(mockIo.emit).toHaveBeenCalledWith('game_update', testData);
    });

    test('should broadcast to specific player (logs only)', () => {
      const testData = { message: 'Player notification' };

      socketHandler.broadcastToPlayer('player-1', 'notification', testData);

      expect(console.log).toHaveBeenCalledWith(
        'Broadcasting notification to player player-1:',
        testData
      );
    });

    test('should broadcast to all clients', () => {
      const testData = { message: 'Server announcement' };

      socketHandler.broadcastToAll('announcement', testData);

      expect(mockIo.emit).toHaveBeenCalledWith('announcement', testData);
    });
  });

  describe('Edge Cases and Integration', () => {
    test('should handle multiple socket connections', () => {
      const mockSocket2 = {
        id: 'test-socket-id-2',
        emit: jest.fn(),
        join: jest.fn(),
        to: jest.fn().mockReturnThis(),
        on: jest.fn(),
        disconnect: jest.fn()
      } as jest.Mocked<Partial<Socket>>;

      // Simulate second connection
      mockSocketSetupCallback(mockSocket2 as Socket);

      expect(console.log).toHaveBeenCalledWith('🔌 WebSocket client connected: test-socket-id-2');
      expect(mockSocket2.emit).toHaveBeenCalledWith('welcome', expect.objectContaining({
        socketId: 'test-socket-id-2'
      }));
    });

    test('should handle empty or malformed data gracefully', () => {
      // Clear previous mocks to avoid interference from setup calls
      jest.clearAllMocks();
      
      mockSocketSetupCallback(mockSocket as Socket);
      const onCalls = (mockSocket.on as jest.Mock).mock.calls;
      const joinGameCall = onCalls.find(call => call[0] === 'join_game');
      const joinGameHandler = joinGameCall[1];

      // Test with empty data - this will actually cause an exception and trigger the error handler
      joinGameHandler({});

      expect(mockGameService.getGame).toHaveBeenCalledWith(undefined);
      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to join game',
        type: 'join_game_error'
      });
    });

    test('should maintain proper event handler binding', () => {
      // Verify all required event handlers are properly bound
      mockSocketSetupCallback(mockSocket as Socket);
      
      const expectedEvents = ['join_game', 'game_action', 'chat_message', 'player_activity', 'disconnect'];
      const onCalls = (mockSocket.on as jest.Mock).mock.calls;
      const registeredEvents = onCalls.map(call => call[0]);

      expectedEvents.forEach(event => {
        expect(registeredEvents).toContain(event);
      });
    });
  });
});