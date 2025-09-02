// Shared package barrel exports
export * from './types';
export * from './utils';
export * from './constants';
export * from './validation';

// Ensure critical types are available
export { PlayerInfo, Position, HexCoordinate, TerrainType, ResourceType, TechnologyType, BuildingType } from './types/GameTypes';
export { PlayerState, GameState, GamePhase, GameAction, GameActionType, UnitType } from './types/index';