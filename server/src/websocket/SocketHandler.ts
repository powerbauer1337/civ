import { Server, Socket } from 'socket.io';
import GameService from '../services/GameService';

export class SocketHandler {
  constructor(
    private io: Server,
    private gameService: GameService
  ) {
    this.setupSocketEvents();
  }

  private setupSocketEvents(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 WebSocket client connected: ${socket.id}`);
      
      this.sendWelcome(socket);
      this.setupGameEvents(socket);
      this.setupDisconnectHandler(socket);
    });
  }

  private sendWelcome(socket: Socket): void {
    socket.emit('welcome', {
      message: 'Connected to Civilization Game Server',
      timestamp: new Date().toISOString(),
      socketId: socket.id
    });
  }

  private setupGameEvents(socket: Socket): void {
    // Join game room
    socket.on('join_game', (data: { gameId: string; playerId: string }) => {
      this.handleJoinGame(socket, data);
    });

    // Handle game actions
    socket.on('game_action', (data: { 
      gameId: string; 
      playerId: string; 
      action: string; 
      payload: any 
    }) => {
      this.handleGameAction(socket, data);
    });

    // Handle chat messages (future feature)
    socket.on('chat_message', (data: {
      gameId: string;
      playerId: string;
      message: string;
    }) => {
      this.handleChatMessage(socket, data);
    });

    // Handle player activity updates
    socket.on('player_activity', (data: { playerId: string }) => {
      this.handlePlayerActivity(socket, data);
    });
  }

  private handleJoinGame(
    socket: Socket, 
    data: { gameId: string; playerId: string }
  ): void {
    const { gameId, playerId } = data;
    
    try {
      // Validate game and player exist
      const game = this.gameService.getGame(gameId);
      const player = this.gameService.getPlayer(playerId);
      
      if (!game || !player) {
        socket.emit('error', { 
          message: 'Game or player not found',
          type: 'join_game_error'
        });
        return;
      }

      // Join the game room
      socket.join(gameId);
      
      // Update player online status
      this.gameService.setPlayerOnlineStatus(playerId, true);
      
      // Confirm game joined
      socket.emit('game_joined', {
        gameId,
        message: 'Successfully joined game room'
      });
      
      // Broadcast to other players in the game
      socket.to(gameId).emit('player_joined', {
        playerId,
        username: player.username,
        message: 'A new player joined the game'
      });

      // If game just started, broadcast game start
      if (game.status === 'active' && game.players.length >= 2) {
        this.io.to(gameId).emit('game_started', {
          gameId: game.id,
          players: game.players.map(p => ({
            id: p.id,
            username: p.username,
            civilization: p.civilization
          }))
        });
      }

    } catch (error) {
      console.error('Error joining game:', error);
      socket.emit('error', { 
        message: 'Failed to join game',
        type: 'join_game_error'
      });
    }
  }

  private handleGameAction(
    socket: Socket,
    data: { gameId: string; playerId: string; action: string; payload: any }
  ): void {
    const { gameId, playerId, action, payload } = data;
    
    try {
      // Validate and process the action
      const success = this.gameService.processGameAction(gameId, playerId, action, payload);
      
      if (success) {
        // Broadcast action to all players in the game except sender
        socket.to(gameId).emit('game_update', {
          action,
          playerId,
          payload,
          timestamp: new Date().toISOString()
        });
        
        // Acknowledge the action to sender
        socket.emit('action_acknowledged', {
          action,
          success: true,
          timestamp: new Date().toISOString()
        });
        
        console.log(`🎮 Game action processed: ${action} from ${playerId} in game ${gameId}`);
      } else {
        socket.emit('action_acknowledged', {
          action,
          success: false,
          error: 'Failed to process action',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error processing game action:', error);
      socket.emit('action_acknowledged', {
        action,
        success: false,
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }

  private handleChatMessage(
    socket: Socket,
    data: { gameId: string; playerId: string; message: string }
  ): void {
    const { gameId, playerId, message } = data;
    
    try {
      const player = this.gameService.getPlayer(playerId);
      if (!player) {
        socket.emit('error', { 
          message: 'Player not found',
          type: 'chat_error'
        });
        return;
      }

      // Broadcast message to all players in the game
      this.io.to(gameId).emit('chat_message', {
        playerId,
        username: player.username,
        message: message.trim(),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error processing chat message:', error);
      socket.emit('error', { 
        message: 'Failed to send message',
        type: 'chat_error'
      });
    }
  }

  private handlePlayerActivity(
    socket: Socket,
    data: { playerId: string }
  ): void {
    try {
      this.gameService.updatePlayerActivity(data.playerId);
    } catch (error) {
      console.error('Error updating player activity:', error);
    }
  }

  private setupDisconnectHandler(socket: Socket): void {
    socket.on('disconnect', (reason: string) => {
      console.log(`🔌 WebSocket client disconnected: ${socket.id}, reason: ${reason}`);
      
      // In a more advanced implementation, you might want to:
      // 1. Track which player this socket belonged to
      // 2. Update their online status
      // 3. Notify other players in their games
      // 4. Handle reconnection logic
    });
  }

  // Utility methods for broadcasting
  broadcastToGame(gameId: string, event: string, data: any): void {
    this.io.to(gameId).emit(event, data);
  }

  broadcastToPlayer(playerId: string, event: string, data: any): void {
    // This would require tracking socket-to-player mapping
    // For now, we'll just log it
    console.log(`Broadcasting ${event} to player ${playerId}:`, data);
  }

  broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }
}

export default SocketHandler;