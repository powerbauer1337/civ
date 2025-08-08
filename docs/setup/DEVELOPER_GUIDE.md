# 🛠️ Developer Setup Guide - Civilization Game

This guide will help you set up the development environment, understand the codebase, and start contributing to the Civilization Game project.

## 📋 Prerequisites

### Required Software
- **Node.js 18+** and **npm 8+**
  - Download: https://nodejs.org/
  - Verify: `node --version` and `npm --version`
- **Git** for version control
  - Download: https://git-scm.com/
  - Verify: `git --version`
- **Modern Web Browser** (Chrome, Firefox, Safari, Edge)
  - Must support WebSocket and ES2020 features

### Recommended Tools
- **VS Code** with extensions:
  - TypeScript and JavaScript Language Features
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter
  - ESLint
  - REST Client (for API testing)
- **Git GUI** (GitKraken, SourceTree, or VS Code Git integration)
- **API Testing Tool** (Postman, Insomnia, or VS Code REST Client)

## 🚀 Quick Setup

### 1. Clone and Install
```bash
# Clone the repository
git clone <repository-url>
cd civ-game

# Install dependencies for all packages
npm install

# This installs dependencies for client/, server/, and shared/ packages
```

### 2. Start Development Servers
```bash
# Option 1: Start both servers with one command
npm run dev

# Option 2: Start servers separately (recommended for development)
# Terminal 1: Backend server
npm run dev:server

# Terminal 2: Frontend client
npm run dev:client
```

### 3. Verify Setup
- **Backend**: http://localhost:4002/health should return server health
- **Frontend**: http://localhost:5173/civ/ should show the game lobby
- **API**: http://localhost:5173/api/games should return game list

## 📁 Project Structure Deep Dive

```
civ-game/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── SimpleApp.tsx          # Main app component (current)
│   │   ├── App.tsx                # Complex app (legacy)
│   │   ├── pages/
│   │   │   ├── SimpleLobbyPage.tsx    # Game lobby interface
│   │   │   ├── SimpleGamePage.tsx     # Game interface
│   │   │   └── ...                    # Other pages (legacy)
│   │   ├── components/            # Reusable React components
│   │   ├── config/                # Client configuration
│   │   └── ...
│   ├── package.json              # Client dependencies
│   └── vite.config.ts            # Vite build configuration
├── server/                 # Node.js backend server
│   ├── src/
│   │   ├── test-game-server.ts        # Main server (current)
│   │   ├── simple-server.ts           # Basic server
│   │   ├── config/
│   │   │   └── config.ts              # Environment & validation
│   │   ├── controllers/           # API request handlers
│   │   ├── game/                  # Game logic
│   │   ├── security/              # Auth & security
│   │   └── ...
│   ├── package.json              # Server dependencies
│   └── tsconfig.json             # TypeScript configuration
├── shared/                 # Shared code between client/server
│   ├── src/
│   │   ├── types/                # TypeScript interfaces
│   │   ├── constants/            # Game constants
│   │   └── utils/                # Utility functions
│   └── package.json              # Shared package config
├── docs/                   # Documentation
│   ├── api/                      # API documentation
│   ├── setup/                    # Setup guides
│   └── ...
└── package.json           # Root workspace configuration
```

## 🔧 Development Workflow

### Daily Development Process

1. **Pull Latest Changes**
```bash
git pull origin main
npm install  # Update dependencies if needed
```

2. **Create Feature Branch**
```bash
git checkout -b feature/your-feature-name
```

3. **Start Development Servers**
```bash
npm run dev
```

4. **Make Changes and Test**
- Edit code in your preferred editor
- Frontend changes auto-reload via Vite HMR
- Backend changes require manual restart

5. **Run Tests**
```bash
npm test                    # All tests
npm run test:server         # Backend tests
npm run test:client         # Frontend tests (if available)
```

6. **Commit and Push**
```bash
git add .
git commit -m "feat: add your feature description"
git push origin feature/your-feature-name
```

### Hot Reload & Development Experience

**Frontend (Vite)**:
- ⚡ **Hot Module Replacement**: Changes appear instantly
- 🔧 **TypeScript**: Compile errors shown in browser
- 🎨 **CSS**: Style changes update without refresh

**Backend (Nodemon)**:
- 🔄 **Auto-restart**: Server restarts on file changes
- 📝 **Console output**: Logs visible in terminal
- 🧪 **API testing**: Use curl or REST client

## 🎮 Key Components Explained

### Frontend Architecture

#### `SimpleLobbyPage.tsx`
**Purpose**: Main game lobby where players create and join games

**Key Features**:
- Game list with real-time updates
- Create game form with validation
- Join game with username/civilization
- Error handling and user feedback

**Development Tips**:
- Game list refreshes every 5 seconds automatically
- Uses Material-UI for consistent styling
- All API calls go through Vite proxy to backend

```typescript
// Example: Adding a new lobby feature
const handleRefreshGames = async () => {
  try {
    const response = await fetch('http://localhost:4002/api/games')
    const games = await response.json()
    setGames(games)
  } catch (error) {
    setError('Failed to refresh games')
  }
}
```

#### `SimpleGamePage.tsx`
**Purpose**: Main game interface with real-time multiplayer

**Key Features**:
- WebSocket connection management
- Real-time game action testing
- Chat system for player communication
- Connection status monitoring

**Development Tips**:
- WebSocket automatically reconnects on disconnect
- All game actions are acknowledged by server
- Chat messages are stored in local state

```typescript
// Example: Adding a new game action
const sendCustomAction = (actionType: string, payload: any) => {
  if (!socket || !connected) return
  
  socket.emit('game_action', {
    gameId,
    playerId,
    action: actionType,
    payload
  })
}
```

### Backend Architecture

#### `test-game-server.ts`
**Purpose**: Main server with REST API and WebSocket support

**Key Components**:
- **Express routes**: REST API endpoints
- **Socket.io server**: Real-time WebSocket communication
- **In-memory storage**: Games and players (Maps)
- **Error handling**: Comprehensive validation

**Development Tips**:
- Add new API routes before WebSocket setup
- Use TypeScript interfaces for type safety
- Test endpoints with curl or Postman

```typescript
// Example: Adding a new API endpoint
app.get('/api/games/:id', (req, res) => {
  const { id } = req.params
  const game = games.get(id)
  
  if (!game) {
    return res.status(404).json({ error: 'Game not found' })
  }
  
  res.json(game)
})
```

#### `config/config.ts`
**Purpose**: Environment configuration with validation

**Features**:
- Zod schema validation
- Automatic development key generation
- Production security enforcement

**Development Tips**:
- Add new environment variables to the schema
- Test both development and production modes
- Security validation prevents unsafe deployments

## 🧪 Testing & Debugging

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode (if available)
npm run test:watch

# Integration test (full system)
node docs/setup/test-complete-system.js
```

### Testing Tools Included

1. **System Integration Test**
```bash
node docs/setup/test-complete-system.js
```
Tests complete API + WebSocket workflow

2. **Multi-client WebSocket Test**
```bash
node docs/setup/test-multi-websocket.js
```
Tests real-time multiplayer communication

3. **Simple WebSocket Test**
```bash
node docs/setup/test-websocket-client.js
```
Basic WebSocket connection test

### Debugging Tips

#### Backend Debugging
```bash
# Enable debug logging
DEBUG=* npm run dev:server

# Or specific modules
DEBUG=socket.io* npm run dev:server
```

#### Frontend Debugging
- **Browser DevTools**: Network tab for API calls, Console for errors
- **React DevTools**: Component state and props inspection
- **Vite**: Build errors shown in terminal and browser

#### Common Issues & Solutions

**Issue**: Frontend can't connect to backend
```bash
# Check if backend is running
curl http://localhost:4002/health

# Check Vite proxy configuration
# File: client/vite.config.ts
```

**Issue**: WebSocket connection fails
```bash
# Test WebSocket directly
node docs/setup/test-websocket-client.js

# Check CORS settings in server
```

**Issue**: TypeScript compilation errors
```bash
# Check TypeScript config
npm run build:server
npm run build:client
```

## 🎯 Development Patterns

### Adding New Features

#### 1. API Endpoint
```typescript
// server/src/test-game-server.ts
app.post('/api/new-feature', (req, res) => {
  // Validate input
  const { data } = req.body
  if (!data) {
    return res.status(400).json({ error: 'Data required' })
  }
  
  // Process request
  // Return response
  res.json({ success: true })
})
```

#### 2. WebSocket Event
```typescript
// Server side
socket.on('new_event', (data) => {
  // Validate and process
  // Broadcast to room
  socket.to(gameId).emit('event_update', data)
  
  // Acknowledge
  socket.emit('event_acknowledged', { success: true })
})
```

#### 3. Frontend Component
```typescript
// client/src/components/NewFeature.tsx
import React, { useState } from 'react'
import { Button, TextField } from '@mui/material'

const NewFeature: React.FC = () => {
  const [value, setValue] = useState('')
  
  const handleSubmit = async () => {
    const response = await fetch('/api/new-feature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: value })
    })
    
    if (response.ok) {
      console.log('Success!')
    }
  }
  
  return (
    <div>
      <TextField value={value} onChange={(e) => setValue(e.target.value)} />
      <Button onClick={handleSubmit}>Submit</Button>
    </div>
  )
}
```

### Code Style Guidelines

#### TypeScript
```typescript
// Use interfaces for object types
interface GameConfig {
  name: string
  maxPlayers: number
  settings?: GameSettings
}

// Use enums for constants
enum GameStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  ENDED = 'ended'
}

// Use proper error handling
const createGame = async (config: GameConfig): Promise<Game | null> => {
  try {
    // Implementation
    return game
  } catch (error) {
    console.error('Failed to create game:', error)
    return null
  }
}
```

#### React Components
```typescript
// Use functional components with hooks
const GameCard: React.FC<{ game: Game; onJoin: (id: string) => void }> = ({ 
  game, 
  onJoin 
}) => {
  const [loading, setLoading] = useState(false)
  
  const handleJoin = async () => {
    setLoading(true)
    try {
      await onJoin(game.id)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Card>
      {/* Component content */}
    </Card>
  )
}
```

## 🔍 Code Quality

### Linting & Formatting
```bash
# Run ESLint
npm run lint

# Auto-fix linting issues
npm run lint -- --fix

# Format code with Prettier (if configured)
npm run format
```

### Type Checking
```bash
# Check TypeScript types
npm run typecheck

# Build to catch type errors
npm run build
```

### Performance Monitoring

#### Frontend Performance
- Use React DevTools Profiler
- Monitor bundle size with `npm run build`
- Check Core Web Vitals in browser DevTools

#### Backend Performance
- Monitor memory usage: `process.memoryUsage()`
- Track response times
- Use `node --inspect` for debugging

```typescript
// Add performance monitoring
const startTime = Date.now()
// ... operation
console.log(`Operation took ${Date.now() - startTime}ms`)
```

## 🚀 Production Considerations

### Environment Variables
```bash
# Development (.env.local)
NODE_ENV=development
PORT=4002
DATABASE_URL=postgresql://localhost:5432/civgame_dev

# Production (.env.production)
NODE_ENV=production
PORT=4002
DATABASE_URL=postgresql://prod-server:5432/civgame
JWT_SECRET=your-secure-production-secret
```

### Build Process
```bash
# Build for production
npm run build

# Test production build locally
npm run start
```

### Security Checklist
- [ ] No hardcoded secrets in code
- [ ] Environment variables validated
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] Rate limiting implemented
- [ ] HTTPS configured (production)

## 📚 Additional Resources

### Documentation
- [API Reference](../api/API_REFERENCE.md)
- [Deployment Guide](../deployment/DEPLOYMENT_GUIDE.md)
- [User Manual](../user/USER_GUIDE.md)

### Learning Resources
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Socket.io Documentation](https://socket.io/docs/v4/)

### Community
- GitHub Issues: Report bugs and request features
- GitHub Discussions: Ask questions and share ideas
- Discord/Slack: Real-time community chat (if available)

## 🤝 Contributing Guidelines

### Before You Start
1. Read the project README
2. Check existing issues and pull requests
3. Set up the development environment
4. Run tests to ensure everything works

### Making Changes
1. Create a feature branch
2. Write tests for new functionality
3. Ensure all tests pass
4. Update documentation if needed
5. Submit a pull request with clear description

### Pull Request Process
1. **Title**: Clear, descriptive title
2. **Description**: Explain what changed and why
3. **Testing**: Include test results
4. **Documentation**: Update relevant docs
5. **Review**: Address feedback promptly

---

**🎮 Happy coding! Ready to build the next great civilization game? 🏛️**