import { 
  GameState, 
  GameAction, 
  ActionType,
  Position, 
  UnitType, 
  TerrainType,
  TechnologyType,
  BuildingType
} from '@civ-game/shared';
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
    
    if (!player || gameState.currentPlayer !== this.playerId) {
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
      type: ActionType.EndTurn,
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
    
    gameState.map.forEach((row, r) => {
      row.forEach((tile, q) => {
        const tileKey = `${q},${r}`;
        
        // Mark explored tiles
        if (this.canSeeTile(gameState, { q, r })) {
          this.exploredTiles.add(tileKey);
          
          // Track enemy units and cities
          if (tile.unit && tile.unit.owner !== this.playerId) {
            const enemyPositions = this.knownEnemyPositions.get(tile.unit.owner) || [];
            enemyPositions.push({ q, r });
            this.knownEnemyPositions.set(tile.unit.owner, enemyPositions);
          }
          
          if (tile.city && tile.city.owner !== this.playerId) {
            const enemyPositions = this.knownEnemyPositions.get(tile.city.owner) || [];
            enemyPositions.push({ q, r });
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
    if (gameState.turn < 20 && this.exploredTiles.size < 100) {
      return 'explore';
    }
    
    // Expand if we have settlers and good locations
    const hasSettler = player.units.some(u => u.type === UnitType.Settler);
    if (hasSettler && player.cities.length < 3) {
      return 'expand';
    }
    
    // Attack based on personality
    if (this.personality === AIPersonality.Aggressive && player.units.length > 5) {
      return 'attack';
    }
    
    // Default to balanced approach
    return gameState.turn < 50 ? 'expand' : 'defend';
  }

  /**
   * Get decisions for a specific unit
   */
  private getUnitDecisions(gameState: GameState, unit: any): AIDecision[] {
    const decisions: AIDecision[] = [];
    
    switch (unit.type) {
      case UnitType.Settler:
        decisions.push(...this.getSettlerDecisions(gameState, unit));
        break;
      case UnitType.Warrior:
        decisions.push(...this.getWarriorDecisions(gameState, unit));
        break;
      case UnitType.Scout:
        decisions.push(...this.getScoutDecisions(gameState, unit));
        break;
      case UnitType.Worker:
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
      if (unit.position.q === bestTarget.position.q && unit.position.r === bestTarget.position.r) {
        // Found city
        decisions.push({
          action: {
            type: ActionType.FoundCity,
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
              type: ActionType.MoveUnit,
              playerId: this.playerId,
              data: {
                from: unit.position,
                to: path[0]
              }
            },
            priority: 8,
            reasoning: `Move settler toward city location`
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
    const neighbors = this.hexMap.getNeighbors(unit.position.q, unit.position.r);
    for (const neighbor of neighbors) {
      const tile = gameState.map[neighbor.r]?.[neighbor.q];
      if (tile?.unit && tile.unit.owner !== this.playerId) {
        decisions.push({
          action: {
            type: ActionType.Attack,
            playerId: this.playerId,
            data: {
              attacker: unit.position,
              target: neighbor
            }
          },
          priority: this.personality === AIPersonality.Aggressive ? 9 : 7,
          reasoning: `Attack enemy unit at ${neighbor.q},${neighbor.r}`
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
            type: ActionType.MoveUnit,
            playerId: this.playerId,
            data: {
              from: unit.position,
              to: path[0]
            }
          },
          priority: 8,
          reasoning: `Move to defend against threat`
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
              type: ActionType.MoveUnit,
              playerId: this.playerId,
              data: {
                from: unit.position,
                to: path[0]
              }
            },
            priority: 5,
            reasoning: `Explore unexplored territory`
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
            type: ActionType.MoveUnit,
            playerId: this.playerId,
            data: {
              from: unit.position,
              to: targetPosition
            }
          },
          priority: 6,
          reasoning: `Scout exploring new territory`
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
      const nearbyTiles = this.hexMap.getTilesInRange(city.position.q, city.position.r, 2);
      
      nearbyTiles.forEach(tilePos => {
        const tile = gameState.map[tilePos.r]?.[tilePos.q];
        if (tile && !tile.improvement && tile.terrain !== TerrainType.Ocean) {
          const distance = this.hexMap.getDistance(
            unit.position.q, unit.position.r,
            tilePos.q, tilePos.r
          );
          
          if (distance === 0) {
            // Build improvement
            decisions.push({
              action: {
                type: ActionType.BuildImprovement,
                playerId: this.playerId,
                data: {
                  position: unit.position,
                  improvement: this.getBestImprovement(tile)
                }
              },
              priority: 7,
              reasoning: `Build improvement on tile`
            });
          } else if (distance <= 3) {
            // Move to tile
            const path = this.findPathTo(gameState, unit.position, tilePos);
            if (path && path.length > 0) {
              decisions.push({
                action: {
                  type: ActionType.MoveUnit,
                  playerId: this.playerId,
                  data: {
                    from: unit.position,
                    to: path[0]
                  }
                },
                priority: 5,
                reasoning: `Move worker to improve tile`
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
        productionChoice = { type: 'unit', item: UnitType.Warrior };
        priority = 8;
      } else if (this.currentStrategy === 'expand' && player.cities.length < 4) {
        productionChoice = { type: 'unit', item: UnitType.Settler };
        priority = 9;
      } else if (this.currentStrategy === 'explore' && !player.units.some(u => u.type === UnitType.Scout)) {
        productionChoice = { type: 'unit', item: UnitType.Scout };
        priority = 7;
      } else if (this.personality === AIPersonality.Economic) {
        productionChoice = { type: 'building', item: BuildingType.Granary };
        priority = 6;
      } else if (this.personality === AIPersonality.Scientific) {
        productionChoice = { type: 'building', item: BuildingType.Library };
        priority = 6;
      } else {
        // Default to warrior
        productionChoice = { type: 'unit', item: UnitType.Warrior };
        priority = 5;
      }
      
      decisions.push({
        action: {
          type: ActionType.SetProduction,
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
          chosenTech = availableTechs.find(t => t === TechnologyType.Writing) || availableTechs[0];
        } else if (this.personality === AIPersonality.Economic) {
          chosenTech = availableTechs.find(t => t === TechnologyType.Agriculture) || availableTechs[0];
        } else if (this.personality === AIPersonality.Aggressive) {
          chosenTech = availableTechs.find(t => t === TechnologyType.BronzeWorking) || availableTechs[0];
        }
        
        decisions.push({
          action: {
            type: ActionType.Research,
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
      const distance = this.hexMap.getDistance(
        unit.position.q, unit.position.r,
        position.q, position.r
      );
      
      const visionRange = unit.type === UnitType.Scout ? 3 + visionBonus : 2 + visionBonus;
      if (distance <= visionRange) {
        return true;
      }
    }
    
    // Check if any city can see this tile
    for (const city of player.cities) {
      const distance = this.hexMap.getDistance(
        city.position.q, city.position.r,
        position.q, position.r
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
          const distance = this.hexMap.getDistance(
            city.position.q, city.position.r,
            pos.q, pos.r
          );
          minDistance = Math.min(minDistance, distance);
          
          if (distance <= 3) {
            threatLevel = Math.max(threatLevel, 10 - distance * 2);
          }
        });
        
        // Distance to units
        player.units.forEach(unit => {
          const distance = this.hexMap.getDistance(
            unit.position.q, unit.position.r,
            pos.q, pos.r
          );
          
          if (distance <= 2 && unit.type === UnitType.Settler) {
            threatLevel = Math.max(threatLevel, 8);
          }
        });
        
        const tile = gameState.map[pos.r][pos.q];
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
    gameState.map.forEach((row, r) => {
      row.forEach((tile, q) => {
        if (this.isValidCityLocation(gameState, { q, r })) {
          const score = this.evaluateCityLocation(gameState, { q, r });
          const nearestCity = this.findNearestCity(gameState, { q, r });
          const distance = nearestCity ? 
            this.hexMap.getDistance(nearestCity.position.q, nearestCity.position.r, q, r) : 0;
          
          targets.push({
            position: { q, r },
            score,
            resources: this.findNearbyResources(gameState, { q, r }),
            distance
          });
        }
      });
    });
    
    return targets.sort((a, b) => b.score - a.score);
  }

  private isValidCityLocation(gameState: GameState, position: Position): boolean {
    const tile = gameState.map[position.r][position.q];
    
    // Can't build on water or existing cities
    if (tile.terrain === TerrainType.Ocean || tile.city) {
      return false;
    }
    
    // Check minimum distance from other cities
    const player = gameState.players[this.playerId];
    for (const city of player.cities) {
      const distance = this.hexMap.getDistance(
        city.position.q, city.position.r,
        position.q, position.r
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
    const nearbyTiles = this.hexMap.getTilesInRange(position.q, position.r, 2);
    
    nearbyTiles.forEach(tilePos => {
      const tile = gameState.map[tilePos.r]?.[tilePos.q];
      if (tile) {
        // Score based on terrain
        switch (tile.terrain) {
          case TerrainType.Grassland: score += 3; break;
          case TerrainType.Plains: score += 2; break;
          case TerrainType.Hills: score += 1; break;
          case TerrainType.Forest: score += 2; break;
          case TerrainType.Desert: score -= 1; break;
          case TerrainType.Tundra: score -= 2; break;
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
    const nearbyTiles = this.hexMap.getTilesInRange(position.q, position.r, 2);
    
    nearbyTiles.forEach(tilePos => {
      const tile = gameState.map[tilePos.r]?.[tilePos.q];
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
      const distance = this.hexMap.getDistance(
        city.position.q, city.position.r,
        position.q, position.r
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
    
    gameState.map.forEach((row, r) => {
      row.forEach((tile, q) => {
        const tileKey = `${q},${r}`;
        if (!this.exploredTiles.has(tileKey) && tile.terrain !== TerrainType.Ocean) {
          const distance = this.hexMap.getDistance(position.q, position.r, q, r);
          if (distance < minDistance) {
            minDistance = distance;
            nearestTile = { q, r };
          }
        }
      });
    });
    
    return nearestTile;
  }

  private findPathTo(gameState: GameState, from: Position, to: Position): Position[] | null {
    // Simple pathfinding - just move toward target
    // In production, use A* or similar algorithm
    const path: Position[] = [];
    const dx = to.q - from.q;
    const dr = to.r - from.r;
    
    let next: Position = { ...from };
    
    if (Math.abs(dx) > Math.abs(dr)) {
      next.q += Math.sign(dx);
    } else {
      next.r += Math.sign(dr);
    }
    
    // Check if move is valid
    const tile = gameState.map[next.r]?.[next.q];
    if (tile && tile.terrain !== TerrainType.Ocean && !tile.unit) {
      path.push(next);
    }
    
    return path.length > 0 ? path : null;
  }

  private getBestImprovement(tile: any): string {
    if (tile.resource) {
      return 'mine'; // Simplified - would check resource type
    }
    
    switch (tile.terrain) {
      case TerrainType.Grassland:
      case TerrainType.Plains:
        return 'farm';
      case TerrainType.Hills:
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
