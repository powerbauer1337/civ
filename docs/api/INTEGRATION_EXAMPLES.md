# Integration Examples & Usage Patterns

## Overview

This guide provides comprehensive examples for integrating with the Civilization Game API, including complete client implementations, common usage patterns, and best practices.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication Integration](#authentication-integration)
3. [Game Management](#game-management)
4. [Real-time Gameplay](#real-time-gameplay)
5. [Save/Load System](#saveload-system)
6. [Spectator Mode](#spectator-mode)
7. [Error Handling](#error-handling)
8. [Complete Client Example](#complete-client-example)
9. [Testing Strategies](#testing-strategies)

## Quick Start

### Basic Setup

```javascript
import { io } from 'socket.io-client';

// API Configuration
const API_BASE = 'http://localhost:3001';
const SOCKET_URL = 'http://localhost:3001';

// Initialize API client
class CivilizationAPI {
  constructor() {
    this.baseURL = API_BASE;
    this.token = null;
    this.socket = null;
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
  }

  // Make authenticated API request
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
        ...options.headers
      }
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return response.json();
  }

  // Initialize WebSocket connection
  initializeSocket() {
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    return this.socket;
  }
}

const api = new CivilizationAPI();
```

### Environment Setup

```javascript
// .env configuration
VITE_API_BASE_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
VITE_ENVIRONMENT=development

// Load configuration
const config = {
  apiUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  socketUrl: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001',
  isDev: import.meta.env.VITE_ENVIRONMENT === 'development'
};
```

## Authentication Integration

### Complete Authentication Flow

```javascript
class AuthManager {
  constructor(api) {
    this.api = api;
    this.accessToken = null;
    this.refreshToken = localStorage.getItem('refreshToken');
    this.user = null;
  }

  // Register new user
  async register(username, email, password) {
    try {
      const response = await this.api.request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password })
      });

      this.setTokens(response.token, response.refreshToken);
      this.user = response.user;
      
      return response;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  // Login user
  async login(username, password) {
    try {
      const response = await this.api.request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      this.setTokens(response.token, response.refreshToken);
      this.user = response.user;
      
      return response;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  // Logout user
  async logout() {
    try {
      await this.api.request('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });
    } catch (error) {
      console.warn('Logout API call failed:', error.message);
    } finally {
      this.clearTokens();
    }
  }

  // Refresh access token
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.api.request('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken })
      });

      this.setTokens(response.accessToken, this.refreshToken);
      return response.accessToken;
    } catch (error) {
      this.clearTokens();
      throw error;
    }
  }

  // Update user profile
  async updateProfile(updates) {
    try {
      const response = await this.api.request('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(updates)
      });

      this.user = { ...this.user, ...response.user };
      return response;
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  // Token management
  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.api.setToken(accessToken);
    
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    this.api.setToken(null);
    localStorage.removeItem('refreshToken');
  }

  // Auto-refresh token on expiry
  async ensureValidToken() {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    try {
      // Verify current token
      await this.api.request('/api/auth/verify');
      return this.accessToken;
    } catch (error) {
      if (error.message.includes('expired')) {
        return await this.refreshAccessToken();
      }
      throw error;
    }
  }

  // Error handling
  handleAuthError(error) {
    const message = error.message;
    
    if (message.includes('already exists')) {
      return new Error('Username or email already in use');
    } else if (message.includes('Invalid credentials')) {
      return new Error('Invalid username or password');
    } else if (message.includes('Validation failed')) {
      return new Error('Please check your input and try again');
    } else if (message.includes('Rate limit')) {
      return new Error('Too many attempts. Please wait before trying again');
    }
    
    return error;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.accessToken && !!this.user;
  }

  // Get current user
  getCurrentUser() {
    return this.user;
  }
}

// Usage example
const auth = new AuthManager(api);

// Register
try {
  await auth.register('player123', 'player@example.com', 'SecurePass123!');
  console.log('Registration successful');
} catch (error) {
  console.error('Registration failed:', error.message);
}

// Login
try {
  await auth.login('player123', 'SecurePass123!');
  console.log('Login successful');
} catch (error) {
  console.error('Login failed:', error.message);
}
```

### React Hook for Authentication

```jsx
import { createContext, useContext, useReducer, useEffect } from 'react';

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return { 
        ...state, 
        loading: false, 
        user: action.payload.user, 
        token: action.payload.token,
        isAuthenticated: true 
      };
    case 'LOGIN_FAILURE':
      return { 
        ...state, 
        loading: false, 
        error: action.payload, 
        isAuthenticated: false 
      };
    case 'LOGOUT':
      return { 
        loading: false, 
        user: null, 
        token: null, 
        isAuthenticated: false, 
        error: null 
      };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null
  });

  const auth = new AuthManager(api);

  const login = async (username, password) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await auth.login(username, password);
      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: { user: response.user, token: response.token } 
      });
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: error.message });
    }
  };

  const logout = async () => {
    await auth.logout();
    dispatch({ type: 'LOGOUT' });
  };

  const register = async (username, email, password) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await auth.register(username, email, password);
      dispatch({ 
        type: 'LOGIN_SUCCESS', 
        payload: { user: response.user, token: response.token } 
      });
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: error.message });
    }
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

## Game Management

### Game Operations

```javascript
class GameManager {
  constructor(api, auth) {
    this.api = api;
    this.auth = auth;
  }

  // List available games
  async listGames(filters = {}) {
    const queryParams = new URLSearchParams({
      page: filters.page || 1,
      limit: filters.limit || 10,
      filter: filters.filter || 'all',
      hideTestGames: filters.hideTestGames || false
    });

    return await this.api.request(`/api/games?${queryParams}`);
  }

  // Get game details
  async getGameDetails(gameId) {
    return await this.api.request(`/api/games/${gameId}`);
  }

  // Get complete game state
  async getGameState(gameId) {
    return await this.api.request(`/api/games/${gameId}/state`);
  }

  // Validate game configuration
  async validateGameConfig(config) {
    return await this.api.request('/api/games/config/validate', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  // Get server statistics
  async getGameStats() {
    return await this.api.request('/api/games/stats');
  }

  // Cleanup operations (admin)
  async cleanupTestGames() {
    return await this.api.request('/api/games/cleanup-test-games', {
      method: 'DELETE'
    });
  }

  async cleanupOldGames(olderThanHours = 24) {
    return await this.api.request(`/api/games/cleanup-old-games?olderThanHours=${olderThanHours}`, {
      method: 'DELETE'
    });
  }
}

// Usage examples
const gameManager = new GameManager(api, auth);

// List active games
const activeGames = await gameManager.listGames({ filter: 'active' });

// Get specific game details
const gameDetails = await gameManager.getGameDetails('game-id-123');

// Validate game configuration before creating
const config = {
  mapSize: { width: 40, height: 30 },
  maxPlayers: 4,
  turnTimeLimit: 300,
  victoryConditions: ['domination', 'science'],
  startingResources: {
    gold: 50,
    science: 0,
    culture: 0,
    production: 0,
    food: 0
  }
};

const validation = await gameManager.validateGameConfig(config);
if (!validation.valid) {
  console.error('Invalid config:', validation.errors);
}
```

## Real-time Gameplay

### WebSocket Game Client

```javascript
class GameClient {
  constructor(api, auth) {
    this.api = api;
    this.auth = auth;
    this.socket = null;
    this.gameId = null;
    this.playerId = null;
    this.gameState = null;
    this.eventListeners = new Map();
  }

  // Connect to game server
  async connect() {
    await this.auth.ensureValidToken();
    
    this.socket = this.api.initializeSocket();
    this.setupEventHandlers();
    
    return new Promise((resolve, reject) => {
      this.socket.on('connect', () => {
        console.log('Connected to game server');
        resolve();
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('Connection failed:', error);
        reject(error);
      });
    });
  }

  // Setup event handlers
  setupEventHandlers() {
    // Connection events
    this.socket.on('welcome', (data) => {
      console.log('Server welcome:', data.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected:', reason);
      this.emit('disconnected', reason);
    });

    // Game management events
    this.socket.on('game_joined', (data) => {
      console.log('Joined game:', data.gameId);
      this.emit('gameJoined', data);
    });

    this.socket.on('player_joined', (data) => {
      console.log('Player joined:', data.username);
      this.emit('playerJoined', data);
    });

    this.socket.on('game_started', (data) => {
      console.log('Game started with players:', data.players);
      this.emit('gameStarted', data);
    });

    // Gameplay events
    this.socket.on('action_acknowledged', (response) => {
      if (response.success) {
        console.log('Action successful:', response.action);
      } else {
        console.error('Action failed:', response.error);
      }
      this.emit('actionAcknowledged', response);
    });

    this.socket.on('game_update', (update) => {
      console.log('Game updated by:', update.playerId);
      this.handleGameUpdate(update);
    });

    this.socket.on('game_state_update', (data) => {
      this.gameState = data.gameState;
      this.emit('gameStateUpdated', data);
    });

    this.socket.on('turn_ended', (data) => {
      console.log('Turn ended, next player:', data.nextPlayerId);
      this.emit('turnEnded', data);
    });

    this.socket.on('game_ended', (data) => {
      console.log('Game ended, winner:', data.winner);
      this.emit('gameEnded', data);
    });

    // Chat events
    this.socket.on('chat_message', (data) => {
      console.log(`${data.username}: ${data.message}`);
      this.emit('chatMessage', data);
    });

    // Error handling
    this.socket.on('error', (error) => {
      console.error('Game error:', error);
      this.emit('error', error);
    });
  }

  // Join game as player
  async joinGame(gameId, playerId) {
    this.gameId = gameId;
    this.playerId = playerId;
    
    this.socket.emit('join_game', { gameId, playerId });
  }

  // Leave current game
  leaveGame() {
    if (this.gameId && this.playerId) {
      this.socket.emit('leave_game', {
        gameId: this.gameId,
        playerId: this.playerId
      });
    }
  }

  // Perform game action
  performAction(action, payload) {
    if (!this.gameId || !this.playerId) {
      throw new Error('Must join game before performing actions');
    }

    this.socket.emit('game_action', {
      gameId: this.gameId,
      playerId: this.playerId,
      action,
      payload
    });
  }

  // Common game actions
  moveUnit(unitId, from, to) {
    this.performAction('move_unit', { unitId, from, to });
  }

  foundCity(position, name) {
    this.performAction('found_city', { position, name });
  }

  buildUnit(cityId, unitType) {
    this.performAction('build_unit', { cityId, unitType });
  }

  researchTechnology(techId) {
    this.performAction('research_technology', { techId });
  }

  attackUnit(attackerId, defenderId) {
    this.performAction('attack_unit', { attackerId, defenderId });
  }

  endTurn() {
    this.performAction('end_turn', {});
  }

  // Send chat message
  sendChatMessage(message) {
    this.socket.emit('chat_message', {
      gameId: this.gameId,
      playerId: this.playerId,
      message: message.trim()
    });
  }

  // Request current game state
  requestGameState() {
    this.socket.emit('request_game_state', {
      gameId: this.gameId,
      playerId: this.playerId
    });
  }

  // Handle game updates
  handleGameUpdate(update) {
    // Update local game state based on the action
    switch (update.action) {
      case 'move_unit':
        this.handleUnitMove(update);
        break;
      case 'found_city':
        this.handleCityFounded(update);
        break;
      case 'build_unit':
        this.handleUnitBuilt(update);
        break;
      // Add more action handlers as needed
    }
    
    this.emit('gameUpdate', update);
  }

  handleUnitMove(update) {
    // Update unit position in local state
    if (this.gameState && this.gameState.units) {
      const unit = this.gameState.units[update.payload.unitId];
      if (unit) {
        unit.position = update.payload.to;
      }
    }
  }

  // Event listener management
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  // Disconnect from server
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Usage example
const gameClient = new GameClient(api, auth);

// Connect and join game
await gameClient.connect();
await gameClient.joinGame('game-123', 'player-456');

// Set up event listeners
gameClient.on('gameStarted', (data) => {
  console.log('Game started!', data);
});

gameClient.on('gameUpdate', (update) => {
  console.log('Game updated:', update);
  // Update UI with new game state
});

gameClient.on('actionAcknowledged', (response) => {
  if (!response.success) {
    alert(`Action failed: ${response.error}`);
  }
});

// Perform actions
gameClient.moveUnit('unit-1', { x: 5, y: 10 }, { x: 6, y: 10 });
gameClient.sendChatMessage('Good luck everyone!');
```

### React Component for Gameplay

```jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

export const GameBoard = ({ gameId }) => {
  const { user } = useAuth();
  const [gameState, setGameState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(null);
  const gameClientRef = useRef(null);

  useEffect(() => {
    if (!gameId || !user) return;

    const initializeGame = async () => {
      const gameClient = new GameClient(api, auth);
      gameClientRef.current = gameClient;

      await gameClient.connect();
      await gameClient.joinGame(gameId, user.id);

      // Set up event listeners
      gameClient.on('gameStateUpdated', (data) => {
        setGameState(data.gameState);
      });

      gameClient.on('chatMessage', (message) => {
        setMessages(prev => [...prev, message]);
      });

      gameClient.on('actionAcknowledged', (response) => {
        if (!response.success) {
          alert(`Action failed: ${response.error}`);
        }
      });

      // Request initial game state
      gameClient.requestGameState();
    };

    initializeGame().catch(console.error);

    return () => {
      if (gameClientRef.current) {
        gameClientRef.current.disconnect();
      }
    };
  }, [gameId, user]);

  const handleTileClick = (x, y) => {
    if (selectedUnit) {
      // Move unit to clicked position
      gameClientRef.current.moveUnit(selectedUnit.id, selectedUnit.position, { x, y });
      setSelectedUnit(null);
    }
  };

  const handleUnitClick = (unit) => {
    if (unit.playerId === user.id) {
      setSelectedUnit(unit);
    }
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      gameClientRef.current.sendChatMessage(chatInput);
      setChatInput('');
    }
  };

  const endTurn = () => {
    gameClientRef.current.endTurn();
  };

  if (!gameState) {
    return <div>Loading game...</div>;
  }

  return (
    <div className="game-container">
      <div className="game-board">
        <h2>Civilization Game</h2>
        <div className="map-grid">
          {gameState.map && gameState.map.tiles.map((row, y) =>
            row.map((tile, x) => (
              <div
                key={`${x}-${y}`}
                className={`tile ${tile.terrain}`}
                onClick={() => handleTileClick(x, y)}
              >
                {/* Render units on tile */}
                {gameState.units && Object.values(gameState.units)
                  .filter(unit => unit.position.x === x && unit.position.y === y)
                  .map(unit => (
                    <div
                      key={unit.id}
                      className={`unit ${unit.playerId === user.id ? 'own' : 'enemy'} ${selectedUnit?.id === unit.id ? 'selected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnitClick(unit);
                      }}
                    >
                      {unit.type}
                    </div>
                  ))
                }
              </div>
            ))
          )}
        </div>
      </div>

      <div className="game-sidebar">
        <div className="game-info">
          <h3>Turn {gameState.currentTurn}</h3>
          <p>Current Player: {gameState.activePlayerId === user.id ? 'You' : 'Opponent'}</p>
          {gameState.activePlayerId === user.id && (
            <button onClick={endTurn}>End Turn</button>
          )}
        </div>

        <div className="chat">
          <h3>Chat</h3>
          <div className="messages">
            {messages.map((msg, index) => (
              <div key={index} className="message">
                <strong>{msg.username}:</strong> {msg.message}
              </div>
            ))}
          </div>
          <form onSubmit={handleChatSubmit}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type message..."
            />
            <button type="submit">Send</button>
          </form>
        </div>
      </div>
    </div>
  );
};
```

## Save/Load System

### Save/Load Manager

```javascript
class SaveLoadManager {
  constructor(gameClient) {
    this.gameClient = gameClient;
    this.saves = [];
  }

  // Save current game
  async saveGame(saveName, saveType = 'manual') {
    return new Promise((resolve, reject) => {
      this.gameClient.socket.emit('save_game', {
        gameId: this.gameClient.gameId,
        playerId: this.gameClient.playerId,
        saveName,
        saveType
      });

      this.gameClient.socket.once('game_saved', (response) => {
        console.log('Game saved:', response.saveId);
        resolve(response);
      });

      this.gameClient.socket.once('save_error', (error) => {
        console.error('Save failed:', error.message);
        reject(new Error(error.message));
      });
    });
  }

  // Load saved game
  async loadGame(saveId) {
    return new Promise((resolve, reject) => {
      this.gameClient.socket.emit('load_game', {
        saveId,
        playerId: this.gameClient.playerId
      });

      this.gameClient.socket.once('game_loaded', (response) => {
        console.log('Game loaded:', response.gameId);
        this.gameClient.gameState = response.gameState;
        resolve(response);
      });

      this.gameClient.socket.once('load_error', (error) => {
        console.error('Load failed:', error.message);
        reject(new Error(error.message));
      });
    });
  }

  // Get list of saved games
  async getSaves() {
    return new Promise((resolve, reject) => {
      this.gameClient.socket.emit('get_saves', {
        playerId: this.gameClient.playerId
      });

      this.gameClient.socket.once('saves_list', (response) => {
        this.saves = response.saves;
        resolve(response.saves);
      });

      this.gameClient.socket.once('error', (error) => {
        reject(new Error(error.message));
      });
    });
  }

  // Delete saved game
  async deleteSave(saveId) {
    return new Promise((resolve, reject) => {
      this.gameClient.socket.emit('delete_save', {
        saveId,
        playerId: this.gameClient.playerId
      });

      this.gameClient.socket.once('save_deleted', (response) => {
        // Remove from local saves list
        this.saves = this.saves.filter(save => save.id !== saveId);
        resolve(response);
      });

      this.gameClient.socket.once('error', (error) => {
        reject(new Error(error.message));
      });
    });
  }

  // Auto-save functionality
  enableAutoSave(intervalMinutes = 5) {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    setInterval(async () => {
      try {
        const turnNumber = this.gameClient.gameState?.currentTurn || 0;
        await this.saveGame(`Auto-save Turn ${turnNumber}`, 'auto');
        console.log('Auto-save completed');
      } catch (error) {
        console.warn('Auto-save failed:', error.message);
      }
    }, intervalMs);
  }
}

// Usage example
const saveLoadManager = new SaveLoadManager(gameClient);

// Save game
try {
  await saveLoadManager.saveGame('Epic Victory Game');
  console.log('Game saved successfully');
} catch (error) {
  console.error('Save failed:', error.message);
}

// Load game
try {
  const saves = await saveLoadManager.getSaves();
  if (saves.length > 0) {
    await saveLoadManager.loadGame(saves[0].id);
    console.log('Game loaded successfully');
  }
} catch (error) {
  console.error('Load failed:', error.message);
}
```

## Spectator Mode

### Spectator Client

```javascript
class SpectatorClient {
  constructor(api) {
    this.api = api;
    this.socket = null;
    this.gameId = null;
    this.gameState = null;
    this.isSpectating = false;
  }

  async connect() {
    this.socket = this.api.initializeSocket();
    this.setupEventHandlers();
    
    return new Promise((resolve, reject) => {
      this.socket.on('connect', resolve);
      this.socket.on('connect_error', reject);
    });
  }

  setupEventHandlers() {
    this.socket.on('spectating_started', (data) => {
      this.gameId = data.gameId;
      this.gameState = data.gameState;
      this.isSpectating = true;
      console.log('Started spectating game:', data.gameId);
    });

    this.socket.on('game_update', (update) => {
      console.log('Spectating game update:', update);
      this.handleGameUpdate(update);
    });

    this.socket.on('game_state_update', (data) => {
      this.gameState = data.gameState;
      console.log('Game state updated for spectator');
    });

    this.socket.on('spectating_stopped', () => {
      this.isSpectating = false;
      this.gameId = null;
      this.gameState = null;
      console.log('Stopped spectating');
    });

    this.socket.on('error', (error) => {
      console.error('Spectator error:', error);
    });
  }

  async spectateGame(gameId) {
    this.socket.emit('spectate_game', { gameId });
  }

  stopSpectating() {
    this.socket.emit('stop_spectating');
  }

  handleGameUpdate(update) {
    // Update local game state (read-only)
    // Spectators cannot perform actions, only observe
  }
}

// Usage
const spectator = new SpectatorClient(api);
await spectator.connect();
await spectator.spectateGame('game-123');
```

## Error Handling

### Comprehensive Error Handling

```javascript
class ErrorHandler {
  constructor() {
    this.errorListeners = new Set();
  }

  // Handle API errors
  handleApiError(error, context = {}) {
    const errorInfo = {
      type: 'API_ERROR',
      message: error.message,
      status: error.status,
      code: error.code,
      context,
      timestamp: new Date().toISOString()
    };

    console.error('API Error:', errorInfo);
    this.notifyListeners(errorInfo);

    switch (error.code) {
      case 'TOKEN_EXPIRED':
        return this.handleTokenExpired();
      case 'RATE_LIMIT_EXCEEDED':
        return this.handleRateLimit(error.data);
      case 'VALIDATION_FAILED':
        return this.handleValidationError(error.data);
      default:
        return this.handleGenericError(error);
    }
  }

  // Handle WebSocket errors
  handleSocketError(error, context = {}) {
    const errorInfo = {
      type: 'SOCKET_ERROR',
      message: error.message,
      errorType: error.type,
      code: error.code,
      context,
      timestamp: new Date().toISOString()
    };

    console.error('Socket Error:', errorInfo);
    this.notifyListeners(errorInfo);

    switch (error.type) {
      case 'join_game_error':
        return this.handleGameJoinError(error);
      case 'save_error':
        return this.handleSaveError(error);
      case 'load_error':
        return this.handleLoadError(error);
      default:
        return this.handleGenericSocketError(error);
    }
  }

  // Specific error handlers
  async handleTokenExpired() {
    try {
      await auth.refreshAccessToken();
      return { retry: true };
    } catch (refreshError) {
      // Redirect to login if refresh fails
      window.location.href = '/login';
      return { retry: false };
    }
  }

  handleRateLimit(errorData) {
    const retryAfter = errorData.retryAfter || 60;
    console.log(`Rate limited, retry after ${retryAfter} seconds`);
    
    return new Promise(resolve => {
      setTimeout(() => resolve({ retry: true }), retryAfter * 1000);
    });
  }

  handleValidationError(errorData) {
    const errors = errorData.details || [];
    const errorMessage = errors.map(e => `${e.field}: ${e.message}`).join('\n');
    
    this.showUserError('Validation Error', errorMessage);
    return { retry: false };
  }

  handleGameJoinError(error) {
    switch (error.message) {
      case 'Game not found':
        this.showUserError('Game Not Found', 'The game you\'re trying to join no longer exists.');
        break;
      case 'Game is full':
        this.showUserError('Game Full', 'This game is at capacity. Try finding another game.');
        break;
      default:
        this.showUserError('Join Failed', error.message);
    }
    return { retry: false };
  }

  // User notification methods
  showUserError(title, message) {
    // Show error to user (toast, modal, etc.)
    console.error(`${title}: ${message}`);
    
    // Example with toast notification
    if (window.showToast) {
      window.showToast({ type: 'error', title, message });
    }
  }

  // Error listener management
  addErrorListener(callback) {
    this.errorListeners.add(callback);
  }

  removeErrorListener(callback) {
    this.errorListeners.delete(callback);
  }

  notifyListeners(errorInfo) {
    this.errorListeners.forEach(callback => {
      try {
        callback(errorInfo);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    });
  }
}

// Global error handler instance
const errorHandler = new ErrorHandler();

// Integrate with API client
const originalRequest = api.request.bind(api);
api.request = async function(endpoint, options) {
  try {
    return await originalRequest(endpoint, options);
  } catch (error) {
    const result = await errorHandler.handleApiError(error, { endpoint, options });
    if (result.retry) {
      return await originalRequest(endpoint, options);
    }
    throw error;
  }
};
```

## Complete Client Example

### Full Featured Game Client

```javascript
class CivilizationGameClient {
  constructor(config = {}) {
    this.config = {
      apiUrl: config.apiUrl || 'http://localhost:3001',
      socketUrl: config.socketUrl || 'http://localhost:3001',
      autoReconnect: config.autoReconnect !== false,
      autoSave: config.autoSave !== false,
      ...config
    };

    this.api = new CivilizationAPI();
    this.auth = new AuthManager(this.api);
    this.gameManager = new GameManager(this.api, this.auth);
    this.gameClient = new GameClient(this.api, this.auth);
    this.saveLoadManager = new SaveLoadManager(this.gameClient);
    this.errorHandler = new ErrorHandler();
    
    this.state = {
      connected: false,
      authenticated: false,
      inGame: false,
      gameId: null,
      playerId: null,
      spectating: false
    };

    this.setupErrorHandling();
  }

  setupErrorHandling() {
    // Global error handling
    this.errorHandler.addErrorListener((error) => {
      console.log('Global error handler:', error);
      this.emit('error', error);
    });

    // Game client error handling
    this.gameClient.on('error', (error) => {
      this.errorHandler.handleSocketError(error);
    });
  }

  // Initialize the client
  async initialize() {
    try {
      // Try to restore authentication from storage
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          await this.auth.refreshAccessToken();
          this.state.authenticated = true;
          this.emit('authenticated', this.auth.getCurrentUser());
        } catch (error) {
          console.log('Auto-login failed:', error.message);
        }
      }

      // Connect to game server
      await this.gameClient.connect();
      this.state.connected = true;
      this.emit('connected');

      return true;
    } catch (error) {
      console.error('Initialization failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async register(username, email, password) {
    const result = await this.auth.register(username, email, password);
    this.state.authenticated = true;
    this.emit('authenticated', result.user);
    return result;
  }

  async login(username, password) {
    const result = await this.auth.login(username, password);
    this.state.authenticated = true;
    this.emit('authenticated', result.user);
    return result;
  }

  async logout() {
    if (this.state.inGame) {
      this.leaveGame();
    }
    await this.auth.logout();
    this.state.authenticated = false;
    this.emit('logout');
  }

  // Game management methods
  async listGames(filters) {
    return await this.gameManager.listGames(filters);
  }

  async joinGame(gameId, playerId = null) {
    if (!this.state.authenticated) {
      throw new Error('Must be authenticated to join game');
    }

    const userId = playerId || this.auth.getCurrentUser().id;
    await this.gameClient.joinGame(gameId, userId);
    
    this.state.inGame = true;
    this.state.gameId = gameId;
    this.state.playerId = userId;

    if (this.config.autoSave) {
      this.saveLoadManager.enableAutoSave();
    }

    this.emit('gameJoined', { gameId, playerId: userId });
  }

  leaveGame() {
    if (this.state.inGame) {
      this.gameClient.leaveGame();
      this.state.inGame = false;
      this.state.gameId = null;
      this.state.playerId = null;
      this.emit('gameLeft');
    }
  }

  // Game actions (delegated to gameClient)
  moveUnit(unitId, from, to) {
    return this.gameClient.moveUnit(unitId, from, to);
  }

  foundCity(position, name) {
    return this.gameClient.foundCity(position, name);
  }

  buildUnit(cityId, unitType) {
    return this.gameClient.buildUnit(cityId, unitType);
  }

  endTurn() {
    return this.gameClient.endTurn();
  }

  sendChat(message) {
    return this.gameClient.sendChatMessage(message);
  }

  // Save/Load methods
  async saveGame(saveName) {
    return await this.saveLoadManager.saveGame(saveName);
  }

  async loadGame(saveId) {
    return await this.saveLoadManager.loadGame(saveId);
  }

  async getSaves() {
    return await this.saveLoadManager.getSaves();
  }

  // Spectator methods
  async spectateGame(gameId) {
    const spectator = new SpectatorClient(this.api);
    await spectator.connect();
    await spectator.spectateGame(gameId);
    
    this.state.spectating = true;
    this.emit('spectatingStarted', gameId);
    
    return spectator;
  }

  // Event system
  emit(event, data) {
    this.gameClient.emit(event, data);
  }

  on(event, callback) {
    this.gameClient.on(event, callback);
  }

  off(event, callback) {
    this.gameClient.off(event, callback);
  }

  // Utility methods
  isConnected() {
    return this.state.connected;
  }

  isAuthenticated() {
    return this.state.authenticated;
  }

  isInGame() {
    return this.state.inGame;
  }

  getCurrentGame() {
    return {
      gameId: this.state.gameId,
      playerId: this.state.playerId,
      gameState: this.gameClient.gameState
    };
  }

  getCurrentUser() {
    return this.auth.getCurrentUser();
  }

  // Cleanup
  destroy() {
    if (this.state.inGame) {
      this.leaveGame();
    }
    this.gameClient.disconnect();
    this.state.connected = false;
    this.emit('destroyed');
  }
}

// Usage example
const client = new CivilizationGameClient({
  apiUrl: 'http://localhost:3001',
  autoSave: true,
  autoReconnect: true
});

// Initialize and set up event listeners
await client.initialize();

client.on('authenticated', (user) => {
  console.log('User authenticated:', user.username);
});

client.on('gameJoined', ({ gameId, playerId }) => {
  console.log('Joined game:', gameId);
});

client.on('gameStarted', (data) => {
  console.log('Game started with players:', data.players);
});

client.on('gameUpdate', (update) => {
  console.log('Game updated:', update);
});

client.on('error', (error) => {
  console.error('Client error:', error);
});

// Use the client
await client.login('username', 'password');
const games = await client.listGames({ filter: 'active' });
await client.joinGame(games.games[0].id);
```

## Testing Strategies

### Unit Tests

```javascript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CivilizationAPI } from '../src/api';

describe('CivilizationAPI', () => {
  let api;
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    api = new CivilizationAPI();
    api.setToken('test-token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('should include token in authenticated requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await api.request('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    it('should handle token refresh on 401', async () => {
      // Mock expired token response
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ code: 'TOKEN_EXPIRED' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ accessToken: 'new-token' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });

      // Should automatically refresh and retry
      const result = await api.request('/api/test');
      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: 'Validation failed',
          details: [
            { field: 'email', message: 'Invalid email format' }
          ]
        })
      });

      await expect(api.request('/api/test')).rejects.toThrow('Validation failed');
    });

    it('should handle rate limiting', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          error: 'Rate limit exceeded',
          retryAfter: 60
        })
      });

      await expect(api.request('/api/test')).rejects.toThrow('Rate limit exceeded');
    });
  });
});
```

### Integration Tests

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io } from 'socket.io-client';

describe('Game Integration Tests', () => {
  let socket1, socket2;
  let gameId;

  beforeAll((done) => {
    socket1 = io('http://localhost:3001');
    socket2 = io('http://localhost:3001');
    
    let connections = 0;
    const onConnect = () => {
      connections++;
      if (connections === 2) done();
    };
    
    socket1.on('connect', onConnect);
    socket2.on('connect', onConnect);
  });

  afterAll(() => {
    socket1.disconnect();
    socket2.disconnect();
  });

  it('should allow two players to join and play a game', (done) => {
    // Create game
    socket1.emit('create_game', {
      gameId: 'test-game-123',
      playerId: 'player1',
      config: {
        name: 'Test Game',
        maxPlayers: 2,
        mapSize: { width: 20, height: 20 }
      }
    });

    socket1.on('game_created', () => {
      // Player 2 joins
      socket2.emit('join_game', {
        gameId: 'test-game-123',
        playerId: 'player2'
      });
    });

    let joinedPlayers = 0;
    const onGameJoined = () => {
      joinedPlayers++;
      if (joinedPlayers === 2) {
        // Start game
        socket1.emit('start_game', {
          gameId: 'test-game-123',
          playerId: 'player1'
        });
      }
    };

    socket1.on('game_joined', onGameJoined);
    socket2.on('game_joined', onGameJoined);

    socket1.on('game_started', (data) => {
      expect(data.players).toHaveLength(2);
      
      // Perform game action
      socket1.emit('game_action', {
        gameId: 'test-game-123',
        playerId: 'player1',
        action: 'end_turn',
        payload: {}
      });
    });

    socket2.on('game_update', (update) => {
      expect(update.action).toBe('end_turn');
      expect(update.playerId).toBe('player1');
      done();
    });
  });
});
```

### E2E Tests with Playwright

```javascript
import { test, expect } from '@playwright/test';

test.describe('Civilization Game E2E', () => {
  test('complete game flow', async ({ page, context }) => {
    // Navigate to game
    await page.goto('http://localhost:5173');

    // Register user
    await page.click('text=Register');
    await page.fill('[name=username]', 'testplayer');
    await page.fill('[name=email]', 'test@example.com');
    await page.fill('[name=password]', 'TestPass123!');
    await page.click('button[type=submit]');

    // Wait for redirect to lobby
    await expect(page).toHaveURL(/lobby/);

    // Create game
    await page.click('text=Create Game');
    await page.fill('[name=gameName]', 'Test Game');
    await page.click('button[type=submit]');

    // Verify game created
    await expect(page.locator('text=Test Game')).toBeVisible();

    // Open second tab for second player
    const secondPage = await context.newPage();
    await secondPage.goto('http://localhost:5173');

    // Register second user
    await secondPage.click('text=Register');
    await secondPage.fill('[name=username]', 'testplayer2');
    await secondPage.fill('[name=email]', 'test2@example.com');
    await secondPage.fill('[name=password]', 'TestPass123!');
    await secondPage.click('button[type=submit]');

    // Join the game
    await secondPage.click('text=Test Game');
    await secondPage.click('text=Join');

    // Start game from first player
    await page.click('text=Start Game');

    // Verify game started for both players
    await expect(page.locator('text=Game Started')).toBeVisible();
    await expect(secondPage.locator('text=Game Started')).toBeVisible();

    // Perform game action
    await page.click('.tile[data-x="5"][data-y="5"]');
    await page.click('text=End Turn');

    // Verify action reflected on second player's screen
    await expect(secondPage.locator('text=Your Turn')).toBeVisible();
  });
});
```

This comprehensive guide provides all the necessary tools and patterns for integrating with the Civilization Game API, from basic setup to advanced features like real-time gameplay, save/load systems, and thorough testing strategies.