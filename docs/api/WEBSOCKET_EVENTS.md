# WebSocket Events Documentation

## Overview

The Civilization Game uses Socket.IO for real-time communication between the client and server. This document outlines all WebSocket events, their payloads, and expected responses.

**Connection URL**: `ws://localhost:3001` (Development) | `wss://your-domain.com` (Production)

**Transport**: WebSocket with Socket.IO polling fallback

## Connection Management

### Client → Server Events

#### `connect`
**Description**: Automatic event when client connects to server
**Payload**: None (Socket.IO internal)
**Server Response**: `welcome` event

#### `disconnect`
**Description**: Automatic event when client disconnects
**Payload**: `{ reason: string }`
**Server Response**: Cleanup of player state

#### `connect_error`
**Description**: Connection failed event
**Payload**: `Error` object
**Client Action**: Handle reconnection logic

### Server → Client Events

#### `welcome`
**Description**: Sent when client successfully connects
**Payload**:
```json
{
  "message": "Connected to Civilization Game Server",
  "timestamp": "2024-01-15T10:30:00Z",
  "socketId": "abc123def456"
}
```

## Game Management Events

### Client → Server Events

#### `create_game`
**Description**: Create a new game session
**Payload**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "playerId": "550e8400-e29b-41d4-a716-446655440001",
  "config": {
    "name": "My Game",
    "maxPlayers": 4,
    "mapSize": { "width": 40, "height": 30 },
    "turnTimeLimit": 300,
    "victoryConditions": ["domination", "science"],
    "startingResources": {
      "gold": 50,
      "science": 0,
      "culture": 0,
      "production": 0,
      "food": 0
    }
  }
}
```
**Server Response**: `game_created` or `error`

#### `join_game`
**Description**: Join an existing game as a player
**Payload**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "playerId": "550e8400-e29b-41d4-a716-446655440001"
}
```
**Server Response**: `game_joined` or `error`

#### `leave_game`
**Description**: Leave current game
**Payload**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "playerId": "550e8400-e29b-41d4-a716-446655440001"
}
```
**Server Response**: `game_left` or `error`

#### `start_game`
**Description**: Start the game (host only)
**Payload**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "playerId": "550e8400-e29b-41d4-a716-446655440001"
}
```
**Server Response**: `game_started` or `error`

#### `list_games`
**Description**: Request list of available games
**Payload**:
```json
{
  "filter": "active", // "all" | "active" | "waiting" | "ended"
  "page": 1,
  "limit": 10
}
```
**Server Response**: `games_list`

#### `lobby_stats`
**Description**: Request lobby statistics
**Payload**: `{}`
**Server Response**: `lobby_stats_update`

### Server → Client Events

#### `game_created`
**Description**: Game successfully created
**Payload**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Game created successfully",
  "gameInfo": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "My Game",
    "maxPlayers": 4,
    "currentPlayers": 1,
    "status": "waiting"
  }
}
```

#### `game_joined`
**Description**: Successfully joined game
**Payload**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Successfully joined game room"
}
```

#### `player_joined`
**Description**: Another player joined the game
**Payload**:
```json
{
  "playerId": "550e8400-e29b-41d4-a716-446655440001",
  "username": "player123",
  "message": "A new player joined the game"
}
```

#### `game_started`
**Description**: Game has started
**Payload**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "players": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "username": "player1",
      "civilization": "romans"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "username": "player2",
      "civilization": "greeks"
    }
  ]
}
```

#### `games_list`
**Description**: List of available games
**Payload**:
```json
{
  "games": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Game 1",
      "playerCount": 2,
      "maxPlayers": 4,
      "status": "waiting",
      "joinable": true
    }
  ],
  "totalGames": 5,
  "page": 1,
  "hasMore": true
}
```

## Gameplay Events

### Client → Server Events

#### `game_action`
**Description**: Perform game action (move unit, build, research, etc.)
**Payload**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "playerId": "550e8400-e29b-41d4-a716-446655440001",
  "action": "move_unit",
  "payload": {
    "unitId": "unit_123",
    "from": { "x": 5, "y": 10 },
    "to": { "x": 6, "y": 10 }
  }
}
```

**Common Actions**:
- `move_unit`: Move a unit to new position
- `found_city`: Found a new city
- `build_unit`: Build military or civilian unit
- `build_building`: Construct building in city
- `research_technology`: Begin technology research
- `attack_unit`: Attack enemy unit
- `end_turn`: End current player's turn

**Server Response**: `action_acknowledged` and `game_update`

#### `player_ready`
**Description**: Mark player as ready for next turn
**Payload**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "playerId": "550e8400-e29b-41d4-a716-446655440001"
}
```
**Server Response**: `player_ready_status`

#### `request_game_state`
**Description**: Request current game state
**Payload**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "playerId": "550e8400-e29b-41d4-a716-446655440001"
}
```
**Server Response**: `game_state_update`

#### `player_activity`
**Description**: Update player activity status
**Payload**:
```json
{
  "playerId": "550e8400-e29b-41d4-a716-446655440001"
}
```
**Server Response**: None (internal tracking)

### Server → Client Events

#### `action_acknowledged`
**Description**: Server acknowledgment of player action
**Payload**:
```json
{
  "action": "move_unit",
  "success": true,
  "timestamp": "2024-01-15T10:30:00Z"
}
```
**Error Response**:
```json
{
  "action": "move_unit",
  "success": false,
  "error": "Invalid move: unit cannot reach that position",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### `game_update`
**Description**: Broadcast game state change to all players
**Payload**:
```json
{
  "action": "move_unit",
  "playerId": "550e8400-e29b-41d4-a716-446655440001",
  "payload": {
    "unitId": "unit_123",
    "from": { "x": 5, "y": 10 },
    "to": { "x": 6, "y": 10 }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### `game_state_update`
**Description**: Complete game state synchronization
**Payload**:
```json
{
  "gameState": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "phase": "active",
    "currentTurn": 15,
    "activePlayerId": "550e8400-e29b-41d4-a716-446655440001",
    "players": [...],
    "map": {...},
    "units": {...},
    "cities": {...}
  }
}
```

#### `turn_timer_update`
**Description**: Turn timer countdown
**Payload**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "activePlayerId": "550e8400-e29b-41d4-a716-446655440001",
  "timeRemaining": 240,
  "totalTime": 300
}
```

#### `turn_ended`
**Description**: Player's turn has ended
**Payload**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "previousPlayerId": "550e8400-e29b-41d4-a716-446655440001",
  "nextPlayerId": "550e8400-e29b-41d4-a716-446655440002",
  "turnNumber": 16
}
```

#### `game_ended`
**Description**: Game has ended with victory condition
**Payload**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "winner": {
    "playerId": "550e8400-e29b-41d4-a716-446655440001",
    "username": "player1",
    "victoryType": "domination"
  },
  "finalStats": {
    "turnNumber": 150,
    "duration": "02:30:45",
    "playerStats": [...]
  }
}
```

## Spectator Events

### Client → Server Events

#### `join_spectator`
**Description**: Join game as spectator (read-only)
**Payload**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "displayName": "Observer1"
}
```
**Server Response**: `spectator_joined` or `error`

#### `spectate_game`
**Description**: Start spectating a game (new API)
**Payload**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000"
}
```
**Server Response**: `spectating_started` or `error`

#### `stop_spectating`
**Description**: Stop spectating current game
**Payload**: `{}`
**Server Response**: `spectating_stopped`

### Server → Client Events

#### `spectator_joined`
**Description**: Successfully joined as spectator
**Payload**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "displayName": "Observer1",
  "joinedAt": "2024-01-15T10:30:00Z"
}
```

#### `spectating_started`
**Description**: Started spectating game (new API)
**Payload**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "gameState": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "active",
    "currentTurn": 15,
    "players": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "username": "player1",
        "civilization": "romans"
      }
    ]
  }
}
```

#### `spectating_stopped`
**Description**: Stopped spectating game
**Payload**:
```json
{
  "timestamp": "2024-01-15T10:30:00Z"
}
```

#### `spectator_notification`
**Description**: Notification to players about spectator activity
**Payload**:
```json
{
  "message": "A spectator joined the game",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Chat Events

### Client → Server Events

#### `chat_message`
**Description**: Send chat message to game room
**Payload**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "playerId": "550e8400-e29b-41d4-a716-446655440001",
  "message": "Good luck everyone!"
}
```
**Server Response**: Broadcast `chat_message` to all players or `error`

### Server → Client Events

#### `chat_message`
**Description**: Broadcast chat message to game room
**Payload**:
```json
{
  "playerId": "550e8400-e29b-41d4-a716-446655440001",
  "username": "player1",
  "message": "Good luck everyone!",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Save/Load Events

### Client → Server Events

#### `save_game`
**Description**: Save current game state
**Payload**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "playerId": "550e8400-e29b-41d4-a716-446655440001",
  "saveName": "My Epic Game",
  "saveType": "manual", // "auto" | "manual" | "checkpoint"
  "gameState": { /* optional, uses current state if not provided */ }
}
```
**Server Response**: `game_saved` or `save_error`

#### `load_game`
**Description**: Load previously saved game
**Payload**:
```json
{
  "saveId": "save_123456",
  "playerId": "550e8400-e29b-41d4-a716-446655440001",
  "gameId": "550e8400-e29b-41d4-a716-446655440000" // optional
}
```
**Server Response**: `game_loaded` or `load_error`

#### `get_saves`
**Description**: Get list of user's saved games
**Payload**:
```json
{
  "playerId": "550e8400-e29b-41d4-a716-446655440001"
}
```
**Server Response**: `saves_list` or `error`

#### `delete_save`
**Description**: Delete a saved game
**Payload**:
```json
{
  "saveId": "save_123456",
  "playerId": "550e8400-e29b-41d4-a716-446655440001"
}
```
**Server Response**: `save_deleted` or `error`

#### `request_autosave`
**Description**: Request automatic save of current game
**Payload**:
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000"
}
```
**Server Response**: `autosave_complete` (if performed)

#### `get_player_stats`
**Description**: Get player statistics
**Payload**:
```json
{
  "playerId": "550e8400-e29b-41d4-a716-446655440001"
}
```
**Server Response**: `player_stats` or `error`

#### `get_leaderboard`
**Description**: Get game leaderboard
**Payload**:
```json
{
  "limit": 10,
  "offset": 0
}
```
**Server Response**: `leaderboard` or `error`

### Server → Client Events

#### `game_saved`
**Description**: Game saved successfully
**Payload**:
```json
{
  "saveId": "save_123456",
  "message": "Game saved successfully"
}
```

#### `game_saved_notification`
**Description**: Notification to other players about save
**Payload**:
```json
{
  "saveId": "save_123456",
  "saveName": "My Epic Game",
  "playerId": "550e8400-e29b-41d4-a716-446655440001",
  "playerName": "player1"
}
```

#### `game_loaded`
**Description**: Game loaded successfully
**Payload**:
```json
{
  "gameState": { /* complete game state */ },
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "roomInfo": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Loaded: My Epic Game",
    "players": ["player1", "player2"],
    "status": "in_progress"
  }
}
```

#### `game_state_restored`
**Description**: Notification that game state was restored
**Payload**:
```json
{
  "gameState": { /* complete game state */ },
  "loadedBy": "550e8400-e29b-41d4-a716-446655440001"
}
```

#### `saves_list`
**Description**: List of user's saved games
**Payload**:
```json
{
  "saves": [
    {
      "id": "save_123456",
      "gameId": "550e8400-e29b-41d4-a716-446655440000",
      "saveName": "My Epic Game",
      "turnNumber": 45,
      "saveType": "manual",
      "createdAt": "2024-01-15T10:30:00Z",
      "fileSize": 52341,
      "gameName": "Epic Strategy Game",
      "status": "completed",
      "gameMode": "multiplayer",
      "difficulty": "intermediate"
    }
  ]
}
```

#### `save_deleted`
**Description**: Save deleted successfully
**Payload**:
```json
{
  "saveId": "save_123456"
}
```

#### `autosave_complete`
**Description**: Automatic save completed
**Payload**:
```json
{
  "saveId": "save_789012",
  "turnNumber": 45
}
```

#### `player_stats`
**Description**: Player statistics
**Payload**:
```json
{
  "stats": {
    "gamesPlayed": 25,
    "gamesWon": 12,
    "winRate": 48.0,
    "totalPlayTime": "15:30:45",
    "favoriteVictoryType": "science",
    "averageTurns": 120.5
  }
}
```

#### `leaderboard`
**Description**: Game leaderboard
**Payload**:
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "playerId": "550e8400-e29b-41d4-a716-446655440001",
      "username": "player1",
      "wins": 45,
      "gamesPlayed": 60,
      "winRate": 75.0,
      "score": 2150
    }
  ]
}
```

## Error Events

### Server → Client Events

#### `error`
**Description**: General error response
**Payload**:
```json
{
  "message": "Game not found",
  "type": "game_error",
  "code": "GAME_NOT_FOUND"
}
```

#### `save_error`
**Description**: Save operation failed
**Payload**:
```json
{
  "message": "Failed to save game: insufficient permissions"
}
```

#### `load_error`
**Description**: Load operation failed
**Payload**:
```json
{
  "message": "Save file not found or corrupted"
}
```

## Connection Configuration

### Socket.IO Client Configuration

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  transports: ['websocket', 'polling'],
  timeout: 5000,
  forceNew: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  // Connection state recovery
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
  }
});
```

### Server Configuration

- **Ping Timeout**: 60 seconds
- **Ping Interval**: 25 seconds
- **Max HTTP Buffer Size**: 1MB
- **Transports**: WebSocket, Polling
- **Connection State Recovery**: 2 minutes
- **CORS**: Configured for client URL

## Usage Examples

### Basic Game Join Flow

```javascript
// Connect to server
socket.on('connect', () => {
  console.log('Connected to game server');
  
  // Join game
  socket.emit('join_game', {
    gameId: 'game123',
    playerId: 'player456'
  });
});

// Handle join response
socket.on('game_joined', (data) => {
  console.log('Successfully joined game:', data.gameId);
});

// Handle errors
socket.on('error', (error) => {
  console.error('Game error:', error.message);
});
```

### Game Action Flow

```javascript
// Perform game action
socket.emit('game_action', {
  gameId: 'game123',
  playerId: 'player456',
  action: 'move_unit',
  payload: {
    unitId: 'unit_789',
    from: { x: 5, y: 10 },
    to: { x: 6, y: 10 }
  }
});

// Handle action acknowledgment
socket.on('action_acknowledged', (response) => {
  if (response.success) {
    console.log('Action successful:', response.action);
  } else {
    console.error('Action failed:', response.error);
  }
});

// Handle game updates from other players
socket.on('game_update', (update) => {
  console.log('Game updated by player:', update.playerId);
  // Update local game state
});
```

### Spectator Mode

```javascript
// Start spectating
socket.emit('spectate_game', {
  gameId: 'game123'
});

// Handle spectator events
socket.on('spectating_started', (data) => {
  console.log('Now spectating game:', data.gameId);
  // Display game state in read-only mode
});

// Stop spectating
socket.emit('stop_spectating');
```

## Error Handling Best Practices

1. **Always handle `error` events** - The server sends detailed error information
2. **Implement reconnection logic** - Handle connection drops gracefully
3. **Validate action responses** - Check `action_acknowledged` for success/failure
4. **Handle timeouts** - Implement client-side timeouts for critical operations
5. **Graceful degradation** - Fall back to REST API if WebSocket fails

## Rate Limiting

WebSocket connections are not subject to the same rate limiting as REST endpoints, but the server may disconnect clients that send too many invalid requests or exceed reasonable usage patterns.

## Security Considerations

- WebSocket connections inherit the same CORS policy as REST endpoints
- Authentication is handled via JWT tokens in subsequent requests
- All game actions are validated server-side
- Spectators have read-only access to game data
- Chat messages are sanitized before broadcast