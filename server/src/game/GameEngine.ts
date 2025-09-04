import { GameAction, GameActionType, GameState, PlayerState, Unit, City, UnitType, TerrainType, VisibilityLevel } from '../../../shared/src/types';
import { Technology, TechnologyEffects, PlayerTechnology, TECHNOLOGY_DATABASE, validateTechnologyPrerequisites, calculateResearchCost } from '@civ-game/shared';
import { HexMap } from './HexMap';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@civ-game/shared/utils';

/**
 * GameEngine handles all game logic, action processing, and state management
 * Replaces the mock GameState.executeAction with comprehensive game mechanics
 */
export class GameEngine {

  constructor(config?: any) {
    // GameEngine is primarily used as a static utility class
    // Constructor provided for compatibility with existing code
  }

  /**
   * Instance method for processing actions (used by tests)
   */
  public processAction(gameState: GameState, action: GameAction): { success: boolean; newState?: GameState; error?: string } {
    const result = GameEngine.processPlayerAction(gameState, action);
    return {
      success: result.success,
      newState: result.success ? result.gameState : undefined,
      error: result.error
    };
  }

  /**
   * Process any player action and update game state accordingly
   */
  public static processPlayerAction(gameState: GameState, action: GameAction): ActionResult {
    logger.debug(`Processing action: ${action.type} for player ${action.payload?.playerId || 'unknown'}`);

    try {
      // Validate basic action structure
      if (!action.type || !action.payload) {
        return { success: false, error: 'Invalid action structure', gameState };
      }

      // Route to appropriate action handler
      switch (action.type) {
        case GameActionType.MOVE_UNIT:
          return GameEngine.processMoveUnit(gameState, action);

        case GameActionType.ATTACK_UNIT:
          return GameEngine.processAttackUnit(gameState, action);

        case GameActionType.FOUND_CITY:
          return GameEngine.processFoundCity(gameState, action);

        case GameActionType.BUILD_IMPROVEMENT:
          return GameEngine.processBuildImprovement(gameState, action);

        case GameActionType.CHANGE_PRODUCTION:
          return GameEngine.processChangeProduction(gameState, action);

        case GameActionType.RESEARCH_TECHNOLOGY:
          return GameEngine.processResearchTechnology(gameState, action);

        case GameActionType.END_TURN:
          return GameEngine.processEndTurn(gameState, action);

        default:
          return { success: false, error: `Unknown action type: ${action.type}`, gameState };
      }
    } catch (error) {
      logger.error('Error processing action:', error);
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
    const unit = GameEngine.findUnit(gameState, unitId);
    if (!unit) {
      return { success: false, error: `Unit ${unitId} not found`, gameState };
    }

    // Verify the action is being performed by the correct player
    const { playerId } = action.payload;
    if (playerId !== gameState.currentPlayer) {
      return { success: false, error: 'Action not performed by current player', gameState };
    }

    // Verify unit belongs to the player making the action
    if (unit.playerId !== playerId) {
      return { success: false, error: 'Unit does not belong to acting player', gameState };
    }

    // Check if unit has movement points
    if (unit.movement <= 0) {
      return { success: false, error: 'Unit has no movement points remaining', gameState };
    }

    // Validate movement destination
    const hexMap = HexMap.deserialize(gameState.map);
    
    // Check for unit collision in gameState.units (for tests and some game state formats)
    if (gameState.units) {
      for (const otherUnitId in gameState.units) {
        const otherUnit = gameState.units[otherUnitId];
        if (otherUnit && otherUnit.id !== unitId && otherUnit.x === to.x && otherUnit.y === to.y) {
          return { success: false, error: 'Destination tile is occupied by another unit', gameState };
        }
      }
    }
    
    if (!hexMap.isValidMoveDestination(to.x, to.y, unit.playerId)) {
      return { success: false, error: 'Invalid movement destination', gameState };
    }

    // Calculate movement cost
    const movementCost = GameEngine.calculateMovementCost(hexMap, from, to);
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
    GameEngine.updateVisibilityAroundUnit(hexMap, unit);

    // Update gameState.units if it exists (for tests and some game state formats)
    if (gameState.units && gameState.units[unitId]) {
      gameState.units[unitId] = unit;
    }

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

    const attacker = GameEngine.findUnit(gameState, attackerId);
    const target = GameEngine.findUnit(gameState, targetId);

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
    const combatResult = GameEngine.resolveCombat(attacker, target, hexMap);

    // Apply damage
    target.health -= combatResult.damage;

    // Update gameState.units if it exists (for tests and some game state formats)
    if (gameState.units && gameState.units[targetId]) {
      gameState.units[targetId] = target;
    }
    if (gameState.units && gameState.units[attackerId]) {
      gameState.units[attackerId] = attacker;
    }

    // Remove unit if destroyed
    if (target.health <= 0) {
      GameEngine.removeUnit(gameState, target.id);
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

    const settler = GameEngine.findUnit(gameState, settlerId);
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
    GameEngine.removeUnit(gameState, settler.id);

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

    const worker = GameEngine.findUnit(gameState, workerId);
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
      yield: GameEngine.getImprovementYield(improvementType, tile)
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
      turnsRemaining: GameEngine.calculateProductionTime(productionType, targetId),
      productionStored: 0,
      productionRequired: GameEngine.getProductionCost(productionType, targetId)
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
  /**
   * Enhanced technology research processing with prerequisites and effects
   * Phase 2.2.1 Implementation
   */
  private static processResearchTechnology(gameState: GameState, action: GameAction): ActionResult {
    const { playerId, techId } = action.payload;
    const playerState = gameState.players.find(p => p.userId === playerId);
    
    if (!playerState) {
      return { success: false, error: 'Player not found', gameState };
    }

    // Get technology definition from database
    const technology = TECHNOLOGY_DATABASE[techId];
    if (!technology) {
      return { success: false, error: `Unknown technology: ${techId}`, gameState };
    }

    // Check if already researched
    const existingTech = playerState.technologies.find(t => t.techId === techId);
    if (existingTech && existingTech.isResearched) {
      return { success: false, error: 'Technology already researched', gameState };
    }

    // Validate prerequisites
    const researchedTechIds = playerState.technologies
      .filter(t => t.isResearched)
      .map(t => t.techId);
    
    const prerequisiteResult = validateTechnologyPrerequisites(techId, researchedTechIds);
    if (!prerequisiteResult.valid) {
      return { 
        success: false, 
        error: `Missing prerequisites: ${prerequisiteResult.missingPrerequisites.join(', ')}`, 
        gameState 
      };
    }

    // Calculate research cost with modifiers
    const baseCost = calculateResearchCost(technology, 1.0, 1.0);
    
    // Check if player has sufficient science
    if (playerState.resources.science <= 0) {
      return { 
        success: false, 
        error: 'Insufficient science points to begin research', 
        gameState 
      };
    }

    if (existingTech) {
      // Continue existing research with science allocation
      const scienceToAllocate = Math.min(playerState.resources.science, baseCost - existingTech.progress);
      existingTech.progress += scienceToAllocate;
      playerState.resources.science -= scienceToAllocate;
      
      // Update turns to complete estimate
      const remainingCost = baseCost - existingTech.progress;
      existingTech.turnsToComplete = remainingCost > 0 
        ? Math.ceil(remainingCost / Math.max(playerState.resources.science || 1, 1))
        : 0;
        
      // Check if research is complete
      if (existingTech.progress >= baseCost) {
        GameEngine.completeTechnologyResearch(techId, playerState, gameState);
      }
      
      logger.info(`Player ${playerState.userId} continued research of ${techId}: ${existingTech.progress}/${baseCost}`);
    } else {
      // Start new research
      const initialProgress = Math.min(playerState.resources.science, baseCost);
      const newTech: PlayerTechnology = {
        techId: techId,
        isResearched: false,
        progress: initialProgress,
        turnsToComplete: Math.ceil((baseCost - initialProgress) / Math.max(playerState.resources.science || 1, 1)),
        startedTurn: gameState.currentTurn
      };
      
      playerState.technologies.push(newTech);
      playerState.resources.science -= initialProgress;
      
      // Check if research completed immediately
      if (newTech.progress >= baseCost) {
        GameEngine.completeTechnologyResearch(techId, playerState, gameState);
      }
      
      logger.info(`Player ${playerState.userId} started research of ${techId}: ${newTech.progress}/${baseCost}`);
    }

    gameState.lastUpdate = new Date();
    return {
      success: true,
      message: `Research progress updated for ${technology.name}`,
      gameState
    };
  }

  /**
   * Complete technology research and apply effects
   * Phase 2.2.1 Implementation
   */
  private static completeTechnologyResearch(techId: string, playerState: PlayerState, gameState: GameState): void {
    const tech = playerState.technologies.find(t => t.techId === techId);
    const technology = TECHNOLOGY_DATABASE[techId];
    
    if (!tech || !technology) return;

    // Mark as researched
    tech.isResearched = true;
    tech.turnsToComplete = undefined;
    
    // Apply technology effects
    if (technology.effects) {
      GameEngine.applyTechnologyEffects(technology.effects, playerState, gameState);
    }
    
    logger.info(`Player ${playerState.userId} completed research of ${technology.name} with effects applied`);
  }

  /**
   * Apply technology effects to player and game state
   * Phase 2.2.1 Implementation
   */
  private static applyTechnologyEffects(effects: TechnologyEffects, playerState: PlayerState, gameState: GameState): void {
    // Apply resource bonuses
    if (effects.resourceBonus) {
      Object.entries(effects.resourceBonus).forEach(([resource, bonus]) => {
        if (bonus && playerState.resources[resource as keyof typeof playerState.resources] !== undefined) {
          (playerState.resources as any)[resource] += bonus;
        }
      });
    }

    // Apply research speed bonus (stored for future calculations)
    if (effects.researchSpeed) {
      // This would be applied during science generation calculations
      (playerState as any).modifiers = (playerState as any).modifiers || {};
      (playerState as any).modifiers.researchSpeedMultiplier = ((playerState as any).modifiers.researchSpeedMultiplier || 1.0) * effects.researchSpeed;
    }

    // Apply trade bonuses (stored for future calculations)
    if (effects.tradeBonus) {
      (playerState as any).modifiers = (playerState as any).modifiers || {};
      (playerState as any).modifiers.tradeMultiplier = ((playerState as any).modifiers.tradeMultiplier || 1.0) * effects.tradeBonus;
    }

    // Log effects application
    logger.debug(`Applied technology effects for player ${playerState.userId}:`, effects);
  }

  /**
   * Process end turn action and advance game state
   */
  private static processEndTurn(gameState: GameState, action: GameAction): ActionResult {
    logger.debug(`Processing end turn for player ${gameState.currentPlayer}`);

    // Advance to next player
    const currentPlayerIndex = gameState.players.findIndex(p => p.userId === gameState.currentPlayer);
    const nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;
    gameState.currentPlayer = gameState.players[nextPlayerIndex].userId;

    // If back to first player, increment turn number
    if (nextPlayerIndex === 0) {
      gameState.turn++;

      // Process turn-based updates
      const turnResult = GameEngine.processTurnEnd(gameState);
      if (!turnResult.success) {
        return turnResult;
      }
    }

    // Reset movement for current player's units
    GameEngine.resetPlayerUnitsMovement(gameState, gameState.currentPlayer);

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
      logger.debug(`Processing turn end mechanics for turn ${gameState.turn}`);

      // Process each player
      for (const playerState of gameState.players) {
        if (!playerState.isAlive) continue;

        // Generate resources from cities
        GameEngine.processResourceGeneration(gameState, playerState);

        // Process city production
        GameEngine.processCityProduction(gameState, playerState);

        // Process technology research
        GameEngine.processTechnologyResearch(playerState, gameState);

        // Update player score
        playerState.score = GameEngine.calculatePlayerScore(gameState, playerState);
      }

      // Check victory conditions
      const victoryResult = GameEngine.checkVictoryConditions(gameState);
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
      logger.error('Error processing turn end:', error);
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
      const city = GameEngine.findCityById(hexMap, cityId);
      if (city) {
        const cityYield = GameEngine.calculateCityYield(hexMap, city);

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

    logger.debug(`Player ${playerState.userId} generated:`, generatedResources);
  }

  /**
   * Process city production (units, buildings, wonders)
   */
  private static processCityProduction(gameState: GameState, playerState: PlayerState): void {
    const hexMap = HexMap.deserialize(gameState.map);

    for (const cityId of playerState.cities) {
      const city = GameEngine.findCityById(hexMap, cityId);
      if (!city || !city.production) continue;

      // Add production points
      const cityYield = GameEngine.calculateCityYield(hexMap, city);
      city.production.productionStored += cityYield.production || 0;

      // Check if production is complete
      if (city.production.productionStored >= city.production.productionRequired) {
        GameEngine.completeProduction(gameState, city, playerState);
      }
    }
  }

  /**
   * Enhanced technology research progress during end turn processing
   * Phase 2.2.1 Implementation
   */
  private static processTechnologyResearch(playerState: PlayerState, gameState: GameState): void {
    const scienceGenerated = playerState.resources.science;
    
    for (const tech of playerState.technologies) {
      if (!tech.isResearched && tech.turnsToComplete !== undefined) {
        const technology = TECHNOLOGY_DATABASE[tech.techId];
        if (!technology) continue;

        // Calculate research cost with current modifiers
        const baseCost = calculateResearchCost(technology, 1.0, 1.0);
        
        // Apply research speed multipliers from technologies
        const researchSpeedMultiplier = (playerState as any).modifiers?.researchSpeedMultiplier || 1.0;
        const effectiveScience = scienceGenerated * researchSpeedMultiplier;
        
        // Add science progress
        const previousProgress = tech.progress;
        tech.progress += effectiveScience;

        // Update turns to complete
        const remainingCost = baseCost - tech.progress;
        tech.turnsToComplete = remainingCost > 0 
          ? Math.ceil(remainingCost / Math.max(effectiveScience, 1))
          : 0;

        // Check if research completed this turn
        if (tech.progress >= baseCost && previousProgress < baseCost) {
          GameEngine.completeTechnologyResearch(tech.techId, playerState, gameState);
        }

        logger.debug(`Player ${playerState.userId} research progress: ${tech.techId} - ${tech.progress}/${baseCost}`);
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
        const terrainYield = GameEngine.getTerrainYield(tile.terrain);
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
    // First check gameState.units object (used by tests and some game state formats)
    if (gameState.units && gameState.units[unitId]) {
      return gameState.units[unitId];
    }

    // Then check units on hex tiles (main game state format)
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
    // Remove from gameState.units object (for tests and some game state formats)
    if (gameState.units && gameState.units[unitId]) {
      delete gameState.units[unitId];
    }

    // Remove from hex map tiles
    const hexMap = HexMap.deserialize(gameState.map);
    for (let y = 0; y < hexMap.height; y++) {
      for (let x = 0; x < hexMap.width; x++) {
        const tile = hexMap.getTile(x, y);
        if (tile?.unit && tile.unit.id === unitId) {
          tile.unit = null;
          break;
        }
      }
    }

    // Also remove from player's unit list
    gameState.players.forEach(player => {
      player.units = player.units.filter(id => id !== unitId);
    });

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

    logger.info(`${city.name} completed production of ${city.production.targetId}`);

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
