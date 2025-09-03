// Shared package barrel exports
export * from './types';
export * from './utils';
export * from './constants';
export * from './validation';

// Ensure critical types are available
export { PlayerInfo, Position, HexCoordinate, TerrainType, TechnologyType, BuildingType, GameConfig, VictoryType, GameResources } from './types/GameTypes';
export { PlayerState, GameState, GamePhase, GameAction, GameActionType, UnitType, ResourceType, ResourceCategory } from './types/index';
export { GameActionType as ActionType } from './types/index';
export { GameUtils } from './utils/GameUtils';