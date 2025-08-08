import { GameMap, MapTile, TerrainType, TerrainFeature, VisibilityLevel, ResourceType, ResourceCategory, Resource } from '@civ-game/shared';

/**
 * HexMap class for managing hexagonal game maps with coordinate systems and procedural generation
 * Implements axial coordinate system for efficient hex grid operations
 */
export class HexMap implements GameMap {
  public width: number;
  public height: number;
  public tiles: MapTile[][];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.tiles = [];
    this.initializeEmptyMap();
  }

  /**
   * Initialize empty map with default grassland terrain
   */
  private initializeEmptyMap(): void {
    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.width; x++) {
        this.tiles[y][x] = this.createEmptyTile(x, y);
      }
    }
  }

  /**
   * Create an empty tile with default properties
   */
  private createEmptyTile(x: number, y: number): MapTile {
    return {
      x,
      y,
      terrain: TerrainType.GRASSLAND,
      features: [],
      resources: null,
      improvement: null,
      unit: null,
      city: null,
      visibility: {} // Will be populated per player
    };
  }

  /**
   * Generate procedural map with varied terrain, features, and resources
   */
  public generateProceduralMap(seed?: number): void {
    // Use seed for reproducible map generation
    const random = seed ? this.seededRandom(seed) : Math.random;

    // First pass: Generate base terrain using Perlin-like noise simulation
    this.generateBaseTerrain(random);

    // Second pass: Add terrain features (forests, hills, etc.)
    this.generateTerrainFeatures(random);

    // Third pass: Place strategic and luxury resources
    this.generateResources(random);

    // Fourth pass: Ensure balanced starting positions
    this.balanceStartingPositions(random);

    console.log(`Generated ${this.width}x${this.height} hex map with procedural generation`);
  }

  /**
   * Generate base terrain using simplified noise generation
   */
  private generateBaseTerrain(random: () => number): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        
        // Simple terrain generation based on position and noise
        const distanceFromCenter = this.getDistanceFromCenter(x, y);
        const noise = this.simpleNoise(x, y, 0.1, random) + this.simpleNoise(x, y, 0.05, random) * 0.5;
        
        // Coastal areas
        if (distanceFromCenter > this.width * 0.4) {
          tile.terrain = random() < 0.7 ? TerrainType.OCEAN : TerrainType.COAST;
        }
        // Mountain ranges (using noise)
        else if (noise > 0.7) {
          tile.terrain = TerrainType.MOUNTAINS;
        }
        // Hills
        else if (noise > 0.5) {
          tile.terrain = TerrainType.HILLS;
        }
        // Desert regions
        else if (noise < -0.4 && random() < 0.3) {
          tile.terrain = TerrainType.DESERT;
        }
        // Plains
        else if (noise < 0 && random() < 0.4) {
          tile.terrain = TerrainType.PLAINS;
        }
        // Default grassland (fertile areas)
        else {
          tile.terrain = TerrainType.GRASSLAND;
        }
      }
    }
  }

  /**
   * Add terrain features like forests, jungles, etc.
   */
  private generateTerrainFeatures(random: () => number): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = this.tiles[y][x];
        
        // Skip water tiles and mountains
        if (tile.terrain === TerrainType.OCEAN || tile.terrain === TerrainType.MOUNTAINS) {
          continue;
        }

        const featureChance = random();
        
        // Forests on grassland and plains
        if ((tile.terrain === TerrainType.GRASSLAND || tile.terrain === TerrainType.PLAINS) && featureChance < 0.3) {
          tile.features.push(TerrainFeature.FOREST);
        }
        // Jungles on grassland near water
        else if (tile.terrain === TerrainType.GRASSLAND && featureChance < 0.15 && this.isNearWater(x, y)) {
          tile.features.push(TerrainFeature.JUNGLE);
        }
        // Oasis in desert
        else if (tile.terrain === TerrainType.DESERT && featureChance < 0.1) {
          tile.features.push(TerrainFeature.OASIS);
        }
        // Marsh near coast
        else if (tile.terrain === TerrainType.COAST && featureChance < 0.2) {
          tile.features.push(TerrainFeature.MARSH);
        }
      }
    }
  }

  /**
   * Generate resources (bonus, luxury, strategic) with balanced distribution
   */
  private generateResources(random: () => number): void {
    const resourceDensity = 0.25; // 25% of tiles have resources
    const resourcesPlaced = Math.floor(this.width * this.height * resourceDensity);
    
    const availableResources = this.getAvailableResources();
    
    for (let i = 0; i < resourcesPlaced; i++) {
      const x = Math.floor(random() * this.width);
      const y = Math.floor(random() * this.height);
      const tile = this.tiles[y][x];
      
      // Skip if tile already has resource or is water/mountain
      if (tile.resources || tile.terrain === TerrainType.OCEAN || tile.terrain === TerrainType.MOUNTAINS) {
        continue;
      }

      // Select appropriate resource for terrain type
      const suitableResources = availableResources.filter(resource => 
        this.isResourceSuitableForTerrain(resource, tile)
      );
      
      if (suitableResources.length > 0) {
        const selectedResource = suitableResources[Math.floor(random() * suitableResources.length)];
        tile.resources = selectedResource;
      }
    }
  }

  /**
   * Balance starting positions to ensure fair gameplay
   */
  private balanceStartingPositions(random: () => number): void {
    // Ensure there are good starting locations with food and production
    const startingPositions = this.findGoodStartingPositions(6); // Support up to 6 players initially
    
    startingPositions.forEach(pos => {
      const tile = this.getTile(pos.x, pos.y);
      if (tile) {
        // Ensure starting areas have basic resources
        if (!tile.resources && tile.terrain === TerrainType.GRASSLAND) {
          tile.resources = {
            type: ResourceType.WHEAT,
            category: ResourceCategory.BONUS,
            yield: { food: 2, production: 1 }
          };
        }
        
        // Clear any negative features from starting positions
        tile.features = tile.features.filter(f => f !== TerrainFeature.MARSH);
      }
    });
  }

  /**
   * Find good starting positions for players
   */
  private findGoodStartingPositions(maxPlayers: number): { x: number, y: number }[] {
    const positions: { x: number, y: number }[] = [];
    const minDistance = Math.min(this.width, this.height) / 4; // Minimum distance between starting positions
    
    for (let attempts = 0; attempts < maxPlayers * 10 && positions.length < maxPlayers; attempts++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      const tile = this.tiles[y]?.[x];
      
      if (!tile || tile.terrain === TerrainType.OCEAN || tile.terrain === TerrainType.MOUNTAINS) {
        continue;
      }
      
      // Check distance from other starting positions
      const tooClose = positions.some(pos => 
        this.calculateDistance(x, y, pos.x, pos.y) < minDistance
      );
      
      if (!tooClose) {
        positions.push({ x, y });
      }
    }
    
    return positions;
  }

  /**
   * Get available resources for map generation
   */
  private getAvailableResources(): Resource[] {
    return [
      // Bonus Resources (Food)
      { type: ResourceType.WHEAT, category: ResourceCategory.BONUS, yield: { food: 2, production: 1 } },
      { type: ResourceType.RICE, category: ResourceCategory.BONUS, yield: { food: 2, production: 1 } },
      { type: ResourceType.CORN, category: ResourceCategory.BONUS, yield: { food: 3 } },
      { type: ResourceType.CATTLE, category: ResourceCategory.BONUS, yield: { food: 2, production: 1 } },
      { type: ResourceType.SHEEP, category: ResourceCategory.BONUS, yield: { food: 1, production: 1 } },
      { type: ResourceType.DEER, category: ResourceCategory.BONUS, yield: { food: 1, production: 1 } },
      { type: ResourceType.FISH, category: ResourceCategory.BONUS, yield: { food: 3 } },
      
      // Luxury Resources
      { type: ResourceType.GOLD, category: ResourceCategory.LUXURY, yield: { gold: 3 } },
      { type: ResourceType.SILVER, category: ResourceCategory.LUXURY, yield: { gold: 2 } },
      { type: ResourceType.GEMS, category: ResourceCategory.LUXURY, yield: { gold: 3 } },
      { type: ResourceType.SILK, category: ResourceCategory.LUXURY, yield: { gold: 2 } },
      { type: ResourceType.SPICES, category: ResourceCategory.LUXURY, yield: { gold: 2 } },
      
      // Strategic Resources
      { type: ResourceType.IRON, category: ResourceCategory.STRATEGIC, yield: { production: 2 }, requiredTech: 'iron_working' },
      { type: ResourceType.HORSES, category: ResourceCategory.STRATEGIC, yield: { production: 1 }, requiredTech: 'animal_husbandry' },
      { type: ResourceType.COAL, category: ResourceCategory.STRATEGIC, yield: { production: 3 }, requiredTech: 'steam_power' },
    ];
  }

  /**
   * Check if resource is suitable for terrain type
   */
  private isResourceSuitableForTerrain(resource: Resource, tile: MapTile): boolean {
    switch (resource.type) {
      case ResourceType.WHEAT:
      case ResourceType.CATTLE:
        return tile.terrain === TerrainType.GRASSLAND || tile.terrain === TerrainType.PLAINS;
      case ResourceType.RICE:
        return tile.terrain === TerrainType.GRASSLAND && tile.features.includes(TerrainFeature.FLOOD_PLAINS);
      case ResourceType.FISH:
        return tile.terrain === TerrainType.COAST;
      case ResourceType.DEER:
        return tile.features.includes(TerrainFeature.FOREST);
      case ResourceType.GOLD:
      case ResourceType.SILVER:
        return tile.terrain === TerrainType.HILLS || tile.terrain === TerrainType.DESERT;
      case ResourceType.IRON:
        return tile.terrain === TerrainType.HILLS;
      case ResourceType.HORSES:
        return tile.terrain === TerrainType.GRASSLAND || tile.terrain === TerrainType.PLAINS;
      default:
        return true;
    }
  }

  /**
   * Simple noise generation function
   */
  private simpleNoise(x: number, y: number, scale: number, random: () => number): number {
    const scaledX = x * scale;
    const scaledY = y * scale;
    
    // Simple pseudo-noise based on position
    const value = Math.sin(scaledX) * Math.cos(scaledY) + Math.sin(scaledX * 2.1) * Math.cos(scaledY * 1.7) * 0.5;
    
    // Add some randomness
    return value + (random() - 0.5) * 0.3;
  }

  /**
   * Check if tile is near water
   */
  private isNearWater(x: number, y: number): boolean {
    const neighbors = this.getNeighbors(x, y);
    return neighbors.some(tile => tile.terrain === TerrainType.OCEAN || tile.terrain === TerrainType.COAST);
  }

  /**
   * Get distance from center of map
   */
  private getDistanceFromCenter(x: number, y: number): number {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    return Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
  }

  /**
   * Seeded random number generator for reproducible maps
   */
  private seededRandom(seed: number): () => number {
    let currentSeed = seed;
    return () => {
      const x = Math.sin(currentSeed++) * 10000;
      return x - Math.floor(x);
    };
  }

  /**
   * Get tile at specific coordinates
   */
  public getTile(x: number, y: number): MapTile | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null;
    }
    return this.tiles[y][x];
  }

  /**
   * Get neighboring tiles (6 neighbors for hex grid)
   */
  public getNeighbors(x: number, y: number): MapTile[] {
    const neighbors: MapTile[] = [];
    
    // Hexagonal grid neighbors (axial coordinates)
    const hexDirections = [
      { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: -1 },
      { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }
    ];

    hexDirections.forEach(dir => {
      const tile = this.getTile(x + dir.x, y + dir.y);
      if (tile) {
        neighbors.push(tile);
      }
    });

    return neighbors;
  }

  /**
   * Calculate distance between two points
   */
  public calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  /**
   * Set tile visibility for a player
   */
  public setTileVisibility(x: number, y: number, playerId: string, level: VisibilityLevel): void {
    const tile = this.getTile(x, y);
    if (tile) {
      tile.visibility[playerId] = level;
    }
  }

  /**
   * Get tiles within range of a position
   */
  public getTilesInRange(centerX: number, centerY: number, range: number): MapTile[] {
    const tilesInRange: MapTile[] = [];
    
    for (let y = Math.max(0, centerY - range); y <= Math.min(this.height - 1, centerY + range); y++) {
      for (let x = Math.max(0, centerX - range); x <= Math.min(this.width - 1, centerX + range); x++) {
        if (this.calculateDistance(centerX, centerY, x, y) <= range) {
          const tile = this.getTile(x, y);
          if (tile) {
            tilesInRange.push(tile);
          }
        }
      }
    }
    
    return tilesInRange;
  }

  /**
   * Check if tile is valid for unit movement
   */
  public isValidMoveDestination(x: number, y: number, playerId: string): boolean {
    const tile = this.getTile(x, y);
    if (!tile) return false;
    
    // Can't move to mountains or ocean (for land units)
    if (tile.terrain === TerrainType.MOUNTAINS || tile.terrain === TerrainType.OCEAN) {
      return false;
    }
    
    // Can't move to tiles occupied by other player's units
    if (tile.unit && tile.unit.playerId !== playerId) {
      return false;
    }
    
    return true;
  }

  /**
   * Serialize map for network transmission
   */
  public serialize(): any {
    return {
      width: this.width,
      height: this.height,
      tiles: this.tiles
    };
  }

  /**
   * Deserialize map from data
   */
  public static deserialize(data: any): HexMap {
    const map = new HexMap(data.width, data.height);
    map.tiles = data.tiles;
    return map;
  }
}