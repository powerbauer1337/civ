// Game constants and configuration values

export const GAME_CONSTANTS = {
  // Map settings
  MIN_MAP_SIZE: { width: 10, height: 10 },
  MAX_MAP_SIZE: { width: 100, height: 100 },
  DEFAULT_MAP_SIZE: { width: 20, height: 20 },
  
  // Player limits
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 16,
  DEFAULT_MAX_PLAYERS: 8,
  
  // Turn settings
  MIN_TURN_TIME: 30, // seconds
  MAX_TURN_TIME: 3600, // 1 hour
  DEFAULT_TURN_TIME: 300, // 5 minutes
  
  // Starting resources
  STARTING_RESOURCES: {
    food: 10,
    production: 5,
    gold: 25,
    science: 0,
    culture: 0,
    faith: 0
  },
  
  // Unit settings
  MAX_UNIT_HEALTH: 100,
  DEFAULT_UNIT_MOVEMENT: 2,
  
  // City settings
  MAX_CITY_HEALTH: 200,
  INITIAL_CITY_POPULATION: 1,
  CITY_ATTACK_RANGE: 2,
  
  // Experience and leveling
  EXPERIENCE_PER_LEVEL: 100,
  MAX_UNIT_LEVEL: 10,
  
  // Victory conditions
  VICTORY_POINTS: {
    DOMINATION: 1000,
    SCIENCE: 800,
    CULTURAL: 600,
    DIPLOMATIC: 500
  },
  
  // Resource yields
  RESOURCE_YIELDS: {
    WHEAT: { food: 1 },
    CATTLE: { food: 1, production: 1 },
    IRON: { production: 2 },
    GOLD: { gold: 2 },
    HORSES: { production: 1 }
  },
  
  // Technology costs by era
  TECH_COSTS: {
    ANCIENT: 50,
    CLASSICAL: 100,
    MEDIEVAL: 200,
    RENAISSANCE: 400,
    INDUSTRIAL: 800,
    MODERN: 1200,
    ATOMIC: 1800,
    INFORMATION: 2400
  }
};

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    VALIDATE: '/api/auth/validate',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout'
  },
  
  // Games
  GAMES: {
    LIST: '/api/games',
    CREATE: '/api/games',
    JOIN: '/api/games/:id/join',
    LEAVE: '/api/games/:id/leave',
    START: '/api/games/:id/start',
    STATE: '/api/games/:id/state',
    STATS: '/api/games/stats'
  },
  
  // Users
  USERS: {
    PROFILE: '/api/users/profile',
    STATS: '/api/users/stats',
    ACHIEVEMENTS: '/api/users/achievements'
  },
  
  // Health
  HEALTH: '/health',
  API_INFO: '/api'
};

export const WEBSOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  HEARTBEAT: 'heartbeat',
  
  // Game events
  GAME_JOIN: 'game:join',
  GAME_LEAVE: 'game:leave',
  GAME_START: 'game:start',
  GAME_STATE: 'game:state',
  GAME_ACTION: 'game:action',
  GAME_UPDATE: 'game:update',
  GAME_END: 'game:end',
  
  // Player events
  PLAYER_JOIN: 'player:join',
  PLAYER_LEAVE: 'player:leave',
  PLAYER_READY: 'player:ready',
  PLAYER_DISCONNECTED: 'player:disconnected',
  PLAYER_RECONNECTED: 'player:reconnected',
  
  // Turn events
  TURN_START: 'turn:start',
  TURN_END: 'turn:end',
  TURN_TIMEOUT: 'turn:timeout',
  
  // Chat events
  CHAT_MESSAGE: 'chat:message',
  CHAT_SYSTEM: 'chat:system',
  
  // Error events
  ERROR: 'error',
  VALIDATION_ERROR: 'validation:error',
  GAME_ERROR: 'game:error'
};

export const ERROR_CODES = {
  // Authentication errors
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  
  // Game errors
  GAME_NOT_FOUND: 'GAME_NOT_FOUND',
  GAME_FULL: 'GAME_FULL',
  GAME_ALREADY_STARTED: 'GAME_ALREADY_STARTED',
  GAME_NOT_STARTED: 'GAME_NOT_STARTED',
  PLAYER_NOT_IN_GAME: 'PLAYER_NOT_IN_GAME',
  PLAYER_ALREADY_IN_GAME: 'PLAYER_ALREADY_IN_GAME',
  NOT_PLAYER_TURN: 'NOT_PLAYER_TURN',
  INVALID_MOVE: 'INVALID_MOVE',
  
  // Validation errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Rate limiting errors
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

export const RATE_LIMITS = {
  // Authentication endpoints (per IP per window)
  AUTH_LOGIN: { windowMs: 5 * 60 * 1000, max: 5 }, // 5 attempts per 5 minutes
  AUTH_REGISTER: { windowMs: 10 * 60 * 1000, max: 3 }, // 3 attempts per 10 minutes
  
  // API endpoints (per user per window)
  API_GENERAL: { windowMs: 15 * 60 * 1000, max: 100 }, // 100 requests per 15 minutes
  API_GAME_ACTIONS: { windowMs: 60 * 1000, max: 30 }, // 30 actions per minute
  
  // Sensitive endpoints
  PASSWORD_RESET: { windowMs: 30 * 60 * 1000, max: 2 }, // 2 attempts per 30 minutes
  PROFILE_UPDATE: { windowMs: 5 * 60 * 1000, max: 10 } // 10 updates per 5 minutes
};

export const SECURITY_HEADERS = {
  CONTENT_SECURITY_POLICY: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  CROSS_ORIGIN_EMBEDDER_POLICY: false,
  CROSS_ORIGIN_OPENER_POLICY: false,
  CROSS_ORIGIN_RESOURCE_POLICY: { policy: "same-origin" },
  ORIGIN_AGENT_CLUSTER: true,
  REFERRER_POLICY: "strict-origin-when-cross-origin",
  STRICT_TRANSPORT_SECURITY: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  X_CONTENT_TYPE_OPTIONS: "nosniff",
  X_DNS_PREFETCH_CONTROL: { allow: false },
  X_DOWNLOAD_OPTIONS: "noopen",
  X_FRAME_OPTIONS: "DENY",
  X_PERMITTED_CROSS_DOMAIN_POLICIES: "none",
  X_XSS_PROTECTION: "0"
};