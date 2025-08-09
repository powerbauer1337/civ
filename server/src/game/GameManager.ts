import { Server, Socket } from 'socket.io';
import { GameState, GameConfig, PlayerInfo, GamePhase, GameAction, GameUtils } from '@civ-game/shared';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { config } from '../config/config';
import { GameEngine } from './GameEngine';

export interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  socket?: Socket;
}

export interface GameRoom {
  id: string;
  name: string;
  gameState: GameState;
  game: GameEngine;
  players: RoomPlayer[];
  maxPlayers: number;
  status: 'waiting' | 'in_progress' | 'completed';
  gameMode: 'singleplayer' | 'multiplayer';
  spectators: Set<Socket>;
  lastActivity: Date;
  lastSaveId?: number;
  lastSaveTime?: Date;
  turnTimer?: NodeJS.Timeout;
}

export class GameManager {
  private io: Server;
  private games: Map<string, GameRoom>;
  private playerToGame: Map<string, string>; // playerId -> gameId
  private socketToPlayer: Map<string, string>; // socketId -> playerId
  private cleanupInterval: NodeJS.Timeout;
  private rooms: Map<string, GameRoom>;

  constructor(io: Server) {
    this.io = io;
    this.games = new Map();
    this.rooms = new Map();
    this.playerToGame = new Map();
    this.socketToPlayer = new Map();
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveGames();
    }, config.GAME_CLEANUP_INTERVAL);
  }

  public handleConnection(socket: Socket): void {
    console.log(`Game Manager: Client connected ${socket.id}`);

    // Register event handlers
    socket.on('create_game', (data) => this.handleCreateGame(socket, data));
    socket.on('join_game', (data) => this.handleJoinGame(socket, data));
    socket.on('leave_game', () => this.handleLeaveGame(socket));
    socket.on('start_game', () => this.handleStartGame(socket));
    socket.on('game_action', (data) => this.handleGameAction(socket, data));
    socket.on('player_ready', () => this.handlePlayerReady(socket));
    socket.on('request_game_state', () => this.handleRequestGameState(socket));
  }

  public handleDisconnection(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (playerId) {
      this.handlePlayerDisconnect(playerId);
      this.socketToPlayer.delete(socket.id);
    }
  }

  private handleCreateGame(socket: Socket, data: { playerName: string; gameConfig: GameConfig }): void {
    try {
      const { playerName, gameConfig } = data;
      
      // Validate game configuration
      if (!this.validateGameConfig(gameConfig)) {
        socket.emit('error', { message: 'Invalid game configuration' });
        return;
      }

      // Create game state
      const gameState = new GameState(gameConfig);
      
      // Create player
      const playerId = GameUtils.generatePlayerId();
      const playerInfo: PlayerInfo = {
        id: playerId,
        name: playerName,
        color: GameUtils.getCivilizationColors()[0],
        civilization: GameUtils.getCivilizationNames()[0],
        resources: GameUtils.createDefaultResources(),
        technologies: new Set(),
        isActive: true,
        score: 0
      };

      gameState.addPlayer(playerInfo);

      // Create game room
      const gameRoom: GameRoom = {
        gameState,
        players: new Map([[playerId, socket]]),
        spectators: new Set(),
        lastActivity: new Date()
      };

      // Register game and player
      this.games.set(gameState.id, gameRoom);
      this.playerToGame.set(playerId, gameState.id);
      this.socketToPlayer.set(socket.id, playerId);

      // Join socket room
      socket.join(gameState.id);

      // Notify client
      socket.emit('game_created', {
        gameId: gameState.id,
        playerId: playerId,
        gameState: gameState.serialize()
      });

      console.log(`Game created: ${gameState.id} by player: ${playerId}`);
    } catch (error) {
      console.error('Error creating game:', error);
      socket.emit('error', { message: 'Failed to create game' });
    }
  }

  private handleJoinGame(socket: Socket, data: { gameId: string; playerName: string }): void {
    try {
      const { gameId, playerName } = data;
      const gameRoom = this.games.get(gameId);

      if (!gameRoom) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      if (gameRoom.gameState.phase !== GamePhase.SETUP && gameRoom.gameState.phase !== GamePhase.SETUP) {
        socket.emit('error', { message: 'Game already started' });
        return;
      }

      if (gameRoom.players.size >= gameRoom.gameState.config.maxPlayers) {
        socket.emit('error', { message: 'Game is full' });
        return;
      }

      // Create player
      const playerId = GameUtils.generatePlayerId();
      const colors = GameUtils.getCivilizationColors();
      const civs = GameUtils.getCivilizationNames();
      
      const usedColors = Array.from(gameRoom.gameState.players).map((p: any) => p.color);
      const usedCivs = Array.from(gameRoom.gameState.players).map((p: any) => p.civilization);
      
      const availableColor = colors.find(c => !usedColors.includes(c)) || colors[gameRoom.players.size % colors.length];
      const availableCiv = civs.find(c => !usedCivs.includes(c)) || civs[gameRoom.players.size % civs.length];

      const playerInfo: PlayerInfo = {
        id: playerId,
        name: playerName,
        color: availableColor,
        civilization: availableCiv,
        resources: GameUtils.createDefaultResources(),
        technologies: new Set(),
        isActive: true,
        score: 0
      };

      gameRoom.gameState.addPlayer(playerInfo);
      gameRoom.players.set(playerId, socket);
      gameRoom.lastActivity = new Date();

      // Register player
      this.playerToGame.set(playerId, gameId);
      this.socketToPlayer.set(socket.id, playerId);

      // Join socket room
      socket.join(gameId);

      // Notify all players
      this.io.to(gameId).emit('player_joined', {
        player: playerInfo,
        gameState: gameRoom.gameState.serialize()
      });

      console.log(`Player ${playerId} joined game ${gameId}`);
    } catch (error) {
      console.error('Error joining game:', error);
      socket.emit('error', { message: 'Failed to join game' });
    }
  }

  private handleLeaveGame(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (playerId) {
      this.handlePlayerDisconnect(playerId);
    }
  }

  private handleStartGame(socket: Socket): void {
    try {
      const playerId = this.socketToPlayer.get(socket.id);
      if (!playerId) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }

      const gameId = this.playerToGame.get(playerId);
      if (!gameId) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const gameRoom = this.games.get(gameId);
      if (!gameRoom) {
        socket.emit('error', { message: 'Game room not found' });
        return;
      }

      // Only first player can start the game  
      const firstPlayer = gameRoom.gameState.players[0];
      const firstPlayerId = (firstPlayer as any).id || (firstPlayer as any).userId;
      if (firstPlayerId !== playerId) {
        socket.emit('error', { message: 'Only game creator can start the game' });
        return;
      }

      if (gameRoom.gameState.players.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players to start' });
        return;
      }

      // Start the game
      gameRoom.gameState.startGame();
      gameRoom.lastActivity = new Date();

      // Start turn timer
      this.startTurnTimer(gameId);

      // Notify all players
      this.io.to(gameId).emit('game_started', {
        gameState: gameRoom.gameState.serialize()
      });

      console.log(`Game ${gameId} started`);
    } catch (error) {
      console.error('Error starting game:', error);
      socket.emit('error', { message: 'Failed to start game' });
    }
  }

  private handleGameAction(socket: Socket, data: GameAction): void {
    try {
      const playerId = this.socketToPlayer.get(socket.id);
      if (!playerId) {
        socket.emit('error', { message: 'Player not found' });
        return;
      }

      const gameId = this.playerToGame.get(playerId);
      if (!gameId) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      const gameRoom = this.games.get(gameId);
      if (!gameRoom) {
        socket.emit('error', { message: 'Game room not found' });
        return;
      }

      // Validate action
      if (data.playerId !== playerId) {
        socket.emit('error', { message: 'Invalid player ID in action' });
        return;
      }

      if (gameRoom.gameState.phase !== 'PLAYER_TURN' && gameRoom.gameState.phase !== 'active') {
        socket.emit('error', { message: 'Game is not active' });
        return;
      }

      const currentPlayer = gameRoom.gameState.getCurrentPlayer();
      if (currentPlayer.id !== playerId) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }

      // Execute action using new GameEngine
      const success = gameRoom.gameState.executeAction(data);
      
      if (success) {
        gameRoom.lastActivity = new Date();

        // Reset turn timer if it wasn't an end turn action
        if (data.type !== 'end_turn') {
          this.resetTurnTimer(gameId);
        } else {
          this.startTurnTimer(gameId);
        }

        // Broadcast game state update with additional action info
        this.io.to(gameId).emit('game_updated', {
          action: data,
          gameState: gameRoom.gameState.serialize(),
          message: `Player ${data.playerId} executed ${data.type}`,
          timestamp: new Date()
        });

        // Send action acknowledgment to the player
        socket.emit('action_acknowledged', {
          action: data.type,
          success: true,
          message: `${data.type} completed successfully`
        });

        // Check for game end
        if (gameRoom.gameState.phase === 'END_GAME') {
          this.handleGameEnd(gameId);
        }
      } else {
        socket.emit('action_failed', { 
          action: data, 
          reason: 'Action validation failed - check console for details' 
        });
      }
    } catch (error) {
      console.error('Error handling game action:', error);
      socket.emit('error', { message: 'Failed to execute action' });
    }
  }

  private handlePlayerReady(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (playerId) {
      const gameId = this.playerToGame.get(playerId);
      if (gameId) {
        this.io.to(gameId).emit('player_ready', { playerId });
      }
    }
  }

  private handleRequestGameState(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (playerId) {
      const gameId = this.playerToGame.get(playerId);
      if (gameId) {
        const gameRoom = this.games.get(gameId);
        if (gameRoom) {
          socket.emit('game_state', gameRoom.gameState.serialize());
        }
      }
    }
  }

  private handlePlayerDisconnect(playerId: string): void {
    const gameId = this.playerToGame.get(playerId);
    if (gameId) {
      const gameRoom = this.games.get(gameId);
      if (gameRoom) {
        // Remove player from game
        gameRoom.players.delete(playerId);
        
        // Mark player as inactive in game state
        gameRoom.gameState.removePlayer(playerId);

        // Notify other players
        this.io.to(gameId).emit('player_disconnected', {
          playerId,
          gameState: gameRoom.gameState.serialize()
        });

        // If game is empty, mark for cleanup
        if (gameRoom.players.size === 0) {
          console.log(`Game ${gameId} marked for cleanup - no players left`);
        }
      }

      this.playerToGame.delete(playerId);
    }
  }

  private startTurnTimer(gameId: string): void {
    const gameRoom = this.games.get(gameId);
    if (!gameRoom || gameRoom.gameState.config.turnTimeLimit <= 0) {
      return;
    }

    // Clear existing timer
    if (gameRoom.turnTimer) {
      clearTimeout(gameRoom.turnTimer);
    }

    // Start new timer
    gameRoom.turnTimer = setTimeout(() => {
      this.handleTurnTimeout(gameId);
    }, gameRoom.gameState.config.turnTimeLimit * 1000);
  }

  private resetTurnTimer(gameId: string): void {
    const gameRoom = this.games.get(gameId);
    if (gameRoom && gameRoom.turnTimer) {
      clearTimeout(gameRoom.turnTimer);
      this.startTurnTimer(gameId);
    }
  }

  private handleTurnTimeout(gameId: string): void {
    const gameRoom = this.games.get(gameId);
    if (!gameRoom) return;

    console.log(`Turn timeout for game ${gameId}`);

    // Force end turn
    const endTurnAction: GameAction = {
      type: 'end_turn',
      playerId: gameRoom.gameState.getCurrentPlayer().id,
      payload: {},
      timestamp: Date.now(),
      actionId: uuidv4()
    };

    gameRoom.gameState.executeAction(endTurnAction);

    // Notify players
    this.io.to(gameId).emit('turn_timeout', {
      gameState: gameRoom.gameState.serialize()
    });

    // Start next turn timer
    this.startTurnTimer(gameId);
  }

  private handleGameEnd(gameId: string): void {
    const gameRoom = this.games.get(gameId);
    if (!gameRoom) return;

    // Clear turn timer
    if (gameRoom.turnTimer) {
      clearTimeout(gameRoom.turnTimer);
      gameRoom.turnTimer = undefined;
    }

    // Calculate final scores
    for (const player of gameRoom.gameState.players) {
      if ('score' in player) {
        player.score = GameUtils.calculateScore(player);
      }
    }

    // Determine winner
    const winner = gameRoom.gameState.players.reduce((prev: any, current: any) => 
      (current.score > prev.score) ? current : prev
    );

    // Notify players
    this.io.to(gameId).emit('game_ended', {
      winner,
      finalScores: gameRoom.gameState.players.map((p: any) => ({
        playerId: p.id,
        playerName: p.name,
        score: p.score
      })),
      gameState: gameRoom.gameState.serialize()
    });

    console.log(`Game ${gameId} ended. Winner: ${(winner as any).name || (winner as any).username || winner.id}`);
  }

  private validateGameConfig(config: GameConfig): boolean {
    return (
      config.maxPlayers >= 2 && 
      config.maxPlayers <= 8 &&
      config.mapSize.width >= 10 &&
      config.mapSize.height >= 10 &&
      config.turnTimeLimit >= 0
    );
  }

  private cleanupInactiveGames(): void {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [gameId, gameRoom] of this.games) {
      const timeSinceActivity = now.getTime() - gameRoom.lastActivity.getTime();
      
      if (timeSinceActivity > inactiveThreshold || gameRoom.players.size === 0) {
        console.log(`Cleaning up inactive game: ${gameId}`);
        
        // Clear turn timer
        if (gameRoom.turnTimer) {
          clearTimeout(gameRoom.turnTimer);
        }

        // Remove player mappings
        for (const playerId of gameRoom.players.keys()) {
          this.playerToGame.delete(playerId);
        }

        // Remove game
        this.games.delete(gameId);
      }
    }
  }

  // Public methods for external access
  public getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId) || this.games.get(roomId);
  }

  public getActiveRooms(): GameRoom[] {
    return Array.from(this.rooms.values()).filter(room => room.status === 'in_progress');
  }

  public async createRoom(options: {
    name: string;
    maxPlayers: number;
    gameMode: 'singleplayer' | 'multiplayer';
    mapSize: { width: number; height: number };
  }): Promise<GameRoom> {
    const roomId = uuidv4();
    const gameConfig: GameConfig = {
      maxPlayers: options.maxPlayers,
      mapSize: options.mapSize,
      turnTimeLimit: 120,
      fogOfWar: true,
      difficulty: 'normal',
      victoryConditions: ['domination', 'science', 'culture'],
      gameSpeed: 'normal'
    };

    const gameState = new GameState(gameConfig);
    const gameEngine = new GameEngine(gameConfig);
    
    const room: GameRoom = {
      id: roomId,
      name: options.name,
      gameState,
      game: gameEngine,
      players: [],
      maxPlayers: options.maxPlayers,
      status: 'waiting',
      gameMode: options.gameMode,
      spectators: new Set(),
      lastActivity: new Date()
    };

    this.rooms.set(roomId, room);
    return room;
  }

  public getGameCount(): number {
    return this.games.size;
  }

  public getActivePlayerCount(): number {
    return this.playerToGame.size;
  }

  public getGameState(gameId: string): GameState | undefined {
    const gameRoom = this.games.get(gameId);
    return gameRoom?.gameState;
  }

  public getGameList(): Array<{ id: string; playerCount: number; phase: GamePhase; createdAt: Date }> {
    return Array.from(this.games.entries()).map(([id, room]) => ({
      id,
      playerCount: room.players.size,
      phase: room.gameState.phase as any,
      createdAt: room.gameState.createdAt
    }));
  }

  public cleanupTestGames(): string[] {
    const removedGameIds: string[] = [];
    const testPatterns = ['test', 'perf', 'performance', 'load', 'benchmark', 'demo', 'sample'];
    
    for (const [gameId, gameRoom] of this.games) {
      const lowerGameId = gameId.toLowerCase();
      const isTestGame = testPatterns.some(pattern => lowerGameId.includes(pattern));
      
      if (isTestGame) {
        console.log(`Removing test game: ${gameId}`);
        
        // Clear turn timer
        if (gameRoom.turnTimer) {
          clearTimeout(gameRoom.turnTimer);
        }
        
        // Notify players about game removal
        this.io.to(gameId).emit('game_removed', {
          gameId,
          reason: 'Test game cleanup'
        });
        
        // Remove player mappings
        for (const playerId of gameRoom.players.keys()) {
          this.playerToGame.delete(playerId);
          // Find and remove socket mapping
          for (const [socketId, pId] of this.socketToPlayer) {
            if (pId === playerId) {
              this.socketToPlayer.delete(socketId);
              break;
            }
          }
        }
        
        // Remove game
        this.games.delete(gameId);
        removedGameIds.push(gameId);
      }
    }
    
    console.log(`Cleaned up ${removedGameIds.length} test games`);
    return removedGameIds;
  }

  public cleanupOldGames(olderThanHours: number): string[] {
    const removedGameIds: string[] = [];
    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    
    for (const [gameId, gameRoom] of this.games) {
      if (gameRoom.gameState.createdAt < cutoffTime) {
        console.log(`Removing old game: ${gameId} (created: ${gameRoom.gameState.createdAt})`);
        
        // Clear turn timer
        if (gameRoom.turnTimer) {
          clearTimeout(gameRoom.turnTimer);
        }
        
        // Notify players about game removal
        this.io.to(gameId).emit('game_removed', {
          gameId,
          reason: `Game cleanup - older than ${olderThanHours} hours`
        });
        
        // Remove player mappings
        for (const playerId of gameRoom.players.keys()) {
          this.playerToGame.delete(playerId);
          // Find and remove socket mapping
          for (const [socketId, pId] of this.socketToPlayer) {
            if (pId === playerId) {
              this.socketToPlayer.delete(socketId);
              break;
            }
          }
        }
        
        // Remove game
        this.games.delete(gameId);
        removedGameIds.push(gameId);
      }
    }
    
    console.log(`Cleaned up ${removedGameIds.length} old games (older than ${olderThanHours} hours)`);
    return removedGameIds;
  }

  public getFilteredGameList(options: {
    page?: number;
    limit?: number;
    filter?: 'all' | 'active' | 'waiting' | 'ended';
    hideTestGames?: boolean;
  } = {}): {
    games: Array<{ id: string; playerCount: number; phase: GamePhase; createdAt: Date; name?: string }>;
    totalGames: number;
    hasMore: boolean;
  } {
    const { page = 1, limit = 10, filter = 'all', hideTestGames = false } = options;
    
    let games = this.getGameList();
    
    // Filter out test games if requested
    if (hideTestGames) {
      const testPatterns = ['test', 'perf', 'performance', 'load', 'benchmark', 'demo', 'sample'];
      games = games.filter(game => {
        const lowerGameId = game.id.toLowerCase();
        return !testPatterns.some(pattern => lowerGameId.includes(pattern));
      });
    }
    
    // Apply status filter
    if (filter !== 'all') {
      games = games.filter(game => {
        switch (filter) {
          case 'active': return game.phase === GamePhase.ACTIVE;
          case 'waiting': return game.phase === GamePhase.LOBBY;
          case 'ended': return game.phase === GamePhase.ENDED;
          default: return true;
        }
      });
    }
    
    // Sort by creation date (newest first)
    games.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedGames = games.slice(startIndex, endIndex);
    
    return {
      games: paginatedGames,
      totalGames: games.length,
      hasMore: endIndex < games.length
    };
  }

  public shutdown(): void {
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Clear all turn timers
    for (const gameRoom of this.games.values()) {
      if (gameRoom.turnTimer) {
        clearTimeout(gameRoom.turnTimer);
      }
    }

    // Clear all games
    this.games.clear();
    this.playerToGame.clear();
    this.socketToPlayer.clear();

    console.log('GameManager shut down');
  }
}