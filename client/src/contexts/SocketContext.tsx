import React, { createContext, useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { io, Socket } from 'socket.io-client';
import { apiConfig } from '../config/api';
import { logger } from '@civ-game/shared';
import { RootState } from '../store/store';
import {
  setConnectionStatus,
  updateGameState,
  playerJoined,
  playerLeft,
  gameStarted,
  gameEnded,
  addGameAction
} from '../store/gameSlice';
import { showInfo, showSuccess, showWarning, showError } from '../store/uiSlice';

interface SocketContextValue {
  socket: Socket | null
  connected: boolean
  createGame: (playerName: string, gameConfig: any) => void
  createGameWithAck: (playerName: string, gameConfig: any, opts?: { timeoutMs?: number }) => Promise<{ gameId: string; playerId: string; gameState: any }>
  joinGame: (gameId: string, playerName: string) => void
  joinGameWithAck: (gameId: string, playerName: string, opts?: { timeoutMs?: number }) => Promise<{ gameId: string; playerId: string; gameState: any }>
  leaveGame: () => void
  startGame: () => void
  sendGameAction: (action: any) => void
  requestGameState: () => void
  listGames: (options?: { page?: number; limit?: number; filter?: 'all' | 'active' | 'waiting' | 'ended'; hideTestGames?: boolean }) => Promise<{ games: any[]; totalGames: number; hasMore: boolean }>
  getLobbyStats: () => Promise<{ activeGames: number; activePlayers: number }>
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
  createGame: () => {},
  createGameWithAck: async () => { throw new Error('socket not connected'); },
  joinGame: () => {},
  joinGameWithAck: async () => { throw new Error('socket not connected'); },
  leaveGame: () => {},
  startGame: () => {},
  sendGameAction: () => {},
  requestGameState: () => {},
  listGames: async () => ({ games: [], totalGames: 0, hasMore: false }),
  getLobbyStats: async () => ({ activeGames: 0, activePlayers: 0 })
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Create socket connection
      const newSocket = io(apiConfig.socketURL, {
        auth: {
          userId: user.id,
          username: user.username
        }
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        logger.info('Connected to server');
        setConnected(true);
        dispatch(setConnectionStatus('connected'));
        dispatch(showSuccess({ title: 'Connected', message: 'Connected to game server' }));
      });

      newSocket.on('disconnect', () => {
        logger.info('Disconnected from server');
        setConnected(false);
        dispatch(setConnectionStatus('disconnected'));
        dispatch(showWarning({ title: 'Disconnected', message: 'Lost connection to server' }));
      });

      newSocket.on('connect_error', (error) => {
        logger.error('Connection error:', error);
        dispatch(setConnectionStatus('error'));
        dispatch(showError({ title: 'Connection Error', message: 'Failed to connect to server' }));
      });

      // Game event handlers
      newSocket.on('game_created', (data) => {
        logger.info('Game created:', data);
        dispatch(showSuccess({ title: 'Game Created', message: `Game ${data.gameId} created successfully` }));
        dispatch(updateGameState(data.gameState));
      });

      newSocket.on('player_joined', (data) => {
        logger.info('Player joined:', data);
        dispatch(playerJoined(data.player));
        dispatch(updateGameState(data.gameState));
        dispatch(showInfo({ title: 'Player Joined', message: `${data.player.name} joined the game` }));
      });

      newSocket.on('player_disconnected', (data) => {
        logger.info('Player disconnected:', data);
        dispatch(playerLeft(data.playerId));
        dispatch(updateGameState(data.gameState));
        dispatch(showWarning({ title: 'Player Left', message: 'A player has left the game' }));
      });

      newSocket.on('game_started', (data) => {
        logger.info('Game started:', data);
        dispatch(gameStarted(data.gameState));
        dispatch(showSuccess({ title: 'Game Started', message: 'The game has begun!' }));
      });

      newSocket.on('game_updated', (data) => {
        logger.debug('Game updated:', data);
        dispatch(updateGameState(data.gameState));
        dispatch(addGameAction(data.action));
      });

      newSocket.on('game_ended', (data) => {
        logger.info('Game ended:', data);
        dispatch(gameEnded(data));
        dispatch(showInfo({
          title: 'Game Ended',
          message: `${data.winner.name} has won the game!`
        }));
      });

      newSocket.on('turn_timeout', (data) => {
        logger.info('Turn timeout:', data);
        dispatch(updateGameState(data.gameState));
        dispatch(showWarning({ title: 'Turn Timeout', message: 'Turn ended due to timeout' }));
      });

      newSocket.on('action_failed', (data) => {
        logger.warn('Action failed:', data);
        dispatch(showError({
          title: 'Action Failed',
          message: data.reason || 'Your action could not be completed'
        }));
      });

      newSocket.on('game_state', (gameState) => {
        logger.debug('Received game state:', gameState);
        dispatch(updateGameState(gameState));
      });

      newSocket.on('player_ready', (data) => {
        logger.info('Player ready:', data);
        dispatch(showInfo({ title: 'Player Ready', message: 'A player is ready to start' }));
      });

      newSocket.on('error', (data) => {
        logger.error('Socket error:', data);
        dispatch(showError({ title: 'Error', message: data.message || 'An error occurred' }));
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      // Clean up socket when not authenticated
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
        dispatch(setConnectionStatus('disconnected'));
      }
    }
  }, [isAuthenticated, user, dispatch]);

  // Socket action functions
  const createGame = (playerName: string, gameConfig: any) => {
    if (socket) {
      socket.emit('create_game', { playerName, gameConfig });
    }
  };

  const createGameWithAck = (playerName: string, gameConfig: any, opts: { timeoutMs?: number } = {}) => {
    return new Promise<{ gameId: string; playerId: string; gameState: any }>((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not connected'));
      try {
        const timeout = setTimeout(() => reject(new Error('create_game timeout')), opts.timeoutMs ?? 5000);
        socket.emit('create_game', { playerName, gameConfig });
        socket.once('game_created', (data: any) => {
          clearTimeout(timeout);
          resolve({ gameId: data.gameId, playerId: data.playerId, gameState: data.gameState });
        });
        socket.once('error', (err: any) => {
          clearTimeout(timeout);
          reject(new Error(err?.message || 'create_game error'));
        });
      } catch (e) {
        reject(e);
      }
    });
  };

  const joinGame = (gameId: string, playerName: string) => {
    if (socket) {
      socket.emit('join_game', { gameId, playerName });
    }
  };

  const joinGameWithAck = (gameId: string, playerName: string, opts: { timeoutMs?: number } = {}) => {
    return new Promise<{ gameId: string; playerId: string; gameState: any }>((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not connected'));
      try {
        const timeout = setTimeout(() => reject(new Error('join_game timeout')), opts.timeoutMs ?? 6000);
        socket.emit('join_game', { gameId, playerName });
        const handler = (data: any) => {
          // Resolve when we see ourselves join
          const p = data?.player;
          if (p && (String(p.name).toLowerCase() === String(playerName).toLowerCase())) {
            clearTimeout(timeout);
            socket.off('player_joined', handler);
            resolve({ gameId, playerId: p.id, gameState: data.gameState });
          }
        };
        socket.on('player_joined', handler);
        socket.once('error', (err: any) => {
          clearTimeout(timeout);
          socket.off('player_joined', handler);
          reject(new Error(err?.message || 'join_game error'));
        });
      } catch (e) {
        reject(e);
      }
    });
  };

  const leaveGame = () => {
    if (socket) {
      socket.emit('leave_game');
    }
  };

  const startGame = () => {
    if (socket) {
      socket.emit('start_game');
    }
  };

  const sendGameAction = (action: any) => {
    if (socket) {
      socket.emit('game_action', action);
    }
  };

  const requestGameState = () => {
    if (socket) {
      socket.emit('request_game_state');
    }
  };

  // Lobby helpers
  const listGames = (options: { page?: number; limit?: number; filter?: 'all' | 'active' | 'waiting' | 'ended'; hideTestGames?: boolean } = {}) => {
    return new Promise<{ games: any[]; totalGames: number; hasMore: boolean }>((resolve, reject) => {
      if (!socket) return resolve({ games: [], totalGames: 0, hasMore: false });
      try {
        socket.emit('list_games', options);
        socket.once('games_list', (payload: any) => {
          resolve({
            games: payload.games || [],
            totalGames: payload.totalGames ?? (payload.games ? payload.games.length : 0),
            hasMore: !!payload.hasMore
          });
        });
        // Basic safety timeout
        setTimeout(() => resolve({ games: [], totalGames: 0, hasMore: false }), 5000);
      } catch (e) {
        reject(e);
      }
    });
  };

  const getLobbyStats = () => {
    return new Promise<{ activeGames: number; activePlayers: number }>((resolve, reject) => {
      if (!socket) return resolve({ activeGames: 0, activePlayers: 0 });
      try {
        socket.emit('lobby_stats');
        socket.once('lobby_stats', (payload: any) => {
          resolve({
            activeGames: payload.activeGames ?? 0,
            activePlayers: payload.activePlayers ?? 0
          });
        });
        setTimeout(() => resolve({ activeGames: 0, activePlayers: 0 }), 3000);
      } catch (e) {
        reject(e);
      }
    });
  };

  const contextValue: SocketContextValue = {
    socket,
    connected,
    createGame,
    createGameWithAck,
    joinGame,
    joinGameWithAck,
    leaveGame,
    startGame,
    sendGameAction,
    requestGameState,
    listGames,
    getLobbyStats
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
