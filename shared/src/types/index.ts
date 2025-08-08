// Authentication Types
export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  lastLogin: Date | null;
  isActive: boolean;
  profile: UserProfile;
}

export interface UserProfile {
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  achievements: string[];
  preferences: UserPreferences;
}

export interface UserPreferences {
  notifications: boolean;
  publicProfile: boolean;
  theme?: 'light' | 'dark';
  language?: string;
}

export interface AuthTokenPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
  jti?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: Omit<User, 'password'>;
}

// Game Types
export interface Game {
  id: string;
  name: string;
  status: GameStatus;
  players: GamePlayer[];
  maxPlayers: number;
  currentTurn: number;
  createdBy: string;
  createdAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  settings: GameSettings;
}

export enum GameStatus {
  WAITING = 'waiting',
  STARTING = 'starting',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  FINISHED = 'finished',
  CANCELLED = 'cancelled'
}

export interface GamePlayer {
  userId: string;
  username: string;
  civilization: string;
  isReady: boolean;
  isOnline: boolean;
  joinedAt: Date;
  lastAction: Date | null;
}

export interface GameSettings {
  mapSize: { width: number; height: number };
  turnTimeLimit: number; // in seconds
  maxTurns: number;
  victoryConditions: VictoryCondition[];
  startingResources: Resources;
  difficulty: DifficultyLevel;
}

export enum VictoryCondition {
  DOMINATION = 'domination',
  SCIENCE = 'science',
  CULTURAL = 'cultural',
  DIPLOMATIC = 'diplomatic',
  TIME = 'time'
}

export enum DifficultyLevel {
  SETTLER = 'settler',
  CHIEFTAIN = 'chieftain',
  WARLORD = 'warlord',
  PRINCE = 'prince',
  KING = 'king',
  EMPEROR = 'emperor',
  IMMORTAL = 'immortal',
  DEITY = 'deity'
}

// Game State Types
export interface GameState {
  gameId: string;
  currentPlayer: string;
  turn: number;
  currentTurn: number;     // Add alias for turn for frontend compatibility
  phase: GamePhase;
  map: GameMap;
  players: PlayerState[];
  cities: { [id: string]: City };  // Add cities map for frontend
  units: { [id: string]: Unit };   // Add units map for frontend
  lastUpdate: Date;
}

export enum GamePhase {
  SETUP = 'setup',
  PLAYER_TURN = 'player_turn', 
  BETWEEN_TURNS = 'between_turns', 
  END_GAME = 'end_game',
  ENDED = 'ended',   // Add compatibility with client code
  ACTIVE = 'active', // Add compatibility with server code
  LOBBY = 'lobby'    // Add compatibility with server code
}

export interface GameMap {
  width: number;
  height: number;
  tiles: MapTile[][];
}

export interface MapTile {
  x: number;
  y: number;
  terrain: TerrainType;
  features: TerrainFeature[];
  resources: Resource | null;
  improvement: Improvement | null;
  unit: Unit | null;
  city: City | null;
  visibility: { [playerId: string]: VisibilityLevel };
}

export enum TerrainType {
  GRASSLAND = 'grassland',
  PLAINS = 'plains',
  DESERT = 'desert',
  TUNDRA = 'tundra',
  SNOW = 'snow',
  OCEAN = 'ocean',
  COAST = 'coast',
  HILLS = 'hills',
  MOUNTAINS = 'mountains'
}

export enum TerrainFeature {
  FOREST = 'forest',
  JUNGLE = 'jungle',
  MARSH = 'marsh',
  OASIS = 'oasis',
  FLOOD_PLAINS = 'flood_plains',
  ICE = 'ice'
}

export enum VisibilityLevel {
  HIDDEN = 0,
  DISCOVERED = 1,
  VISIBLE = 2
}

// Resource Types
export interface Resources {
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  faith: number;
}

export interface Resource {
  type: ResourceType;
  category: ResourceCategory;
  yield: Partial<Resources>;
  requiredTech?: string;
}

export enum ResourceType {
  // Bonus Resources
  WHEAT = 'wheat',
  RICE = 'rice',
  CORN = 'corn',
  CATTLE = 'cattle',
  SHEEP = 'sheep',
  DEER = 'deer',
  FISH = 'fish',
  // Luxury Resources
  GOLD = 'gold',
  SILVER = 'silver',
  GEMS = 'gems',
  SILK = 'silk',
  SPICES = 'spices',
  // Strategic Resources
  IRON = 'iron',
  HORSES = 'horses',
  COAL = 'coal',
  OIL = 'oil',
  ALUMINUM = 'aluminum',
  URANIUM = 'uranium'
}

export enum ResourceCategory {
  BONUS = 'bonus',
  LUXURY = 'luxury',
  STRATEGIC = 'strategic'
}

// Unit Types
export interface Unit {
  id: string;
  type: UnitType;
  name: string;
  playerId: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  movement: number;
  maxMovement: number;
  strength: number;
  experience: number;
  promotions: string[];
  status: UnitStatus[];
}

export enum UnitType {
  WARRIOR = 'warrior',
  SCOUT = 'scout',
  SETTLER = 'settler',
  WORKER = 'worker',
  ARCHER = 'archer',
  SPEARMAN = 'spearman',
  SWORDSMAN = 'swordsman',
  HORSEMAN = 'horseman'
}

export enum UnitStatus {
  FORTIFIED = 'fortified',
  SLEEP = 'sleep',
  ALERT = 'alert',
  EMBARKED = 'embarked',
  PILLAGING = 'pillaging'
}

// City Types
export interface City {
  id: string;
  name: string;
  playerId: string;
  x: number;
  y: number;
  population: number;
  health: number;
  maxHealth: number;
  production: CityProduction | null;
  buildings: Building[];
  workingTiles: { x: number; y: number }[];
  founded: Date;
}

export interface CityProduction {
  type: ProductionType;
  targetId: string;
  turnsRemaining: number;
  productionStored: number;
  productionRequired: number;
}

export enum ProductionType {
  UNIT = 'unit',
  BUILDING = 'building',
  WONDER = 'wonder',
  PROJECT = 'project'
}

export interface Building {
  type: string;
  constructedTurn: number;
  isActive: boolean;
}

// Technology Types
export interface Technology {
  id: string;
  name: string;
  description: string;
  cost: number;
  era: TechEra;
  prerequisites: string[];
  unlocks: TechUnlock[];
}

export enum TechEra {
  ANCIENT = 'ancient',
  CLASSICAL = 'classical',
  MEDIEVAL = 'medieval',
  RENAISSANCE = 'renaissance',
  INDUSTRIAL = 'industrial',
  MODERN = 'modern',
  ATOMIC = 'atomic',
  INFORMATION = 'information'
}

export interface TechUnlock {
  type: UnlockType;
  id: string;
}

export enum UnlockType {
  UNIT = 'unit',
  BUILDING = 'building',
  IMPROVEMENT = 'improvement',
  CIVIC = 'civic',
  RESOURCE = 'resource'
}

// Player State
export interface PlayerState {
  id: string;           // Add id property (alias for userId)
  userId: string;
  name: string;         // Add name property for display
  color: string;        // Add color property for UI
  civilization: string;
  resources: Resources;
  technologies: PlayerTechnology[];
  cities: string[]; // city IDs
  units: string[]; // unit IDs
  score: number;
  isAlive: boolean;
  isActive: boolean;    // Add for client compatibility
}

export interface PlayerTechnology {
  techId: string;
  isResearched: boolean;
  progress: number;
  turnsToComplete?: number;
}

// Add method for PlayerTechnology arrays to support Set-like operations
declare global {
  interface Array<T> {
    add?(item: T): void;
  }
}

// Extend PlayerTechnology[] to support add method for client compatibility
if (!Array.prototype.add) {
  Array.prototype.add = function<T>(this: T[], item: T) {
    if (!this.includes(item)) {
      this.push(item);
    }
  };
}

// Improvement Types
export interface Improvement {
  type: ImprovementType;
  constructedTurn: number;
  isActive: boolean;
  yield: Partial<Resources>;
}

export enum ImprovementType {
  FARM = 'farm',
  MINE = 'mine',
  PASTURE = 'pasture',
  CAMP = 'camp',
  FISHING_BOATS = 'fishing_boats',
  PLANTATION = 'plantation',
  QUARRY = 'quarry',
  TRADING_POST = 'trading_post',
  ROAD = 'road',
  RAILROAD = 'railroad'
}

// WebSocket Message Types
export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: Date;
  messageId: string;
}

export interface GameActionMessage {
  gameId: string;
  playerId: string;
  action: GameAction;
}

export interface GameAction {
  type: GameActionType;
  payload: any;
}

export enum GameActionType {
  MOVE_UNIT = 'move_unit',
  ATTACK_UNIT = 'attack_unit',
  FOUND_CITY = 'found_city',
  BUILD_IMPROVEMENT = 'build_improvement',
  CHANGE_PRODUCTION = 'change_production',
  RESEARCH_TECHNOLOGY = 'research_technology',
  END_TURN = 'end_turn'
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  timestamp: Date;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
}

// Rate Limiting Types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

// Health Check Types
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  version?: string;
  services?: ServiceHealth[];
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
}