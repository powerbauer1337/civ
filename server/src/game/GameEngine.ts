import { GameAction, GameActionType, GameState, PlayerState, Unit, City, UnitType, TerrainType, VisibilityLevel, ProductionType } from '@civ-game/shared';
import { Technology, TechnologyEffects, PlayerTechnology, TECHNOLOGY_DATABASE, validateTechnologyPrerequisites, calculateResearchCost, TechnologyTradeOffer, TradeOfferStatus } from '@civ-game/shared';
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

        // Technology Trading Actions
        case GameActionType.TECH_TRADE_OFFER:
          return GameEngine.processTechTradeOffer(gameState, action);

        case GameActionType.TECH_TRADE_ACCEPT:
          return GameEngine.processTechTradeAccept(gameState, action);

        case GameActionType.TECH_TRADE_REJECT:
          return GameEngine.processTechTradeReject(gameState, action);

        case GameActionType.TECH_TRADE_CANCEL:
          return GameEngine.processTechTradeCancel(gameState, action);

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
    try {
      const { settlerId, unitId, location, position, cityName } = action.payload;
      const actualSettlerId = settlerId || unitId;
      const actualLocation = location || position;

      if (!actualSettlerId || !actualLocation) {
        return { success: false, error: 'Missing required parameters: settlerId and location', gameState };
      }

      const settler = GameEngine.findUnit(gameState, actualSettlerId);
      if (!settler || settler.type !== UnitType.SETTLER) {
        return { success: false, error: 'Valid settler unit required to found city', gameState };
      }

      const hexMap = HexMap.deserialize(gameState.map);
    // Handle both axial (q,r) and cartesian (x,y) coordinate systems
    const x = actualLocation.x !== undefined ? actualLocation.x : actualLocation.q;
    const y = actualLocation.y !== undefined ? actualLocation.y : actualLocation.r;
    const tile = hexMap.getTile(x, y);
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
    const nearbyTiles = hexMap.getTilesInRange(x, y, 3);
    const hasNearbyCity = nearbyTiles.some(t => t.city !== null);
    if (hasNearbyCity) {
      return { success: false, error: 'Too close to existing city', gameState };
    }

    // Create new city
    const newCity: City = {
      id: uuidv4(),
      name: cityName || `${settler.playerId}'s City`,
      playerId: settler.playerId,
      x: x,
      y: y,
      population: 1,
      health: 100,
      maxHealth: 100,
      production: null,
      buildings: [],
      workingTiles: [{ x: x, y: y }], // City works its own tile initially
      founded: new Date()
    };

    // Add city to tile and game state
    tile.city = newCity;
    const playerState = gameState.players.find(p => p.userId === settler.playerId || p.id === settler.playerId);
    if (playerState) {
      playerState.cities.push(newCity.id);
    } else {
      logger.warn(`Player not found for settler ${settler.playerId}`);
    }

    // Add city to global cities object if it exists
    if (gameState.cities) {
      gameState.cities[newCity.id] = newCity;
    }

    // Remove settler unit (consumed in founding)
    GameEngine.removeUnit(gameState, settler.id);

    // Update map and game state
    gameState.map = hexMap.serialize();
    gameState.lastUpdate = new Date();

      return {
        success: true,
        message: `Founded city ${newCity.name} at (${x}, ${y}),`,
        gameState
      };
    } catch (error) {
      logger.error('Error in processFoundCity:', error);
      return { success: false, error: `City founding failed: ${error}`, gameState };
    }
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
    try {
      const { cityId, productionType, targetId } = action.payload;

      if (!cityId || !productionType || !targetId) {
        return { success: false, error: 'Missing required parameters for production change', gameState };
      }

      // Find city in game state - first check gameState.cities
      let targetCity: City | null = null;

      if (gameState.cities && gameState.cities[cityId]) {
        targetCity = gameState.cities[cityId];
      } else {
        // Fall back to searching the map
        const hexMap = HexMap.deserialize(gameState.map);
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

      // Update both the city in gameState.cities and in map
      if (gameState.cities && gameState.cities[cityId]) {
        gameState.cities[cityId] = targetCity;
      }

      // Update the map if city was found there
      const hexMap = HexMap.deserialize(gameState.map);
      const tile = hexMap.getTile(targetCity.x, targetCity.y);
      if (tile && tile.city) {
        tile.city.production = targetCity.production;
      }
      gameState.map = hexMap.serialize();
      gameState.lastUpdate = new Date();

      return {
        success: true,
        message: `City ${targetCity.name} now producing ${targetId}`,
        gameState
      };
    } catch (error) {
      logger.error('Error in processChangeProduction:', error);
      return { success: false, error: `Production change failed: ${error}`, gameState };
    }
  }

  /**
   * Process technology research action
   */
  /**
   * Enhanced technology research processing with prerequisites and effects
   * Phase 2.2.1 Implementation
   */
  private static processResearchTechnology(gameState: GameState, action: GameAction): ActionResult {
    try {
      const { playerId, techId, technologyId } = action.payload;
      const actualTechId = techId || technologyId;

      if (!actualTechId || !playerId) {
        return { success: false, error: 'Missing required parameters for technology research', gameState };
      }

      const playerState = gameState.players.find(p => p.userId === playerId || p.id === playerId);

      if (!playerState) {
        return { success: false, error: 'Player not found', gameState };
      }

      // Import technology validation from shared package
      const { TECHNOLOGY_DATABASE } = require('@civ-game/shared');
      const { validateTechnologyPrerequisites } = require('@civ-game/shared');

      // Check if technology exists
      if (!TECHNOLOGY_DATABASE[actualTechId]) {
        return { success: false, error: 'Technology not found', gameState };
      }

      // Check if player has sufficient science
      if (playerState.resources.science <= 0) {
        return {
          success: false,
          error: 'Insufficient science points to begin research',
          gameState
        };
      }

      // Get current researched technologies for prerequisite validation
      const researchedTechs: string[] = [];
      // Handle both simple string arrays and PlayerTechnology arrays for backward compatibility
      if (playerState.technologies.length > 0 && typeof playerState.technologies[0] === 'string') {
        // Simple string array format
        researchedTechs.push(...(playerState.technologies as unknown as string[]));
      } else {
        // PlayerTechnology array format
        researchedTechs.push(...playerState.technologies.filter(t => t.isResearched).map(t => t.techId));
      }

      // Check prerequisites
      const prerequisiteCheck = validateTechnologyPrerequisites(actualTechId, researchedTechs);
      if (!prerequisiteCheck.valid) {
        return {
          success: false,
          error: `Missing prerequisites: ${prerequisiteCheck.missingPrerequisites.join(', ')}`,
          gameState
        };
      }

      const techData = TECHNOLOGY_DATABASE[actualTechId];
      const isSimpleArray = playerState.technologies.length === 0 || typeof playerState.technologies[0] === 'string';

      if (isSimpleArray) {
        // Handle simple string array format for backward compatibility
        const techArray = playerState.technologies as unknown as string[];
        if (techArray.includes(actualTechId)) {
          return { success: false, error: 'Technology already researched', gameState };
        }

        // Add technology and apply effects immediately (simple format doesn't track progress)
        techArray.push(actualTechId);
        GameEngine.applyTechnologyEffects(techData.effects, playerState, gameState);

      } else {
        // Handle PlayerTechnology array format
        const existingTech = playerState.technologies.find(t => t.techId === actualTechId);
        if (existingTech && existingTech.isResearched) {
          return { success: false, error: 'Technology already researched', gameState };
        }

        if (existingTech) {
          // Add progress to existing research
          existingTech.progress = Math.min(100, (existingTech.progress || 0) + 25);
          if (existingTech.progress >= 100) {
            existingTech.isResearched = true;
            // Apply technology effects
            GameEngine.applyTechnologyEffects(techData.effects, playerState, gameState);
          }
        } else {
          // Add new technology with progress
          const newTech = {
            techId: actualTechId,
            isResearched: false,
            progress: 25
          };

          // Check if we have enough science to complete it immediately
          if (playerState.resources.science >= techData.cost) {
            newTech.isResearched = true;
            newTech.progress = 100;
            // Apply technology effects
            GameEngine.applyTechnologyEffects(techData.effects, playerState, gameState);
          }

          playerState.technologies.push(newTech);
        }
      }

      // Consume science resources based on technology cost
      const scienceCost = Math.min(playerState.resources.science, techData.cost);
      playerState.resources.science = Math.max(0, playerState.resources.science - scienceCost);

      gameState.lastUpdate = new Date();
      return {
        success: true,
        message: `Technology ${actualTechId} research progressed successfully`,
        gameState
      };
    } catch (error) {
      logger.error('Error in processResearchTechnology:', error);
      return { success: false, error: `Technology research failed: ${error}`, gameState };
    }
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
      // Also update currentTurn for compatibility
      (gameState as any).currentTurn = gameState.turn;

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

      // Reset movement for all players at the start of turn processing
      for (const playerState of gameState.players) {
        if (playerState.isAlive !== false) { // Default to alive if not specified
          GameEngine.resetPlayerUnitsMovement(gameState, playerState.userId);
        }
      }

      // Process each player
      for (const playerState of gameState.players) {
        if (playerState.isAlive === false) continue;

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
    if (!hexMap) {
      logger.warn('Could not deserialize map for resource generation');
      return;
    }

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
    if (!hexMap) {
      logger.warn('Could not deserialize map for city production');
      return;
    }

    for (const cityId of playerState.cities) {
      const city = GameEngine.findCityById(hexMap, cityId);
      if (!city || !city.production) continue;

      // Add production points
      const cityYield = GameEngine.calculateCityYield(hexMap, city);
      // Handle different production property naming conventions
      const progress = (city.production as any).progress || city.production.productionStored || 0;
      const cost = (city.production as any).cost || city.production.productionRequired || 0;
      const productionYield = cityYield.production || 0;

      // Update progress
      if ((city.production as any).progress !== undefined) {
        (city.production as any).progress += productionYield;
      } else if (city.production.productionStored !== undefined) {
        city.production.productionStored += productionYield;
      }

      // Check if production is complete
      const currentProgress = (city.production as any).progress || city.production.productionStored || 0;
      const requiredCost = (city.production as any).cost || city.production.productionRequired || 0;
      if (currentProgress >= requiredCost) {
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

    // Handle both simple array of technology strings and complex PlayerTechnology objects
    for (const tech of playerState.technologies) {
      // Skip if tech is just a string (already researched technology) or undefined/null
      if (typeof tech === 'string' || !tech) continue;

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
    const finalDamage = Math.max(1, Math.floor(baseDamage * randomMultiplier));

    return {
      damage: finalDamage,
      message: `${attacker.type} deals ${finalDamage} damage to ${defender.type}`
    };
  }

  private static resetPlayerUnitsMovement(gameState: GameState, playerId: string): void {
    // Reset movement in gameState.units if it exists
    if (gameState.units) {
      Object.values(gameState.units).forEach(unit => {
        if (unit && unit.playerId === playerId) {
          unit.movement = unit.maxMovement;
          (unit as any).moves = unit.maxMovement; // Handle both property names
        }
      });
    }

    // Reset movement in map tiles
    const hexMap = HexMap.deserialize(gameState.map);
    if (!hexMap) {
      logger.warn('Could not deserialize map for unit movement reset');
      return;
    }
    for (let y = 0; y < hexMap.height; y++) {
      for (let x = 0; x < hexMap.width; x++) {
        const tile = hexMap.getTile(x, y);
        if (tile?.unit && tile.unit.playerId === playerId) {
          tile.unit.movement = tile.unit.maxMovement;
          (tile.unit as any).moves = tile.unit.maxMovement; // Handle both property names
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


  private static completeProduction(gameState: GameState, city: City, playerState: PlayerState): void {
    if (!city.production) return;

    const productionTarget = city.production.targetId;
    logger.info(`${city.name} completed production of ${productionTarget}`);

    // Handle unit production
    if (city.production.type === ProductionType.UNIT) {
      const newUnit: Unit = {
        id: uuidv4(),
        type: productionTarget as UnitType,
        name: `${productionTarget} Unit`,
        playerId: city.playerId,
        x: city.x,
        y: city.y,
        // position: { q: city.x, r: city.y }, // Removed - not part of Unit interface
        movement: 2, // Default movement points
        maxMovement: 2,
        health: 100,
        maxHealth: 100,
        strength: 10,
        experience: 0,
        promotions: [],
        status: []
      };

      // Add unit to game state
      if (gameState.units) {
        gameState.units[newUnit.id] = newUnit;
      } else {
        // Initialize units if it doesn't exist
        gameState.units = {};
        gameState.units[newUnit.id] = newUnit;
      }
    }

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

  /**
   * Calculate production time for a unit/building based on type
   */
  private static calculateProductionTime(productionType: string, targetId: string): number {
    // Simple implementation - can be expanded
    if (productionType === 'unit') {
      switch (targetId) {
        case UnitType.WARRIOR: return 5;
        case UnitType.SCOUT: return 3;
        case UnitType.SETTLER: return 8;
        default: return 5;
      }
    }
    return 5; // Default production time
  }

  /**
   * Get production cost for a unit/building
   */
  private static getProductionCost(productionType: string, targetId: string): number {
    // Simple implementation - can be expanded
    if (productionType === 'unit') {
      switch (targetId) {
        case UnitType.WARRIOR: return 40;
        case UnitType.SCOUT: return 25;
        case UnitType.SETTLER: return 80;
        default: return 40;
      }
    }
    return 40; // Default production cost
  }

  /**
   * Process technology trade offer
   */
  private static processTechTradeOffer(gameState: GameState, action: GameAction): ActionResult {
    const { fromPlayerId, toPlayerId, offeredTech, requestedTech, offeredResources, requestedResources, message } = action.payload;

    if (!fromPlayerId || !toPlayerId || !offeredTech || !requestedTech) {
      return { success: false, error: 'Missing required parameters for tech trade offer', gameState };
    }

    // Verify the action is being performed by the correct player
    if (fromPlayerId !== gameState.currentPlayer) {
      return { success: false, error: 'Tech trade offer not from current player', gameState };
    }

    // Find both players
    const fromPlayer = gameState.players.find(p => p.id === fromPlayerId || p.userId === fromPlayerId);
    const toPlayer = gameState.players.find(p => p.id === toPlayerId || p.userId === toPlayerId);

    if (!fromPlayer || !toPlayer) {
      return { success: false, error: 'One or both players not found', gameState };
    }

    // Normalize tech arrays
    const offeredTechArray = Array.isArray(offeredTech) ? offeredTech : [offeredTech];
    const requestedTechArray = Array.isArray(requestedTech) ? requestedTech : [requestedTech];

    // Verify the offering player has the technologies they're offering
    for (const techId of offeredTechArray) {
      const playerTech = fromPlayer.technologies.find(t => t.techId === techId);
      if (!playerTech || !playerTech.isResearched) {
        return { success: false, error: `Player ${fromPlayerId} does not have technology ${techId}`, gameState };
      }
    }

    // Verify the target player has the technologies being requested
    for (const techId of requestedTechArray) {
      const playerTech = toPlayer.technologies.find(t => t.techId === techId);
      if (!playerTech || !playerTech.isResearched) {
        return { success: false, error: `Player ${toPlayerId} does not have technology ${techId}`, gameState };
      }
    }

    // Initialize tradeOffers array if it doesn't exist
    if (!gameState.tradeOffers) {
      gameState.tradeOffers = [];
    }

    // Create the trade offer
    const tradeOffer: TechnologyTradeOffer = {
      id: uuidv4(),
      fromPlayerId,
      toPlayerId,
      offeredTech: offeredTechArray,
      requestedTech: requestedTechArray,
      offeredResources: offeredResources || {},
      requestedResources: requestedResources || {},
      status: TradeOfferStatus.PENDING,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expires in 24 hours
      createdAt: new Date(),
      message: message || ''
    };

    gameState.tradeOffers.push(tradeOffer);

    logger.info(`Technology trade offer created: ${fromPlayerId} → ${toPlayerId}`);
    return {
      success: true,
      message: `Technology trade offer sent to ${toPlayer.name}`,
      gameState
    };
  }

  /**
   * Process technology trade acceptance
   */
  private static processTechTradeAccept(gameState: GameState, action: GameAction): ActionResult {
    const { tradeOfferId } = action.payload;

    if (!tradeOfferId) {
      return { success: false, error: 'Missing trade offer ID', gameState };
    }

    if (!gameState.tradeOffers) {
      return { success: false, error: 'No trade offers exist', gameState };
    }

    // Find the trade offer
    const tradeOffer = gameState.tradeOffers.find(offer => offer.id === tradeOfferId);
    if (!tradeOffer) {
      return { success: false, error: 'Trade offer not found', gameState };
    }

    // Verify the action is being performed by the target player
    if (tradeOffer.toPlayerId !== gameState.currentPlayer) {
      return { success: false, error: 'Only the target player can accept this trade', gameState };
    }

    // Check if offer has expired or is not pending
    if (tradeOffer.status !== TradeOfferStatus.PENDING) {
      return { success: false, error: 'Trade offer is no longer pending', gameState };
    }

    if (tradeOffer.expiresAt < new Date()) {
      tradeOffer.status = TradeOfferStatus.EXPIRED;
      return { success: false, error: 'Trade offer has expired', gameState };
    }

    // Find both players
    const fromPlayer = gameState.players.find(p => p.id === tradeOffer.fromPlayerId || p.userId === tradeOffer.fromPlayerId);
    const toPlayer = gameState.players.find(p => p.id === tradeOffer.toPlayerId || p.userId === tradeOffer.toPlayerId);

    if (!fromPlayer || !toPlayer) {
      return { success: false, error: 'One or both players not found', gameState };
    }

    // Execute the trade - give technologies to each player
    for (const techId of tradeOffer.offeredTech) {
      const existingTech = toPlayer.technologies.find(t => t.techId === techId);
      if (!existingTech) {
        toPlayer.technologies.push({
          techId,
          isResearched: true,
          progress: 0,
          startedTurn: gameState.turn
        });
      } else {
        existingTech.isResearched = true;
      }
    }

    for (const techId of tradeOffer.requestedTech) {
      const existingTech = fromPlayer.technologies.find(t => t.techId === techId);
      if (!existingTech) {
        fromPlayer.technologies.push({
          techId,
          isResearched: true,
          progress: 0,
          startedTurn: gameState.turn
        });
      } else {
        existingTech.isResearched = true;
      }
    }

    // Exchange resources if specified
    if (tradeOffer.offeredResources) {
      Object.entries(tradeOffer.offeredResources).forEach(([resource, amount]) => {
        if (amount && fromPlayer.resources[resource as keyof typeof fromPlayer.resources] >= amount) {
          (fromPlayer.resources[resource as keyof typeof fromPlayer.resources] as number) -= amount;
          (toPlayer.resources[resource as keyof typeof toPlayer.resources] as number) += amount;
        }
      });
    }

    if (tradeOffer.requestedResources) {
      Object.entries(tradeOffer.requestedResources).forEach(([resource, amount]) => {
        if (amount && toPlayer.resources[resource as keyof typeof toPlayer.resources] >= amount) {
          (toPlayer.resources[resource as keyof typeof toPlayer.resources] as number) -= amount;
          (fromPlayer.resources[resource as keyof typeof fromPlayer.resources] as number) += amount;
        }
      });
    }

    // Update trade offer status
    tradeOffer.status = TradeOfferStatus.ACCEPTED;

    logger.info(`Technology trade accepted: ${tradeOffer.fromPlayerId} ↔ ${tradeOffer.toPlayerId}`);
    return {
      success: true,
      message: 'Technology trade completed successfully',
      gameState
    };
  }

  /**
   * Process technology trade rejection
   */
  private static processTechTradeReject(gameState: GameState, action: GameAction): ActionResult {
    const { tradeOfferId } = action.payload;

    if (!tradeOfferId) {
      return { success: false, error: 'Missing trade offer ID', gameState };
    }

    if (!gameState.tradeOffers) {
      return { success: false, error: 'No trade offers exist', gameState };
    }

    // Find the trade offer
    const tradeOffer = gameState.tradeOffers.find(offer => offer.id === tradeOfferId);
    if (!tradeOffer) {
      return { success: false, error: 'Trade offer not found', gameState };
    }

    // Verify the action is being performed by the target player
    if (tradeOffer.toPlayerId !== gameState.currentPlayer) {
      return { success: false, error: 'Only the target player can reject this trade', gameState };
    }

    // Update trade offer status
    tradeOffer.status = TradeOfferStatus.REJECTED;

    logger.info(`Technology trade rejected: ${tradeOffer.fromPlayerId} → ${tradeOffer.toPlayerId}`);
    return {
      success: true,
      message: 'Technology trade offer rejected',
      gameState
    };
  }

  /**
   * Process technology trade cancellation
   */
  private static processTechTradeCancel(gameState: GameState, action: GameAction): ActionResult {
    const { tradeOfferId } = action.payload;

    if (!tradeOfferId) {
      return { success: false, error: 'Missing trade offer ID', gameState };
    }

    if (!gameState.tradeOffers) {
      return { success: false, error: 'No trade offers exist', gameState };
    }

    // Find the trade offer
    const tradeOffer = gameState.tradeOffers.find(offer => offer.id === tradeOfferId);
    if (!tradeOffer) {
      return { success: false, error: 'Trade offer not found', gameState };
    }

    // Verify the action is being performed by the offering player
    if (tradeOffer.fromPlayerId !== gameState.currentPlayer) {
      return { success: false, error: 'Only the offering player can cancel this trade', gameState };
    }

    // Update trade offer status
    tradeOffer.status = TradeOfferStatus.CANCELLED;

    logger.info(`Technology trade cancelled: ${tradeOffer.fromPlayerId} → ${tradeOffer.toPlayerId}`);
    return {
      success: true,
      message: 'Technology trade offer cancelled',
      gameState
    };
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
