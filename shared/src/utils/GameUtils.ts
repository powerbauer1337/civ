import { HexCoordinate, GameResources } from '../types/GameTypes';
import { Resources } from '../types/index';

export class GameUtils {
  public static createDefaultResources(): GameResources {
    return {
      food: 0,
      production: 0,
      gold: 50,
      science: 0,
      culture: 0,
      faith: 0
    };
  }

  public static hexDistance(a: HexCoordinate, b: HexCoordinate): number {
    return Math.max(
      Math.abs(a.q - b.q),
      Math.abs(a.r - b.r),
      Math.abs(a.s - b.s)
    );
  }

  public static isValidHexCoordinate(coord: HexCoordinate): boolean {
    return Math.abs(coord.q + coord.r + coord.s) < 0.001; // Account for floating point errors
  }

  public static generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public static generateGameId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public static clampResources(resources: GameResources): GameResources {
    return {
      food: Math.max(0, resources.food),
      production: Math.max(0, resources.production),
      gold: Math.max(0, resources.gold),
      science: Math.max(0, resources.science),
      culture: Math.max(0, resources.culture),
      faith: Math.max(0, resources.faith)
    };
  }

  public static addResources(a: GameResources, b: GameResources): GameResources {
    return {
      food: a.food + b.food,
      production: a.production + b.production,
      gold: a.gold + b.gold,
      science: a.science + b.science,
      culture: a.culture + b.culture,
      faith: a.faith + b.faith
    };
  }

  public static subtractResources(a: GameResources, b: GameResources): GameResources {
    return {
      food: a.food - b.food,
      production: a.production - b.production,
      gold: a.gold - b.gold,
      science: a.science - b.science,
      culture: a.culture - b.culture,
      faith: a.faith - b.faith
    };
  }

  public static canAfford(resources: GameResources, cost: GameResources): boolean {
    return (
      resources.food >= cost.food &&
      resources.production >= cost.production &&
      resources.gold >= cost.gold &&
      resources.science >= cost.science &&
      resources.culture >= cost.culture &&
      resources.faith >= cost.faith
    );
  }

  public static calculateScore(player: any): number {
    let score = 0;
    
    // Population score
    score += player.cities ? player.cities.length * 100 : 0;
    
    // Technology score
    score += player.technologies ? player.technologies.size * 50 : 0;
    
    // Resource score
    if (player.resources) {
      score += player.resources.gold * 0.1;
      score += player.resources.science * 2;
      score += player.resources.culture * 1.5;
    }
    
    return Math.floor(score);
  }

  public static formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  public static validatePlayerName(name: string): boolean {
    return name.length >= 2 && name.length <= 20 && /^[a-zA-Z0-9_]+$/.test(name);
  }

  public static getCivilizationColors(): string[] {
    return [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal  
      '#45B7D1', // Blue
      '#96CEB4', // Green
      '#FFEAA7', // Yellow
      '#DDA0DD', // Plum
      '#F39C12', // Orange
      '#9B59B6'  // Purple
    ];
  }

  public static getCivilizationNames(): string[] {
    return [
      'Romans',
      'Egyptians', 
      'Greeks',
      'Babylonians',
      'Chinese',
      'Persians',
      'Aztecs',
      'Vikings'
    ];
  }
}