// Shared package barrel exports
export * from './types';
export * from './utils';
export * from './constants';
export * from './validation';

// Ensure critical types are available
export type { PlayerInfo, Position, HexCoordinate, GameConfig, GameResources } from './types/GameTypes';
export { TerrainType, TechnologyType, BuildingType, VictoryType } from './types/GameTypes';
export type { PlayerState, GameState, GameAction } from './types/index';
export { GameActionType, UnitType, ResourceType, ResourceCategory, GamePhase } from './types/index';
export { GameActionType as ActionType } from './types/index';
export { GameUtils } from './utils/GameUtils';
