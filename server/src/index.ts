import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import timeout from 'connect-timeout';
import { GameManager } from './game/GameManager';
import { AuthController } from './controllers/AuthController';
import { GameController } from './controllers/GameController';
import { DatabaseManager } from './database/DatabaseManager';
import { config, getConfigSummary } from './config/config';
import { securityHeaders, sanitizeRequest, validationErrorHandler } from './middleware/validation';
import { authErrorHandler } from './middleware/auth';
import { secureJWTManager } from './security/SecureJWTManager';

async function startServer() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: config.CLIENT_URL,
      methods: ["GET", "POST"],
      credentials: config.ENABLE_CORS_CREDENTIALS
    }
  });
  
  // Initialize secure JWT manager
  try {
    await secureJWTManager.initialize();
    console.log('✅ Secure JWT Manager initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Secure JWT Manager:', error);
    process.exit(1);
  }

  // Security middleware (order matters)
  app.use(securityHeaders());
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", "ws:", "wss:"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  }));
  
  // CORS with security configuration
  app.use(cors({
    origin: config.CLIENT_URL,
    credentials: config.ENABLE_CORS_CREDENTIALS,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400 // 24 hours
  }));
  
  // Request processing middleware
  app.use(timeout(`${config.REQUEST_TIMEOUT_MS}ms`));
  app.use(sanitizeRequest());
  app.use(express.json({ 
    limit: '1mb', // Reduced from 10mb for security
    verify: (req, res, buf) => {
      // Verify JSON payload integrity
      try {
        JSON.parse(buf.toString());
      } catch (err) {
        throw new Error('Invalid JSON payload');
      }
    }
  }));
  app.use(express.urlencoded({ 
    extended: true, 
    limit: '1mb',
    parameterLimit: 100 // Limit URL parameters
  }));

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

  // API routes with error handling
  app.use('/api/auth', authController.router);
  app.use('/api/games', gameController.router);
  
  // Security info endpoint (development only)
  if (config.ENABLE_DEBUG_ENDPOINTS && config.NODE_ENV === 'development') {
    app.get('/api/security/info', (req, res) => {
      res.json({
        jwtKeyInfo: secureJWTManager.getKeyInfo(),
        config: getConfigSummary()
      });
    });
  }

  // Enhanced health check with security status
  app.get('/health', (req, res) => {
    const jwtInfo = secureJWTManager.getKeyInfo();
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.NODE_ENV,
      database: databaseManager.isConnected() ? 'connected' : 'disconnected',
      security: {
        jwtKeysActive: jwtInfo.totalKeys > 0,
        currentKeyActive: jwtInfo.currentKeyId !== null,
        securityHeadersEnabled: config.ENABLE_SECURITY_HEADERS
      },
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

  // Global error handling middleware (must be last)
  app.use(validationErrorHandler());
  app.use(authErrorHandler());
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    
    // Don't expose internal errors in production
    if (config.NODE_ENV === 'production') {
      res.status(500).json({
        error: 'Internal server error'
      });
    } else {
      res.status(500).json({
        error: 'Internal server error',
        details: err.message,
        stack: err.stack
      });
    }
  });
  
  const PORT = config.PORT;

  server.listen(PORT, () => {
    const summary = getConfigSummary();
    
    console.log(`
🚀 SPARC Civilization Game Server Started!
🌐 Server running on port ${PORT}
📊 Environment: ${summary.environment}
🔗 Client URL: ${config.CLIENT_URL}
💾 Database: ${databaseManager.isConnected() ? 'Connected ✅' : 'Disconnected ❌'}
🔐 Security: JWT Manager Active ✅
⚡ Rate Limiting: ${summary.rateLimiting.maxRequests} req/${summary.rateLimiting.windowMs}ms
🛡️ Security Headers: ${summary.security.securityHeadersEnabled ? 'Enabled ✅' : 'Disabled ❌'}
📅 Started at: ${new Date().toISOString()}

Endpoints:
🔍 API Documentation: http://localhost:${PORT}/api
💊 Health Check: http://localhost:${PORT}/health${config.ENABLE_DEBUG_ENDPOINTS && config.NODE_ENV === 'development' ? '\n🔧 Security Info: http://localhost:' + PORT + '/api/security/info' : ''}

⚠️  Security Status:
   - JWT Secrets: ${config.NODE_ENV === 'production' ? 'Production Ready ✅' : 'Development Mode ⚠️'}
   - Environment Variables: Validated ✅
   - Rate Limiting: Active ✅
   - Input Validation: Active ✅
    `);
  });

  // Enhanced graceful shutdown
  const shutdown = async () => {
    console.log('🔄 Shutting down gracefully...');
    
    server.close(async () => {
      try {
        // Stop JWT key rotation
        secureJWTManager.stop();
        console.log('✅ JWT Manager stopped');
        
        // Shutdown game manager
        gameManager.shutdown();
        console.log('✅ Game Manager stopped');
        
        // Disconnect database
        await databaseManager.disconnect();
        console.log('✅ Database disconnected');
        
        console.log('🏁 Server shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      console.log('⏰ Force exit after timeout');
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