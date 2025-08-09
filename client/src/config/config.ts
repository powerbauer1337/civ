// Client configuration
const isDevelopment = import.meta.env.MODE === 'development'
const isProduction = import.meta.env.MODE === 'production'

export const config = {
  // Environment
  isDevelopment,
  isProduction,
  
  // API Configuration
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || (
    isProduction 
      ? 'https://civ-game-api.herokuapp.com'  // Replace with your backend URL
      : 'http://localhost:4002'
  ),
  
  // WebSocket Configuration
  SOCKET_URL: import.meta.env.VITE_SOCKET_URL || (
    isProduction 
      ? 'https://civ-game-api.herokuapp.com'  // Replace with your backend URL
      : 'http://localhost:4002'
  ),
  
  // Game Configuration
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  HEARTBEAT_INTERVAL: 30000,
  
  // Performance
  ENABLE_REDUX_DEVTOOLS: isDevelopment,
  ENABLE_PHASER_DEBUG: isDevelopment,
  
  // Features
  ENABLE_OFFLINE_MODE: false,
  ENABLE_DEMO_MODE: isProduction, // Enable demo mode for GitHub Pages
  
  // Demo Configuration (for GitHub Pages deployment)
  DEMO_MODE: {
    ENABLE_LOCAL_STORAGE_PERSISTENCE: true,
    SIMULATE_MULTIPLAYER: true,
    MAX_DEMO_PLAYERS: 4
  }
}

// Validate required environment variables in production
if (isProduction) {
  const requiredEnvVars: string[] = []
  
  for (const envVar of requiredEnvVars) {
    if (!import.meta.env[envVar as keyof ImportMetaEnv]) {
      console.warn(`Missing required environment variable: ${envVar}`)
    }
  }
}

export default config