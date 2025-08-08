// Game type definitions for frontend use
// These match the server types but are simplified for client use

export interface MapTile {
  x: number;
  y: number;
  terrain: string;
  features?: string[];
  resources?: Resource | null;
  improvement?: Improvement | null;
  unit?: Unit | null;
  city?: City | null;
  visibility?: { [playerId: string]: number };
}

export interface Unit {
  id: string;
  type: string;
  name: string;
  playerId: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  movement: number;
  maxMovement: number;
  strength: number;
  experience?: number;
  promotions?: string[];
  status?: string[];
}

export interface City {
  id: string;
  name: string;
  playerId: string;
  x: number;
  y: number;
  population: number;
  health: number;
  maxHealth: number;
  production?: CityProduction | null;
  buildings?: Building[];
  workingTiles?: { x: number; y: number }[];
  founded: Date;
}

export interface CityProduction {
  type: string;
  targetId: string;
  turnsRemaining: number;
  productionStored: number;
  productionRequired: number;
}

export interface Building {
  type: string;
  constructedTurn: number;
  isActive: boolean;
}

export interface Resource {
  type: string;
  category: string;
  yield: {
    food?: number;
    production?: number;
    gold?: number;
    science?: number;
    culture?: number;
    faith?: number;
  };
  requiredTech?: string;
}

export interface Improvement {
  type: string;
  constructedTurn: number;
  isActive: boolean;
  yield: {
    food?: number;
    production?: number;
    gold?: number;
    science?: number;
    culture?: number;
    faith?: number;
  };
}

export interface GameMap {
  width: number;
  height: number;
  tiles: MapTile[][];
}

export interface Resources {
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  faith: number;
}

export interface PlayerState {
  userId: string;
  civilization: string;
  resources: Resources;
  technologies: PlayerTechnology[];
  cities: string[];
  units: string[];
  score: number;
  isAlive: boolean;
}

export interface PlayerTechnology {
  techId: string;
  isResearched: boolean;
  progress: number;
  turnsToComplete?: number;
}

export interface GameState {
  gameId: string;
  currentPlayer: string;
  turn: number;
  phase: string;
  map: GameMap;
  players: PlayerState[];
  lastUpdate: Date;
}

// Legacy support for existing code
export interface GameAction {
  type: string;
  playerId: string;
  payload: any;
  timestamp?: number;
  actionId?: string;
}