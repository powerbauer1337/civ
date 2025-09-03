import request from 'supertest';
import express from 'express';
import { GameController } from '../../src/controllers/GameController';
import { GameManager } from '../../src/game/GameManager';

// Mock the GameManager
const mockGameManager = {
  getGameList: jest.fn(),
  getGameCount: jest.fn(),
  getActivePlayerCount: jest.fn(),
  getGameState: jest.fn()
} as jest.Mocked<Partial<GameManager>>;

describe('GameController', () => {
  let app: express.Express;
  let gameController: GameController;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create app and controller
    app = express();
    app.use(express.json());
    gameController = new GameController(mockGameManager as GameManager);
    app.use('/games', gameController.router);
  });

  describe('Constructor and Basic Functionality', () => {
    test('should create GameController instance', () => {
      expect(gameController).toBeDefined();
      expect(gameController.router).toBeDefined();
    });

    test('should have router with expected routes', () => {
      const routes = gameController.router.stack.map((layer: any) => ({
        method: Object.keys(layer.route.methods)[0],
        path: layer.route.path
      }));
      
      expect(routes).toContainEqual({ method: 'get', path: '/' });
      expect(routes).toContainEqual({ method: 'get', path: '/stats' });
      expect(routes).toContainEqual({ method: 'get', path: '/:gameId' });
      expect(routes).toContainEqual({ method: 'get', path: '/:gameId/state' });
    });
  });

  describe('GET /games', () => {
    test('should handle empty game list', async () => {
      mockGameManager.getGameList!.mockReturnValue([]);

      const response = await request(app)
        .get('/games');

      expect(response.status).toBe(200);
      expect(response.body.games).toBeDefined();
      expect(response.body.games).toHaveLength(0);
      expect(response.body.totalGames).toBe(0);
    });

    test('should return games when available', async () => {
      const mockGames = [
        { id: 'game1', phase: 'active', playerCount: 2, createdAt: new Date().toISOString() }
      ];

      mockGameManager.getGameList!.mockReturnValue(mockGames);

      const response = await request(app)
        .get('/games');

      expect(response.status).toBe(200);
      expect(response.body.games).toBeDefined();
      expect(response.body.totalGames).toBe(1);
      expect(mockGameManager.getGameList).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /games/stats', () => {
    test('should return game statistics', async () => {
      mockGameManager.getGameCount!.mockReturnValue(10);
      mockGameManager.getActivePlayerCount!.mockReturnValue(25);
      mockGameManager.getGameList!.mockReturnValue([
        { id: 'game1', phase: 'active' },
        { id: 'game2', phase: 'lobby' }
      ]);

      const response = await request(app)
        .get('/games/stats');

      expect(response.status).toBe(200);
      expect(response.body.totalGames).toBe(10);
      expect(response.body.totalPlayers).toBe(25);
      expect(response.body.gamesByPhase).toBeDefined();
      expect(response.body.uptime).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /games/:gameId/state', () => {
    test('should return game state when game exists', async () => {
      const mockGameState = {
        gameId: 'game123',
        currentPlayer: 'player1',
        turn: 5,
        phase: 'active',
        serialize: jest.fn().mockReturnValue({
          gameId: 'game123',
          currentPlayer: 'player1',
          turn: 5,
          phase: 'active'
        })
      };

      mockGameManager.getGameState!.mockReturnValue(mockGameState);

      const response = await request(app)
        .get('/games/game123/state');

      expect(response.status).toBe(200);
      expect(response.body.gameState).toBeDefined();
      expect(response.body.gameState.gameId).toBe('game123');
      expect(mockGameManager.getGameState).toHaveBeenCalledWith('game123');
      expect(mockGameState.serialize).toHaveBeenCalled();
    });

    test('should return 404 when game does not exist', async () => {
      mockGameManager.getGameState!.mockReturnValue(null);

      const response = await request(app)
        .get('/games/nonexistent/state');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Game not found');
    });
  });

  describe('Error Handling', () => {
    test('should handle GameManager errors gracefully in getGameList', async () => {
      mockGameManager.getGameList!.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app)
        .get('/games');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    test('should handle GameManager errors gracefully in getGameStats', async () => {
      mockGameManager.getGameCount!.mockImplementation(() => {
        throw new Error('Stats calculation failed');
      });

      const response = await request(app)
        .get('/games/stats');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });
});