import { GameService } from '../../src/services/GameService';
import { CreateGameRequest, JoinGameRequest } from '../../src/types/game';

describe('GameService', () => {
  let gameService: GameService;

  beforeEach(() => {
    gameService = new GameService();
  });

  describe('Game Creation', () => {
    test('should create a game with valid request', () => {
      const request: CreateGameRequest = {
        name: 'Test Game',
        maxPlayers: 4
      };

      const game = gameService.createGame(request);

      expect(game.id).toMatch(/^game_\d+$/);
      expect(game.name).toBe('Test Game');
      expect(game.status).toBe('waiting');
      expect(game.players).toEqual([]);
      expect(game.maxPlayers).toBe(4);
      expect(game.currentTurn).toBe(0);
      expect(game.createdAt).toBeInstanceOf(Date);
      expect(game.lastActivity).toBeInstanceOf(Date);
    });

    test('should trim game name when creating', () => {
      const request: CreateGameRequest = {
        name: '  Spaced Game  ',
        maxPlayers: 2
      };

      const game = gameService.createGame(request);
      expect(game.name).toBe('Spaced Game');
    });

    test('should throw error when game name is empty', () => {
      const request: CreateGameRequest = {
        name: '',
        maxPlayers: 4
      };

      expect(() => gameService.createGame(request)).toThrow('Game name is required');
    });

    test('should throw error when game name is only whitespace', () => {
      const request: CreateGameRequest = {
        name: '   ',
        maxPlayers: 4
      };

      expect(() => gameService.createGame(request)).toThrow('Game name is required');
    });

    test('should enforce minimum maxPlayers of 2', () => {
      const request: CreateGameRequest = {
        name: 'Small Game',
        maxPlayers: 1
      };

      const game = gameService.createGame(request);
      expect(game.maxPlayers).toBe(2);
    });

    test('should enforce maximum maxPlayers of 8', () => {
      const request: CreateGameRequest = {
        name: 'Large Game',
        maxPlayers: 10
      };

      const game = gameService.createGame(request);
      expect(game.maxPlayers).toBe(8);
    });

    test('should default to 4 maxPlayers if not specified', () => {
      const request: CreateGameRequest = {
        name: 'Default Game'
      };

      const game = gameService.createGame(request);
      expect(game.maxPlayers).toBe(4);
    });
  });

  describe('Game Retrieval', () => {
    test('should retrieve existing game', () => {
      const request: CreateGameRequest = {
        name: 'Retrievable Game',
        maxPlayers: 6
      };

      const createdGame = gameService.createGame(request);
      const retrievedGame = gameService.getGame(createdGame.id);

      expect(retrievedGame).toBeDefined();
      expect(retrievedGame!.id).toBe(createdGame.id);
      expect(retrievedGame!.name).toBe('Retrievable Game');
    });

    test('should return undefined for non-existent game', () => {
      const retrievedGame = gameService.getGame('non-existent-id');
      expect(retrievedGame).toBeUndefined();
    });
  });

  describe('Game State Management', () => {
    test('should handle multiple games independently', async () => {
      const request1: CreateGameRequest = {
        name: 'Game One',
        maxPlayers: 2
      };

      const request2: CreateGameRequest = {
        name: 'Game Two',
        maxPlayers: 4
      };

      const game1 = gameService.createGame(request1);
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 2));
      const game2 = gameService.createGame(request2);

      expect(game1.id).not.toBe(game2.id);
      expect(game1.name).toBe('Game One');
      expect(game2.name).toBe('Game Two');
      expect(game1.maxPlayers).toBe(2);
      expect(game2.maxPlayers).toBe(4);

      // Verify both games are independently accessible
      expect(gameService.getGame(game1.id)!.name).toBe('Game One');
      expect(gameService.getGame(game2.id)!.name).toBe('Game Two');
    });

    test('should generate unique game IDs', async () => {
      const gameIds = new Set<string>();
      
      // Create multiple games with slight delays to ensure unique timestamps
      for (let i = 0; i < 5; i++) {
        const game = gameService.createGame({
          name: `Game ${i}`,
          maxPlayers: 4
        });
        
        expect(gameIds.has(game.id)).toBe(false);
        gameIds.add(game.id);
        
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 2));
      }
      
      expect(gameIds.size).toBe(5);
    });
  });
});