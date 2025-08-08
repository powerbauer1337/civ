import { TestGame, TestPlayer, GameStats, CreateGameRequest, JoinGameRequest } from '../types/game';

export class GameService {
  private games = new Map<string, TestGame>();
  private players = new Map<string, TestPlayer>();

  // Game CRUD Operations
  createGame(request: CreateGameRequest): TestGame {
    if (!request.name || request.name.trim().length === 0) {
      throw new Error('Game name is required');
    }

    const gameId = `game_${Date.now()}`;
    const game: TestGame = {
      id: gameId,
      name: request.name.trim(),
      status: 'waiting',
      players: [],
      maxPlayers: Math.max(2, Math.min(8, request.maxPlayers || 4)),
      currentTurn: 0,
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.games.set(gameId, game);
    return game;
  }

  getGame(gameId: string): TestGame | undefined {
    return this.games.get(gameId);
  }

  getAllGames(): TestGame[] {
    return Array.from(this.games.values());
  }

  deleteGame(gameId: string): boolean {
    const game = this.games.get(gameId);
    if (game) {
      // Remove all players from this game
      game.players.forEach(player => this.players.delete(player.id));
      this.games.delete(gameId);
      return true;
    }
    return false;
  }

  // Player Operations
  joinGame(gameId: string, request: JoinGameRequest): { game: TestGame; playerId: string } {
    const game = this.games.get(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    if (!request.username || request.username.trim().length === 0) {
      throw new Error('Username is required');
    }

    if (game.status !== 'waiting') {
      throw new Error('Game is not accepting new players');
    }

    if (game.players.length >= game.maxPlayers) {
      throw new Error('Game is full');
    }

    // Check for duplicate username
    const existingPlayer = game.players.find(p => p.username === request.username.trim());
    if (existingPlayer) {
      throw new Error('Username already taken in this game');
    }

    const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const player: TestPlayer = {
      id: playerId,
      username: request.username.trim(),
      civilization: request.civilization || 'Random',
      score: 0,
      isOnline: true,
      lastActivity: new Date()
    };

    game.players.push(player);
    this.players.set(playerId, player);
    game.lastActivity = new Date();

    // Start game if enough players
    if (game.players.length >= 2) {
      game.status = 'active';
    }

    return { game, playerId };
  }

  getPlayer(playerId: string): TestPlayer | undefined {
    return this.players.get(playerId);
  }

  getAllPlayers(): TestPlayer[] {
    return Array.from(this.players.values());
  }

  updatePlayerActivity(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (player) {
      player.lastActivity = new Date();
      return true;
    }
    return false;
  }

  setPlayerOnlineStatus(playerId: string, isOnline: boolean): boolean {
    const player = this.players.get(playerId);
    if (player) {
      player.isOnline = isOnline;
      player.lastActivity = new Date();
      return true;
    }
    return false;
  }

  // Game Actions
  processGameAction(gameId: string, playerId: string, action: string, payload: any): boolean {
    const game = this.games.get(gameId);
    const player = this.players.get(playerId);

    if (!game || !player) {
      return false;
    }

    // Update activity
    game.lastActivity = new Date();
    player.lastActivity = new Date();

    // Process action based on type
    switch (action) {
      case 'move_unit':
        // Validate and process unit movement
        this.processUnitMove(game, player, payload);
        break;
      case 'build_city':
        // Validate and process city building
        this.processCityBuild(game, player, payload);
        break;
      case 'research_technology':
        // Validate and process technology research
        this.processTechResearch(game, player, payload);
        break;
      default:
        console.warn(`Unknown action type: ${action}`);
    }

    return true;
  }

  // Statistics
  getStats(): GameStats {
    const games = Array.from(this.games.values());
    const players = Array.from(this.players.values());

    return {
      totalGames: games.length,
      activeGames: games.filter(g => g.status === 'active').length,
      waitingGames: games.filter(g => g.status === 'waiting').length,
      endedGames: games.filter(g => g.status === 'ended').length,
      totalPlayers: players.length,
      onlinePlayers: players.filter(p => p.isOnline).length,
      averagePlayersPerGame: games.length > 0 ? players.length / games.length : 0
    };
  }

  // Cleanup inactive games and players
  cleanup(): { gamesRemoved: number; playersRemoved: number } {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes
    let gamesRemoved = 0;
    let playersRemoved = 0;

    // Remove inactive games
    for (const [gameId, game] of this.games.entries()) {
      if (game.lastActivity && (now.getTime() - game.lastActivity.getTime()) > inactiveThreshold) {
        // Remove players from inactive game
        game.players.forEach(player => {
          this.players.delete(player.id);
          playersRemoved++;
        });
        this.games.delete(gameId);
        gamesRemoved++;
      }
    }

    // Remove orphaned players
    for (const [playerId, player] of this.players.entries()) {
      if (player.lastActivity && (now.getTime() - player.lastActivity.getTime()) > inactiveThreshold) {
        this.players.delete(playerId);
        playersRemoved++;
      }
    }

    return { gamesRemoved, playersRemoved };
  }

  // Private helper methods
  private processUnitMove(game: TestGame, player: TestPlayer, payload: any): void {
    // Placeholder for unit movement logic
    console.log(`Player ${player.username} moved unit in game ${game.id}:`, payload);
  }

  private processCityBuild(game: TestGame, player: TestPlayer, payload: any): void {
    // Placeholder for city building logic
    console.log(`Player ${player.username} built city in game ${game.id}:`, payload);
  }

  private processTechResearch(game: TestGame, player: TestPlayer, payload: any): void {
    // Placeholder for technology research logic
    console.log(`Player ${player.username} researched tech in game ${game.id}:`, payload);
  }
}

export { GameService };
export default GameService;