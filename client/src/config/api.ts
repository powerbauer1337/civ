// API Configuration for Civilization Game Client

// Environment-based API configuration
const isDevelopment = import.meta.env.MODE === 'development'
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4002'
const socketURL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4002'

export const apiConfig = {
  baseURL,
  socketURL,
  isDevelopment,
  
  // API endpoints
  endpoints: {
    health: '/health',
    api: '/api',
    status: '/api/status',
    games: '/api/games',
    players: '/api/players',
    gameJoin: (gameId: string) => `/api/games/${gameId}/join`,
  },
  
  // Request configuration
  request: {
    timeout: 10000, // 10 seconds
    retries: 3,
    retryDelay: 1000, // 1 second
  },
  
  // WebSocket configuration
  websocket: {
    transports: ['websocket'],
    timeout: 5000,
    forceNew: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  }
}

// API utilities
export const createApiUrl = (endpoint: string) => `${baseURL}${endpoint}`

// Fetch with retry logic
export const fetchWithRetry = async (
  url: string, 
  options: RequestInit = {},
  retries = apiConfig.request.retries
): Promise<Response> => {
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(apiConfig.request.timeout)
    })
    
    if (!response.ok && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, apiConfig.request.retryDelay))
      return fetchWithRetry(url, options, retries - 1)
    }
    
    return response
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, apiConfig.request.retryDelay))
      return fetchWithRetry(url, options, retries - 1)
    }
    throw error
  }
}

export default apiConfig
