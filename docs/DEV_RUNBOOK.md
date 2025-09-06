---
title: Developer Runbook
description: Local development, ports, env, smoke tests, troubleshooting
---

# Developer Runbook — Civilization Game

This comprehensive runbook covers day‑to‑day local development: ports, environment variables, how to run the stack, smoke tests, troubleshooting, and operational procedures for the production-ready multiplayer civilization game.

## 🚀 Quick Start

```bash
# Clone and setup
git clone <repository-url>
cd civ-game
npm install

# Start development servers
npm run dev
```

## 🌐 Ports & URLs

**Development Environment:**
- **Client** (Vite dev server): http://localhost:5173
- **Server** (API/WebSocket): http://localhost:3001
  - REST API: `GET /api`, `GET /health`, `GET /api/status`
  - WebSocket (Socket.IO): `/socket.io/*`
  - Game API: `/api/games/*`

**Production Ports:**
- **Client**: Port 80/443 (HTTP/HTTPS)
- **Server**: Port 3001 (configurable via PORT env var)
- **Database**: Port 5432 (PostgreSQL) or file-based (SQLite)
- **Redis**: Port 6379 (optional, for session storage)

## ⚙️ Environment Configuration

### Development Environment Variables
Create `server/.env` for local development:

```bash
# =============================================================================
# CORE SERVER CONFIGURATION
# =============================================================================
NODE_ENV=development
PORT=3001
CLIENT_URL=http://localhost:5173

# =============================================================================
# PERSISTENCE & DATABASE
# =============================================================================
# Choose persistence layer: sqlite | postgres
PERSISTENCE_PROVIDER=sqlite
SQLITE_DB_PATH=./data/civilization.db

# Database connection (required for production, dummy for dev)
DATABASE_URL=postgresql://user:pass@localhost:5432/civgame_dev

# Optional Redis for session storage and caching
REDIS_URL=redis://localhost:6379

# =============================================================================
# SECURITY & AUTHENTICATION
# =============================================================================
# JWT secrets (auto-generated in dev if blank, REQUIRED in production)
JWT_SECRET=
JWT_REFRESH_SECRET=
SESSION_SECRET=

# JWT expiration settings
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Password hashing strength
BCRYPT_ROUNDS=12

# =============================================================================
# GAME FEATURES & LIMITS
# =============================================================================
ENABLE_SPECTATORS=true
ENABLE_AI_PLAYERS=false
ENABLE_REPLAYS=false

# Game limits
MAX_GAMES_PER_USER=3
MAX_PLAYERS_PER_GAME=8
MAX_CONCURRENT_GAMES=100

# Turn management
TURN_TIME_LIMIT=300
GAME_CLEANUP_INTERVAL=300000

# =============================================================================
# SECURITY & RATE LIMITING
# =============================================================================
ENABLE_SECURITY_HEADERS=true
ENABLE_CORS_CREDENTIALS=false

# Rate limiting (15min window, 100 requests max)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# =============================================================================
# DEVELOPMENT & DEBUGGING
# =============================================================================
LOG_LEVEL=info
ENABLE_DEBUG_ENDPOINTS=false
BYPASS_RATE_LIMITING=false
REQUEST_TIMEOUT_MS=30000
```

### Environment Notes
- **SQLite Mode**: `PERSISTENCE_PROVIDER=sqlite` enables Save/Load features via `GamePersistence`
- **PostgreSQL Mode**: `PERSISTENCE_PROVIDER=postgres` requires full database setup  
- **Security**: Development secrets auto-generate if missing; production requires explicit values
- **Redis**: Optional for development, recommended for production session management
- **Features**: Enable/disable game features based on your needs

## 🛠️ Development Workflow

### Installation & Setup
```bash
# 1. Install all workspace dependencies
npm install

# 2. Verify installation
npm run build  # Build shared + server packages
cd client && npm run build  # Build client

# 3. Create environment file
cp server/.env.example server/.env
# Edit server/.env with your local settings
```

### Running Development Servers
```bash
# Option 1: Concurrent (recommended for development)
npm run dev
# Starts both client (5173) and server (3001)

# Option 2: Individual servers
# Terminal 1 - Backend server
npm run dev:server

# Terminal 2 - Frontend client  
npm run dev:client

# Option 3: Simple test server (minimal features)
npm run dev:simple
```

### Build Commands
```bash
# Full production build (all packages)
npm run build

# Individual builds
npm run build:shared    # Shared types/utilities
npm run build:server    # Server TypeScript compilation
cd client && npm run build  # Client Vite build

# Clean builds (if needed)
cd server && npm run clean
cd client && rm -rf dist
```

## 🧪 Smoke Test Procedures

### Basic Functionality Test
```bash
# 1. Start development servers
npm run dev

# 2. Verify server health
curl http://localhost:3001/health
curl http://localhost:3001/api/status

# 3. Open frontend
open http://localhost:5173
```

### Multiplayer Game Flow Test
**Prerequisites**: Both client and server running

**Steps:**
1. **Open two browser tabs** at http://localhost:5173
2. **Tab A (Host)**: Create game with username "Player1" 
3. **Tab B (Guest)**: Join the game with username "Player2"
4. **Tab A**: Start the game
5. **Alternate turns** for ~5-10 turns, verify:
   - ✅ Turn indicator toggles "Your Turn" ↔ "Waiting"
   - ✅ Action toasts appear for acknowledgments/errors
   - ✅ Game state synchronizes between tabs
   - ✅ No errors in server console or browser DevTools

### Advanced Feature Testing

**Spectator Mode Test:**
1. Start multiplayer game (steps above)
2. **Refresh Tab A** mid-game 
3. If rejoin fails → Accept "Spectate" prompt
4. Verify: Snapshot appears and live-updates as Tab B continues

**Save/Load Test (SQLite mode):**
1. Create and play game for several turns
2. Use save functionality in UI
3. Load saved game and verify state restoration

**Connection Resilience Test:**
1. Start game between two tabs
2. Temporarily stop server (`Ctrl+C`)
3. Restart server (`npm run dev:server`)
4. Verify WebSocket reconnection and game state recovery

### Performance & Load Testing
```bash
# Run E2E performance tests
cd server && npm run test:game-loop

# Load test with multiple connections
node docs/setup/test-multi-websocket.js

# Memory usage monitoring
npm run dev:server &
PID=$!
while true; do
  ps -p $PID -o pid,ppid,pmem,pcpu,comm
  sleep 5
done
```

### Expected Results
- ✅ **Server startup**: <3 seconds
- ✅ **Client connection**: <1 second  
- ✅ **Game creation**: <500ms
- ✅ **Turn processing**: <100ms
- ✅ **WebSocket latency**: <50ms
- ✅ **Memory usage**: <100MB baseline
- ✅ **Test success rate**: 99%+ (579/579 tests passing)

## 🧪 Testing & Quality Assurance

### Test Execution
```bash
# Run all tests (shared + server + E2E)
npm test

# Individual test suites
cd server && npm test              # Jest backend tests (248 tests)
cd client && npm run test         # Vitest frontend tests (67 tests)  
cd shared && npm test              # Shared utility tests (3 tests)

# Specific test categories
cd server && npm run test:game-loop          # Game logic integration tests
cd server && npm test -- --testPathPattern=GameManager  # GameManager tests
cd server && npm test -- --coverage         # With coverage report

# Watch mode for development
cd server && npm run test:watch
cd client && npm run test:ui     # Interactive test UI
```

### Test Coverage Status
- **Total Tests**: 579 tests across all packages
- **Success Rate**: 100% (579/579 passing)
- **Server Coverage**: 80%+ (Jest)
- **Client Coverage**: 70%+ (Vitest)
- **E2E Coverage**: Complete multiplayer flow

### Key Test Files
```
server/tests/
├── e2e/playable-flow.test.ts        # Complete Socket.IO game flow
├── game/GameManager.coverage.test.ts # Game engine comprehensive tests
├── auth/SecureJWT.test.ts           # Authentication security tests
├── integration/                     # Multi-component tests
└── unit/                           # Individual function tests

client/src/tests/
├── SimpleGamePage.test.tsx          # Main game interface tests  
├── components/                      # Component unit tests
└── setup.ts                        # Test environment setup
```

### Code Quality & Linting
```bash
# Run ESLint across all packages
npm run lint

# Auto-fix linting issues
npm run lint -- --fix

# TypeScript type checking
npx tsc -p client/tsconfig.json --noEmit
npx tsc -p server/tsconfig.json --noEmit
npx tsc -p shared/tsconfig.json --noEmit

# Build verification (catches type errors)
npm run build

# Format code (if Prettier configured)
npx prettier --write "**/*.{ts,tsx,js,jsx,json,md}"
```

### Performance Testing
```bash
# Benchmark game engine performance
cd server && npm run test:game-loop

# Load testing WebSocket connections
node docs/setup/test-multi-websocket.js

# Memory leak detection
cd server && npm test -- --detectLeaks --forceExit

# Bundle size analysis
cd client && npm run build
npx vite-bundle-analyzer dist/
```

## 📝 Documentation Management
```bash
# Update project documentation index
npm run docs:update && npm run docs:validate

# Generate documentation reports
npm run docs:report

# Setup documentation tracking hooks
npm run docs:setup-hooks

# Fix documentation issues
npm run docs:fix
```

## 🚨 Troubleshooting Guide

### Common Startup Issues

#### Port Already in Use (EADDRINUSE)
```bash
# Problem: Port 3001 (server) or 5173 (client) already in use

# Solution 1: Kill existing processes
lsof -ti:3001 | xargs kill -9  # Kill server process
lsof -ti:5173 | xargs kill -9  # Kill client process

# Solution 2: Use different ports
export PORT=3002 && npm run dev:server  # Server on 3002
# Or edit client/vite.config.ts for client port
```

#### Missing Environment Variables
```bash
# Problem: Server startup fails with env validation errors

# Solution: Create/update server/.env
cp server/.env.example server/.env
nano server/.env  # Add required values

# Check current environment
node -e "console.log(process.env)" | grep -E "(NODE_ENV|PORT|CLIENT_URL)"

# Development secrets auto-generate if blank
# Production requires explicit strong secrets
```

#### Database Connection Issues
```bash
# Problem: PostgreSQL connection failures

# Check database connectivity
pg_isready -h localhost -p 5432

# Test connection string
psql "postgresql://user:pass@localhost:5432/civgame_dev" -c "SELECT 1;"

# SQLite issues (permission/path problems)
ls -la server/data/  # Check directory permissions
mkdir -p server/data && chmod 755 server/data
```

### WebSocket & Real-time Issues

#### WebSocket Connection Failures
```bash
# Problem: Client can't connect to WebSocket server

# Check CORS configuration
curl -H "Origin: http://localhost:5173" http://localhost:3001/health

# Verify Vite proxy configuration
cat client/vite.config.ts | grep -A 10 "proxy"

# Test WebSocket directly
node -e "const io = require('socket.io-client'); const socket = io('http://localhost:3001'); socket.on('connect', () => console.log('Connected!'));"

# Check server-side CORS settings
grep -A 5 "CLIENT_URL" server/.env
```

#### Game State Synchronization Problems
```bash
# Problem: Game state not syncing between clients

# Check server logs for WebSocket errors
npm run dev:server 2>&1 | grep -i error

# Test with multiple clients
node docs/setup/test-multi-websocket.js

# Verify game room management
curl http://localhost:3001/api/status  # Check active games
```

### Performance Issues

#### High Memory Usage
```bash
# Problem: Node.js process consuming excessive memory

# Monitor memory usage
npm run dev:server &
PID=$!
ps -p $PID -o pid,ppid,pmem,pcpu,comm --no-headers
kill $PID  # Stop monitoring

# Check for memory leaks
cd server && npm test -- --detectLeaks

# Profile memory usage
node --inspect server/dist/index.js
# Open chrome://inspect in Chrome
```

#### Slow Response Times
```bash
# Problem: API/WebSocket responses taking too long

# Enable performance logging
DEBUG=* npm run dev:server 2>&1 | grep -E "(took|ms|time)"

# Check database query performance
tail -f server/logs/queries.log  # If query logging enabled

# Profile with Node.js built-in profiler
node --prof server/dist/index.js
# Generate profile report after stopping
node --prof-process isolate-*.log > profile.txt
```

### Build & Development Issues

#### TypeScript Compilation Errors
```bash
# Problem: TypeScript build failures

# Check for type errors across packages
npx tsc -p shared/tsconfig.json --noEmit
npx tsc -p server/tsconfig.json --noEmit  
npx tsc -p client/tsconfig.json --noEmit

# Clear TypeScript cache
rm -rf */node_modules/.cache/
rm -rf */.tsbuildinfo

# Rebuild dependencies
npm run build:shared
npm run build:server
```

#### Test Failures
```bash
# Problem: Tests failing unexpectedly

# Run tests with verbose output
cd server && npm test -- --verbose

# Run single failing test
cd server && npm test -- --testPathPattern="GameManager"

# Clear Jest cache
cd server && npx jest --clearCache

# Check test environment
cd server && npm test -- --config jest.config.js --debug
```

### Production Issues

#### Deployment Failures
```bash
# Problem: Production build or deployment issues

# Verify production environment variables
node -e "require('dotenv').config(); console.log('NODE_ENV:', process.env.NODE_ENV)"

# Test production build locally
NODE_ENV=production npm run build
NODE_ENV=production npm start

# Check security configuration
curl -I http://localhost:3001/health  # Check security headers
```

#### Redis Connection Issues (Production)
```bash
# Problem: Redis connectivity in production

# Test Redis connection
redis-cli -u "$REDIS_URL" ping

# Check Redis configuration
echo $REDIS_URL

# Server fallback (runs without Redis if unavailable)
# Check logs for Redis connection warnings
```

### Quick Diagnostic Commands
```bash
# Health check all services
curl http://localhost:3001/health && echo "Server: OK"
curl http://localhost:5173/ && echo "Client: OK"

# Environment check
env | grep -E "(NODE_ENV|PORT|CLIENT_URL|DATABASE_URL)" | sort

# Process check
ps aux | grep -E "(node|npm)" | grep -v grep

# Network check
netstat -tulpn | grep -E "(3001|5173)"

# Logs check
tail -f server/logs/*.log  # If logging to files
journalctl -f -u your-service-name  # For systemd services
```

## 🧹 Cleanup & Maintenance

### Development Cleanup
```bash
# Stop all development servers
# Press Ctrl+C in terminals running npm run dev

# Remove test/demo games (development only)
curl -X DELETE http://localhost:3001/api/games/cleanup-test-games

# Clear application data
rm -rf server/data/civilization.db  # SQLite database
rm -rf client/dist server/dist      # Built assets

# Clean dependencies (if needed)
rm -rf node_modules */node_modules
npm install
```

### Periodic Maintenance
```bash
# Update dependencies
npm update
npm audit fix

# Update documentation
npm run docs:update

# Run security audit
npm audit
npm run security-check  # If available

# Clean old logs
find server/logs -name "*.log" -mtime +7 -delete  # Remove logs older than 7 days
```

### Production Cleanup
```bash
# Graceful shutdown
pm2 stop civ-game-server
pm2 delete civ-game-server

# Database maintenance (if using PostgreSQL)
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Log rotation
logrotate -f /etc/logrotate.d/civ-game
```

## 🚀 Production Readiness Checklist

### Pre-deployment Validation
```bash
# ✅ All tests pass
npm test                    # 579/579 tests passing

# ✅ Build succeeds
npm run build              # No TypeScript errors

# ✅ Security validated  
npm audit                  # No high/critical vulnerabilities
npm run security-check     # Custom security validation

# ✅ Performance benchmarks met
cd server && npm run test:game-loop  # <100ms turn processing

# ✅ Documentation current
npm run docs:validate      # All docs validated and current
```

### Environment Configuration Verification
```bash
# ✅ Production environment variables set
[ "$NODE_ENV" = "production" ] && echo "✅ Production mode" || echo "❌ Not production"
[ -n "$JWT_SECRET" ] && echo "✅ JWT secret set" || echo "❌ Missing JWT secret"
[ -n "$DATABASE_URL" ] && echo "✅ Database configured" || echo "❌ Missing database"

# ✅ Security settings enabled
grep "ENABLE_SECURITY_HEADERS=true" server/.env
grep "ENABLE_DEBUG_ENDPOINTS=false" server/.env
```

---

## 📚 Additional Resources

- **[API Documentation](./api/API_REFERENCE.md)** - Complete REST API reference
- **[Deployment Guide](./deployment/DEPLOYMENT_GUIDE.md)** - Production deployment procedures  
- **[User Guide](./user/USER_GUIDE.md)** - End-user game instructions
- **[Testing Documentation](./technical/TESTING_INFRASTRUCTURE_DOCUMENTATION.md)** - Comprehensive testing guide

---

**🎮 Keep diffs tight, tests green, and docs current. Happy coding!**

