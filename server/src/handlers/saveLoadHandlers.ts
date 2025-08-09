import { Socket } from 'socket.io';
import { GamePersistence } from '../database/GamePersistence';
import { GameManager } from '../game/GameManager';
import { logger } from '../utils/logger';

export class SaveLoadHandlers {
  private gamePersistence: GamePersistence;
  private gameManager: GameManager;

  constructor(gamePersistence: GamePersistence, gameManager: GameManager) {
    this.gamePersistence = gamePersistence;
    this.gameManager = gameManager;
  }

  /**
   * Register all save/load related socket handlers
   */
  registerHandlers(socket: Socket): void {
    // Save game handler
    socket.on('save_game', async (data) => {
      try {
        const { gameId, saveName, saveType, playerId, gameState } = data;

        if (!gameId || !saveName || !playerId) {
          socket.emit('save_error', { message: 'Missing required fields' });
          return;
        }

        // Get the game room to verify player is in the game
        const room = this.gameManager.getRoom(gameId);
        if (!room) {
          socket.emit('save_error', { message: 'Game not found' });
          return;
        }

        // Verify player is in the game
        const isPlayerInGame = room.players.some(p => p.id === playerId);
        if (!isPlayerInGame) {
          socket.emit('save_error', { message: 'Player not in this game' });
          return;
        }

        // Save the game state
        const saveId = await this.gamePersistence.saveGame(
          gameId,
          playerId,
          saveName,
          gameState || room.game.getState(),
          saveType || 'manual'
        );

        // Update the room's last save info
        room.lastSaveId = saveId;
        room.lastSaveTime = new Date();

        socket.emit('game_saved', {
          saveId,
          message: 'Game saved successfully'
        });

        // Notify other players in the room
        socket.to(gameId).emit('game_saved_notification', {
          saveId,
          saveName,
          playerId,
          playerName: room.players.find(p => p.id === playerId)?.name
        });

        logger.info(`Game saved: ${gameId} by player ${playerId}`);
      } catch (error) {
        logger.error('Error saving game:', error);
        socket.emit('save_error', { 
          message: error instanceof Error ? error.message : 'Failed to save game' 
        });
      }
    });

    // Load game handler
    socket.on('load_game', async (data) => {
      try {
        const { saveId, gameId, playerId } = data;

        if (!saveId || !playerId) {
          socket.emit('load_error', { message: 'Missing required fields' });
          return;
        }

        // Load the game state from database
        const savedGame = await this.gamePersistence.loadGame(saveId);
        if (!savedGame) {
          socket.emit('load_error', { message: 'Save not found' });
          return;
        }

        // Verify player has access to this save
        const playerSaves = await this.gamePersistence.getPlayerSaves(playerId);
        const hasAccess = playerSaves.some(save => save.id === saveId);
        if (!hasAccess) {
          socket.emit('load_error', { message: 'Access denied to this save' });
          return;
        }

        // Check if game room exists
        let room = this.gameManager.getRoom(savedGame.gameId);
        
        if (!room) {
          // Create a new room for the loaded game
          room = await this.gameManager.createRoom({
            name: `Loaded: ${savedGame.saveName}`,
            maxPlayers: Object.keys(savedGame.gameState.players).length,
            gameMode: savedGame.gameMode || 'multiplayer',
            mapSize: { 
              width: savedGame.gameState.map[0].length, 
              height: savedGame.gameState.map.length 
            }
          });

          // Restore the game state
          room.game.setState(savedGame.gameState);
          room.status = 'in_progress';
          room.lastSaveId = saveId;
        } else {
          // Update existing room's game state
          room.game.setState(savedGame.gameState);
          room.lastSaveId = saveId;
        }

        // Join the player to the room
        socket.join(savedGame.gameId);

        socket.emit('game_loaded', {
          gameState: savedGame.gameState,
          gameId: savedGame.gameId,
          roomInfo: {
            id: room.id,
            name: room.name,
            players: room.players,
            status: room.status
          }
        });

        // Notify other players
        socket.to(savedGame.gameId).emit('game_state_restored', {
          gameState: savedGame.gameState,
          loadedBy: playerId
        });

        logger.info(`Game loaded: ${savedGame.gameId} by player ${playerId}`);
      } catch (error) {
        logger.error('Error loading game:', error);
        socket.emit('load_error', { 
          message: error instanceof Error ? error.message : 'Failed to load game' 
        });
      }
    });

    // Get saves list handler
    socket.on('get_saves', async (data) => {
      try {
        const { playerId } = data;

        if (!playerId) {
          socket.emit('error', { message: 'Player ID required' });
          return;
        }

        const saves = await this.gamePersistence.getPlayerSaves(playerId);
        
        // Format saves for frontend
        const formattedSaves = saves.map(save => ({
          id: save.id,
          gameId: save.gameId,
          saveName: save.saveName,
          turnNumber: save.turnNumber,
          saveType: save.saveType,
          createdAt: save.createdAt,
          fileSize: save.compressedSize || 0,
          gameName: save.gameName || 'Unnamed Game',
          status: save.status,
          gameMode: save.gameMode || 'multiplayer',
          difficulty: save.difficulty
        }));

        socket.emit('saves_list', { saves: formattedSaves });
      } catch (error) {
        logger.error('Error getting saves:', error);
        socket.emit('error', { 
          message: error instanceof Error ? error.message : 'Failed to get saves' 
        });
      }
    });

    // Delete save handler
    socket.on('delete_save', async (data) => {
      try {
        const { saveId, playerId } = data;

        if (!saveId || !playerId) {
          socket.emit('error', { message: 'Missing required fields' });
          return;
        }

        // Verify player owns this save
        const playerSaves = await this.gamePersistence.getPlayerSaves(playerId);
        const ownsSave = playerSaves.some(save => save.id === saveId);
        
        if (!ownsSave) {
          socket.emit('error', { message: 'Cannot delete this save' });
          return;
        }

        await this.gamePersistence.deleteSave(saveId);
        socket.emit('save_deleted', { saveId });

        logger.info(`Save deleted: ${saveId} by player ${playerId}`);
      } catch (error) {
        logger.error('Error deleting save:', error);
        socket.emit('error', { 
          message: error instanceof Error ? error.message : 'Failed to delete save' 
        });
      }
    });

    // Auto-save handler (called periodically by the game manager)
    socket.on('request_autosave', async (data) => {
      try {
        const { gameId } = data;

        if (!gameId) {
          return;
        }

        const room = this.gameManager.getRoom(gameId);
        if (!room || room.status !== 'in_progress') {
          return;
        }

        // Only auto-save if enough time has passed
        const now = new Date();
        const lastSave = room.lastSaveTime || new Date(0);
        const timeSinceLastSave = now.getTime() - lastSave.getTime();
        const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes

        if (timeSinceLastSave < AUTO_SAVE_INTERVAL) {
          return;
        }

        // Perform auto-save
        const gameState = room.game.getState();
        const hostPlayer = room.players[0]; // Use host player for auto-saves
        
        const saveId = await this.gamePersistence.saveGame(
          gameId,
          hostPlayer.id,
          `Auto-save Turn ${gameState.turn}`,
          gameState,
          'auto'
        );

        room.lastSaveId = saveId;
        room.lastSaveTime = now;

        // Notify all players
        socket.to(gameId).emit('autosave_complete', {
          saveId,
          turnNumber: gameState.turn
        });

        logger.info(`Auto-save completed for game: ${gameId}`);
      } catch (error) {
        logger.error('Error during auto-save:', error);
      }
    });

    // Get player statistics
    socket.on('get_player_stats', async (data) => {
      try {
        const { playerId } = data;

        if (!playerId) {
          socket.emit('error', { message: 'Player ID required' });
          return;
        }

        const stats = await this.gamePersistence.getPlayerStats(playerId);
        
        socket.emit('player_stats', { stats });
      } catch (error) {
        logger.error('Error getting player stats:', error);
        socket.emit('error', { 
          message: error instanceof Error ? error.message : 'Failed to get stats' 
        });
      }
    });

    // Get leaderboard
    socket.on('get_leaderboard', async (data) => {
      try {
        const { limit = 10, offset = 0 } = data;

        const leaderboard = await this.gamePersistence.getLeaderboard(limit, offset);
        
        socket.emit('leaderboard', { leaderboard });
      } catch (error) {
        logger.error('Error getting leaderboard:', error);
        socket.emit('error', { 
          message: error instanceof Error ? error.message : 'Failed to get leaderboard' 
        });
      }
    });
  }

  /**
   * Setup auto-save timer for active games
   */
  setupAutoSave(): void {
    const AUTO_SAVE_INTERVAL = 5 * 60 * 1000; // 5 minutes

    setInterval(async () => {
      try {
        const activeRooms = this.gameManager.getActiveRooms();
        
        for (const room of activeRooms) {
          if (room.status !== 'in_progress') continue;

          const now = new Date();
          const lastSave = room.lastSaveTime || new Date(0);
          const timeSinceLastSave = now.getTime() - lastSave.getTime();

          if (timeSinceLastSave >= AUTO_SAVE_INTERVAL) {
            const gameState = room.game.getState();
            const hostPlayer = room.players[0];
            
            if (hostPlayer) {
              const saveId = await this.gamePersistence.saveGame(
                room.id,
                hostPlayer.id,
                `Auto-save Turn ${gameState.turn}`,
                gameState,
                'auto'
              );

              room.lastSaveId = saveId;
              room.lastSaveTime = now;

              logger.info(`Auto-saved game ${room.id} at turn ${gameState.turn}`);
            }
          }
        }
      } catch (error) {
        logger.error('Error in auto-save timer:', error);
      }
    }, AUTO_SAVE_INTERVAL);
  }
}
