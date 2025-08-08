import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/config';

const app = express();

// Basic middleware
app.use(helmet());
app.use(cors({
  origin: config.CLIENT_URL || "http://localhost:5173"
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
    version: '1.0.0'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Civilization Game API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/health',
      api: '/api'
    }
  });
});

// Simple game status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    gameServer: 'running',
    players: 0,
    activeGames: 0,
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = config.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Civilization Game Server - Simple Mode`);
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${config.NODE_ENV}`);
  console.log(`🔗 Client URL: ${config.CLIENT_URL}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`🎯 Health Check: http://localhost:${PORT}/health`);
  console.log(`📋 API Info: http://localhost:${PORT}/api`);
});

export default app;