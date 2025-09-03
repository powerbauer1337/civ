export interface Position {
  x: number;
  y: number;
}

export interface HexCoordinate {
  q: number;  // column
  r: number;  // row
  s: number;  // diagonal (q + r + s = 0)
}

export enum TerrainType {
  GRASSLAND = 'grassland',
  PLAINS = 'plains',
  DESERT = 'desert',
  TUNDRA = 'tundra',
  SNOW = 'snow',
  OCEAN = 'ocean',
  COAST = 'coast',
  LAKE = 'lake',
  HILLS = 'hills',
  MOUNTAINS = 'mountains',
  FOREST = 'forest',
  JUNGLE = 'jungle'
}

// Import from main types to avoid conflicts
import { Resources } from './index';

export enum UnitType {
  WARRIOR = 'warrior',
  ARCHER = 'archer',
  SPEARMAN = 'spearman',
  SETTLER = 'settler',
  SCOUT = 'scout',
  WORKER = 'worker'
}

export enum BuildingType {
  PALACE = 'palace',
  GRANARY = 'granary',
  BARRACKS = 'barracks',
  LIBRARY = 'library',
  MONUMENT = 'monument',
  WALLS = 'walls'
}

export enum TechnologyType {
  POTTERY = 'pottery',
  ANIMAL_HUSBANDRY = 'animal_husbandry',
  ARCHERY = 'archery',
  BRONZE_WORKING = 'bronze_working',
  WRITING = 'writing',
  WHEEL = 'wheel',
  MATHEMATICS = 'mathematics',
  CURRENCY = 'currency'
}

export type GameResources = Resources;

export interface PlayerInfo {
  id: string;
  name: string;
  color: string;
  civilization: string;
  resources: GameResources;
  technologies: Set<TechnologyType>;
  isActive: boolean;
  score: number;
}

export interface GameConfig {
  mapSize: { width: number; height: number };
  maxPlayers: number;
  turnTimeLimit: number; // seconds
  victoryConditions: VictoryType[];
  startingResources: GameResources;
}

export enum VictoryType {
  DOMINATION = 'domination',
  SCIENCE = 'science',
  CULTURE = 'culture',
  DIPLOMATIC = 'diplomatic',
  SCORE = 'score'
}

// GamePhase enum moved to index.ts to avoid conflicts
// Using unified enum: SETUP, PLAYER_TURN, BETWEEN_TURNS, END_GAME

export interface GameAction {
  type: string;
  playerId: string;
  data: any;  // Changed from payload to data to match server expectations
  timestamp?: number;
  actionId?: string;
}