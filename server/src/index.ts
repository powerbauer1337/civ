import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GameManager } from './game/GameManager';
import { AuthController } from './controllers/AuthController';
import { GameController } from './controllers/GameController';
import { DatabaseManager } from './database/DatabaseManager';
import { config } from './config/config';

async function startServer() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: config.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  // Middleware
  app.use(helmet());
  app.use(cors({
    origin: config.CLIENT_URL || "http://localhost:5173"
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Initialize database
  const databaseManager = new DatabaseManager();
  try {
    await databaseManager.initialize();
  } catch (error) {
    console.error('Failed to initialize database, continuing without persistence:', error);
  }

  // Initialize game manager
  const gameManager = new GameManager(io);

  // Initialize controllers
  const authController = new AuthController();
  const gameController = new GameController(gameManager);

  // Routes
  app.use('/api/auth', authController.router);
  app.use('/api/games', gameController.router);

  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: databaseManager.isConnected() ? 'connected' : 'disconnected',
      gameStats: {
        activeGames: gameManager.getGameCount(),
        activePlayers: gameManager.getActivePlayerCount()
      }
    });
  });

  // API documentation endpoint
  app.get('/api', (req, res) => {
    res.json({
      name: 'Civilization Game API',
      version: '1.0.0',
      endpoints: {
        auth: {
          'POST /api/auth/register': 'Register new user',
          'POST /api/auth/login': 'Login user',
          'GET /api/auth/profile': 'Get user profile',
          'PUT /api/auth/profile': 'Update user profile',
          'GET /api/auth/verify': 'Verify JWT token'
        },
        games: {
          'GET /api/games': 'List all games',
          'GET /api/games/stats': 'Get game statistics',
          'GET /api/games/:id': 'Get game details',
          'GET /api/games/:id/state': 'Get game state',
          'POST /api/games/config/validate': 'Validate game configuration'
        },
        websocket: {
          events: [
            'create_game',
            'join_game', 
            'leave_game',
            'start_game',
            'game_action',
            'player_ready',
            'request_game_state'
          ]
        }
      }
    });
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Handle game events
    gameManager.handleConnection(socket);
    
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      gameManager.handleDisconnection(socket);
    });
  });

  const PORT = config.PORT || 3001;

  server.listen(PORT, () => {
    console.log(`
🚀 Civilization Game Server Started!
🌐 Server running on port ${PORT}
📊 Environment: ${config.NODE_ENV}
🔗 Client URL: ${config.CLIENT_URL}
💾 Database: ${databaseManager.isConnected() ? 'Connected' : 'Disconnected'}
📅 Started at: ${new Date().toISOString()}

API Documentation available at: http://localhost:${PORT}/api
Health Check available at: http://localhost:${PORT}/health
    `);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down gracefully...');
    
    server.close(async () => {
      gameManager.shutdown();
      await databaseManager.disconnect();
      console.log('Server shut down complete');
      process.exit(0);
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      console.log('Force exit');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});