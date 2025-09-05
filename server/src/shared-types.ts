// Simplified shared types that integrate HexMap and GameEngine with existing system
import { HexMap } from './game/HexMap';
import { GameEngine } from './game/GameEngine';
import { logger } from '@civ-game/shared/utils';
import { GameUtils as SharedGameUtils, DiplomaticRelation } from '@civ-game/shared';
import { v4 as uuidv4 } from 'uuid';

export class GameState {
  public id: string;
  public players: Player[];
  public currentPlayer: number = 0;
  public currentTurn: number = 1;
  public phase: GamePhase = GamePhase.LOBBY;
  public config: GameConfig;
  public createdAt: Date;
  public lastUpdate: Date;
  public board: any; // This now contains the real HexMap data
  public map: any;   // Alias used by GameEngine/shared types
  public diplomacy?: Record<string, DiplomaticRelation>;

  constructor(config: GameConfig) {
    this.id = GameUtils.generateGameId();
    this.players = [];
    this.config = config;
    this.createdAt = new Date();
    this.lastUpdate = new Date();

    // Create real hex map instead of empty board
    const hexMap = new HexMap(config.mapSize.width, config.mapSize.height);
    hexMap.generateProceduralMap();
    this.board = hexMap.serialize();
    this.map = this.board;
    this.diplomacy = {};

    logger.info(`Created real game state with ${config.mapSize.width}x${config.mapSize.height} hex map`);
  }

  addPlayer(playerInfo: PlayerInfo): void {
    this.players.push(playerInfo as any);
    this.lastUpdate = new Date();

    // If this is the first player to be added after game creation, create starting units
    if (this.players.length === 1) {
      this.createStartingUnitsForPlayer(playerInfo);
    }
  }

  removePlayer(playerId: string): void {
    this.players = this.players.filter(p => (p as any).id !== playerId);
    this.lastUpdate = new Date();
  }

  startGame(): void {
    this.phase = GamePhase.ACTIVE;

    // Create starting units for all players when game starts
    this.players.forEach(player => this.createStartingUnitsForPlayer(player as any));

    this.lastUpdate = new Date();
    logger.info(`Game ${this.id} started with real hex map and starting units`);
  }

  private createStartingUnitsForPlayer(playerInfo: any): void {
    if (!this.board || !this.board.tiles) return;

    const hexMap = HexMap.deserialize(this.board);

    // Find a good starting position
    let startX, startY;
    let attempts = 0;

    do {
      startX = Math.floor(Math.random() * hexMap.width);
      startY = Math.floor(Math.random() * hexMap.height);
      attempts++;
    } while (attempts < 50 && !hexMap.isValidMoveDestination(startX, startY, playerInfo.id));

    if (attempts < 50) {
      // Create starter units (simplified - just place them in player's units array for now)
      const settler = {
        id: uuidv4(),
        type: 'settler',
        position: { x: startX, y: startY },
        owner: playerInfo.id,
        health: 100,
        movement: 2
      };

      const warrior = {
        id: uuidv4(),
        type: 'warrior',
        position: { x: startX + 1, y: startY },
        owner: playerInfo.id,
        health: 100,
        movement: 2
      };

      playerInfo.units = playerInfo.units || [];
      playerInfo.units.push(settler, warrior);

      logger.debug(`Created starting units for player ${playerInfo.id} at (${startX}, ${startY})`);
    }

    this.board = hexMap.serialize();
  }

  getCurrentPlayer(): any {
    return this.players[this.currentPlayer] || this.players[0];
  }

  executeAction(action: any): boolean {
    try {
      const playerId = action.playerId || (action.payload && action.payload.playerId);
      logger.debug(`Executing action: ${action.type} for player ${playerId}`);

      // Prepare a GameEngine-compatible state view
      const hexMap = HexMap.deserialize(this.board);

      // Build shared-like state minimally for GameEngine
      const sharedState: any = {
        id: this.id,
        players: (this.players || []).map((p: any) => ({
          id: p.id || p.userId,
          userId: p.id || p.userId,
          name: p.name || p.username,
          color: p.color,
          civilization: p.civilization,
          resources: p.resources || GameUtils.createDefaultResources(),
          technologies: p.technologies || [],
          cities: [],
          units: [],
          score: p.score || 0,
          isAlive: true,
          isActive: p.isActive ?? true
        })),
        // GameEngine expects currentPlayer to be a playerId (string)
        currentPlayer: (this.players[this.currentPlayer] as any)?.id,
        currentTurn: this.currentTurn,
        // Some engine paths expect 'turn' instead of 'currentTurn'
        turn: this.currentTurn,
        phase: this.phase,
        map: hexMap.serialize(),
        cities: {},
        units: {},
        lastUpdate: this.lastUpdate
      };
      // Carry over diplomacy state for GameEngine
      if (this.diplomacy) sharedState.diplomacy = this.diplomacy;

      // Populate units map from per-player local units (if present)
      for (const p of this.players as any[]) {
        if (p?.units?.length) {
          for (const u of p.units) {
            sharedState.units[u.id] = {
              id: u.id,
              type: u.type,
              playerId: p.id,
              x: u.position?.x ?? u.x,
              y: u.position?.y ?? u.y,
              health: u.health ?? 100,
              maxHealth: u.maxHealth ?? 100,
              movement: u.movement ?? 2,
              maxMovement: u.maxMovement ?? 2,
              strength: u.strength ?? 10,
              experience: u.experience ?? 0,
              promotions: u.promotions ?? [],
              status: u.status ?? []
            };
          }
        }
      }

      // Normalize action shape to { type, payload, playerId }
      const normalizedAction: any = {
        type: action.type,
        playerId: playerId,
        payload: action.payload ?? action.data ?? {}
      };
      // Ensure payload carries playerId for engine validation
      if (!normalizedAction.payload) normalizedAction.payload = {};
      if (!normalizedAction.payload.playerId) normalizedAction.payload.playerId = playerId;

      // Delegate to GameEngine
      const { success, gameState, error } = GameEngine.processPlayerAction(sharedState, normalizedAction as any);

      if (!success) {
        logger.warn(`Action ${action.type} failed: ${error}`);
        return false;
      }

      // Write back updates
      this.currentTurn = gameState.currentTurn;
      // Update currentPlayer index from id
      const nextPlayerId = gameState.currentPlayer;
      const idx = (this.players as any[]).findIndex(p => (p.id || p.userId) === nextPlayerId);
      if (idx >= 0) this.currentPlayer = idx;

      // Update map/board
      this.map = gameState.map;
      this.board = gameState.map;

      // Update local phase if engine advanced to end state
      if ((gameState as any).phase) {
        this.phase = (gameState as any).phase as any;
      }

      // Write back diplomacy
      if (gameState.diplomacy) {
        this.diplomacy = gameState.diplomacy as any;
      }

      // Re-hydrate player unit positions from gameState.units
      const unitsByOwner: Record<string, any[]> = {};
      if (gameState.units) {
        Object.values(gameState.units).forEach((u: any) => {
          if (!unitsByOwner[u.playerId]) unitsByOwner[u.playerId] = [];
          unitsByOwner[u.playerId].push({
            id: u.id,
            type: u.type,
            position: { x: u.x, y: u.y },
            owner: u.playerId,
            health: u.health,
            movement: u.movement
          });
        });
      }
      (this.players as any[]).forEach(p => {
        p.units = unitsByOwner[p.id] || p.units || [];
      });

      this.lastUpdate = new Date();
      return true;
    } catch (error) {
      logger.error(`Error executing action ${action?.type}:`, error as Error);
      return false;
    }
  }

  serialize(): any {
    return {
      id: this.id,
      players: this.players,
      currentPlayer: this.currentPlayer,
      currentTurn: this.currentTurn,
      phase: this.phase,
      config: this.config,
      createdAt: this.createdAt,
      lastUpdate: this.lastUpdate,
      board: this.board,
      diplomacy: this.diplomacy
    };
  }

  static deserialize(data: any): GameState {
    const gameState = new GameState(data.config);
    gameState.id = data.id;
    gameState.players = data.players;
    gameState.currentPlayer = data.currentPlayer;
    gameState.currentTurn = data.currentTurn;
    gameState.phase = data.phase;
    gameState.createdAt = new Date(data.createdAt);
    gameState.lastUpdate = new Date(data.lastUpdate);
    gameState.board = data.board;
    gameState.map = data.board;
    gameState.diplomacy = data.diplomacy || {};
    return gameState;
  }
}

export interface Player {
  id: string;
  username: string;
  civilization: string;
  color: string;
  isReady: boolean;
  resources: {
    food: number;
    production: number;
    gold: number;
    science: number;
  };
  cities: City[];
  units: Unit[];
}

export interface City {
  id: string;
  name: string;
  position: { x: number; y: number };
  population: number;
  owner: string;
}

export interface Unit {
  id: string;
  type: string;
  position: { x: number; y: number };
  owner: string;
  health: number;
  movement: number;
}

// Game configuration interfaces
export interface GameConfig {
  mapSize: { width: number; height: number };
  maxPlayers: number;
  turnTimeLimit: number;
  victoryConditions: VictoryType[];
  startingResources: Record<ResourceType, number>;
}

export enum VictoryType {
  DOMINATION = 'domination',
  SCIENCE = 'science',
  CULTURE = 'culture',
  DIPLOMATIC = 'diplomatic',
  SCORE = 'score'
}

export enum ResourceType {
  FOOD = 'food',
  PRODUCTION = 'production',
  GOLD = 'gold',
  SCIENCE = 'science',
  CULTURE = 'culture'
}

export enum GamePhase {
  LOBBY = 'lobby',
  ACTIVE = 'active',
  ENDED = 'ended'
}

export interface PlayerInfo {
  id: string;
  name: string;
  color: string;
  civilization: string;
  resources: Record<ResourceType, number>;
  technologies: Set<string>;
  isActive: boolean;
  score: number;
}

export interface GameAction {
  type: string;
  playerId: string;
  data: any;  // Changed from payload to data to match database expectations
  timestamp?: number;
  actionId?: string;
}

export class GameUtils {
  static calculateWinRate(gamesWon: number, gamesPlayed: number): string {
    if (gamesPlayed === 0) return '0.0';
    return ((gamesWon / gamesPlayed) * 100).toFixed(1);
  }

  static generateGameId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static validatePlayerName(name: string): boolean {
    return !!(name && name.length >= 2 && name.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(name));
  }

  static getCivilizationColors(): string[] {
    return ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'teal', 'pink'];
  }

  static getCivilizationNames(): string[] {
    return ['Romans', 'Greeks', 'Egyptians', 'Chinese', 'Aztecs', 'Vikings', 'Japanese', 'Persians'];
  }

  static createDefaultResources(): Record<ResourceType, number> {
    return {
      [ResourceType.FOOD]: 0,
      [ResourceType.PRODUCTION]: 0,
      [ResourceType.GOLD]: 50,
      [ResourceType.SCIENCE]: 0,
      [ResourceType.CULTURE]: 0
    };
  }

  static calculateScore(player: any): number {
    return SharedGameUtils.calculateScore(player);
  }
}
