import { SaveLoadHandlers } from '../../src/handlers/saveLoadHandlers';
import { GamePersistence } from '../../src/database/GamePersistence';
import { GameManager } from '../../src/game/GameManager';
import { Socket } from 'socket.io';
import { GameState } from '../../src/shared-types';

// Mock dependencies
jest.mock('../../src/database/GamePersistence');
jest.mock('../../src/game/GameManager');

describe('SaveLoadHandlers', () => {
  let saveLoadHandlers: SaveLoadHandlers;
  let mockGamePersistence: jest.Mocked<GamePersistence>;
  let mockGameManager: jest.Mocked<GameManager>;
  let mockSocket: jest.Mocked<Socket>;

  // Test data
  const testGameId = 'test-game-123';
  const testPlayerId = 'player-456';
  const testSaveId = 'save-789';
  const testSaveName = 'Test Save';
  
  const mockGameState: GameState = {
    currentTurn: 5,
    players: [
      { id: testPlayerId, username: 'TestPlayer', civilization: 'Romans', isActive: true, isAI: false }
    ],
    board: [
      [{ type: 'grassland', resource: null, unit: null, improvement: null }],
      [{ type: 'plains', resource: null, unit: null, improvement: null }]
    ],
    winner: null,
    gamePhase: 'playing'
  };

  // Separate mock for autosave tests that need object-style players
  const mockGameStateForAutosave: GameState = {
    currentTurn: 5,
    players: { [testPlayerId]: { id: testPlayerId, username: 'TestPlayer' } },
    board: [
      [{ type: 'grassland', resource: null, unit: null, improvement: null }],
      [{ type: 'plains', resource: null, unit: null, improvement: null }]
    ],
    winner: null,
    gamePhase: 'playing'
  } as any;

  const mockRoom = {
    id: testGameId,
    name: 'Test Game',
    players: new Map([[testPlayerId, { id: testPlayerId, username: 'TestPlayer' }]]),
    gameState: mockGameState,
    status: 'in_progress',
    lastSaveId: null,
    lastSaveTime: null,
    maxPlayers: 4
  };

  beforeEach(() => {
    // Create mocks
    mockGamePersistence = new GamePersistence('') as jest.Mocked<GamePersistence>;
    mockGameManager = new GameManager() as jest.Mocked<GameManager>;
    
    // Create mock socket
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
      join: jest.fn()
    } as any;

    // Setup GameManager mocks
    mockGameManager.getRoom = jest.fn();
    mockGameManager.createRoom = jest.fn();
    mockGameManager.getActiveRooms = jest.fn();

    // Create instance
    saveLoadHandlers = new SaveLoadHandlers(mockGamePersistence, mockGameManager);
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance with dependencies', () => {
      expect(saveLoadHandlers).toBeInstanceOf(SaveLoadHandlers);
      expect(saveLoadHandlers['gamePersistence']).toBe(mockGamePersistence);
      expect(saveLoadHandlers['gameManager']).toBe(mockGameManager);
    });
  });

  describe('registerHandlers', () => {
    beforeEach(() => {
      saveLoadHandlers.registerHandlers(mockSocket);
    });

    it('should register all socket event handlers', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('save_game', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('load_game', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('get_saves', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('delete_save', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('request_autosave', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('get_player_stats', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('get_leaderboard', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledTimes(7);
    });

    describe('save_game handler', () => {
      let saveGameHandler: Function;

      beforeEach(() => {
        const mockOnCalls = mockSocket.on as jest.Mock;
        saveGameHandler = mockOnCalls.mock.calls.find(call => call[0] === 'save_game')[1];
      });

      it('should save game successfully', async () => {
        const saveData = {
          gameId: testGameId,
          saveName: testSaveName,
          saveType: 'manual',
          playerId: testPlayerId,
          gameState: mockGameState
        };

        mockGameManager.getRoom.mockReturnValue(mockRoom as any);
        mockGamePersistence.saveGame.mockResolvedValue(testSaveId);

        await saveGameHandler(saveData);

        expect(mockGamePersistence.saveGame).toHaveBeenCalledWith({
          gameId: testGameId,
          playerId: testPlayerId,
          saveName: testSaveName,
          gameState: mockGameState,
          saveType: 'manual'
        });
        expect(mockSocket.emit).toHaveBeenCalledWith('game_saved', {
          saveId: testSaveId,
          message: 'Game saved successfully'
        });
        expect(mockRoom.lastSaveId).toBe(testSaveId);
        expect(mockRoom.lastSaveTime).toBeInstanceOf(Date);
      });

      it('should emit error for missing required fields', async () => {
        const incompleteData = { gameId: testGameId };

        await saveGameHandler(incompleteData);

        expect(mockSocket.emit).toHaveBeenCalledWith('save_error', {
          message: 'Missing required fields'
        });
        expect(mockGamePersistence.saveGame).not.toHaveBeenCalled();
      });

      it('should emit error when game not found', async () => {
        const saveData = {
          gameId: testGameId,
          saveName: testSaveName,
          playerId: testPlayerId
        };

        mockGameManager.getRoom.mockReturnValue(null);

        await saveGameHandler(saveData);

        expect(mockSocket.emit).toHaveBeenCalledWith('save_error', {
          message: 'Game not found'
        });
        expect(mockGamePersistence.saveGame).not.toHaveBeenCalled();
      });

      it('should emit error when player not in game', async () => {
        const saveData = {
          gameId: testGameId,
          saveName: testSaveName,
          playerId: 'unauthorized-player'
        };

        mockGameManager.getRoom.mockReturnValue(mockRoom as any);

        await saveGameHandler(saveData);

        expect(mockSocket.emit).toHaveBeenCalledWith('save_error', {
          message: 'Player not in this game'
        });
        expect(mockGamePersistence.saveGame).not.toHaveBeenCalled();
      });

      it('should use room game state when not provided', async () => {
        const saveData = {
          gameId: testGameId,
          saveName: testSaveName,
          playerId: testPlayerId
        };

        mockGameManager.getRoom.mockReturnValue(mockRoom as any);
        mockGamePersistence.saveGame.mockResolvedValue(testSaveId);

        await saveGameHandler(saveData);

        expect(mockGamePersistence.saveGame).toHaveBeenCalledWith({
          gameId: testGameId,
          playerId: testPlayerId,
          saveName: testSaveName,
          gameState: mockGameState,
          saveType: 'manual'
        });
      });

      it('should handle save errors gracefully', async () => {
        const saveData = {
          gameId: testGameId,
          saveName: testSaveName,
          playerId: testPlayerId
        };

        mockGameManager.getRoom.mockReturnValue(mockRoom as any);
        mockGamePersistence.saveGame.mockRejectedValue(new Error('Database error'));

        await saveGameHandler(saveData);

        expect(mockSocket.emit).toHaveBeenCalledWith('save_error', {
          message: 'Database error'
        });
      });

      it('should notify other players when game is saved', async () => {
        const saveData = {
          gameId: testGameId,
          saveName: testSaveName,
          playerId: testPlayerId
        };

        const mockTo = jest.fn(() => ({ emit: jest.fn() }));
        mockSocket.to = mockTo as any;

        mockGameManager.getRoom.mockReturnValue(mockRoom as any);
        mockGamePersistence.saveGame.mockResolvedValue(testSaveId);

        await saveGameHandler(saveData);

        expect(mockSocket.to).toHaveBeenCalledWith(testGameId);
      });
    });

    describe('load_game handler', () => {
      let loadGameHandler: Function;

      beforeEach(() => {
        const mockOnCalls = mockSocket.on as jest.Mock;
        loadGameHandler = mockOnCalls.mock.calls.find(call => call[0] === 'load_game')[1];
      });

      const mockSavedGame = {
        ...mockGameState,
        players: { [testPlayerId]: { id: testPlayerId, username: 'TestPlayer' } }
      };

      const mockSaveMetadata = {
        id: testSaveId,
        game_id: testGameId,
        save_name: testSaveName,
        game_mode: 'multiplayer'
      };

      it('should load game successfully', async () => {
        const loadData = {
          saveId: testSaveId,
          gameId: testGameId,
          playerId: testPlayerId
        };

        mockGamePersistence.loadGame.mockResolvedValue(mockSavedGame);
        mockGamePersistence.getSavedGames.mockResolvedValue([mockSaveMetadata] as any);
        mockGameManager.getRoom.mockReturnValue(mockRoom as any);

        await loadGameHandler(loadData);

        expect(mockGamePersistence.loadGame).toHaveBeenCalledWith({
          saveId: testSaveId,
          playerId: testPlayerId
        });
        expect(mockSocket.emit).toHaveBeenCalledWith('game_loaded', {
          gameState: mockSavedGame,
          gameId: testGameId,
          roomInfo: expect.objectContaining({
            id: testGameId,
            name: 'Test Game'
          })
        });
        expect(mockSocket.join).toHaveBeenCalledWith(testGameId);
      });

      it('should emit error for missing required fields', async () => {
        const incompleteData = { gameId: testGameId };

        await loadGameHandler(incompleteData);

        expect(mockSocket.emit).toHaveBeenCalledWith('load_error', {
          message: 'Missing required fields'
        });
        expect(mockGamePersistence.loadGame).not.toHaveBeenCalled();
      });

      it('should emit error when save not found', async () => {
        const loadData = {
          saveId: testSaveId,
          playerId: testPlayerId
        };

        mockGamePersistence.loadGame.mockResolvedValue(null);

        await loadGameHandler(loadData);

        expect(mockSocket.emit).toHaveBeenCalledWith('load_error', {
          message: 'Save not found'
        });
      });

      it('should emit error when access denied to save', async () => {
        const loadData = {
          saveId: testSaveId,
          playerId: testPlayerId
        };

        mockGamePersistence.loadGame.mockResolvedValue(mockSavedGame);
        mockGamePersistence.getSavedGames.mockResolvedValue([]);

        await loadGameHandler(loadData);

        expect(mockSocket.emit).toHaveBeenCalledWith('load_error', {
          message: 'Access denied to this save'
        });
      });

      it('should create new room when none exists', async () => {
        const loadData = {
          saveId: testSaveId,
          playerId: testPlayerId
        };

        const newRoom = { ...mockRoom, id: 'new-room-id' };
        
        mockGamePersistence.loadGame.mockResolvedValue(mockSavedGame);
        mockGamePersistence.getSavedGames.mockResolvedValue([mockSaveMetadata] as any);
        mockGameManager.getRoom.mockReturnValue(null);
        mockGameManager.createRoom.mockResolvedValue(newRoom as any);

        await loadGameHandler(loadData);

        expect(mockGameManager.createRoom).toHaveBeenCalledWith({
          name: `Loaded: ${testSaveName}`,
          maxPlayers: 1, // Object.keys(savedGame.players).length
          gameMode: 'multiplayer',
          mapSize: {
            width: 1, // savedGame.board[0].length
            height: 2  // savedGame.board.length
          }
        });
        expect(newRoom.gameState).toBe(mockSavedGame);
        expect(newRoom.status).toBe('in_progress');
      });

      it('should handle load errors gracefully', async () => {
        const loadData = {
          saveId: testSaveId,
          playerId: testPlayerId
        };

        mockGamePersistence.loadGame.mockRejectedValue(new Error('Database error'));

        await loadGameHandler(loadData);

        expect(mockSocket.emit).toHaveBeenCalledWith('load_error', {
          message: 'Database error'
        });
      });
    });

    describe('get_saves handler', () => {
      let getSavesHandler: Function;

      beforeEach(() => {
        const mockOnCalls = mockSocket.on as jest.Mock;
        getSavesHandler = mockOnCalls.mock.calls.find(call => call[0] === 'get_saves')[1];
      });

      it('should return formatted saves list', async () => {
        const mockSaves = [{
          id: testSaveId,
          gameId: testGameId,
          saveName: testSaveName,
          turnNumber: 5,
          saveType: 'manual',
          createdAt: new Date(),
          compressedSize: 1024,
          gameName: 'Test Game',
          status: 'completed',
          gameMode: 'multiplayer',
          difficulty: 'normal'
        }];

        mockGamePersistence.getSavedGames.mockResolvedValue(mockSaves as any);

        await getSavesHandler({ playerId: testPlayerId });

        expect(mockGamePersistence.getSavedGames).toHaveBeenCalledWith(testPlayerId);
        expect(mockSocket.emit).toHaveBeenCalledWith('saves_list', {
          saves: expect.arrayContaining([
            expect.objectContaining({
              id: testSaveId,
              gameId: testGameId,
              saveName: testSaveName,
              fileSize: 1024
            })
          ])
        });
      });

      it('should emit error for missing player ID', async () => {
        await getSavesHandler({});

        expect(mockSocket.emit).toHaveBeenCalledWith('error', {
          message: 'Player ID required'
        });
        expect(mockGamePersistence.getSavedGames).not.toHaveBeenCalled();
      });

      it('should handle get saves errors gracefully', async () => {
        mockGamePersistence.getSavedGames.mockRejectedValue(new Error('Database error'));

        await getSavesHandler({ playerId: testPlayerId });

        expect(mockSocket.emit).toHaveBeenCalledWith('error', {
          message: 'Database error'
        });
      });
    });

    describe('delete_save handler', () => {
      let deleteSaveHandler: Function;

      beforeEach(() => {
        const mockOnCalls = mockSocket.on as jest.Mock;
        deleteSaveHandler = mockOnCalls.mock.calls.find(call => call[0] === 'delete_save')[1];
      });

      it('should delete save successfully', async () => {
        const deleteData = {
          saveId: testSaveId,
          playerId: testPlayerId
        };

        const mockSaves = [{ id: testSaveId }];
        mockGamePersistence.getSavedGames.mockResolvedValue(mockSaves as any);
        mockGamePersistence.deleteSave.mockResolvedValue(undefined);

        await deleteSaveHandler(deleteData);

        expect(mockGamePersistence.deleteSave).toHaveBeenCalledWith(testSaveId, testPlayerId);
        expect(mockSocket.emit).toHaveBeenCalledWith('save_deleted', { saveId: testSaveId });
      });

      it('should emit error for missing required fields', async () => {
        const incompleteData = { saveId: testSaveId };

        await deleteSaveHandler(incompleteData);

        expect(mockSocket.emit).toHaveBeenCalledWith('error', {
          message: 'Missing required fields'
        });
        expect(mockGamePersistence.deleteSave).not.toHaveBeenCalled();
      });

      it('should emit error when player does not own save', async () => {
        const deleteData = {
          saveId: testSaveId,
          playerId: testPlayerId
        };

        mockGamePersistence.getSavedGames.mockResolvedValue([]);

        await deleteSaveHandler(deleteData);

        expect(mockSocket.emit).toHaveBeenCalledWith('error', {
          message: 'Cannot delete this save'
        });
        expect(mockGamePersistence.deleteSave).not.toHaveBeenCalled();
      });

      it('should handle delete errors gracefully', async () => {
        const deleteData = {
          saveId: testSaveId,
          playerId: testPlayerId
        };

        const mockSaves = [{ id: testSaveId }];
        mockGamePersistence.getSavedGames.mockResolvedValue(mockSaves as any);
        mockGamePersistence.deleteSave.mockRejectedValue(new Error('Database error'));

        await deleteSaveHandler(deleteData);

        expect(mockSocket.emit).toHaveBeenCalledWith('error', {
          message: 'Database error'
        });
      });
    });

    describe('request_autosave handler', () => {
      let autosaveHandler: Function;

      beforeEach(() => {
        const mockOnCalls = mockSocket.on as jest.Mock;
        autosaveHandler = mockOnCalls.mock.calls.find(call => call[0] === 'request_autosave')[1];
      });

      it('should perform autosave successfully', async () => {
        const autosaveData = { gameId: testGameId };
        const roomWithOldSave = {
          ...mockRoom,
          gameState: mockGameStateForAutosave,
          lastSaveTime: new Date(Date.now() - 6 * 60 * 1000) // 6 minutes ago
        };

        mockGameManager.getRoom.mockReturnValue(roomWithOldSave as any);
        mockGamePersistence.saveGame.mockResolvedValue(testSaveId);

        await autosaveHandler(autosaveData);

        expect(mockGamePersistence.saveGame).toHaveBeenCalledWith({
          gameId: testGameId,
          playerId: testPlayerId,
          saveName: 'Auto-save Turn 5',
          gameState: mockGameStateForAutosave,
          saveType: 'auto'
        });
        expect(roomWithOldSave.lastSaveId).toBe(testSaveId);
      });

      it('should skip autosave when no game ID provided', async () => {
        await autosaveHandler({});

        expect(mockGameManager.getRoom).not.toHaveBeenCalled();
        expect(mockGamePersistence.saveGame).not.toHaveBeenCalled();
      });

      it('should skip autosave when game not found', async () => {
        const autosaveData = { gameId: testGameId };

        mockGameManager.getRoom.mockReturnValue(null);

        await autosaveHandler(autosaveData);

        expect(mockGamePersistence.saveGame).not.toHaveBeenCalled();
      });

      it('should skip autosave when game not in progress', async () => {
        const autosaveData = { gameId: testGameId };
        const pausedRoom = { ...mockRoom, status: 'paused' };

        mockGameManager.getRoom.mockReturnValue(pausedRoom as any);

        await autosaveHandler(autosaveData);

        expect(mockGamePersistence.saveGame).not.toHaveBeenCalled();
      });

      it('should skip autosave when not enough time passed', async () => {
        const autosaveData = { gameId: testGameId };
        const recentRoom = {
          ...mockRoom,
          lastSaveTime: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
        };

        mockGameManager.getRoom.mockReturnValue(recentRoom as any);

        await autosaveHandler(autosaveData);

        expect(mockGamePersistence.saveGame).not.toHaveBeenCalled();
      });

      it('should handle autosave errors gracefully', async () => {
        const autosaveData = { gameId: testGameId };
        const roomWithOldSave = {
          ...mockRoom,
          lastSaveTime: new Date(Date.now() - 6 * 60 * 1000)
        };

        mockGameManager.getRoom.mockReturnValue(roomWithOldSave as any);
        mockGamePersistence.saveGame.mockRejectedValue(new Error('Database error'));

        await autosaveHandler(autosaveData);

        // Should not throw error, just log it
        expect(true).toBe(true); // Test passes if no exception thrown
      });
    });

    describe('get_player_stats handler', () => {
      let getStatsHandler: Function;

      beforeEach(() => {
        const mockOnCalls = mockSocket.on as jest.Mock;
        getStatsHandler = mockOnCalls.mock.calls.find(call => call[0] === 'get_player_stats')[1];
      });

      it('should return player stats successfully', async () => {
        const mockStats = {
          playerId: testPlayerId,
          totalGames: 10,
          gamesWon: 6,
          winRate: 60
        };

        mockGamePersistence.getPlayerStats.mockResolvedValue(mockStats as any);

        await getStatsHandler({ playerId: testPlayerId });

        expect(mockGamePersistence.getPlayerStats).toHaveBeenCalledWith(testPlayerId);
        expect(mockSocket.emit).toHaveBeenCalledWith('player_stats', { stats: mockStats });
      });

      it('should emit error for missing player ID', async () => {
        await getStatsHandler({});

        expect(mockSocket.emit).toHaveBeenCalledWith('error', {
          message: 'Player ID required'
        });
        expect(mockGamePersistence.getPlayerStats).not.toHaveBeenCalled();
      });

      it('should handle stats errors gracefully', async () => {
        mockGamePersistence.getPlayerStats.mockRejectedValue(new Error('Database error'));

        await getStatsHandler({ playerId: testPlayerId });

        expect(mockSocket.emit).toHaveBeenCalledWith('error', {
          message: 'Database error'
        });
      });
    });

    describe('get_leaderboard handler', () => {
      let getLeaderboardHandler: Function;

      beforeEach(() => {
        const mockOnCalls = mockSocket.on as jest.Mock;
        getLeaderboardHandler = mockOnCalls.mock.calls.find(call => call[0] === 'get_leaderboard')[1];
      });

      it('should return leaderboard successfully', async () => {
        const mockLeaderboard = [
          { playerId: testPlayerId, username: 'Player1', winRate: 80 },
          { playerId: 'player2', username: 'Player2', winRate: 70 }
        ];

        mockGamePersistence.getLeaderboard.mockResolvedValue(mockLeaderboard as any);

        await getLeaderboardHandler({ limit: 10, offset: 0 });

        expect(mockGamePersistence.getLeaderboard).toHaveBeenCalled();
        expect(mockSocket.emit).toHaveBeenCalledWith('leaderboard', { leaderboard: mockLeaderboard });
      });

      it('should handle leaderboard with default parameters', async () => {
        const mockLeaderboard = [];
        mockGamePersistence.getLeaderboard.mockResolvedValue(mockLeaderboard as any);

        await getLeaderboardHandler({});

        expect(mockGamePersistence.getLeaderboard).toHaveBeenCalled();
        expect(mockSocket.emit).toHaveBeenCalledWith('leaderboard', { leaderboard: mockLeaderboard });
      });

      it('should handle leaderboard errors gracefully', async () => {
        mockGamePersistence.getLeaderboard.mockRejectedValue(new Error('Database error'));

        await getLeaderboardHandler({});

        expect(mockSocket.emit).toHaveBeenCalledWith('error', {
          message: 'Database error'
        });
      });
    });
  });

  describe('setupAutoSave', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should setup auto-save interval', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      
      saveLoadHandlers.setupAutoSave();

      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        5 * 60 * 1000 // 5 minutes
      );
    });

    it('should auto-save active games when interval triggers', () => {
      const oldRoom = {
        ...mockRoom,
        gameState: mockGameStateForAutosave,
        status: 'in_progress',
        lastSaveTime: new Date(Date.now() - 6 * 60 * 1000) // 6 minutes ago
      };

      mockGameManager.getActiveRooms.mockReturnValue([oldRoom] as any);
      mockGamePersistence.saveGame.mockResolvedValue(testSaveId);

      saveLoadHandlers.setupAutoSave();

      // Fast-forward time to trigger interval
      jest.advanceTimersByTime(5 * 60 * 1000);

      // Run pending timers
      jest.runOnlyPendingTimers();

      expect(mockGamePersistence.saveGame).toHaveBeenCalledWith({
        gameId: testGameId,
        playerId: testPlayerId,
        saveName: 'Auto-save Turn 5',
        gameState: mockGameStateForAutosave,
        saveType: 'auto'
      });
    });

    it('should skip rooms not in progress', () => {
      const pausedRoom = { ...mockRoom, status: 'paused' };
      mockGameManager.getActiveRooms.mockReturnValue([pausedRoom] as any);

      saveLoadHandlers.setupAutoSave();
      jest.advanceTimersByTime(5 * 60 * 1000);
      jest.runOnlyPendingTimers();

      expect(mockGamePersistence.saveGame).not.toHaveBeenCalled();
    });

    it('should skip rooms with recent saves', () => {
      const recentRoom = {
        ...mockRoom,
        lastSaveTime: new Date(Date.now() - 2 * 60 * 1000) // 2 minutes ago
      };
      mockGameManager.getActiveRooms.mockReturnValue([recentRoom] as any);

      saveLoadHandlers.setupAutoSave();
      jest.advanceTimersByTime(5 * 60 * 1000);
      jest.runOnlyPendingTimers();

      expect(mockGamePersistence.saveGame).not.toHaveBeenCalled();
    });

    it('should skip rooms without host player', () => {
      const roomWithoutPlayers = {
        ...mockRoom,
        players: new Map(),
        lastSaveTime: new Date(Date.now() - 6 * 60 * 1000)
      };
      mockGameManager.getActiveRooms.mockReturnValue([roomWithoutPlayers] as any);

      saveLoadHandlers.setupAutoSave();
      jest.advanceTimersByTime(5 * 60 * 1000);
      jest.runOnlyPendingTimers();

      expect(mockGamePersistence.saveGame).not.toHaveBeenCalled();
    });

    it('should handle auto-save errors gracefully', () => {
      const errorRoom = {
        ...mockRoom,
        gameState: mockGameStateForAutosave,
        lastSaveTime: new Date(Date.now() - 6 * 60 * 1000)
      };
      mockGameManager.getActiveRooms.mockReturnValue([errorRoom] as any);
      mockGamePersistence.saveGame.mockRejectedValue(new Error('Database error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      saveLoadHandlers.setupAutoSave();
      jest.advanceTimersByTime(5 * 60 * 1000);
      jest.runOnlyPendingTimers();

      expect(consoleSpy).toHaveBeenCalledWith('Error in auto-save timer:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});