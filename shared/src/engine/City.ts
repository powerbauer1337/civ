import { v4 as uuidv4 } from 'uuid';
import { HexCoordinate, BuildingType, GameResources } from '../types/GameTypes';

export interface BuildingInfo {
  type: BuildingType;
  name: string;
  cost: number;
  maintenance: number;
  effects: {
    gold?: number;
    science?: number;
    culture?: number;
    production?: number;
    food?: number;
    happiness?: number;
  };
}

export class City {
  public readonly id: string;
  public name: string;
  public ownerId: string;
  public position: HexCoordinate;
  public population: number;
  public health: number;
  public maxHealth: number;
  public buildings: Set<BuildingType>;
  public currentProduction: string | null;
  public productionProgress: number;
  public foodStored: number;
  public territory: HexCoordinate[]; // Owned tiles
  public specialists: { [key: string]: number }; // Scientists, Artists, etc.
  public createdAt: Date;
  private buildingQueue: string[];

  constructor(
    id: string | undefined,
    name: string,
    ownerId: string,
    position: HexCoordinate,
    population: number
  ) {
    this.id = id || uuidv4();
    this.name = name;
    this.ownerId = ownerId;
    this.position = position;
    this.population = population;
    this.health = 200;
    this.maxHealth = 200;
    this.buildings = new Set();
    this.currentProduction = null;
    this.productionProgress = 0;
    this.foodStored = 0;
    this.territory = [position]; // Start with city center
    this.specialists = {};
    this.createdAt = new Date();
    this.buildingQueue = [];
    
    // Every city starts with a palace/town center
    if (this.buildings.size === 0) {
      this.buildings.add(BuildingType.PALACE);
    }
  }

  public calculateOutput(): GameResources {
    let output: GameResources = {
      gold: 0,
      science: 0,
      culture: 0,
      production: 0,
      food: 0
    };

    // Base output from population
    output.food = this.population * 2;
    output.production = this.population;
    output.gold = this.population;
    output.science = this.population;
    output.culture = this.population;

    // Output from buildings
    for (const buildingType of this.buildings) {
      const building = this.getBuildingInfo(buildingType);
      if (building.effects.gold) output.gold += building.effects.gold;
      if (building.effects.science) output.science += building.effects.science;
      if (building.effects.culture) output.culture += building.effects.culture;
      if (building.effects.production) output.production += building.effects.production;
      if (building.effects.food) output.food += building.effects.food;
    }

    // Output from specialists
    for (const [specialistType, count] of Object.entries(this.specialists)) {
      switch (specialistType) {
        case 'scientist':
          output.science += count * 3;
          break;
        case 'merchant':
          output.gold += count * 3;
          break;
        case 'artist':
          output.culture += count * 3;
          break;
        case 'engineer':
          output.production += count * 3;
          break;
      }
    }

    // TODO: Add tile improvements and resource bonuses

    return output;
  }

  public calculateMaintenance(): number {
    let maintenance = 0;
    
    // Building maintenance
    for (const buildingType of this.buildings) {
      const building = this.getBuildingInfo(buildingType);
      maintenance += building.maintenance;
    }
    
    // Population maintenance
    maintenance += Math.floor(this.population * 0.5);
    
    return maintenance;
  }

  public canBuild(item: string): boolean {
    if (this.isBuilding(item)) {
      return !this.buildings.has(item as BuildingType);
    } else {
      // Check if it's a unit type and if we have required buildings
      return this.hasRequiredBuildings(item);
    }
  }

  private isBuilding(item: string): boolean {
    return Object.values(BuildingType).includes(item as BuildingType);
  }

  private hasRequiredBuildings(unitType: string): boolean {
    // Define unit requirements
    const requirements: { [key: string]: BuildingType[] } = {
      warrior: [],
      archer: [BuildingType.BARRACKS],
      spearman: [BuildingType.BARRACKS],
      settler: [],
      scout: [],
      worker: []
    };

    const required = requirements[unitType] || [];
    return required.every(building => this.buildings.has(building));
  }

  public startProduction(item: string): boolean {
    if (!this.canBuild(item)) {
      return false;
    }

    this.currentProduction = item;
    this.productionProgress = 0;
    return true;
  }

  public addToProductionQueue(item: string): void {
    if (this.canBuild(item)) {
      this.buildingQueue.push(item);
    }
  }

  public processProduction(productionPoints: number): string | null {
    if (!this.currentProduction) {
      if (this.buildingQueue.length > 0) {
        this.currentProduction = this.buildingQueue.shift()!;
        this.productionProgress = 0;
      } else {
        return null;
      }
    }

    this.productionProgress += productionPoints;
    const cost = this.getProductionCost(this.currentProduction);

    if (this.productionProgress >= cost) {
      const completed = this.currentProduction;
      this.completeProduction(completed);
      this.currentProduction = null;
      this.productionProgress = 0;
      
      // Start next item in queue
      if (this.buildingQueue.length > 0) {
        this.currentProduction = this.buildingQueue.shift()!;
        this.productionProgress = 0;
      }
      
      return completed;
    }

    return null;
  }

  private completeProduction(item: string): void {
    if (this.isBuilding(item)) {
      this.buildings.add(item as BuildingType);
    } else {
      // Unit completed - would need to spawn unit in game state
      console.log(`City ${this.name} completed ${item}`);
    }
  }

  public getProductionCost(item: string): number {
    if (this.isBuilding(item)) {
      const building = this.getBuildingInfo(item as BuildingType);
      return building.cost;
    } else {
      // Unit costs
      const unitCosts: { [key: string]: number } = {
        warrior: 40,
        archer: 40,
        spearman: 56,
        settler: 106,
        scout: 25,
        worker: 70
      };
      return unitCosts[item] || 40;
    }
  }

  public processGrowth(foodPoints: number): boolean {
    this.foodStored += foodPoints;
    const foodNeeded = this.getFoodNeededForGrowth();

    if (this.foodStored >= foodNeeded) {
      this.population++;
      this.foodStored = 0;
      this.expandTerritory();
      return true; // City grew
    }

    return false;
  }

  private getFoodNeededForGrowth(): number {
    // Food needed increases with population
    return this.population * 15 + 15;
  }

  private expandTerritory(): void {
    // Simple territory expansion when city grows
    if (this.population % 2 === 0 && this.territory.length < this.population * 3) {
      // Add adjacent tiles to territory
      // This is a simplified implementation
      console.log(`City ${this.name} territory expanded`);
    }
  }

  public addBuilding(buildingType: BuildingType): boolean {
    if (this.buildings.has(buildingType)) {
      return false;
    }

    this.buildings.add(buildingType);
    return true;
  }

  public hasBuilding(buildingType: BuildingType): boolean {
    return this.buildings.has(buildingType);
  }

  public assignSpecialist(type: string): boolean {
    // Check if we have available population
    const totalSpecialists = Object.values(this.specialists).reduce((sum, count) => sum + count, 0);
    
    if (totalSpecialists >= this.population - 1) { // -1 for base citizen
      return false;
    }

    this.specialists[type] = (this.specialists[type] || 0) + 1;
    return true;
  }

  public removeSpecialist(type: string): boolean {
    if (!this.specialists[type] || this.specialists[type] <= 0) {
      return false;
    }

    this.specialists[type]--;
    if (this.specialists[type] === 0) {
      delete this.specialists[type];
    }
    return true;
  }

  public getHappiness(): number {
    let happiness = 0;
    
    // Base happiness
    happiness += 4;
    
    // Building effects
    for (const buildingType of this.buildings) {
      const building = this.getBuildingInfo(buildingType);
      if (building.effects.happiness) {
        happiness += building.effects.happiness;
      }
    }
    
    // Population unhappiness
    happiness -= Math.floor(this.population / 4);
    
    return happiness;
  }

  private getBuildingInfo(buildingType: BuildingType): BuildingInfo {
    const buildings: { [key in BuildingType]: BuildingInfo } = {
      [BuildingType.PALACE]: {
        type: BuildingType.PALACE,
        name: 'Palace',
        cost: 0,
        maintenance: 0,
        effects: { culture: 3, science: 3 }
      },
      [BuildingType.GRANARY]: {
        type: BuildingType.GRANARY,
        name: 'Granary',
        cost: 60,
        maintenance: 1,
        effects: { food: 2 }
      },
      [BuildingType.BARRACKS]: {
        type: BuildingType.BARRACKS,
        name: 'Barracks',
        cost: 75,
        maintenance: 1,
        effects: {}
      },
      [BuildingType.LIBRARY]: {
        type: BuildingType.LIBRARY,
        name: 'Library',
        cost: 75,
        maintenance: 1,
        effects: { science: 2 }
      },
      [BuildingType.MONUMENT]: {
        type: BuildingType.MONUMENT,
        name: 'Monument',
        cost: 40,
        maintenance: 1,
        effects: { culture: 2 }
      },
      [BuildingType.WALLS]: {
        type: BuildingType.WALLS,
        name: 'Walls',
        cost: 75,
        maintenance: 1,
        effects: {}
      }
    };

    return buildings[buildingType];
  }

  public serialize(): any {
    return {
      id: this.id,
      name: this.name,
      ownerId: this.ownerId,
      position: this.position,
      population: this.population,
      health: this.health,
      maxHealth: this.maxHealth,
      buildings: Array.from(this.buildings),
      currentProduction: this.currentProduction,
      productionProgress: this.productionProgress,
      foodStored: this.foodStored,
      territory: this.territory,
      specialists: this.specialists,
      buildingQueue: this.buildingQueue,
      createdAt: this.createdAt.toISOString()
    };
  }

  public static deserialize(data: any): City {
    const city = new City(
      data.id,
      data.name,
      data.ownerId,
      data.position,
      data.population
    );
    
    city.health = data.health;
    city.maxHealth = data.maxHealth;
    city.buildings = new Set(data.buildings);
    city.currentProduction = data.currentProduction;
    city.productionProgress = data.productionProgress;
    city.foodStored = data.foodStored;
    city.territory = data.territory;
    city.specialists = data.specialists;
    city.buildingQueue = data.buildingQueue;
    city.createdAt = new Date(data.createdAt);
    
    return city;
  }
}