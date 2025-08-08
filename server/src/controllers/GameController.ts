import { Router, Request, Response } from 'express';
import { GameManager } from '../game/GameManager';
import { GameConfig, VictoryType, ResourceType } from '../shared-types';

export class GameController {
  public router: Router;
  private gameManager: GameManager;

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager;
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.get('/', this.getGameList.bind(this));
    this.router.get('/stats', this.getGameStats.bind(this));
    this.router.get('/:gameId', this.getGameDetails.bind(this));
    this.router.get('/:gameId/state', this.getGameState.bind(this));
    this.router.post('/config/validate', this.validateGameConfig.bind(this));
    this.router.delete('/cleanup-test-games', this.cleanupTestGames.bind(this));
    this.router.delete('/cleanup-old-games', this.cleanupOldGames.bind(this));
  }

  private getGameList(req: Request, res: Response): void {
    try {
      const { page = '1', limit = '10', filter = 'all', hideTestGames = 'false' } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const hideTest = hideTestGames === 'true';
      
      let games = this.gameManager.getGameList();
      
      // Filter out test games if requested
      if (hideTest) {
        games = games.filter(game => 
          !this.isTestGame(game.id) && 
          !game.id.includes('test') && 
          !game.id.includes('perf')
        );
      }
      
      // Apply status filter
      if (filter !== 'all') {
        games = games.filter(game => {
          switch (filter) {
            case 'active': return game.phase === 'active';
            case 'waiting': return game.phase === 'lobby';
            case 'ended': return game.phase === 'ended';
            default: return true;
          }
        });
      }
      
      // Sort by creation date (newest first)
      games.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Apply pagination
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedGames = games.slice(startIndex, endIndex);
      
      res.json({
        games: paginatedGames.map(game => ({
          id: game.id,
          name: this.getGameName(game.id),
          playerCount: game.playerCount,
          maxPlayers: 8, // Would need to get from game config
          phase: game.phase,
          status: this.mapPhaseToStatus(game.phase),
          createdAt: game.createdAt,
          joinable: game.phase === 'lobby' && game.playerCount < 8,
          currentTurn: this.getGameTurn(game.id) || 1,
          isTestGame: this.isTestGame(game.id)
        })),
        totalGames: games.length,
        currentPage: pageNum,
        totalPages: Math.ceil(games.length / limitNum),
        hasMore: endIndex < games.length
      });
    } catch (error) {
      console.error('Error getting game list:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private getGameStats(req: Request, res: Response): void {
    try {
      const gameCount = this.gameManager.getGameCount();
      const playerCount = this.gameManager.getActivePlayerCount();
      const gameList = this.gameManager.getGameList();
      
      const gamesByPhase = gameList.reduce((acc, game) => {
        acc[game.phase] = (acc[game.phase] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const averagePlayersPerGame = gameCount > 0 ? playerCount / gameCount : 0;

      res.json({
        totalGames: gameCount,
        totalPlayers: playerCount,
        averagePlayersPerGame: Number(averagePlayersPerGame.toFixed(1)),
        gamesByPhase,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting game stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private getGameDetails(req: Request, res: Response): void {
    try {
      const { gameId } = req.params;
      const gameState = this.gameManager.getGameState(gameId);

      if (!gameState) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      // Return public game information (no sensitive data)
      res.json({
        id: gameState.id,
        phase: gameState.phase,
        currentTurn: gameState.currentTurn,
        playerCount: gameState.players.length,
        maxPlayers: gameState.config.maxPlayers,
        mapSize: gameState.config.mapSize,
        victoryConditions: gameState.config.victoryConditions,
        turnTimeLimit: gameState.config.turnTimeLimit,
        createdAt: gameState.createdAt,
        lastUpdate: gameState.lastUpdate,
        players: gameState.players.map((p: any) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          civilization: p.civilization,
          isActive: p.isActive,
          score: p.score
        }))
      });
    } catch (error) {
      console.error('Error getting game details:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private getGameState(req: Request, res: Response): void {
    try {
      const { gameId } = req.params;
      const gameState = this.gameManager.getGameState(gameId);

      if (!gameState) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      // For REST API, return full serialized game state
      // In a real app, you might want to filter based on requesting player
      res.json({
        gameState: gameState.serialize()
      });
    } catch (error) {
      console.error('Error getting game state:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private validateGameConfig(req: Request, res: Response): void {
    try {
      const config: GameConfig = req.body;
      const validation = this.performGameConfigValidation(config);

      res.json({
        valid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings
      });
    } catch (error) {
      console.error('Error validating game config:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  private performGameConfigValidation(config: GameConfig): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!config.mapSize) {
      errors.push('Map size is required');
    } else {
      if (config.mapSize.width < 10 || config.mapSize.width > 100) {
        errors.push('Map width must be between 10 and 100');
      }
      if (config.mapSize.height < 10 || config.mapSize.height > 100) {
        errors.push('Map height must be between 10 and 100');
      }
      if (config.mapSize.width * config.mapSize.height > 5000) {
        warnings.push('Large maps may impact performance');
      }
    }

    if (!config.maxPlayers) {
      errors.push('Maximum players is required');
    } else if (config.maxPlayers < 2 || config.maxPlayers > 8) {
      errors.push('Maximum players must be between 2 and 8');
    }

    if (config.turnTimeLimit !== undefined) {
      if (config.turnTimeLimit < 0) {
        errors.push('Turn time limit cannot be negative');
      } else if (config.turnTimeLimit > 0 && config.turnTimeLimit < 30) {
        warnings.push('Very short turn time limits may frustrate players');
      } else if (config.turnTimeLimit > 600) {
        warnings.push('Long turn time limits may make games drag');
      }
    }

    if (!config.victoryConditions || config.victoryConditions.length === 0) {
      errors.push('At least one victory condition is required');
    } else {
      const validVictoryTypes = Object.values(VictoryType);
      for (const victory of config.victoryConditions) {
        if (!validVictoryTypes.includes(victory)) {
          errors.push(`Invalid victory condition: ${victory}`);
        }
      }
    }

    if (!config.startingResources) {
      errors.push('Starting resources configuration is required');
    } else {
      const resourceTypes = Object.values(ResourceType);
      for (const resourceType of resourceTypes) {
        if (config.startingResources[resourceType] === undefined) {
          errors.push(`Starting ${resourceType} amount is required`);
        } else if (config.startingResources[resourceType] < 0) {
          errors.push(`Starting ${resourceType} cannot be negative`);
        } else if (config.startingResources[resourceType] > 1000) {
          warnings.push(`Starting ${resourceType} amount seems very high`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private cleanupTestGames(req: Request, res: Response): void {
    try {
      console.log('Starting cleanup of test games...');
      
      const beforeCount = this.gameManager.getGameCount();
      const removedGames = this.gameManager.cleanupTestGames();
      const afterCount = this.gameManager.getGameCount();
      
      console.log(`Test games cleanup completed. Removed ${removedGames.length} games.`);
      
      res.json({
        success: true,
        message: `Successfully removed ${removedGames.length} test games`,
        removedGames: removedGames.map(id => ({ id, name: this.getGameName(id) })),
        gameCountBefore: beforeCount,
        gameCountAfter: afterCount
      });
    } catch (error) {
      console.error('Error cleaning up test games:', error);
      res.status(500).json({ error: 'Failed to cleanup test games' });
    }
  }

  private cleanupOldGames(req: Request, res: Response): void {
    try {
      const { olderThanHours = '24' } = req.query;
      const hours = parseInt(olderThanHours as string);
      
      console.log(`Starting cleanup of games older than ${hours} hours...`);
      
      const beforeCount = this.gameManager.getGameCount();
      const removedGames = this.gameManager.cleanupOldGames(hours);
      const afterCount = this.gameManager.getGameCount();
      
      console.log(`Old games cleanup completed. Removed ${removedGames.length} games.`);
      
      res.json({
        success: true,
        message: `Successfully removed ${removedGames.length} games older than ${hours} hours`,
        removedGames: removedGames.map(id => ({ id, name: this.getGameName(id) })),
        gameCountBefore: beforeCount,
        gameCountAfter: afterCount,
        hoursThreshold: hours
      });
    } catch (error) {
      console.error('Error cleaning up old games:', error);
      res.status(500).json({ error: 'Failed to cleanup old games' });
    }
  }

  private isTestGame(gameId: string): boolean {
    const testPatterns = [
      'test',
      'perf',
      'performance',
      'load',
      'benchmark',
      'demo',
      'sample'
    ];
    
    const lowerGameId = gameId.toLowerCase();
    return testPatterns.some(pattern => lowerGameId.includes(pattern));
  }

  private getGameName(gameId: string): string {
    // Try to get the actual game name from the game state
    const gameState = this.gameManager.getGameState(gameId);
    if (gameState && (gameState as any).name) {
      return (gameState as any).name;
    }
    
    // Fallback to generating a display name from ID
    if (this.isTestGame(gameId)) {
      return `Test Game (${gameId.substring(0, 8)})`;
    }
    
    return `Game ${gameId.substring(0, 8)}`;
  }

  private mapPhaseToStatus(phase: string): string {
    switch (phase) {
      case 'lobby': return 'waiting';
      case 'active': return 'active';
      case 'ended': return 'ended';
      default: return 'unknown';
    }
  }

  private getGameTurn(gameId: string): number | undefined {
    const gameState = this.gameManager.getGameState(gameId);
    return gameState?.currentTurn;
  }

  // Admin methods for game management
  public getAdminStats(): { testGames: number; totalGames: number; activeGames: number } {
    const games = this.gameManager.getGameList();
    const testGames = games.filter(game => this.isTestGame(game.id)).length;
    const activeGames = games.filter(game => game.phase === 'active').length;
    
    return {
      testGames,
      totalGames: games.length,
      activeGames
    };
  }

  // Method to create a default game configuration
  public static createDefaultConfig(): GameConfig {
    return {
      mapSize: { width: 40, height: 30 },
      maxPlayers: 4,
      turnTimeLimit: 300, // 5 minutes
      victoryConditions: [
        VictoryType.DOMINATION,
        VictoryType.SCIENCE,
        VictoryType.CULTURE,
        VictoryType.SCORE
      ],
      startingResources: {
        [ResourceType.GOLD]: 50,
        [ResourceType.SCIENCE]: 0,
        [ResourceType.CULTURE]: 0,
        [ResourceType.PRODUCTION]: 0,
        [ResourceType.FOOD]: 0
      }
    };
  }
}