import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { config } from './config/config';

// Import new modular components
import GameService from './services/GameService';
import { GameController } from './controllers/GameController';
import { PlayerController } from './controllers/PlayerController';
import { SocketHandler } from './websocket/SocketHandler';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: config.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: config.CLIENT_URL || "http://localhost:5173"
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize services
const gameService = new GameService();
const gameController = new GameController(gameService);
const playerController = new PlayerController(gameService);

// Initialize WebSocket handling
const socketHandler = new SocketHandler(io, gameService);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const stats = gameService.getStats();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    version: '1.0.0',
    features: ['api', 'websocket', 'game-engine'],
    stats
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Civilization Game API - Optimized Version',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/health',
      api: '/api',
      games: '/api/games',
      'create-game': 'POST /api/games',
      'get-game': 'GET /api/games/:id',
      'join-game': 'POST /api/games/:id/join',
      'game-stats': 'GET /api/games/stats',
      players: '/api/players',
      'get-player': 'GET /api/players/:id',
      'update-activity': 'PUT /api/players/:id/activity',
      'update-status': 'PUT /api/players/:id/status'
    },
    documentation: '/docs'
  });
});

// Game routes
app.get('/api/games', gameController.getAllGames);
app.post('/api/games', gameController.createGame);
app.get('/api/games/stats', gameController.getStats);
app.get('/api/games/:id', gameController.getGame);
app.post('/api/games/:id/join', gameController.joinGame);
app.delete('/api/games/:id', gameController.deleteGame);

// Player routes
app.get('/api/players', playerController.getAllPlayers);
app.get('/api/players/:id', playerController.getPlayer);
app.put('/api/players/:id/activity', playerController.updateActivity);
app.put('/api/players/:id/status', playerController.updateStatus);

// API status endpoint
app.get('/api/status', (req, res) => {
  const stats = gameService.getStats();
  res.json({
    gameServer: 'running',
    totalGames: stats.totalGames,
    activeGames: stats.activeGames,
    players: stats.onlinePlayers,
    timestamp: new Date().toISOString(),
    performance: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /health',
      'GET /api',
      'GET /api/status',
      'GET /api/games',
      'POST /api/games',
      'GET /api/games/:id',
      'POST /api/games/:id/join',
      'GET /api/players'
    ]
  });
});

// Cleanup inactive games periodically
const cleanupInterval = setInterval(() => {
  const result = gameService.cleanup();
  if (result.gamesRemoved > 0 || result.playersRemoved > 0) {
    console.log(`🧹 Cleanup completed: ${result.gamesRemoved} games, ${result.playersRemoved} players removed`);
  }
}, 5 * 60 * 1000); // Every 5 minutes

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  clearInterval(cleanupInterval);
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  clearInterval(cleanupInterval);
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
const PORT = config.PORT || 4002;

server.listen(PORT, () => {
  console.log(`🚀 Civilization Game Server - Optimized Version`);
  console.log(`🌐 HTTP Server running on port ${PORT}`);
  console.log(`🔌 WebSocket Server running on port ${PORT}`);
  console.log(`📊 Environment: ${config.NODE_ENV}`);
  console.log(`🔗 Client URL: ${config.CLIENT_URL}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`🎯 Health Check: http://localhost:${PORT}/health`);
  console.log(`📋 API Info: http://localhost:${PORT}/api`);
  console.log(`🎮 Games Endpoint: http://localhost:${PORT}/api/games`);
  console.log(`👥 Players Endpoint: http://localhost:${PORT}/api/players`);
  console.log(`🛡️  Security: Helmet enabled, CORS configured`);
  console.log(`🧹 Auto-cleanup: Every 5 minutes`);
  console.log(`✨ Features: Modular architecture, comprehensive error handling`);
});

export default server;