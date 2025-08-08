import { z } from 'zod';
import { GameStatus, VictoryCondition, DifficultyLevel, GameActionType } from '../types';

// Authentication validation schemas
export const loginSchema = z.object({
  username: z.string()
    .min(1, 'Username is required')
    .max(50, 'Username must be less than 50 characters'),
  password: z.string()
    .min(1, 'Password is required')
});

export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string()
    .email('Must be a valid email address')
    .max(100, 'Email must be less than 100 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number')
});

// Game validation schemas
export const createGameSchema = z.object({
  name: z.string()
    .min(1, 'Game name is required')
    .max(50, 'Game name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Game name can only contain letters, numbers, spaces, hyphens, and underscores'),
  maxPlayers: z.number()
    .int('Max players must be an integer')
    .min(2, 'Must have at least 2 players')
    .max(16, 'Cannot have more than 16 players'),
  settings: z.object({
    mapSize: z.object({
      width: z.number().int().min(10).max(100),
      height: z.number().int().min(10).max(100)
    }),
    turnTimeLimit: z.number().int().min(30).max(3600),
    maxTurns: z.number().int().min(50).max(1000),
    victoryConditions: z.array(z.nativeEnum(VictoryCondition)).min(1),
    startingResources: z.object({
      food: z.number().int().min(0),
      production: z.number().int().min(0),
      gold: z.number().int().min(0),
      science: z.number().int().min(0),
      culture: z.number().int().min(0),
      faith: z.number().int().min(0)
    }),
    difficulty: z.nativeEnum(DifficultyLevel)
  })
});

export const joinGameSchema = z.object({
  gameId: z.string().min(1, 'Game ID is required'),
  civilization: z.string()
    .min(1, 'Civilization is required')
    .max(30, 'Civilization name must be less than 30 characters')
});

export const gameActionSchema = z.object({
  gameId: z.string().min(1, 'Game ID is required'),
  action: z.object({
    type: z.nativeEnum(GameActionType),
    payload: z.any() // Specific validation based on action type
  })
});

// Move unit action validation
export const moveUnitActionSchema = z.object({
  unitId: z.string().min(1, 'Unit ID is required'),
  targetX: z.number().int().min(0),
  targetY: z.number().int().min(0),
  path: z.array(z.object({
    x: z.number().int().min(0),
    y: z.number().int().min(0)
  })).optional()
});

// Attack unit action validation
export const attackUnitActionSchema = z.object({
  attackingUnitId: z.string().min(1, 'Attacking unit ID is required'),
  targetUnitId: z.string().min(1, 'Target unit ID is required'),
  combatType: z.enum(['melee', 'ranged']).optional()
});

// Found city action validation
export const foundCityActionSchema = z.object({
  settlerUnitId: z.string().min(1, 'Settler unit ID is required'),
  cityName: z.string()
    .min(1, 'City name is required')
    .max(30, 'City name must be less than 30 characters')
    .regex(/^[a-zA-Z0-9\s\-_']+$/, 'City name contains invalid characters'),
  x: z.number().int().min(0),
  y: z.number().int().min(0)
});

// Build improvement action validation
export const buildImprovementActionSchema = z.object({
  workerUnitId: z.string().min(1, 'Worker unit ID is required'),
  improvementType: z.string().min(1, 'Improvement type is required'),
  x: z.number().int().min(0),
  y: z.number().int().min(0)
});

// Change production action validation
export const changeProductionActionSchema = z.object({
  cityId: z.string().min(1, 'City ID is required'),
  production: z.object({
    type: z.enum(['unit', 'building', 'wonder', 'project']),
    targetId: z.string().min(1, 'Target ID is required')
  })
});

// Research technology action validation
export const researchTechnologyActionSchema = z.object({
  technologyId: z.string().min(1, 'Technology ID is required')
});

// WebSocket message validation
export const webSocketMessageSchema = z.object({
  type: z.string().min(1, 'Message type is required'),
  data: z.any(),
  timestamp: z.string().datetime().optional(),
  messageId: z.string().min(1, 'Message ID is required')
});

// User profile validation
export const updateProfileSchema = z.object({
  preferences: z.object({
    notifications: z.boolean().optional(),
    publicProfile: z.boolean().optional(),
    theme: z.enum(['light', 'dark']).optional(),
    language: z.string().max(10).optional()
  }).optional()
});

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Chat message validation
export const chatMessageSchema = z.object({
  gameId: z.string().min(1, 'Game ID is required'),
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(500, 'Message must be less than 500 characters')
    .trim(),
  type: z.enum(['public', 'team', 'private']).default('public'),
  targetPlayerId: z.string().optional() // For private messages
});

// Coordinate validation
export const coordinateSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0)
});

// ID validation
export const idSchema = z.string().min(1, 'ID is required');

// Game state query validation
export const gameStateQuerySchema = z.object({
  includeHidden: z.boolean().default(false),
  playerView: z.string().optional(), // For fog of war
  lastUpdate: z.string().datetime().optional()
});

// Validation helpers
export const validateGameAction = (actionType: GameActionType, payload: any) => {
  switch (actionType) {
    case GameActionType.MOVE_UNIT:
      return moveUnitActionSchema.parse(payload);
    case GameActionType.ATTACK_UNIT:
      return attackUnitActionSchema.parse(payload);
    case GameActionType.FOUND_CITY:
      return foundCityActionSchema.parse(payload);
    case GameActionType.BUILD_IMPROVEMENT:
      return buildImprovementActionSchema.parse(payload);
    case GameActionType.CHANGE_PRODUCTION:
      return changeProductionActionSchema.parse(payload);
    case GameActionType.RESEARCH_TECHNOLOGY:
      return researchTechnologyActionSchema.parse(payload);
    case GameActionType.END_TURN:
      return z.object({}).parse(payload); // No payload for end turn
    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
};

// Export all schemas for use in API endpoints
export const validationSchemas = {
  login: loginSchema,
  register: registerSchema,
  createGame: createGameSchema,
  joinGame: joinGameSchema,
  gameAction: gameActionSchema,
  updateProfile: updateProfileSchema,
  pagination: paginationSchema,
  chatMessage: chatMessageSchema,
  coordinate: coordinateSchema,
  id: idSchema,
  gameStateQuery: gameStateQuerySchema,
  webSocketMessage: webSocketMessageSchema
};