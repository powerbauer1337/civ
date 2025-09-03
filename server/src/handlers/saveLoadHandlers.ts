import { Socket } from 'socket.io';
import { GamePersistence } from '../database/GamePersistence';
import { GameManager } from '../game/GameManager';
// import { logger } from '../utils/logger'; // Logger not implemented yet

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
        const isPlayerInGame = room.players.has(playerId);
        if (!isPlayerInGame) {
          socket.emit('save_error', { message: 'Player not in this game' });
          return;
        }

        // Save the game state
        const saveId = await this.gamePersistence.saveGame({
          gameId,
          playerId,
          saveName,
          gameState: gameState || room.gameState,
          saveType: (saveType as 'auto' | 'manual' | 'checkpoint') || 'manual'
        });

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
          playerName: room.gameState.players.find((p: any) => p.id === playerId)?.username || 'Unknown Player'
        });

        console.info(`Game saved: ${gameId} by player ${playerId}`);
      } catch (error) {
        console.error('Error saving game:', error);
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
        const savedGame = await this.gamePersistence.loadGame({ saveId, playerId });
        if (!savedGame) {
          socket.emit('load_error', { message: 'Save not found' });
          return;
        }

        // Get save metadata
        const playerSaves = await this.gamePersistence.getSavedGames(playerId);
        const saveMetadata = playerSaves.find(save => save.id === saveId);
        if (!saveMetadata) {
          socket.emit('load_error', { message: 'Access denied to this save' });
          return;
        }

        // Check if game room exists
        let room = this.gameManager.getRoom(saveMetadata.game_id);

        if (!room) {
          // Create a new room for the loaded game
          room = await this.gameManager.createRoom({
            name: `Loaded: ${saveMetadata.save_name}`,
            maxPlayers: Object.keys(savedGame.players).length,
            gameMode: saveMetadata.game_mode || 'multiplayer',
            mapSize: {
              width: savedGame.board[0].length,
              height: savedGame.board.length
            }
          });

          // Restore the game state
          room.gameState = savedGame;
          room.status = 'in_progress';
          room.lastSaveId = saveId;
        } else {
          // Update existing room's game state
          room.gameState = savedGame;
          room.lastSaveId = saveId;
        }

        // Join the player to the room
        socket.join(saveMetadata.game_id);

        socket.emit('game_loaded', {
          gameState: savedGame,
          gameId: saveMetadata.game_id,
          roomInfo: {
            id: room.id,
            name: room.name,
            players: room.players,
            status: room.status
          }
        });

        // Notify other players
        socket.to(saveMetadata.game_id).emit('game_state_restored', {
          gameState: savedGame,
          loadedBy: playerId
        });

        console.info(`Game loaded: ${saveMetadata.game_id} by player ${playerId}`);
      } catch (error) {
        console.error('Error loading game:', error);
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

        const saves = await this.gamePersistence.getSavedGames(playerId);

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
        console.error('Error getting saves:', error);
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
        const playerSaves = await this.gamePersistence.getSavedGames(playerId);
        const ownsSave = playerSaves.some(save => save.id === saveId);

        if (!ownsSave) {
          socket.emit('error', { message: 'Cannot delete this save' });
          return;
        }

        await this.gamePersistence.deleteSave(saveId, playerId);
        socket.emit('save_deleted', { saveId });

        console.info(`Save deleted: ${saveId} by player ${playerId}`);
      } catch (error) {
        console.error('Error deleting save:', error);
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
        const gameState = room.gameState;
        const hostPlayerId = Array.from(room.players.keys())[0]; // Use first player for auto-saves

        const saveId = await this.gamePersistence.saveGame({
          gameId,
          playerId: hostPlayerId,
          saveName: `Auto-save Turn ${gameState.currentTurn}`,
          gameState,
          saveType: 'auto'
        });

        room.lastSaveId = saveId;
        room.lastSaveTime = now;

        // Notify all players
        socket.to(gameId).emit('autosave_complete', {
          saveId,
          turnNumber: gameState.currentTurn
        });

        console.info(`Auto-save completed for game: ${gameId}`);
      } catch (error) {
        console.error('Error during auto-save:', error);
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
        console.error('Error getting player stats:', error);
        socket.emit('error', {
          message: error instanceof Error ? error.message : 'Failed to get stats'
        });
      }
    });

    // Get leaderboard
    socket.on('get_leaderboard', async (data) => {
      try {
        const { limit = 10, offset = 0 } = data;

        const leaderboard = await this.gamePersistence.getLeaderboard();

        socket.emit('leaderboard', { leaderboard });
      } catch (error) {
        console.error('Error getting leaderboard:', error);
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
            const gameState = room.gameState;
            const hostPlayerId = Array.from(room.players.keys())[0];

            if (hostPlayerId) {
              const saveId = await this.gamePersistence.saveGame({
                gameId: room.id,
                playerId: hostPlayerId,
                saveName: `Auto-save Turn ${gameState.currentTurn}`,
                gameState,
                saveType: 'auto'
              });

              room.lastSaveId = saveId;
              room.lastSaveTime = now;

              console.info(`Auto-saved game ${room.id} at turn ${gameState.currentTurn}`);
            }
          }
        }
      } catch (error) {
        console.error('Error in auto-save timer:', error);
      }
    }, AUTO_SAVE_INTERVAL);
  }
}
