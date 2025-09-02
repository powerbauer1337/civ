# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a production-ready, hex-based civilization strategy game with real-time multiplayer support. The project uses a monorepo structure with three main packages: client (React), server (Node.js), and shared (TypeScript types).

## Architecture

### Monorepo Structure
- `client/` - React 18 + TypeScript frontend with Vite
- `server/` - Node.js + Express + Socket.io backend
- `shared/` - Shared TypeScript types and utilities used by both client and server

### Key Technologies
- **Frontend**: React 18, TypeScript 5, Material-UI, Redux Toolkit, Socket.io Client, SVG rendering
- **Backend**: Node.js, Express, Socket.io, TypeScript, SQLite, Jest testing
- **Shared**: TypeScript types, Zod validation, utility functions
- **Build**: Vite (client), TypeScript compiler (server/shared), npm workspaces

## Development Commands

### Setup and Installation
```bash
# Install all packages
npm run install:all

# Install individual packages
npm run install:client
npm run install:server
npm run install:shared
```

### Development
```bash
# Start both client and server in development mode
npm run dev

# Start individual services
npm run dev:client    # Frontend only (http://localhost:5173)
npm run dev:server    # Backend only (http://localhost:3001)

# Simple server for testing (bypasses full game system)
npm run dev:simple
```

### Building
```bash
# Build all packages for production
npm run build

# Build individual packages
npm run build:shared   # Required first - builds shared types
npm run build:server
```

### Testing
```bash
# Run all tests
npm run test

# Run package-specific tests
npm run test:shared    # Shared utilities tests
npm run test:server    # Server unit tests with Jest

# Client testing (from client/ directory)
cd client && npm run test          # Vitest tests
cd client && npm run test:coverage # Coverage report
cd client && npm run test:ui       # UI test runner
```

### Linting and Code Quality
```bash
# Run linting for all packages
npm run lint

# Package-specific linting
npm run lint:shared
npm run lint:server
cd client && npm run lint
```

### Game Testing
```bash
# Test game server functionality
npm run test:game
```

## Core Architecture Components

### Game Engine (`server/src/game/`)
- **GameEngine.ts** - Core game logic, action processing, turn management
- **GameManager.ts** - WebSocket multiplayer coordination, game state synchronization
- **HexMap.ts** - Hex grid mathematics, procedural map generation, pathfinding
- **AIPlayer.ts** - Computer player AI with multiple difficulty levels and strategies
- **GameManagerAI.ts** - AI-specific game management functionality

### Frontend Hex System (`client/src/components/HexMap/`)
- **HexMap.tsx** - Main hex grid container with zoom/pan controls
- **HexTile.tsx** - Individual hex tile rendering (terrain, units, resources)
- **MobileHexMap.tsx** - Touch-optimized version for mobile devices

### State Management
- **Client**: Redux Toolkit with slices (`client/src/store/`)
  - `gameSlice.ts` - Game state management
  - `authSlice.ts` - Authentication state
  - `uiSlice.ts` - UI state management
- **Server**: In-memory game state with SQLite persistence

### Real-time Communication
- **WebSocket**: Socket.io for real-time multiplayer synchronization
- **REST API**: Express endpoints for game management, authentication
- **Persistence**: SQLite database for game saves and user data

## Development Workflow

### Before Making Changes
1. **Shared types first**: Always build shared package after type changes: `cd shared && npm run build`
2. **Dependency order**: Changes typically flow shared → server → client
3. **Type safety**: Both client and server are fully TypeScript with strict mode

### Testing Strategy
- **Server**: Jest with 80% coverage requirement, comprehensive unit tests for game engine
- **Client**: Vitest with 70% coverage requirement, component and integration tests
- **Game Logic**: Dedicated test files for hex mathematics, game actions, AI behavior

### Code Organization Principles
- **Hex coordinates**: Uses axial coordinate system throughout codebase
- **Game actions**: All game changes go through action-based system with validation
- **Type safety**: Shared types ensure consistency between client and server
- **Modularity**: Clear separation between game engine, networking, and UI concerns

## Important Files

### Configuration
- `vite.config.ts` - Frontend build configuration with path aliases and proxy setup
- `jest.config.js` - Server test configuration with coverage thresholds
- `tsconfig.json` files - TypeScript configuration for each package

### Game Core
- `server/src/game/GameEngine.ts` - Main game logic (24k+ lines)
- `server/src/game/HexMap.ts` - Hex grid system (14k+ lines)
- `shared/src/types/index.ts` - Core game type definitions

### Networking
- `server/src/websocket/SocketHandler.ts` - WebSocket event handling
- `client/src/contexts/SocketContext.tsx` - Client-side socket management

## Path Aliases

### Client (`client/vite.config.ts`)
- `@/` → `./src/`
- `@components/` → `./src/components/`
- `@store/` → `./src/store/`
- `@contexts/` → `./src/contexts/`
- `@pages/` → `./src/pages/`
- `@config/` → `./src/config/`

### Server (`server/jest.config.js`)
- `@/` → `src/`
- `@controllers/` → `src/controllers/`
- `@config/` → `src/config/`
- `@game/` → `src/game/`
- `@database/` → `src/database/`

## Production Considerations

### Build Process
1. Build shared types: `npm run build:shared`
2. Build server: `npm run build:server`
3. Frontend build includes code splitting, terser minification, and chunk optimization

### Performance
- **Map Generation**: <100ms for 20x20 hex maps
- **Action Processing**: <10ms per game action
- **Real-time Updates**: <200ms client-server-client latency

### Deployment
- **Frontend**: Static files served from `client/dist/`
- **Backend**: Node.js server from `server/dist/`
- **Database**: SQLite files for game persistence

## Development Notes

- The game uses a complete hex-based civilization system, not a simple board game
- TypeScript migration was completed with zero TypeScript errors across all packages
- Mobile support is fully implemented with touch controls and responsive design
- AI system includes 5 different AI personalities with 4 difficulty levels
- Save/load system persists complete game state to SQLite database
- Production-ready with comprehensive error handling and validation