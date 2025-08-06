import { v4 as uuidv4 } from 'uuid';
import { HexCoordinate, UnitType } from '../types/GameTypes';

export interface UnitStats {
  attack: number;
  defense: number;
  movement: number;
  health: number;
  cost: number; // Production cost
}

export class Unit {
  public readonly id: string;
  public type: string;
  public ownerId: string;
  public position: HexCoordinate;
  public health: number;
  public maxHealth: number;
  public movementPoints: number;
  public maxMovementPoints: number;
  public experience: number;
  public promotions: string[];
  public orders: string[]; // Queue of orders
  public createdAt: Date;

  constructor(
    id: string | undefined,
    type: string,
    ownerId: string,
    position: HexCoordinate,
    health: number,
    movement: number
  ) {
    this.id = id || uuidv4();
    this.type = type;
    this.ownerId = ownerId;
    this.position = position;
    this.health = health;
    this.maxHealth = health;
    this.movementPoints = movement;
    this.maxMovementPoints = movement;
    this.experience = 0;
    this.promotions = [];
    this.orders = [];
    this.createdAt = new Date();
  }

  public getStats(): UnitStats {
    // Base stats for different unit types
    const baseStats: { [key: string]: UnitStats } = {
      warrior: { attack: 8, defense: 8, movement: 2, health: 100, cost: 40 },
      archer: { attack: 7, defense: 6, movement: 2, health: 100, cost: 40 },
      spearman: { attack: 7, defense: 13, movement: 2, health: 100, cost: 56 },
      settler: { attack: 0, defense: 0, movement: 2, health: 100, cost: 106 },
      scout: { attack: 4, defense: 4, movement: 3, health: 100, cost: 25 },
      worker: { attack: 0, defense: 0, movement: 2, health: 100, cost: 70 }
    };

    const stats = baseStats[this.type] || baseStats.warrior;
    
    // Apply promotions and bonuses
    let modifiedStats = { ...stats };
    
    for (const promotion of this.promotions) {
      modifiedStats = this.applyPromotion(modifiedStats, promotion);
    }
    
    return modifiedStats;
  }

  private applyPromotion(stats: UnitStats, promotion: string): UnitStats {
    const modifiedStats = { ...stats };
    
    switch (promotion) {
      case 'combat1':
        modifiedStats.attack += 2;
        modifiedStats.defense += 2;
        break;
      case 'combat2':
        modifiedStats.attack += 2;
        modifiedStats.defense += 2;
        break;
      case 'shock':
        modifiedStats.attack += 3;
        break;
      case 'drill':
        modifiedStats.defense += 3;
        break;
      case 'mobility':
        modifiedStats.movement += 1;
        break;
    }
    
    return modifiedStats;
  }

  public canMove(): boolean {
    return this.movementPoints > 0 && this.health > 0;
  }

  public canAttack(): boolean {
    return this.getStats().attack > 0 && this.health > 0;
  }

  public move(destination: HexCoordinate, cost: number): boolean {
    if (this.movementPoints < cost) {
      return false;
    }
    
    this.position = destination;
    this.movementPoints -= cost;
    return true;
  }

  public attack(defender: Unit): CombatResult {
    const attackerStats = this.getStats();
    const defenderStats = defender.getStats();
    
    // Simple combat calculation
    const attackStrength = attackerStats.attack + Math.random() * 10;
    const defenseStrength = defenderStats.defense + Math.random() * 10;
    
    const damageFactor = attackStrength / (attackStrength + defenseStrength);
    const maxDamage = 30;
    const damage = Math.floor(maxDamage * damageFactor) + 10;
    
    defender.takeDamage(damage);
    
    // Attacker can take damage too
    const counterDamage = Math.floor(damage * 0.3);
    this.takeDamage(counterDamage);
    
    // Gain experience
    this.gainExperience(5);
    defender.gainExperience(2);
    
    this.movementPoints = 0; // Spent turn attacking
    
    return {
      attackerId: this.id,
      defenderId: defender.id,
      damage: damage,
      counterDamage: counterDamage,
      defenderDestroyed: defender.health <= 0
    };
  }

  public takeDamage(damage: number): void {
    this.health = Math.max(0, this.health - damage);
  }

  public heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  public gainExperience(amount: number): void {
    this.experience += amount;
    
    // Check for promotions (every 15 XP)
    const promotionThreshold = 15;
    const availablePromotions = Math.floor(this.experience / promotionThreshold) - this.promotions.length;
    
    if (availablePromotions > 0) {
      // Could trigger promotion selection
      console.log(`Unit ${this.id} ready for promotion!`);
    }
  }

  public addPromotion(promotion: string): void {
    if (!this.promotions.includes(promotion)) {
      this.promotions.push(promotion);
    }
  }

  public startTurn(): void {
    this.movementPoints = this.maxMovementPoints;
    
    // Heal if not moved last turn and in friendly territory
    if (this.movementPoints === this.maxMovementPoints) {
      this.heal(10);
    }
  }

  public endTurn(): void {
    // Process any end-of-turn effects
    // Execute queued orders if any
    this.processOrders();
  }

  private processOrders(): void {
    // Process automated orders (like "go to", "fortify", etc.)
    if (this.orders.length > 0) {
      const order = this.orders[0];
      // Process order based on type
      console.log(`Processing order: ${order}`);
    }
  }

  public fortify(): void {
    this.movementPoints = 0;
    this.orders = ['fortified'];
    // Fortified units get defensive bonus
  }

  public sleep(): void {
    this.orders = ['sleeping'];
    // Sleeping units skip turns until enemy spotted
  }

  public canEmbark(): boolean {
    // Check if unit can enter water
    return ['settler', 'warrior', 'archer'].includes(this.type);
  }

  public serialize(): any {
    return {
      id: this.id,
      type: this.type,
      ownerId: this.ownerId,
      position: this.position,
      health: this.health,
      maxHealth: this.maxHealth,
      movementPoints: this.movementPoints,
      maxMovementPoints: this.maxMovementPoints,
      experience: this.experience,
      promotions: this.promotions,
      orders: this.orders,
      createdAt: this.createdAt.toISOString()
    };
  }

  public static deserialize(data: any): Unit {
    const unit = new Unit(
      data.id,
      data.type,
      data.ownerId,
      data.position,
      data.maxHealth,
      data.maxMovementPoints
    );
    
    unit.health = data.health;
    unit.movementPoints = data.movementPoints;
    unit.experience = data.experience;
    unit.promotions = data.promotions;
    unit.orders = data.orders;
    unit.createdAt = new Date(data.createdAt);
    
    return unit;
  }
}

export interface CombatResult {
  attackerId: string;
  defenderId: string;
  damage: number;
  counterDamage: number;
  defenderDestroyed: boolean;
}