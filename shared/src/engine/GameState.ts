import { v4 as uuidv4 } from 'uuid';
import {
  PlayerInfo,
  GameConfig,
  GamePhase,
  GameAction,
  VictoryType,
  ResourceType,
  GameResources
} from '../types/GameTypes';
import { HexGrid } from './HexGrid';
import { Unit } from './Unit';
import { City } from './City';

export class GameState {
  public readonly id: string;
  public phase: GamePhase;
  public currentTurn: number;
  public currentPlayer: number;
  public players: PlayerInfo[];
  public config: GameConfig;
  public grid: HexGrid;
  public units: Map<string, Unit>;
  public cities: Map<string, City>;
  public actionHistory: GameAction[];
  public createdAt: Date;
  public lastUpdate: Date;

  constructor(config: GameConfig) {
    this.id = uuidv4();
    this.phase = GamePhase.LOBBY;
    this.currentTurn = 1;
    this.currentPlayer = 0;
    this.players = [];
    this.config = config;
    this.grid = new HexGrid(config.mapSize.width, config.mapSize.height);
    this.units = new Map();
    this.cities = new Map();
    this.actionHistory = [];
    this.createdAt = new Date();
    this.lastUpdate = new Date();
  }

  public addPlayer(player: Omit<PlayerInfo, 'resources' | 'technologies' | 'isActive' | 'score'>): void {
    if (this.players.length >= this.config.maxPlayers) {
      throw new Error('Game is full');
    }

    const newPlayer: PlayerInfo = {
      ...player,
      resources: { ...this.config.startingResources },
      technologies: new Set(),
      isActive: true,
      score: 0
    };

    this.players.push(newPlayer);
    this.lastUpdate = new Date();
  }

  public removePlayer(playerId: string): void {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      throw new Error('Player not found');
    }

    this.players[playerIndex].isActive = false;
    this.lastUpdate = new Date();
  }

  public startGame(): void {
    if (this.players.length < 2) {
      throw new Error('Need at least 2 players to start');
    }

    this.phase = GamePhase.ACTIVE;
    this.grid.generateTerrain();
    this.spawnStartingUnits();
    this.lastUpdate = new Date();
  }

  public nextTurn(): void {
    if (this.phase !== GamePhase.ACTIVE) {
      throw new Error('Game is not active');
    }

    // Process end-of-turn for current player
    this.processEndOfTurn();

    // Move to next active player
    do {
      this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
    } while (!this.players[this.currentPlayer].isActive);

    // If we've cycled back to player 0, increment turn
    if (this.currentPlayer === 0) {
      this.currentTurn++;
    }

    // Process start-of-turn for new current player
    this.processStartOfTurn();

    // Check victory conditions
    this.checkVictoryConditions();

    this.lastUpdate = new Date();
  }

  private processEndOfTurn(): void {
    const currentPlayer = this.players[this.currentPlayer];
    
    // Generate resources from cities
    for (const [cityId, city] of this.cities) {
      if (city.ownerId === currentPlayer.id) {
        const cityOutput = city.calculateOutput();
        currentPlayer.resources.gold += cityOutput.gold;
        currentPlayer.resources.science += cityOutput.science;
        currentPlayer.resources.culture += cityOutput.culture;
        currentPlayer.resources.production += cityOutput.production;
        currentPlayer.resources.food += cityOutput.food;
      }
    }

    // Process unit actions
    for (const [unitId, unit] of this.units) {
      if (unit.ownerId === currentPlayer.id) {
        unit.endTurn();
      }
    }
  }

  private processStartOfTurn(): void {
    const currentPlayer = this.players[this.currentPlayer];
    
    // Reset unit movement points
    for (const [unitId, unit] of this.units) {
      if (unit.ownerId === currentPlayer.id) {
        unit.startTurn();
      }
    }
  }

  private spawnStartingUnits(): void {
    // Each player starts with a settler and warrior
    for (let i = 0; i < this.players.length; i++) {
      const player = this.players[i];
      const startPosition = this.grid.getPlayerStartPosition(i);
      
      // Create settler
      const settler = new Unit(
        uuidv4(),
        'settler',
        player.id,
        startPosition,
        100, // health
        2    // movement
      );
      this.units.set(settler.id, settler);

      // Create warrior
      const warriorPos = this.grid.getAdjacentHex(startPosition, 0);
      const warrior = new Unit(
        uuidv4(),
        'warrior',
        player.id,
        warriorPos,
        100,
        2
      );
      this.units.set(warrior.id, warrior);
    }
  }

  private checkVictoryConditions(): void {
    for (const victoryType of this.config.victoryConditions) {
      const winner = this.checkVictoryCondition(victoryType);
      if (winner) {
        this.phase = GamePhase.ENDED;
        return;
      }
    }
  }

  private checkVictoryCondition(victoryType: VictoryType): PlayerInfo | null {
    switch (victoryType) {
      case VictoryType.DOMINATION:
        return this.checkDominationVictory();
      case VictoryType.SCIENCE:
        return this.checkScienceVictory();
      case VictoryType.CULTURE:
        return this.checkCultureVictory();
      case VictoryType.SCORE:
        return this.checkScoreVictory();
      default:
        return null;
    }
  }

  private checkDominationVictory(): PlayerInfo | null {
    const activePlayers = this.players.filter(p => p.isActive);
    if (activePlayers.length === 1) {
      return activePlayers[0];
    }
    return null;
  }

  private checkScienceVictory(): PlayerInfo | null {
    // TODO: Implement science victory (research all techs)
    return null;
  }

  private checkCultureVictory(): PlayerInfo | null {
    // TODO: Implement culture victory (cultural influence)
    return null;
  }

  private checkScoreVictory(): PlayerInfo | null {
    // TODO: Implement score victory (highest score at turn limit)
    return null;
  }

  public executeAction(action: GameAction): boolean {
    try {
      // Validate action
      if (action.playerId !== this.players[this.currentPlayer].id) {
        throw new Error('Not current player\'s turn');
      }

      // Execute action based on type
      const success = this.processAction(action);
      
      if (success) {
        this.actionHistory.push(action);
        this.lastUpdate = new Date();
      }

      return success;
    } catch (error) {
      console.error('Action execution failed:', error);
      return false;
    }
  }

  private processAction(action: GameAction): boolean {
    switch (action.type) {
      case 'move_unit':
        return this.moveUnit(action.payload.unitId, action.payload.destination);
      case 'found_city':
        return this.foundCity(action.payload.unitId, action.payload.cityName);
      case 'attack_unit':
        return this.attackUnit(action.payload.attackerId, action.payload.defenderId);
      case 'end_turn':
        this.nextTurn();
        return true;
      default:
        return false;
    }
  }

  private moveUnit(unitId: string, destination: { q: number; r: number; s: number }): boolean {
    const unit = this.units.get(unitId);
    if (!unit || unit.movementPoints <= 0) {
      return false;
    }

    const distance = this.grid.getDistance(unit.position, destination);
    if (distance > unit.movementPoints) {
      return false;
    }

    unit.position = destination;
    unit.movementPoints -= distance;
    return true;
  }

  private foundCity(unitId: string, cityName: string): boolean {
    const unit = this.units.get(unitId);
    if (!unit || unit.type !== 'settler') {
      return false;
    }

    // Create new city
    const city = new City(
      uuidv4(),
      cityName,
      unit.ownerId,
      unit.position,
      1 // population
    );

    this.cities.set(city.id, city);
    this.units.delete(unitId); // Settler consumed
    return true;
  }

  private attackUnit(attackerId: string, defenderId: string): boolean {
    const attacker = this.units.get(attackerId);
    const defender = this.units.get(defenderId);
    
    if (!attacker || !defender) {
      return false;
    }

    const distance = this.grid.getDistance(attacker.position, defender.position);
    if (distance > 1) {
      return false; // Only adjacent attacks allowed
    }

    // Simple combat resolution
    const damage = Math.floor(Math.random() * 30) + 20;
    defender.health -= damage;

    if (defender.health <= 0) {
      this.units.delete(defenderId);
    }

    attacker.movementPoints = 0; // Used turn attacking
    return true;
  }

  public getCurrentPlayer(): PlayerInfo {
    return this.players[this.currentPlayer];
  }

  public getPlayer(playerId: string): PlayerInfo | undefined {
    return this.players.find(p => p.id === playerId);
  }

  public serialize(): any {
    return {
      id: this.id,
      phase: this.phase,
      currentTurn: this.currentTurn,
      currentPlayer: this.currentPlayer,
      players: this.players.map(p => ({
        ...p,
        technologies: Array.from(p.technologies)
      })),
      config: this.config,
      grid: this.grid.serialize(),
      units: Array.from(this.units.entries()).map(([id, unit]) => [id, unit.serialize()]),
      cities: Array.from(this.cities.entries()).map(([id, city]) => [id, city.serialize()]),
      createdAt: this.createdAt.toISOString(),
      lastUpdate: this.lastUpdate.toISOString()
    };
  }

  public static deserialize(data: any): GameState {
    const gameState = new GameState(data.config);
    gameState.id = data.id;
    gameState.phase = data.phase;
    gameState.currentTurn = data.currentTurn;
    gameState.currentPlayer = data.currentPlayer;
    gameState.players = data.players.map((p: any) => ({
      ...p,
      technologies: new Set(p.technologies)
    }));
    gameState.grid = HexGrid.deserialize(data.grid);
    
    gameState.units = new Map(
      data.units.map(([id, unitData]: [string, any]) => [id, Unit.deserialize(unitData)])
    );
    
    gameState.cities = new Map(
      data.cities.map(([id, cityData]: [string, any]) => [id, City.deserialize(cityData)])
    );
    
    gameState.createdAt = new Date(data.createdAt);
    gameState.lastUpdate = new Date(data.lastUpdate);
    
    return gameState;
  }
}