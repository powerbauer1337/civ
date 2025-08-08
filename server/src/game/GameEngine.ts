import { GameAction, GameActionType, GameState, PlayerState, Unit, City, UnitType, TerrainType, VisibilityLevel } from '../../../shared/src/types';
import { HexMap } from './HexMap';
import { v4 as uuidv4 } from 'uuid';

/**
 * GameEngine handles all game logic, action processing, and state management
 * Replaces the mock GameState.executeAction with comprehensive game mechanics
 */
export class GameEngine {
  
  /**
   * Process any player action and update game state accordingly
   */
  public static processPlayerAction(gameState: GameState, action: GameAction): ActionResult {
    console.log(`Processing action: ${action.type} for player ${action.payload?.playerId || 'unknown'}`);
    
    try {
      // Validate basic action structure
      if (!action.type || !action.payload) {
        return { success: false, error: 'Invalid action structure', gameState };
      }

      // Route to appropriate action handler
      switch (action.type) {
        case GameActionType.MOVE_UNIT:
          return this.processMoveUnit(gameState, action);
        
        case GameActionType.ATTACK_UNIT:
          return this.processAttackUnit(gameState, action);
        
        case GameActionType.FOUND_CITY:
          return this.processFoundCity(gameState, action);
        
        case GameActionType.BUILD_IMPROVEMENT:
          return this.processBuildImprovement(gameState, action);
        
        case GameActionType.CHANGE_PRODUCTION:
          return this.processChangeProduction(gameState, action);
        
        case GameActionType.RESEARCH_TECHNOLOGY:
          return this.processResearchTechnology(gameState, action);
        
        case GameActionType.END_TURN:
          return this.processEndTurn(gameState, action);
        
        default:
          return { success: false, error: `Unknown action type: ${action.type}`, gameState };
      }
    } catch (error) {
      console.error('Error processing action:', error);
      return { success: false, error: `Action processing failed: ${error}`, gameState };
    }
  }

  /**
   * Process unit movement action
   */
  private static processMoveUnit(gameState: GameState, action: GameAction): ActionResult {
    const { unitId, from, to } = action.payload;
    
    if (!unitId || !from || !to) {
      return { success: false, error: 'Missing required parameters for move unit', gameState };
    }

    // Find the unit in the game state
    const unit = this.findUnit(gameState, unitId);
    if (!unit) {
      return { success: false, error: `Unit ${unitId} not found`, gameState };
    }

    // Verify unit belongs to current player
    const currentPlayer = gameState.players.find(p => p.userId === gameState.currentPlayer);
    if (!currentPlayer || unit.playerId !== currentPlayer.userId) {
      return { success: false, error: 'Unit does not belong to current player', gameState };
    }

    // Check if unit has movement points
    if (unit.movement <= 0) {
      return { success: false, error: 'Unit has no movement points remaining', gameState };
    }

    // Validate movement destination
    const hexMap = HexMap.deserialize(gameState.map);
    if (!hexMap.isValidMoveDestination(to.x, to.y, unit.playerId)) {
      return { success: false, error: 'Invalid movement destination', gameState };
    }

    // Calculate movement cost
    const movementCost = this.calculateMovementCost(hexMap, from, to);
    if (unit.movement < movementCost) {
      return { success: false, error: 'Insufficient movement points', gameState };
    }

    // Update unit position and movement
    unit.x = to.x;
    unit.y = to.y;
    unit.movement -= movementCost;

    // Update tile occupancy in map
    const fromTile = hexMap.getTile(from.x, from.y);
    const toTile = hexMap.getTile(to.x, to.y);
    
    if (fromTile) fromTile.unit = null;
    if (toTile) toTile.unit = unit;

    // Update visibility (units reveal surrounding tiles)
    this.updateVisibilityAroundUnit(hexMap, unit);

    // Update game state map
    gameState.map = hexMap.serialize();
    gameState.lastUpdate = new Date();

    return { 
      success: true, 
      message: `Unit ${unit.type} moved to (${to.x}, ${to.y})`,
      gameState 
    };
  }

  /**
   * Process unit attack action
   */
  private static processAttackUnit(gameState: GameState, action: GameAction): ActionResult {
    const { attackerId, targetId } = action.payload;
    
    const attacker = this.findUnit(gameState, attackerId);
    const target = this.findUnit(gameState, targetId);
    
    if (!attacker || !target) {
      return { success: false, error: 'Attacker or target unit not found', gameState };
    }

    // Check if units are adjacent
    const hexMap = HexMap.deserialize(gameState.map);
    const distance = hexMap.calculateDistance(attacker.x, attacker.y, target.x, target.y);
    if (distance > 1) {
      return { success: false, error: 'Units must be adjacent to attack', gameState };
    }

    // Process combat
    const combatResult = this.resolveCombat(attacker, target, hexMap);
    
    // Apply damage
    target.health -= combatResult.damage;
    
    // Remove unit if destroyed
    if (target.health <= 0) {
      this.removeUnit(gameState, target.id);
      combatResult.message += ` ${target.type} destroyed!`;
    }

    // Attacker gains experience
    attacker.experience += Math.floor(combatResult.damage / 10);

    gameState.lastUpdate = new Date();

    return {
      success: true,
      message: combatResult.message,
      gameState
    };
  }

  /**
   * Process city founding action
   */
  private static processFoundCity(gameState: GameState, action: GameAction): ActionResult {
    const { settlerId, location, cityName } = action.payload;
    
    const settler = this.findUnit(gameState, settlerId);
    if (!settler || settler.type !== UnitType.SETTLER) {
      return { success: false, error: 'Valid settler unit required to found city', gameState };
    }

    const hexMap = HexMap.deserialize(gameState.map);
    const tile = hexMap.getTile(location.x, location.y);
    if (!tile) {
      return { success: false, error: 'Invalid location for city', gameState };
    }

    // Check if location is valid for city (not water, not too close to other cities)
    if (tile.terrain === TerrainType.OCEAN) {
      return { success: false, error: 'Cannot found city on water', gameState };
    }

    if (tile.city) {
      return { success: false, error: 'Tile already has a city', gameState };
    }

    // Check minimum distance from other cities (3 tiles)
    const nearbyTiles = hexMap.getTilesInRange(location.x, location.y, 3);
    const hasNearbyCity = nearbyTiles.some(t => t.city !== null);
    if (hasNearbyCity) {
      return { success: false, error: 'Too close to existing city', gameState };
    }

    // Create new city
    const newCity: City = {
      id: uuidv4(),
      name: cityName || `${settler.playerId}'s City`,
      playerId: settler.playerId,
      x: location.x,
      y: location.y,
      population: 1,
      health: 100,
      maxHealth: 100,
      production: null,
      buildings: [],
      workingTiles: [{ x: location.x, y: location.y }], // City works its own tile initially
      founded: new Date()
    };

    // Add city to tile and game state
    tile.city = newCity;
    const playerState = gameState.players.find(p => p.userId === settler.playerId);
    if (playerState) {
      playerState.cities.push(newCity.id);
    }

    // Remove settler unit (consumed in founding)
    this.removeUnit(gameState, settler.id);

    // Update map and game state
    gameState.map = hexMap.serialize();
    gameState.lastUpdate = new Date();

    return {
      success: true,
      message: `Founded city ${newCity.name} at (${location.x}, ${location.y})`,
      gameState
    };
  }

  /**
   * Process improvement building action
   */
  private static processBuildImprovement(gameState: GameState, action: GameAction): ActionResult {
    const { workerId, improvementType, location } = action.payload;
    
    const worker = this.findUnit(gameState, workerId);
    if (!worker || worker.type !== UnitType.WORKER) {
      return { success: false, error: 'Valid worker unit required to build improvement', gameState };
    }

    const hexMap = HexMap.deserialize(gameState.map);
    const tile = hexMap.getTile(location.x, location.y);
    if (!tile) {
      return { success: false, error: 'Invalid location for improvement', gameState };
    }

    // Check if tile can have improvement
    if (tile.improvement) {
      return { success: false, error: 'Tile already has an improvement', gameState };
    }

    // Create improvement (simplified - in full game would require multiple turns)
    tile.improvement = {
      type: improvementType,
      constructedTurn: gameState.turn,
      isActive: true,
      yield: this.getImprovementYield(improvementType, tile)
    };

    gameState.map = hexMap.serialize();
    gameState.lastUpdate = new Date();

    return {
      success: true,
      message: `Built ${improvementType} at (${location.x}, ${location.y})`,
      gameState
    };
  }

  /**
   * Process production change in city
   */
  private static processChangeProduction(gameState: GameState, action: GameAction): ActionResult {
    const { cityId, productionType, targetId } = action.payload;
    
    // Find city in game state
    const hexMap = HexMap.deserialize(gameState.map);
    let targetCity: City | null = null;
    
    for (let y = 0; y < hexMap.height; y++) {
      for (let x = 0; x < hexMap.width; x++) {
        const tile = hexMap.getTile(x, y);
        if (tile?.city && tile.city.id === cityId) {
          targetCity = tile.city;
          break;
        }
      }
      if (targetCity) break;
    }

    if (!targetCity) {
      return { success: false, error: 'City not found', gameState };
    }

    // Update city production
    targetCity.production = {
      type: productionType,
      targetId: targetId,
      turnsRemaining: this.calculateProductionTime(productionType, targetId),
      productionStored: 0,
      productionRequired: this.getProductionCost(productionType, targetId)
    };

    gameState.map = hexMap.serialize();
    gameState.lastUpdate = new Date();

    return {
      success: true,
      message: `City ${targetCity.name} now producing ${targetId}`,
      gameState
    };
  }

  /**
   * Process technology research action
   */
  private static processResearchTechnology(gameState: GameState, action: GameAction): ActionResult {
    const { playerId, techId } = action.payload;
    
    const playerState = gameState.players.find(p => p.userId === playerId);
    if (!playerState) {
      return { success: false, error: 'Player not found', gameState };
    }

    // Check if already researched
    const existingTech = playerState.technologies.find(t => t.techId === techId);
    if (existingTech && existingTech.isResearched) {
      return { success: false, error: 'Technology already researched', gameState };
    }

    // Set as current research (simplified - full game would check prerequisites)
    if (existingTech) {
      // Continue existing research
      existingTech.turnsToComplete = 5; // Placeholder
    } else {
      // Start new research
      playerState.technologies.push({
        techId: techId,
        isResearched: false,
        progress: 0,
        turnsToComplete: 5
      });
    }

    gameState.lastUpdate = new Date();

    return {
      success: true,
      message: `Started researching ${techId}`,
      gameState
    };
  }

  /**
   * Process end turn action and advance game state
   */
  private static processEndTurn(gameState: GameState, action: GameAction): ActionResult {
    console.log(`Processing end turn for player ${gameState.currentPlayer}`);

    // Advance to next player
    const currentPlayerIndex = gameState.players.findIndex(p => p.userId === gameState.currentPlayer);
    const nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;
    gameState.currentPlayer = gameState.players[nextPlayerIndex].userId;

    // If back to first player, increment turn number
    if (nextPlayerIndex === 0) {
      gameState.turn++;
      
      // Process turn-based updates
      const turnResult = this.processTurnEnd(gameState);
      if (!turnResult.success) {
        return turnResult;
      }
    }

    // Reset movement for current player's units
    this.resetPlayerUnitsMovement(gameState, gameState.currentPlayer);

    gameState.lastUpdate = new Date();

    return {
      success: true,
      message: `Turn ended. Now ${gameState.currentPlayer}'s turn (Turn ${gameState.turn})`,
      gameState
    };
  }

  /**
   * Process all turn-end mechanics (resource generation, production, research)
   */
  public static processTurnEnd(gameState: GameState): ActionResult {
    try {
      console.log(`Processing turn end mechanics for turn ${gameState.turn}`);

      // Process each player
      for (const playerState of gameState.players) {
        if (!playerState.isAlive) continue;

        // Generate resources from cities
        this.processResourceGeneration(gameState, playerState);
        
        // Process city production
        this.processCityProduction(gameState, playerState);
        
        // Process technology research
        this.processTechnologyResearch(playerState);
        
        // Update player score
        playerState.score = this.calculatePlayerScore(gameState, playerState);
      }

      // Check victory conditions
      const victoryResult = this.checkVictoryConditions(gameState);
      if (victoryResult.victory) {
        gameState.phase = 'END_GAME' as any;
        return {
          success: true,
          message: `Victory achieved! ${victoryResult.message}`,
          gameState,
          victory: victoryResult
        };
      }

      return { success: true, message: 'Turn processed successfully', gameState };
    } catch (error) {
      console.error('Error processing turn end:', error);
      return { success: false, error: `Turn processing failed: ${error}`, gameState };
    }
  }

  /**
   * Generate resources for a player from their cities
   */
  private static processResourceGeneration(gameState: GameState, playerState: PlayerState): void {
    const hexMap = HexMap.deserialize(gameState.map);
    
    // Reset per-turn resources
    const generatedResources = { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
    
    // Process each city
    for (const cityId of playerState.cities) {
      const city = this.findCityById(hexMap, cityId);
      if (city) {
        const cityYield = this.calculateCityYield(hexMap, city);
        
        generatedResources.food += cityYield.food || 0;
        generatedResources.production += cityYield.production || 0;
        generatedResources.gold += cityYield.gold || 0;
        generatedResources.science += cityYield.science || 0;
        generatedResources.culture += cityYield.culture || 0;
        generatedResources.faith += cityYield.faith || 0;
      }
    }

    // Apply to player resources
    playerState.resources.food += generatedResources.food;
    playerState.resources.production += generatedResources.production;
    playerState.resources.gold += generatedResources.gold;
    playerState.resources.science += generatedResources.science;
    playerState.resources.culture += generatedResources.culture;
    playerState.resources.faith += generatedResources.faith;

    console.log(`Player ${playerState.userId} generated:`, generatedResources);
  }

  /**
   * Process city production (units, buildings, wonders)
   */
  private static processCityProduction(gameState: GameState, playerState: PlayerState): void {
    const hexMap = HexMap.deserialize(gameState.map);
    
    for (const cityId of playerState.cities) {
      const city = this.findCityById(hexMap, cityId);
      if (!city || !city.production) continue;

      // Add production points
      const cityYield = this.calculateCityYield(hexMap, city);
      city.production.productionStored += cityYield.production || 0;

      // Check if production is complete
      if (city.production.productionStored >= city.production.productionRequired) {
        this.completeProduction(gameState, city, playerState);
      }
    }
  }

  /**
   * Process technology research progress
   */
  private static processTechnologyResearch(playerState: PlayerState): void {
    for (const tech of playerState.technologies) {
      if (!tech.isResearched && tech.turnsToComplete !== undefined) {
        tech.progress += playerState.resources.science;
        tech.turnsToComplete--;
        
        if (tech.turnsToComplete <= 0) {
          tech.isResearched = true;
          tech.turnsToComplete = undefined;
          console.log(`Player ${playerState.userId} completed research of ${tech.techId}`);
        }
      }
    }
  }

  /**
   * Calculate total yield from a city (worked tiles + buildings)
   */
  private static calculateCityYield(hexMap: HexMap, city: City): any {
    const baseYield = { food: 2, production: 1, gold: 1, science: 1, culture: 1, faith: 0 };
    
    // Add yield from worked tiles
    for (const tilePos of city.workingTiles) {
      const tile = hexMap.getTile(tilePos.x, tilePos.y);
      if (tile) {
        // Base terrain yield
        const terrainYield = this.getTerrainYield(tile.terrain);
        baseYield.food += terrainYield.food || 0;
        baseYield.production += terrainYield.production || 0;
        baseYield.gold += terrainYield.gold || 0;

        // Resource yield
        if (tile.resources) {
          const resourceYield = tile.resources.yield;
          baseYield.food += resourceYield.food || 0;
          baseYield.production += resourceYield.production || 0;
          baseYield.gold += resourceYield.gold || 0;
          baseYield.science += resourceYield.science || 0;
        }

        // Improvement yield
        if (tile.improvement) {
          const impYield = tile.improvement.yield;
          baseYield.food += impYield.food || 0;
          baseYield.production += impYield.production || 0;
          baseYield.gold += impYield.gold || 0;
          baseYield.science += impYield.science || 0;
        }
      }
    }

    return baseYield;
  }

  // Helper methods

  private static findUnit(gameState: GameState, unitId: string): Unit | null {
    const hexMap = HexMap.deserialize(gameState.map);
    for (let y = 0; y < hexMap.height; y++) {
      for (let x = 0; x < hexMap.width; x++) {
        const tile = hexMap.getTile(x, y);
        if (tile?.unit && tile.unit.id === unitId) {
          return tile.unit;
        }
      }
    }
    return null;
  }

  private static findCityById(hexMap: HexMap, cityId: string): City | null {
    for (let y = 0; y < hexMap.height; y++) {
      for (let x = 0; x < hexMap.width; x++) {
        const tile = hexMap.getTile(x, y);
        if (tile?.city && tile.city.id === cityId) {
          return tile.city;
        }
      }
    }
    return null;
  }

  private static removeUnit(gameState: GameState, unitId: string): void {
    const hexMap = HexMap.deserialize(gameState.map);
    for (let y = 0; y < hexMap.height; y++) {
      for (let x = 0; x < hexMap.width; x++) {
        const tile = hexMap.getTile(x, y);
        if (tile?.unit && tile.unit.id === unitId) {
          tile.unit = null;
          // Also remove from player's unit list
          gameState.players.forEach(player => {
            player.units = player.units.filter(id => id !== unitId);
          });
          break;
        }
      }
    }
    gameState.map = hexMap.serialize();
  }

  private static updateVisibilityAroundUnit(hexMap: HexMap, unit: Unit): void {
    // Reveal tiles around unit (2 tile vision range)
    const visibleTiles = hexMap.getTilesInRange(unit.x, unit.y, 2);
    visibleTiles.forEach(tile => {
      hexMap.setTileVisibility(tile.x, tile.y, unit.playerId, VisibilityLevel.VISIBLE);
    });
  }

  private static calculateMovementCost(hexMap: HexMap, from: any, to: any): number {
    const tile = hexMap.getTile(to.x, to.y);
    if (!tile) return 999; // Invalid tile
    
    // Basic movement costs
    let cost = 1;
    if (tile.terrain === TerrainType.HILLS) cost = 2;
    if (tile.features.includes('forest' as any)) cost += 1;
    
    return cost;
  }

  private static resolveCombat(attacker: Unit, defender: Unit, hexMap: HexMap): { damage: number, message: string } {
    const attackStrength = attacker.strength;
    const defenseStrength = defender.strength;
    
    // Get terrain defense bonus
    const defenderTile = hexMap.getTile(defender.x, defender.y);
    let defensiveBonus = 0;
    if (defenderTile?.terrain === TerrainType.HILLS) defensiveBonus = 25;
    if (defenderTile?.features.includes('forest' as any)) defensiveBonus += 10;
    
    const adjustedDefense = defenseStrength * (1 + defensiveBonus / 100);
    
    // Simple damage calculation
    const baseDamage = Math.max(1, attackStrength - adjustedDefense);
    const randomMultiplier = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
    const finalDamage = Math.floor(baseDamage * randomMultiplier);
    
    return {
      damage: finalDamage,
      message: `${attacker.type} deals ${finalDamage} damage to ${defender.type}`
    };
  }

  private static resetPlayerUnitsMovement(gameState: GameState, playerId: string): void {
    const hexMap = HexMap.deserialize(gameState.map);
    for (let y = 0; y < hexMap.height; y++) {
      for (let x = 0; x < hexMap.width; x++) {
        const tile = hexMap.getTile(x, y);
        if (tile?.unit && tile.unit.playerId === playerId) {
          tile.unit.movement = tile.unit.maxMovement;
        }
      }
    }
    gameState.map = hexMap.serialize();
  }

  private static getTerrainYield(terrain: TerrainType): any {
    switch (terrain) {
      case TerrainType.GRASSLAND: return { food: 2, production: 0, gold: 0 };
      case TerrainType.PLAINS: return { food: 1, production: 1, gold: 0 };
      case TerrainType.HILLS: return { food: 0, production: 2, gold: 0 };
      case TerrainType.DESERT: return { food: 0, production: 0, gold: 1 };
      case TerrainType.COAST: return { food: 1, production: 0, gold: 1 };
      default: return { food: 0, production: 0, gold: 0 };
    }
  }

  private static getImprovementYield(improvementType: any, tile: any): any {
    // Simplified improvement yields
    switch (improvementType) {
      case 'farm': return { food: 1, production: 0, gold: 0 };
      case 'mine': return { food: 0, production: 2, gold: 0 };
      case 'trading_post': return { food: 0, production: 0, gold: 2 };
      default: return { food: 0, production: 0, gold: 0 };
    }
  }

  private static calculateProductionTime(productionType: any, targetId: string): number {
    return 5; // Placeholder - all productions take 5 turns
  }

  private static getProductionCost(productionType: any, targetId: string): number {
    return 50; // Placeholder - all productions cost 50 production points
  }

  private static completeProduction(gameState: GameState, city: City, playerState: PlayerState): void {
    if (!city.production) return;

    console.log(`${city.name} completed production of ${city.production.targetId}`);
    
    // Reset production
    city.production = null;
  }

  private static calculatePlayerScore(gameState: GameState, playerState: PlayerState): number {
    return playerState.cities.length * 100 + playerState.units.length * 10 + Math.floor(playerState.resources.gold / 10);
  }

  private static checkVictoryConditions(gameState: GameState): { victory: boolean, type?: string, playerId?: string, message?: string } {
    // Check domination victory (control all original capitals)
    const alivePlayers = gameState.players.filter(p => p.isAlive);
    if (alivePlayers.length === 1) {
      return {
        victory: true,
        type: 'domination',
        playerId: alivePlayers[0].userId,
        message: `${alivePlayers[0].userId} achieves domination victory!`
      };
    }

    // Check turn limit (300 turns)
    if (gameState.turn >= 300) {
      const winner = gameState.players.reduce((prev, current) => 
        current.score > prev.score ? current : prev
      );
      return {
        victory: true,
        type: 'score',
        playerId: winner.userId,
        message: `${winner.userId} achieves score victory with ${winner.score} points!`
      };
    }

    return { victory: false };
  }
}

/**
 * Result of processing an action
 */
export interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  gameState: GameState;
  victory?: {
    victory: boolean;
    type?: string;
    playerId?: string;
    message?: string;
  };
}