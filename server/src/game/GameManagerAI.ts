import { Server, Socket } from 'socket.io';
import { 
  GameState, 
  GameConfig, 
  PlayerInfo, 
  GamePhase, 
  GameAction,
  ActionType,
  Position,
  UnitType,
  GameUtils 
} from '@civ-game/shared';
import { v4 as uuidv4 } from 'uuid';
import { GameEngine } from './GameEngine';
import { HexMap } from './HexMap';
import { AIPlayer, AIPersonality, AIDifficulty } from './AIPlayer';
import { config } from '../config/config';

export interface GameRoom {
  gameState: GameState;
  gameEngine: GameEngine;
  players: Map<string, Socket | 'AI'>; // playerId -> socket or AI marker
  aiPlayers: Map<string, AIPlayer>; // playerId -> AI instance
  spectators: Set<Socket>;
  lastActivity: Date;
  turnTimer?: NodeJS.Timeout;
  aiProcessingTimer?: NodeJS.Timeout;
  singlePlayer: boolean;
}

export interface CreateGameOptions {
  playerName: string;
  gameConfig: GameConfig;
  singlePlayer?: boolean;
  aiOpponents?: number;
  aiDifficulty?: AIDifficulty;
}

export class GameManagerAI {
  private io: Server;
  private games: Map<string, GameRoom>;
  private playerToGame: Map<string, string>;
  private socketToPlayer: Map<string, string>;
  private cleanupInterval: NodeJS.Timeout;

  constructor(io: Server) {
    this.io = io;
    this.games = new Map();
    this.playerToGame = new Map();
    this.socketToPlayer = new Map();
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveGames();
    }, config.GAME_CLEANUP_INTERVAL || 300000);
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
    
    // Single player specific events
    socket.on('create_single_player', (data) => this.handleCreateSinglePlayer(socket, data));
    socket.on('set_ai_difficulty', (data) => this.handleSetAIDifficulty(socket, data));
  }

  public handleDisconnection(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (playerId) {
      this.handlePlayerDisconnect(playerId);
      this.socketToPlayer.delete(socket.id);
    }
  }

  /**
   * Create a single-player game with AI opponents
   */
  private handleCreateSinglePlayer(socket: Socket, data: {
    playerName: string;
    aiOpponents: number;
    aiDifficulty: AIDifficulty;
    mapSize?: 'small' | 'medium' | 'large';
  }): void {
    try {
      const { playerName, aiOpponents, aiDifficulty, mapSize = 'medium' } = data;
      
      // Create game configuration
      const gameConfig: GameConfig = {
        maxPlayers: aiOpponents + 1,
        mapWidth: mapSize === 'small' ? 15 : mapSize === 'large' ? 30 : 20,
        mapHeight: mapSize === 'small' ? 15 : mapSize === 'large' ? 30 : 20,
        victoryConditions: ['domination', 'science', 'culture'],
        turnTimeLimit: 0, // No time limit for single player
        startingResources: GameUtils.createDefaultResources(),
        allowSpectators: false
      };

      // Create game state
      const gameId = uuidv4();
      const gameEngine = new GameEngine();
      const hexMap = new HexMap(gameConfig.mapWidth, gameConfig.mapHeight);
      
      // Initialize game state
      const gameState: GameState = {
        id: gameId,
        phase: GamePhase.SETUP,
        turn: 1,
        currentPlayer: null,
        players: {},
        map: hexMap.generateMap(gameConfig.mapWidth, gameConfig.mapHeight),
        config: gameConfig,
        winner: null,
        gameOver: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create human player
      const humanPlayerId = uuidv4();
      const humanPlayer: PlayerInfo = {
        id: humanPlayerId,
        name: playerName,
        color: GameUtils.getCivilizationColors()[0],
        civilization: GameUtils.getCivilizationNames()[0],
        resources: GameUtils.createDefaultResources(),
        technologies: [],
        cities: [],
        units: [],
        isActive: true,
        isHuman: true,
        score: 0
      };
      gameState.players[humanPlayerId] = humanPlayer;

      // Create AI players
      const aiPlayerMap = new Map<string, AIPlayer>();
      const aiPersonalities = [
        AIPersonality.Aggressive,
        AIPersonality.Economic,
        AIPersonality.Scientific,
        AIPersonality.Defensive,
        AIPersonality.Balanced
      ];

      for (let i = 0; i < aiOpponents; i++) {
        const aiPlayerId = uuidv4();
        const aiPersonality = aiPersonalities[i % aiPersonalities.length];
        
        const aiPlayerInfo: PlayerInfo = {
          id: aiPlayerId,
          name: `AI ${i + 1} (${aiPersonality})`,
          color: GameUtils.getCivilizationColors()[i + 1],
          civilization: GameUtils.getCivilizationNames()[i + 1],
          resources: this.getAIStartingResources(aiDifficulty),
          technologies: [],
          cities: [],
          units: [],
          isActive: true,
          isHuman: false,
          score: 0
        };
        
        gameState.players[aiPlayerId] = aiPlayerInfo;
        
        // Create AI player instance
        const aiPlayer = new AIPlayer(aiPlayerId, aiPersonality, aiDifficulty);
        aiPlayerMap.set(aiPlayerId, aiPlayer);
      }

      // Place starting units
      this.placeStartingUnits(gameState);

      // Create game room
      const gameRoom: GameRoom = {
        gameState,
        gameEngine,
        players: new Map([[humanPlayerId, socket]]),
        aiPlayers: aiPlayerMap,
        spectators: new Set(),
        lastActivity: new Date(),
        singlePlayer: true
      };

      // Add AI players to the players map
      aiPlayerMap.forEach((ai, playerId) => {
        gameRoom.players.set(playerId, 'AI');
      });

      // Register game and player
      this.games.set(gameId, gameRoom);
      this.playerToGame.set(humanPlayerId, gameId);
      this.socketToPlayer.set(socket.id, humanPlayerId);

      // Join socket room
      socket.join(gameId);

      // Start the game immediately for single player
      gameState.phase = GamePhase.IN_PROGRESS;
      gameState.currentPlayer = humanPlayerId;

      // Notify client
      socket.emit('game_created', {
        gameId: gameId,
        playerId: humanPlayerId,
        gameState: this.serializeGameState(gameState),
        singlePlayer: true,
        aiPlayers: Array.from(aiPlayerMap.keys())
      });

      console.log(`Single player game created: ${gameId} with ${aiOpponents} AI opponents`);
    } catch (error) {
      console.error('Error creating single player game:', error);
      socket.emit('error', { message: 'Failed to create single player game' });
    }
  }

  /**
   * Handle game actions from both human and AI players
   */
  private async handleGameAction(socket: Socket, action: GameAction): Promise<void> {
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

      // Validate it's the player's turn
      if (gameRoom.gameState.currentPlayer !== playerId) {
        socket.emit('error', { message: 'Not your turn' });
        return;
      }

      // Process the action
      const result = gameRoom.gameEngine.processAction(gameRoom.gameState, action);
      
      if (result.success && result.newState) {
        gameRoom.gameState = result.newState;
        gameRoom.lastActivity = new Date();

        // Check for game over
        const victoryCheck = GameEngine.checkVictoryConditions(result.newState);
        if (victoryCheck.gameOver) {
          gameRoom.gameState.gameOver = true;
          gameRoom.gameState.winner = victoryCheck.winner;
          
          this.io.to(gameId).emit('game_over', {
            winner: victoryCheck.winner,
            type: victoryCheck.type,
            gameState: this.serializeGameState(gameRoom.gameState)
          });
          
          return;
        }

        // Broadcast updated state
        this.io.to(gameId).emit('game_state_updated', {
          gameState: this.serializeGameState(gameRoom.gameState),
          lastAction: action
        });

        // If it's end turn action, process next player
        if (action.type === ActionType.EndTurn) {
          this.processNextTurn(gameRoom, gameId);
        }
      } else {
        socket.emit('action_failed', {
          error: result.error || 'Action failed',
          action: action
        });
      }
    } catch (error) {
      console.error('Error processing game action:', error);
      socket.emit('error', { message: 'Failed to process action' });
    }
  }

  /**
   * Process the next turn, including AI turns
   */
  private async processNextTurn(gameRoom: GameRoom, gameId: string): Promise<void> {
    const playerIds = Object.keys(gameRoom.gameState.players);
    const currentIndex = playerIds.indexOf(gameRoom.gameState.currentPlayer!);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    const nextPlayerId = playerIds[nextIndex];

    // Update turn
    if (nextIndex === 0) {
      gameRoom.gameState.turn++;
    }
    gameRoom.gameState.currentPlayer = nextPlayerId;

    // Notify all players
    this.io.to(gameId).emit('turn_changed', {
      currentPlayer: nextPlayerId,
      turn: gameRoom.gameState.turn,
      gameState: this.serializeGameState(gameRoom.gameState)
    });

    // If next player is AI, process AI turn
    const nextPlayerSocket = gameRoom.players.get(nextPlayerId);
    if (nextPlayerSocket === 'AI') {
      // Clear any existing AI timer
      if (gameRoom.aiProcessingTimer) {
        clearTimeout(gameRoom.aiProcessingTimer);
      }

      // Process AI turn with a small delay for better UX
      gameRoom.aiProcessingTimer = setTimeout(async () => {
        await this.processAITurn(gameRoom, gameId, nextPlayerId);
      }, 1000);
    }
  }

  /**
   * Process AI player's turn
   */
  private async processAITurn(gameRoom: GameRoom, gameId: string, aiPlayerId: string): Promise<void> {
    try {
      const aiPlayer = gameRoom.aiPlayers.get(aiPlayerId);
      if (!aiPlayer) {
        console.error(`AI player not found: ${aiPlayerId}`);
        return;
      }

      // Notify that AI is thinking
      this.io.to(gameId).emit('ai_thinking', {
        playerId: aiPlayerId,
        playerName: gameRoom.gameState.players[aiPlayerId].name
      });

      // Get AI decisions
      const actions = await aiPlayer.makeDecisions(gameRoom.gameState);

      // Process each AI action
      for (const action of actions) {
        if (gameRoom.gameState.currentPlayer !== aiPlayerId) {
          break; // Turn changed, stop processing
        }

        const result = gameRoom.gameEngine.processAction(gameRoom.gameState, action);
        
        if (result.success && result.newState) {
          gameRoom.gameState = result.newState;
          
          // Broadcast action to human players
          this.io.to(gameId).emit('ai_action', {
            playerId: aiPlayerId,
            action: action,
            gameState: this.serializeGameState(gameRoom.gameState)
          });

          // Small delay between AI actions for visibility
          await this.delay(500);

          // Check for game over
          const victoryCheck = GameEngine.checkVictoryConditions(result.newState);
          if (victoryCheck.gameOver) {
            gameRoom.gameState.gameOver = true;
            gameRoom.gameState.winner = victoryCheck.winner;
            
            this.io.to(gameId).emit('game_over', {
              winner: victoryCheck.winner,
              type: victoryCheck.type,
              gameState: this.serializeGameState(gameRoom.gameState)
            });
            
            return;
          }

          // If AI ended turn, process next turn
          if (action.type === ActionType.EndTurn) {
            this.processNextTurn(gameRoom, gameId);
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error processing AI turn:', error);
      // Continue to next player on error
      this.processNextTurn(gameRoom, gameId);
    }
  }

  /**
   * Place starting units for all players
   */
  private placeStartingUnits(gameState: GameState): void {
    const startPositions = this.generateStartPositions(gameState.map, Object.keys(gameState.players).length);
    
    Object.keys(gameState.players).forEach((playerId, index) => {
      const startPos = startPositions[index];
      const player = gameState.players[playerId];
      
      // Place settler
      const settlerPos = startPos;
      gameState.map[settlerPos.r][settlerPos.q].unit = {
        type: UnitType.Settler,
        owner: playerId,
        moves: 2,
        maxMoves: 2
      };
      
      player.units.push({
        id: uuidv4(),
        type: UnitType.Settler,
        position: { q: settlerPos.q, r: settlerPos.r },
        moves: 2,
        maxMoves: 2,
        health: 100
      });

      // Place warrior nearby
      const neighbors = this.getValidNeighbors(gameState.map, startPos);
      if (neighbors.length > 0) {
        const warriorPos = neighbors[0];
        gameState.map[warriorPos.r][warriorPos.q].unit = {
          type: UnitType.Warrior,
          owner: playerId,
          moves: 1,
          maxMoves: 1
        };
        
        player.units.push({
          id: uuidv4(),
          type: UnitType.Warrior,
          position: { q: warriorPos.q, r: warriorPos.r },
          moves: 1,
          maxMoves: 1,
          health: 100
        });
      }
    });
  }

  /**
   * Generate starting positions for players
   */
  private generateStartPositions(map: any[][], playerCount: number): Position[] {
    const positions: Position[] = [];
    const mapWidth = map[0].length;
    const mapHeight = map.length;
    
    // Simple distribution - divide map into sections
    const angle = (2 * Math.PI) / playerCount;
    const centerX = mapWidth / 2;
    const centerY = mapHeight / 2;
    const radius = Math.min(mapWidth, mapHeight) * 0.35;
    
    for (let i = 0; i < playerCount; i++) {
      const x = Math.round(centerX + radius * Math.cos(angle * i));
      const y = Math.round(centerY + radius * Math.sin(angle * i));
      
      // Find nearest valid land tile
      const validPos = this.findNearestLandTile(map, x, y);
      if (validPos) {
        positions.push(validPos);
      }
    }
    
    return positions;
  }

  /**
   * Find nearest land tile from a position
   */
  private findNearestLandTile(map: any[][], x: number, y: number): Position | null {
    const visited = new Set<string>();
    const queue: Position[] = [{ q: x, r: y }];
    
    while (queue.length > 0) {
      const pos = queue.shift()!;
      const key = `${pos.q},${pos.r}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      
      if (pos.r >= 0 && pos.r < map.length && pos.q >= 0 && pos.q < map[0].length) {
        const tile = map[pos.r][pos.q];
        if (tile && tile.terrain !== 'ocean' && tile.terrain !== 'water') {
          return pos;
        }
        
        // Add neighbors
        const neighbors = [
          { q: pos.q + 1, r: pos.r },
          { q: pos.q - 1, r: pos.r },
          { q: pos.q, r: pos.r + 1 },
          { q: pos.q, r: pos.r - 1 }
        ];
        
        neighbors.forEach(n => {
          if (!visited.has(`${n.q},${n.r}`)) {
            queue.push(n);
          }
        });
      }
    }
    
    return null;
  }

  /**
   * Get valid neighbor positions
   */
  private getValidNeighbors(map: any[][], pos: Position): Position[] {
    const neighbors: Position[] = [];
    const directions = [
      { q: 1, r: 0 }, { q: -1, r: 0 },
      { q: 0, r: 1 }, { q: 0, r: -1 },
      { q: 1, r: -1 }, { q: -1, r: 1 }
    ];
    
    directions.forEach(dir => {
      const newPos = { q: pos.q + dir.q, r: pos.r + dir.r };
      if (newPos.r >= 0 && newPos.r < map.length && 
          newPos.q >= 0 && newPos.q < map[0].length) {
        const tile = map[newPos.r][newPos.q];
        if (tile && tile.terrain !== 'ocean' && !tile.unit) {
          neighbors.push(newPos);
        }
      }
    });
    
    return neighbors;
  }

  /**
   * Get AI starting resources based on difficulty
   */
  private getAIStartingResources(difficulty: AIDifficulty): any {
    const base = GameUtils.createDefaultResources();
    
    switch (difficulty) {
      case AIDifficulty.Easy:
        return {
          ...base,
          gold: base.gold * 0.8,
          production: base.production * 0.8
        };
      case AIDifficulty.Hard:
        return {
          ...base,
          gold: base.gold * 1.2,
          production: base.production * 1.2,
          science: base.science * 1.2
        };
      case AIDifficulty.Insane:
        return {
          ...base,
          gold: base.gold * 1.5,
          production: base.production * 1.5,
          science: base.science * 1.5,
          food: base.food * 1.5
        };
      default:
        return base;
    }
  }

  /**
   * Serialize game state for transmission
   */
  private serializeGameState(gameState: GameState): any {
    return {
      ...gameState,
      players: Object.fromEntries(
        Object.entries(gameState.players).map(([id, player]) => [
          id,
          {
            ...player,
            technologies: Array.from(player.technologies || [])
          }
        ])
      )
    };
  }

  // Standard GameManager methods...
  
  private handleCreateGame(socket: Socket, data: CreateGameOptions): void {
    // Implementation for multiplayer game creation
    // ... (keep existing implementation)
  }

  private handleJoinGame(socket: Socket, data: { gameId: string; playerName: string }): void {
    // Implementation for joining multiplayer game
    // ... (keep existing implementation)
  }

  private handleLeaveGame(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (playerId) {
      this.handlePlayerDisconnect(playerId);
    }
  }

  private handleStartGame(socket: Socket): void {
    // Implementation for starting multiplayer game
    // ... (keep existing implementation)
  }

  private handlePlayerReady(socket: Socket): void {
    // Implementation for player ready status
    // ... (keep existing implementation)
  }

  private handleRequestGameState(socket: Socket): void {
    const playerId = this.socketToPlayer.get(socket.id);
    if (!playerId) return;
    
    const gameId = this.playerToGame.get(playerId);
    if (!gameId) return;
    
    const gameRoom = this.games.get(gameId);
    if (!gameRoom) return;
    
    socket.emit('game_state', {
      gameState: this.serializeGameState(gameRoom.gameState)
    });
  }

  private handleSetAIDifficulty(socket: Socket, data: { difficulty: AIDifficulty }): void {
    // Allow changing AI difficulty mid-game (for future enhancement)
    socket.emit('ai_difficulty_updated', { difficulty: data.difficulty });
  }

  private handlePlayerDisconnect(playerId: string): void {
    const gameId = this.playerToGame.get(playerId);
    if (!gameId) return;
    
    const gameRoom = this.games.get(gameId);
    if (!gameRoom) return;
    
    // In single player, pause the game
    if (gameRoom.singlePlayer) {
      if (gameRoom.aiProcessingTimer) {
        clearTimeout(gameRoom.aiProcessingTimer);
      }
      // Game state is preserved for reconnection
    } else {
      // Handle multiplayer disconnect
      gameRoom.players.delete(playerId);
      this.io.to(gameId).emit('player_disconnected', { playerId });
    }
    
    this.playerToGame.delete(playerId);
  }

  private cleanupInactiveGames(): void {
    const now = Date.now();
    const maxInactivity = 30 * 60 * 1000; // 30 minutes
    
    this.games.forEach((room, gameId) => {
      if (now - room.lastActivity.getTime() > maxInactivity) {
        // Clean up AI timers
        if (room.aiProcessingTimer) {
          clearTimeout(room.aiProcessingTimer);
        }
        if (room.turnTimer) {
          clearTimeout(room.turnTimer);
        }
        
        // Remove player mappings
        room.players.forEach((socket, playerId) => {
          if (socket !== 'AI') {
            this.playerToGame.delete(playerId);
          }
        });
        
        this.games.delete(gameId);
        console.log(`Cleaned up inactive game: ${gameId}`);
      }
    });
  }

  private validateGameConfig(config: GameConfig): boolean {
    // Add validation logic
    return true;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public shutdown(): void {
    clearInterval(this.cleanupInterval);
    
    // Clear all AI timers
    this.games.forEach(room => {
      if (room.aiProcessingTimer) {
        clearTimeout(room.aiProcessingTimer);
      }
      if (room.turnTimer) {
        clearTimeout(room.turnTimer);
      }
    });
    
    this.games.clear();
    this.playerToGame.clear();
    this.socketToPlayer.clear();
  }

  public getGameCount(): number {
    return this.games.size;
  }

  public getActivePlayerCount(): number {
    return this.playerToGame.size;
  }
}
