# Civilization Game API Documentation

## Overview

Welcome to the comprehensive API documentation for the Civilization multiplayer strategy game. This documentation provides everything you need to integrate with our REST API and WebSocket-based real-time communication system.

## 🚀 Quick Start

1. **[OpenAPI Specification](./CIVILIZATION_GAME_API.yaml)** - Complete REST API specification
2. **[Integration Examples](./INTEGRATION_EXAMPLES.md)** - Ready-to-use code examples
3. **[WebSocket Events](./WEBSOCKET_EVENTS.md)** - Real-time communication guide
4. **[Authentication & Security](./AUTHENTICATION_SECURITY.md)** - Security implementation guide
5. **[Error Handling](./ERROR_HANDLING_GUIDE.md)** - Comprehensive error handling

## 📋 API Overview

### Base URLs
- **Development**: `http://localhost:3001`
- **Production**: `https://api.civilization-game.com`

### Key Features
- 🔐 JWT-based authentication with refresh tokens
- 🎮 Real-time multiplayer gameplay via WebSocket
- 💾 Save/load system with persistence
- 👥 Spectator mode support
- 🛡️ Comprehensive security and rate limiting
- 📊 Player statistics and leaderboards

### Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│   Client App    │◄──►│   REST API      │◄──►│   Database      │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │              ┌─────────────────┐
         │              │                 │
         └──────────────►│  WebSocket      │
                        │  (Socket.IO)    │
                        │                 │
                        └─────────────────┘
```

## 📚 Documentation Structure

### 1. [OpenAPI Specification](./CIVILIZATION_GAME_API.yaml)
Complete REST API documentation in OpenAPI 3.0 format including:
- All endpoints with request/response schemas
- Authentication requirements
- Error responses
- Rate limiting information
- Input validation rules

**Use Cases:**
- Generate client SDKs
- Import into Postman/Insomnia
- Interactive API exploration
- Contract testing

### 2. [WebSocket Events Guide](./WEBSOCKET_EVENTS.md)
Comprehensive WebSocket communication documentation covering:
- Connection management
- Game lifecycle events
- Real-time gameplay actions
- Chat system
- Save/load operations
- Spectator functionality

**Key Events:**
- `join_game` - Join multiplayer game
- `game_action` - Perform game actions
- `game_update` - Receive game state changes
- `save_game` - Save current game state
- `spectate_game` - Watch games as observer

### 3. [Authentication & Security](./AUTHENTICATION_SECURITY.md)
Enterprise-grade security implementation guide:
- JWT token system (access + refresh tokens)
- Multi-tier rate limiting
- Input validation and sanitization
- Security headers and CORS
- Password requirements and hashing

**Security Features:**
- 15-minute access tokens with automatic refresh
- Bcrypt password hashing (12-14 rounds)
- Rate limiting (5-100 requests per window)
- Comprehensive input validation
- Token blacklisting for instant revocation

### 4. [Error Handling Guide](./ERROR_HANDLING_GUIDE.md)
Comprehensive error handling patterns:
- Standardized error response format
- HTTP status code meanings
- WebSocket error events
- Client-side error handling strategies
- Retry logic and backoff algorithms

**Error Categories:**
- Authentication errors (401, 403)
- Validation errors (400)
- Rate limiting (429)
- Game-specific errors
- Network and timeout errors

### 5. [Integration Examples](./INTEGRATION_EXAMPLES.md)
Complete integration guide with working code:
- Full-featured client implementation
- React component examples
- Authentication flows
- Real-time gameplay integration
- Save/load system usage
- Testing strategies (Unit, Integration, E2E)

## 🔗 API Endpoints Summary

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/profile` | Get user profile |
| PUT | `/api/auth/profile` | Update user profile |
| GET | `/api/auth/verify` | Verify JWT token |

### Game Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/games` | List games with filtering |
| GET | `/api/games/stats` | Get server statistics |
| GET | `/api/games/{id}` | Get game details |
| GET | `/api/games/{id}/state` | Get complete game state |
| POST | `/api/games/config/validate` | Validate game configuration |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api` | API documentation |
| GET | `/api/security/info` | Security info (dev only) |

## 🎮 WebSocket Events Summary

### Connection Events
- `connect` - Client connected
- `disconnect` - Client disconnected  
- `welcome` - Server welcome message

### Game Management
- `create_game` / `game_created` - Create new game
- `join_game` / `game_joined` - Join existing game
- `leave_game` / `game_left` - Leave current game
- `start_game` / `game_started` - Start game session

### Gameplay
- `game_action` / `action_acknowledged` - Perform/confirm actions
- `game_update` - Broadcast state changes
- `turn_ended` - Turn transition
- `game_ended` - Game completion

### Save/Load
- `save_game` / `game_saved` - Save game state
- `load_game` / `game_loaded` - Load saved game
- `get_saves` / `saves_list` - List saved games

### Spectator
- `spectate_game` / `spectating_started` - Start spectating
- `stop_spectating` / `spectating_stopped` - Stop spectating

## 🛡️ Security Overview

### Rate Limiting Tiers
1. **Authentication**: 5 requests / 5 minutes (strict)
2. **General API**: 100 requests / 15 minutes (standard)
3. **Sensitive**: 2 requests / 10 minutes (ultra-strict)

### JWT Token Security
- **Access Token**: 15 minutes (short-lived)
- **Refresh Token**: 7 days (long-lived)
- **Key Rotation**: Every 24 hours
- **Blacklisting**: Immediate revocation support

### Input Validation
- Zod schema validation for all inputs
- Password complexity requirements
- Username format restrictions
- Email format validation
- Request size limits (1MB)

## 🧪 Testing

### Test Files Available
- Unit tests for API client
- Integration tests for game flows
- E2E tests with Playwright
- Performance and load testing examples

### Test Environment
```bash
# Start test server
npm run test:server

# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install socket.io-client
# or
npm install axios socket.io-client
```

### 2. Initialize Client
```javascript
import { CivilizationGameClient } from './api-client';

const client = new CivilizationGameClient({
  apiUrl: 'http://localhost:3001',
  socketUrl: 'http://localhost:3001'
});

await client.initialize();
```

### 3. Authenticate
```javascript
// Register new user
await client.register('username', 'email@example.com', 'SecurePass123!');

// Or login existing user
await client.login('username', 'SecurePass123!');
```

### 4. Join Game
```javascript
// List available games
const games = await client.listGames({ filter: 'active' });

// Join a game
await client.joinGame(games.games[0].id);

// Start playing
client.on('gameStarted', () => {
  console.log('Game has started!');
});
```

### 5. Perform Actions
```javascript
// Move unit
client.moveUnit('unit-123', { x: 5, y: 10 }, { x: 6, y: 10 });

// End turn
client.endTurn();

// Send chat message
client.sendChat('Good luck everyone!');
```

## 🔧 Configuration

### Environment Variables
```bash
# Client Configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
VITE_ENVIRONMENT=development

# Server Configuration
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:5173
JWT_SECRET=your-super-secret-jwt-key
DATABASE_URL=postgresql://user:pass@localhost:5432/civgame
```

### Client Options
```javascript
const client = new CivilizationGameClient({
  apiUrl: 'http://localhost:3001',
  socketUrl: 'http://localhost:3001',
  autoReconnect: true,        // Auto-reconnect WebSocket
  autoSave: true,            // Enable auto-save every 5 minutes
  retryAttempts: 3,          // API retry attempts
  retryDelay: 1000,          // Retry delay in milliseconds
  timeout: 10000             // Request timeout
});
```

## 📖 Additional Resources

### Development Tools
- [OpenAPI Spec](./CIVILIZATION_GAME_API.yaml) - Import into Postman/Insomnia
- [OpenAPI Generator](https://openapi-generator.tech/) - Generate client SDKs

### Community
- [GitHub Repository](https://github.com/your-org/civilization-game)
- [Discord Server](https://discord.gg/your-invite) - Developer community
- [Documentation Website](https://docs.civilization-game.com) - Interactive docs

### Support
- [GitHub Issues](https://github.com/your-org/civilization-game/issues) - Bug reports
- [Stack Overflow](https://stackoverflow.com/questions/tagged/civilization-game-api) - Q&A
- Email: api-support@civilization-game.com

## 🔄 Changelog

### Version 1.0.0
- Initial API release
- JWT authentication system
- Real-time multiplayer gameplay
- Save/load functionality
- Spectator mode
- Comprehensive error handling
- Rate limiting implementation

### Version 1.1.0 (Planned)
- Enhanced spectator features
- Tournament mode
- Advanced AI opponents
- Mobile-optimized WebSocket events
- GraphQL API support

## 📄 License

This API documentation is licensed under the MIT License.

---

## 🤝 Contributing

We welcome contributions to improve this documentation! Please:

1. Fork the repository
2. Create a feature branch
3. Make your improvements
4. Submit a pull request

### Documentation Standards
- Use clear, concise language
- Include working code examples
- Test all examples before submitting
- Follow existing formatting patterns
- Update table of contents when adding sections

---

**Happy coding! 🎮**

For questions or support, reach out to our developer community or create an issue in our GitHub repository.
