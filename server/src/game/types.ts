// Local server-side type definitions to avoid conflicts with shared types
// These types are specifically for the GameManager and server infrastructure

export interface ServerGameAction {
  type: string;
  playerId: string;
  payload: any;
  timestamp: number;
  actionId: string;
}

export enum ServerGamePhase {
  LOBBY = 'lobby',
  ACTIVE = 'active', 
  ENDED = 'ended'
}

export interface ServerPlayerInfo {
  id: string;
  name: string;
  color: string;
  civilization: string;
  resources: Record<string, number>;
  technologies: Set<string>;
  isActive: boolean;
  score: number;
}

export interface ServerGameConfig {
  mapSize: { width: number; height: number };
  maxPlayers: number;
  turnTimeLimit: number;
  victoryConditions: string[];
  startingResources: Record<string, number>;
}

// Legacy compatibility types
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
  cities: any[];
  units: any[];
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

export enum VictoryType {
  DOMINATION = 'domination',
  SCIENCE = 'science',
  CULTURE = 'culture',
  SCORE = 'score'
}

export enum ResourceType {
  FOOD = 'food',
  PRODUCTION = 'production',
  GOLD = 'gold',
  SCIENCE = 'science',
  CULTURE = 'culture'
}