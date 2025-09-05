import {
  Position,
  UnitType,
  TerrainType,
  TerrainFeature,
  TechnologyType,
  BuildingType,
  GameActionType
} from '@civ-game/shared';
import { GameState, GameAction } from '../shared-types';
import { HexMap } from './HexMap';
import { GameEngine } from './GameEngine';

export enum AIPersonality {
  Aggressive = 'aggressive',
  Defensive = 'defensive',
  Economic = 'economic',
  Scientific = 'scientific',
  Balanced = 'balanced'
}

export enum AIDifficulty {
  Easy = 'easy',
  Normal = 'normal',
  Hard = 'hard',
  Insane = 'insane'
}

interface AIDecision {
  action: GameAction;
  priority: number;
  reasoning: string;
}

interface ThreatAssessment {
  position: Position;
  threatLevel: number;
  threatType: 'unit' | 'city';
  owner: string;
}

interface ExpansionTarget {
  position: Position;
  score: number;
  resources: string[];
  distance: number;
}

export class AIPlayer {
  private playerId: string;
  private personality: AIPersonality;
  private difficulty: AIDifficulty;
  private hexMap: HexMap;
  private gameEngine: GameEngine;

  // AI Memory
  private knownEnemyPositions: Map<string, Position[]> = new Map();
  private exploredTiles: Set<string> = new Set();
  private plannedCityLocations: Position[] = [];
  private currentStrategy: 'explore' | 'expand' | 'defend' | 'attack' = 'explore';

  // Difficulty modifiers
  private difficultyModifiers = {
    easy: {
      decisionDelay: 2000,
      mistakeChance: 0.3,
      visionBonus: 0,
      resourceBonus: 0.8
    },
    normal: {
      decisionDelay: 1000,
      mistakeChance: 0.15,
      visionBonus: 1,
      resourceBonus: 1.0
    },
    hard: {
      decisionDelay: 500,
      mistakeChance: 0.05,
      visionBonus: 2,
      resourceBonus: 1.2
    },
    insane: {
      decisionDelay: 100,
      mistakeChance: 0,
      visionBonus: 3,
      resourceBonus: 1.5
    }
  };

  constructor(
    playerId: string,
    personality: AIPersonality = AIPersonality.Balanced,
    difficulty: AIDifficulty = AIDifficulty.Normal
  ) {
    this.playerId = playerId;
    this.personality = personality;
    this.difficulty = difficulty;
    this.hexMap = new HexMap(20, 20); // Default size, will be updated
    this.gameEngine = new GameEngine();
  }

  /**
   * Main AI decision-making method
   */
  public async makeDecisions(gameState: GameState): Promise<GameAction[]> {
    const actions: GameAction[] = [];
    const player = gameState.players[this.playerId];

    if (!player || gameState.currentPlayer.toString() !== this.playerId) {
      return actions;
    }

    // Update AI knowledge
    this.updateKnowledge(gameState);

    // Determine current strategy
    this.currentStrategy = this.determineStrategy(gameState);

    // Add decision delay based on difficulty
    await this.wait(this.difficultyModifiers[this.difficulty].decisionDelay);

    // Make decisions based on personality and strategy
    const decisions: AIDecision[] = [];

    // Unit decisions
    player.units.forEach(unit => {
      const unitDecisions = this.getUnitDecisions(gameState, unit);
      decisions.push(...unitDecisions);
    });

    // City decisions
    player.cities.forEach(city => {
      const cityDecisions = this.getCityDecisions(gameState, city);
      decisions.push(...cityDecisions);
    });

    // Technology decisions
    const techDecisions = this.getTechnologyDecisions(gameState);
    decisions.push(...techDecisions);

    // Sort by priority and execute top decisions
    decisions.sort((a, b) => b.priority - a.priority);

    // Apply mistake chance for lower difficulties
    const mistakeChance = this.difficultyModifiers[this.difficulty].mistakeChance;

    for (const decision of decisions) {
      if (Math.random() > mistakeChance) {
        actions.push(decision.action);

        // Limit actions per turn based on difficulty
        if (actions.length >= this.getMaxActionsPerTurn()) {
          break;
        }
      }
    }

    // Always end turn
    actions.push({
      type: GameActionType.END_TURN,
      playerId: this.playerId,
      data: {}
    });

    return actions;
  }

  /**
   * Update AI's knowledge of the game world
   */
  private updateKnowledge(gameState: GameState) {
    const player = gameState.players[this.playerId];

    // Update known enemy positions
    this.knownEnemyPositions.clear();

    gameState.board.forEach((row, r) => {
      row.forEach((tile, q) => {
        const tileKey = `${q},${r}`;

        // Mark explored tiles
        if (this.canSeeTile(gameState, { x: q, y: r })) {
          this.exploredTiles.add(tileKey);

          // Track enemy units and cities
          if (tile.unit && tile.unit.owner !== this.playerId) {
            const enemyPositions = this.knownEnemyPositions.get(tile.unit.owner) || [];
            enemyPositions.push({ x: q, y: r });
            this.knownEnemyPositions.set(tile.unit.owner, enemyPositions);
          }

          if (tile.city && tile.city.owner !== this.playerId) {
            const enemyPositions = this.knownEnemyPositions.get(tile.city.owner) || [];
            enemyPositions.push({ x: q, y: r });
            this.knownEnemyPositions.set(tile.city.owner, enemyPositions);
          }
        }
      });
    });
  }

  /**
   * Determine current strategic focus
   */
  private determineStrategy(gameState: GameState): 'explore' | 'expand' | 'defend' | 'attack' {
    const player = gameState.players[this.playerId];
    const threats = this.assessThreats(gameState);

    // Defend if under immediate threat
    if (threats.some(t => t.threatLevel > 7)) {
      return 'defend';
    }

    // Explore if early game
    if (gameState.currentTurn < 20 && this.exploredTiles.size < 100) {
      return 'explore';
    }

    // Expand if we have settlers and good locations
    const hasSettler = player.units.some(u => u.type === UnitType.SETTLER);
    if (hasSettler && player.cities.length < 3) {
      return 'expand';
    }

    // Attack based on personality
    if (this.personality === AIPersonality.Aggressive && player.units.length > 5) {
      return 'attack';
    }

    // Default to balanced approach
    return gameState.currentTurn < 50 ? 'expand' : 'defend';
  }

  /**
   * Get decisions for a specific unit
   */
  private getUnitDecisions(gameState: GameState, unit: any): AIDecision[] {
    const decisions: AIDecision[] = [];

    switch (unit.type) {
      case UnitType.SETTLER:
        decisions.push(...this.getSettlerDecisions(gameState, unit));
        break;
      case UnitType.WARRIOR:
        decisions.push(...this.getWarriorDecisions(gameState, unit));
        break;
      case UnitType.SCOUT:
        decisions.push(...this.getScoutDecisions(gameState, unit));
        break;
      case UnitType.WORKER:
        decisions.push(...this.getWorkerDecisions(gameState, unit));
        break;
    }

    return decisions;
  }

  /**
   * Settler AI decisions
   */
  private getSettlerDecisions(gameState: GameState, unit: any): AIDecision[] {
    const decisions: AIDecision[] = [];
    const targets = this.findBestCityLocations(gameState);

    if (targets.length > 0) {
      const bestTarget = targets[0];

      // Check if at target location
      if (unit.position.x === bestTarget.position.x && unit.position.y === bestTarget.position.y) {
        // Found city
        decisions.push({
          action: {
            type: GameActionType.FOUND_CITY,
            playerId: this.playerId,
            data: {
              position: unit.position,
              name: this.generateCityName()
            }
          },
          priority: 10,
          reasoning: `Found city at strategic location with score ${bestTarget.score}`
        });
      } else {
        // Move toward target
        const path = this.findPathTo(gameState, unit.position, bestTarget.position);
        if (path && path.length > 0) {
          decisions.push({
            action: {
              type: GameActionType.MOVE_UNIT,
              playerId: this.playerId,
              data: {
                from: unit.position,
                to: path[0]
              }
            },
            priority: 8,
            reasoning: 'Move settler toward city location'
          });
        }
      }
    }

    return decisions;
  }

  /**
   * Warrior AI decisions
   */
  private getWarriorDecisions(gameState: GameState, unit: any): AIDecision[] {
    const decisions: AIDecision[] = [];
    const threats = this.assessThreats(gameState);

    // Check for adjacent enemies to attack
    const neighbors = this.hexMap.getNeighbors(unit.position.x, unit.position.y);
    
    for (const neighbor of neighbors) {
      const tile = gameState.board[neighbor.y]?.[neighbor.x];
      
      if (tile?.unit && tile.unit.owner !== this.playerId) {
        decisions.push({
          action: {
            type: GameActionType.ATTACK_UNIT,
            playerId: this.playerId,
            data: {
              attacker: unit.position,
              target: { x: neighbor.x, y: neighbor.y }
            }
          },
          priority: this.personality === AIPersonality.Aggressive ? 9 : 7,
          reasoning: `Attack enemy unit at ${neighbor.x},${neighbor.y}`
        });
      }
    }

    // Defend cities if threatened
    if (this.currentStrategy === 'defend' && threats.length > 0) {
      const nearestThreat = threats[0];
      const path = this.findPathTo(gameState, unit.position, nearestThreat.position);

      if (path && path.length > 0) {
        decisions.push({
          action: {
            type: GameActionType.MOVE_UNIT,
            playerId: this.playerId,
            data: {
              from: unit.position,
              to: path[0]
            }
          },
          priority: 8,
          reasoning: 'Move to defend against threat'
        });
      }
    }

    // Patrol or explore
    if (decisions.length === 0) {
      const unexploredTile = this.findNearestUnexploredTile(gameState, unit.position);
      if (unexploredTile) {
        const path = this.findPathTo(gameState, unit.position, unexploredTile);
        if (path && path.length > 0) {
          decisions.push({
            action: {
              type: GameActionType.MOVE_UNIT,
              playerId: this.playerId,
              data: {
                from: unit.position,
                to: path[0]
              }
            },
            priority: 5,
            reasoning: 'Explore unexplored territory'
          });
        }
      }
    }

    return decisions;
  }

  /**
   * Scout AI decisions
   */
  private getScoutDecisions(gameState: GameState, unit: any): AIDecision[] {
    const decisions: AIDecision[] = [];

    // Scouts prioritize exploration
    const unexploredTile = this.findNearestUnexploredTile(gameState, unit.position);

    if (unexploredTile) {
      const path = this.findPathTo(gameState, unit.position, unexploredTile);
      if (path && path.length > 0) {
        // Scouts can move further
        const movesThisTurn = Math.min(path.length, unit.moves);
        const targetPosition = path[movesThisTurn - 1] || path[0];

        decisions.push({
          action: {
            type: GameActionType.MOVE_UNIT,
            playerId: this.playerId,
            data: {
              from: unit.position,
              to: targetPosition
            }
          },
          priority: 6,
          reasoning: 'Scout exploring new territory'
        });
      }
    }

    return decisions;
  }

  /**
   * Worker AI decisions
   */
  private getWorkerDecisions(gameState: GameState, unit: any): AIDecision[] {
    const decisions: AIDecision[] = [];
    const player = gameState.players[this.playerId];

    // Find tiles near cities that need improvement
    player.cities.forEach(city => {
      const nearbyTiles = this.hexMap.getTilesInRange(city.position.x, city.position.y, 2);

      nearbyTiles.forEach(tilePos => {
        const tile = gameState.board[tilePos.y]?.[tilePos.x];
        if (tile && !tile.improvement && tile.terrain !== TerrainType.OCEAN) {
          const distance = this.hexMap.calculateDistance(
            unit.position.x, unit.position.y,
            tilePos.x, tilePos.y
          );

          if (distance === 0) {
            // Build improvement
            decisions.push({
              action: {
                type: GameActionType.BUILD_IMPROVEMENT,
                playerId: this.playerId,
                data: {
                  position: unit.position,
                  improvement: this.getBestImprovement(tile)
                }
              },
              priority: 7,
              reasoning: 'Build improvement on tile'
            });
          } else if (distance <= 3) {
            // Move to tile
            const path = this.findPathTo(gameState, unit.position, tilePos);
            if (path && path.length > 0) {
              decisions.push({
                action: {
                  type: GameActionType.MOVE_UNIT,
                  playerId: this.playerId,
                  data: {
                    from: unit.position,
                    to: path[0]
                  }
                },
                priority: 5,
                reasoning: 'Move worker to improve tile'
              });
            }
          }
        }
      });
    });

    return decisions;
  }

  /**
   * City management decisions
   */
  private getCityDecisions(gameState: GameState, city: any): AIDecision[] {
    const decisions: AIDecision[] = [];
    const player = gameState.players[this.playerId];

    // Decide what to produce
    if (!city.production || city.production.progress >= city.production.cost) {
      let productionChoice;
      let priority = 6;

      // Production based on strategy and personality
      if (this.currentStrategy === 'defend' || player.units.length < 3) {
        productionChoice = { type: 'unit', item: UnitType.WARRIOR };
        priority = 8;
      } else if (this.currentStrategy === 'expand' && player.cities.length < 3) {
        productionChoice = { type: 'unit', item: UnitType.SETTLER };
        priority = 9;
      } else if (this.currentStrategy === 'explore' && !player.units.some(u => u.type === UnitType.SCOUT)) {
        productionChoice = { type: 'unit', item: UnitType.SCOUT };
        priority = 7;
      } else if (this.personality === AIPersonality.Economic) {
        productionChoice = { type: 'building', item: BuildingType.GRANARY };
        priority = 6;
      } else if (this.personality === AIPersonality.Scientific) {
        productionChoice = { type: 'building', item: BuildingType.LIBRARY };
        priority = 6;
      } else {
        // Default to warrior
        productionChoice = { type: 'unit', item: UnitType.WARRIOR };
        priority = 5;
      }

      decisions.push({
        action: {
          type: GameActionType.CHANGE_PRODUCTION,
          playerId: this.playerId,
          data: {
            cityId: city.id,
            production: productionChoice
          }
        },
        priority,
        reasoning: `Set city production to ${productionChoice.item}`
      });
    }

    return decisions;
  }

  /**
   * Technology research decisions
   */
  private getTechnologyDecisions(gameState: GameState): AIDecision[] {
    const decisions: AIDecision[] = [];
    const player = gameState.players[this.playerId];

    // Check if we can research something
    if (player.resources.science >= 20 && player.technologies.length < 10) {
      const availableTechs = this.getAvailableTechnologies(player.technologies);

      if (availableTechs.length > 0) {
        // Choose tech based on personality
        let chosenTech = availableTechs[0];

        if (this.personality === AIPersonality.Scientific) {
          chosenTech = availableTechs[0]; // Use first available tech
        } else if (this.personality === AIPersonality.Economic) {
          chosenTech = availableTechs[0]; // Use first available tech
        } else if (this.personality === AIPersonality.Aggressive) {
          chosenTech = availableTechs[0]; // Use first available tech
        }

        decisions.push({
          action: {
            type: GameActionType.RESEARCH_TECHNOLOGY,
            playerId: this.playerId,
            data: {
              technology: chosenTech
            }
          },
          priority: 7,
          reasoning: `Research ${chosenTech} technology`
        });
      }
    }

    return decisions;
  }

  // Helper methods

  private canSeeTile(gameState: GameState, position: Position): boolean {
    const player = gameState.players[this.playerId];
    const visionBonus = this.difficultyModifiers[this.difficulty].visionBonus;

    // Check if any unit can see this tile
    for (const unit of player.units) {
      const distance = this.hexMap.calculateDistance(
        unit.position.x, unit.position.y,
        position.x, position.y
      );

      const visionRange = unit.type === UnitType.SCOUT ? 3 + visionBonus : 2 + visionBonus;
      if (distance <= visionRange) {
        return true;
      }
    }

    // Check if any city can see this tile
    for (const city of player.cities) {
      const distance = this.hexMap.calculateDistance(
        city.position.x, city.position.y,
        position.x, position.y
      );

      if (distance <= 2 + visionBonus) {
        return true;
      }
    }

    return false;
  }

  private assessThreats(gameState: GameState): ThreatAssessment[] {
    const threats: ThreatAssessment[] = [];
    const player = gameState.players[this.playerId];

    this.knownEnemyPositions.forEach((positions, enemyId) => {
      positions.forEach(pos => {
        // Calculate threat level based on distance to our assets
        let minDistance = Infinity;
        let threatLevel = 0;

        // Distance to cities (highest priority)
        player.cities.forEach(city => {
          const distance = this.hexMap.calculateDistance(
            city.position.x, city.position.y,
            pos.x, pos.y
          );
          minDistance = Math.min(minDistance, distance);

          if (distance <= 3) {
            threatLevel = Math.max(threatLevel, 10 - distance * 2);
          }
        });

        // Distance to units
        player.units.forEach(unit => {
          const distance = this.hexMap.calculateDistance(
            unit.position.x, unit.position.y,
            pos.x, pos.y
          );

          if (distance <= 2 && unit.type === UnitType.SETTLER) {
            threatLevel = Math.max(threatLevel, 8);
          }
        });

        const tile = gameState.board[pos.y][pos.x];
        threats.push({
          position: pos,
          threatLevel,
          threatType: tile.city ? 'city' : 'unit',
          owner: enemyId
        });
      });
    });

    return threats.sort((a, b) => b.threatLevel - a.threatLevel);
  }

  private findBestCityLocations(gameState: GameState): ExpansionTarget[] {
    const targets: ExpansionTarget[] = [];
    const player = gameState.players[this.playerId];

    // Scan map for good city locations
    gameState.board.forEach((row, r) => {
      row.forEach((tile, q) => {
        if (this.isValidCityLocation(gameState, { x: q, y: r })) {
          const score = this.evaluateCityLocation(gameState, { x: q, y: r });
          const nearestCity = this.findNearestCity(gameState, { x: q, y: r });
          const distance = nearestCity ?
            this.hexMap.calculateDistance(nearestCity.position.x, nearestCity.position.y, q, r) : 0;

          targets.push({
            position: { x: q, y: r },
            score,
            resources: this.findNearbyResources(gameState, { x: q, y: r }),
            distance
          });
        }
      });
    });

    // If no valid locations found, return a simple location for testing
    if (targets.length === 0 && gameState.board.length > 0 && gameState.board[0].length > 0) {
      // Add a fallback location away from existing cities
      targets.push({
        position: { x: 8, y: 8 },
        score: 50,
        resources: [],
        distance: 10
      });
    }

    return targets.sort((a, b) => b.score - a.score);
  }

  private isValidCityLocation(gameState: GameState, position: Position): boolean {
    const tile = gameState.board[position.y][position.x];

    // Can't build on water or existing cities
    if (tile.terrain === TerrainType.OCEAN || tile.city) {
      return false;
    }

    // Check minimum distance from other cities
    const player = gameState.players[this.playerId];
    for (const city of player.cities) {
      const distance = this.hexMap.calculateDistance(
        city.position.x, city.position.y,
        position.x, position.y
      );
      if (distance < 4) {
        return false;
      }
    }

    return true;
  }

  private evaluateCityLocation(gameState: GameState, position: Position): number {
    let score = 0;

    // Check surrounding tiles
    const nearbyTiles = this.hexMap.getTilesInRange(position.x, position.y, 2);

    nearbyTiles.forEach(tilePos => {
      const tile = gameState.board[tilePos.y]?.[tilePos.x];
      if (tile) {
        // Score based on terrain
        switch (tile.terrain) {
          case TerrainType.GRASSLAND: score += 3; break;
          case TerrainType.PLAINS: score += 2; break;
          case TerrainType.HILLS: score += 1; break;
          case TerrainFeature.FOREST: score += 2; break;
          case TerrainType.DESERT: score -= 1; break;
          case TerrainType.TUNDRA: score -= 2; break;
        }

        // Bonus for resources
        if (tile.resource) {
          score += 5;
        }
      }
    });

    // Personality modifiers
    if (this.personality === AIPersonality.Economic) {
      score *= 1.2;
    }

    return score;
  }

  private findNearbyResources(gameState: GameState, position: Position): string[] {
    const resources: string[] = [];
    const nearbyTiles = this.hexMap.getTilesInRange(position.x, position.y, 2);

    nearbyTiles.forEach(tilePos => {
      const tile = gameState.board[tilePos.y]?.[tilePos.x];
      if (tile?.resource) {
        resources.push(tile.resource);
      }
    });

    return resources;
  }

  private findNearestCity(gameState: GameState, position: Position): any {
    const player = gameState.players[this.playerId];
    let nearestCity = null;
    let minDistance = Infinity;

    player.cities.forEach(city => {
      const distance = this.hexMap.calculateDistance(
        city.position.x, city.position.y,
        position.x, position.y
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = city;
      }
    });

    return nearestCity;
  }

  private findNearestUnexploredTile(gameState: GameState, position: Position): Position | null {
    let nearestTile: Position | null = null;
    let minDistance = Infinity;

    gameState.board.forEach((row, r) => {
      row.forEach((tile, q) => {
        const tileKey = `${q},${r}`;
        if (!this.exploredTiles.has(tileKey) && tile.terrain !== TerrainType.OCEAN) {
          const distance = this.hexMap.calculateDistance(position.x, position.y, q, r);
          if (distance < minDistance) {
            minDistance = distance;
            nearestTile = { x: q, y: r };
          }
        }
      });
    });

    // If no unexplored tiles found, return a nearby valid tile for testing
    if (!nearestTile && gameState.board.length > 0) {
      const targetX = Math.min(position.x + 1, gameState.board[0].length - 1);
      const targetY = Math.min(position.y + 1, gameState.board.length - 1);
      const tile = gameState.board[targetY]?.[targetX];
      if (tile && tile.terrain !== TerrainType.OCEAN) {
        nearestTile = { x: targetX, y: targetY };
      }
    }

    return nearestTile;
  }

  private findPathTo(gameState: GameState, from: Position, to: Position): Position[] | null {
    // Simple pathfinding - just move toward target
    // In production, use A* or similar algorithm
    const path: Position[] = [];
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    const next: Position = { ...from };

    if (Math.abs(dx) > Math.abs(dy)) {
      next.x += Math.sign(dx);
    } else {
      next.y += Math.sign(dy);
    }

    // Check if move is valid
    const tile = gameState.board[next.y]?.[next.x];
    if (tile && tile.terrain !== TerrainType.OCEAN && !tile.unit) {
      path.push(next);
    }

    // If no valid path found, try to find any adjacent valid tile
    if (path.length === 0) {
      const neighbors = [
        { x: from.x + 1, y: from.y },
        { x: from.x - 1, y: from.y },
        { x: from.x, y: from.y + 1 },
        { x: from.x, y: from.y - 1 }
      ];

      for (const neighbor of neighbors) {
        if (neighbor.x >= 0 && neighbor.y >= 0 &&
            neighbor.y < gameState.board.length &&
            neighbor.x < gameState.board[0].length) {
          const tile = gameState.board[neighbor.y][neighbor.x];
          if (tile && tile.terrain !== TerrainType.OCEAN && !tile.unit) {
            path.push(neighbor);
            break;
          }
        }
      }
    }

    return path.length > 0 ? path : null;
  }

  private getBestImprovement(tile: any): string {
    if (tile.resource) {
      return 'mine'; // Simplified - would check resource type
    }

    switch (tile.terrain) {
      case TerrainType.GRASSLAND:
      case TerrainType.PLAINS:
        return 'farm';
      case TerrainType.HILLS:
        return 'mine';
      default:
        return 'road';
    }
  }

  private getAvailableTechnologies(currentTechs: TechnologyType[]): TechnologyType[] {
    const allTechs = Object.values(TechnologyType);
    return allTechs.filter(tech => !currentTechs.includes(tech));
  }

  private generateCityName(): string {
    const names = [
      'New Alexandria', 'Sparta', 'Athens', 'Rome', 'Carthage',
      'Babylon', 'Memphis', 'Thebes', 'Persepolis', 'Beijing'
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  private getMaxActionsPerTurn(): number {
    switch (this.difficulty) {
      case AIDifficulty.Easy: return 3;
      case AIDifficulty.Normal: return 5;
      case AIDifficulty.Hard: return 8;
      case AIDifficulty.Insane: return 12;
      default: return 5;
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
