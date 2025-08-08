import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { config } from './config/config';

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
app.use(express.json());

// In-memory game state for testing
interface TestPlayer {
  id: string;
  username: string;
  civilization: string;
  score: number;
  isOnline: boolean;
}

interface TestGame {
  id: string;
  name: string;
  status: 'waiting' | 'active' | 'ended';
  players: TestPlayer[];
  maxPlayers: number;
  currentTurn: number;
  createdAt: Date;
}

const games = new Map<string, TestGame>();
const players = new Map<string, TestPlayer>();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    version: '1.0.0',
    features: ['api', 'websocket', 'game-engine']
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Civilization Game API - Test Mode',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/health',
      api: '/api',
      games: '/api/games',
      'create-game': '/api/games',
      'join-game': '/api/games/:id/join',
      players: '/api/players'
    }
  });
});

// Game status endpoint
app.get('/api/status', (req, res) => {
  const activeGames = Array.from(games.values()).filter(g => g.status === 'active').length;
  const onlinePlayers = Array.from(players.values()).filter(p => p.isOnline).length;
  
  res.json({
    gameServer: 'running',
    totalGames: games.size,
    activeGames,
    players: onlinePlayers,
    timestamp: new Date().toISOString()
  });
});

// Get all games with pagination and filtering
app.get('/api/games', (req, res) => {
  const { page = '1', limit = '10', filter = 'all', hideTestGames = 'false' } = req.query;
  const pageNum = parseInt(page as string);
  const limitNum = parseInt(limit as string);
  const hideTest = hideTestGames === 'true';
  
  let gameList = Array.from(games.values()).map(game => ({
    id: game.id,
    name: game.name,
    status: game.status,
    playerCount: game.players.length,
    maxPlayers: game.maxPlayers,
    currentTurn: game.currentTurn,
    createdAt: game.createdAt,
    joinable: game.status === 'waiting' && game.players.length < game.maxPlayers,
    isTestGame: isTestGame(game.id) || isTestGame(game.name)
  }));
  
  // Filter out test games if requested
  if (hideTest) {
    gameList = gameList.filter(game => !game.isTestGame);
  }
  
  // Apply status filter
  if (filter !== 'all') {
    gameList = gameList.filter(game => {
      switch (filter) {
        case 'active': return game.status === 'active';
        case 'waiting': return game.status === 'waiting';
        case 'ended': return game.status === 'ended';
        default: return true;
      }
    });
  }
  
  // Sort by creation date (newest first)
  gameList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Apply pagination
  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = startIndex + limitNum;
  const paginatedGames = gameList.slice(startIndex, endIndex);
  
  res.json({
    games: paginatedGames,
    totalGames: gameList.length,
    currentPage: pageNum,
    totalPages: Math.ceil(gameList.length / limitNum),
    hasMore: endIndex < gameList.length
  });
});

// Test game detection helper
function isTestGame(name: string): boolean {
  const testPatterns = ['test', 'perf', 'performance', 'load', 'benchmark', 'demo', 'sample'];
  const lowerName = name.toLowerCase();
  return testPatterns.some(pattern => lowerName.includes(pattern));
}

// Cleanup test games endpoint
app.delete('/api/games/cleanup-test-games', (req, res) => {
  const removedGames: string[] = [];
  
  for (const [gameId, game] of games) {
    if (isTestGame(game.id) || isTestGame(game.name)) {
      games.delete(gameId);
      removedGames.push(gameId);
      
      // Remove players from this game
      game.players.forEach(player => {
        players.delete(player.id);
      });
    }
  }
  
  res.json({
    success: true,
    message: `Successfully removed ${removedGames.length} test games`,
    removedGames: removedGames.map(id => ({ id, name: `Test Game (${id.substring(0, 8)})` })),
    gameCountBefore: games.size + removedGames.length,
    gameCountAfter: games.size
  });
});

// Cleanup old games endpoint
app.delete('/api/games/cleanup-old-games', (req, res) => {
  const { olderThanHours = '24' } = req.query;
  const hours = parseInt(olderThanHours as string);
  const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
  const removedGames: string[] = [];
  
  for (const [gameId, game] of games) {
    if (game.createdAt < cutoffTime) {
      games.delete(gameId);
      removedGames.push(gameId);
      
      // Remove players from this game
      game.players.forEach(player => {
        players.delete(player.id);
      });
    }
  }
  
  res.json({
    success: true,
    message: `Successfully removed ${removedGames.length} games older than ${hours} hours`,
    removedGames: removedGames.map(id => ({ id, name: `Old Game (${id.substring(0, 8)})` })),
    gameCountBefore: games.size + removedGames.length,
    gameCountAfter: games.size,
    hoursThreshold: hours
  });
});

// Create a new game
app.post('/api/games', (req, res) => {
  const { name, maxPlayers = 4 } = req.body;
  
  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Game name is required' });
  }
  
  const gameId = `game_${Date.now()}`;
  const game: TestGame = {
    id: gameId,
    name: name.trim(),
    status: 'waiting',
    players: [],
    maxPlayers: Math.max(2, Math.min(8, maxPlayers)),
    currentTurn: 0,
    createdAt: new Date()
  };
  
  games.set(gameId, game);
  
  res.status(201).json({
    message: 'Game created successfully',
    game: {
      id: game.id,
      name: game.name,
      status: game.status,
      maxPlayers: game.maxPlayers,
      createdAt: game.createdAt
    }
  });
});

// Join a game
app.post('/api/games/:id/join', (req, res) => {
  const { id } = req.params;
  const { username, civilization = 'Random' } = req.body;
  
  if (!username || username.trim().length === 0) {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  const game = games.get(id);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  
  if (game.status !== 'waiting') {
    return res.status(400).json({ error: 'Game is not accepting new players' });
  }
  
  if (game.players.length >= game.maxPlayers) {
    return res.status(400).json({ error: 'Game is full' });
  }
  
  // Check if player already exists
  const existingPlayer = game.players.find(p => p.username === username.trim());
  if (existingPlayer) {
    return res.status(400).json({ error: 'Username already taken in this game' });
  }
  
  const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const player: TestPlayer = {
    id: playerId,
    username: username.trim(),
    civilization: civilization,
    score: 0,
    isOnline: true
  };
  
  game.players.push(player);
  players.set(playerId, player);
  
  // Start game if enough players
  if (game.players.length >= 2) {
    game.status = 'active';
    
    // Emit game start to all connected sockets
    io.emit('game_started', {
      gameId: game.id,
      players: game.players.map(p => ({
        id: p.id,
        username: p.username,
        civilization: p.civilization
      }))
    });
  }
  
  res.json({
    message: 'Joined game successfully',
    game: {
      id: game.id,
      name: game.name,
      status: game.status,
      players: game.players.map(p => ({
        id: p.id,
        username: p.username,
        civilization: p.civilization
      }))
    },
    playerId: playerId
  });
});

// Get players
app.get('/api/players', (req, res) => {
  const playerList = Array.from(players.values()).map(player => ({
    id: player.id,
    username: player.username,
    civilization: player.civilization,
    score: player.score,
    isOnline: player.isOnline
  }));
  
  res.json(playerList);
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`🔌 WebSocket client connected: ${socket.id}`);
  
  socket.emit('welcome', {
    message: 'Connected to Civilization Game Server',
    timestamp: new Date().toISOString(),
    socketId: socket.id
  });
  
  socket.on('join_game', (data) => {
    const { gameId, playerId } = data;
    socket.join(gameId);
    
    socket.emit('game_joined', {
      gameId,
      message: 'Successfully joined game room'
    });
    
    // Broadcast to other players in the game
    socket.to(gameId).emit('player_joined', {
      playerId,
      message: 'A new player joined the game'
    });
  });
  
  socket.on('game_action', (data) => {
    const { gameId, playerId, action, payload } = data;
    
    console.log(`🎮 Game action received: ${action} from ${playerId} in game ${gameId}`);
    
    // Broadcast action to all players in the game
    socket.to(gameId).emit('game_update', {
      action,
      playerId,
      payload,
      timestamp: new Date().toISOString()
    });
    
    // Acknowledge the action
    socket.emit('action_acknowledged', {
      action,
      success: true,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('disconnect', () => {
    console.log(`🔌 WebSocket client disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = 4002;

server.listen(PORT, () => {
  console.log(`🚀 Civilization Game Server - Full Test Mode`);
  console.log(`🌐 HTTP Server running on port ${PORT}`);
  console.log(`🔌 WebSocket Server running on port ${PORT}`);
  console.log(`📊 Environment: ${config.NODE_ENV}`);
  console.log(`🔗 Client URL: ${config.CLIENT_URL}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`🎯 Health Check: http://localhost:${PORT}/health`);
  console.log(`📋 API Info: http://localhost:${PORT}/api`);
  console.log(`🎮 Games Endpoint: http://localhost:${PORT}/api/games`);
  console.log(`👥 Players Endpoint: http://localhost:${PORT}/api/players`);
});

export default server;