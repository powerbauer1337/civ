import { HexCoordinate, GameResources, ResourceType } from '../types/GameTypes';

export class GameUtils {
  public static createDefaultResources(): GameResources {
    return {
      [ResourceType.GOLD]: 50,
      [ResourceType.SCIENCE]: 0,
      [ResourceType.CULTURE]: 0,
      [ResourceType.PRODUCTION]: 0,
      [ResourceType.FOOD]: 0
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
      [ResourceType.GOLD]: Math.max(0, resources[ResourceType.GOLD]),
      [ResourceType.SCIENCE]: Math.max(0, resources[ResourceType.SCIENCE]),
      [ResourceType.CULTURE]: Math.max(0, resources[ResourceType.CULTURE]),
      [ResourceType.PRODUCTION]: Math.max(0, resources[ResourceType.PRODUCTION]),
      [ResourceType.FOOD]: Math.max(0, resources[ResourceType.FOOD])
    };
  }

  public static addResources(a: GameResources, b: GameResources): GameResources {
    return {
      [ResourceType.GOLD]: a[ResourceType.GOLD] + b[ResourceType.GOLD],
      [ResourceType.SCIENCE]: a[ResourceType.SCIENCE] + b[ResourceType.SCIENCE],
      [ResourceType.CULTURE]: a[ResourceType.CULTURE] + b[ResourceType.CULTURE],
      [ResourceType.PRODUCTION]: a[ResourceType.PRODUCTION] + b[ResourceType.PRODUCTION],
      [ResourceType.FOOD]: a[ResourceType.FOOD] + b[ResourceType.FOOD]
    };
  }

  public static subtractResources(a: GameResources, b: GameResources): GameResources {
    return {
      [ResourceType.GOLD]: a[ResourceType.GOLD] - b[ResourceType.GOLD],
      [ResourceType.SCIENCE]: a[ResourceType.SCIENCE] - b[ResourceType.SCIENCE],
      [ResourceType.CULTURE]: a[ResourceType.CULTURE] - b[ResourceType.CULTURE],
      [ResourceType.PRODUCTION]: a[ResourceType.PRODUCTION] - b[ResourceType.PRODUCTION],
      [ResourceType.FOOD]: a[ResourceType.FOOD] - b[ResourceType.FOOD]
    };
  }

  public static canAfford(resources: GameResources, cost: GameResources): boolean {
    return (
      resources[ResourceType.GOLD] >= cost[ResourceType.GOLD] &&
      resources[ResourceType.SCIENCE] >= cost[ResourceType.SCIENCE] &&
      resources[ResourceType.CULTURE] >= cost[ResourceType.CULTURE] &&
      resources[ResourceType.PRODUCTION] >= cost[ResourceType.PRODUCTION] &&
      resources[ResourceType.FOOD] >= cost[ResourceType.FOOD]
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
      score += player.resources[ResourceType.GOLD] * 0.1;
      score += player.resources[ResourceType.SCIENCE] * 2;
      score += player.resources[ResourceType.CULTURE] * 1.5;
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