/**
 * Enhanced Technology Types - Phase 2.2.1
 * Comprehensive technology effects and trading system
 */

import { Resources } from './index';

/**
 * Enhanced Technology Interface with Effects System
 */
export interface Technology {
  id: string;
  name: string;
  description: string;
  cost: number;
  era: TechEra;
  prerequisites: string[];
  unlocks: TechUnlock[];
  effects?: TechnologyEffects;
}

/**
 * Technology Eras - Extended for comprehensive progression
 */
export enum TechEra {
  ANCIENT = 'ancient',
  CLASSICAL = 'classical', 
  MEDIEVAL = 'medieval',
  RENAISSANCE = 'renaissance',
  INDUSTRIAL = 'industrial',
  MODERN = 'modern',
  ATOMIC = 'atomic',
  INFORMATION = 'information'
}

/**
 * Technology Unlock Types - What technologies enable
 */
export interface TechUnlock {
  type: UnlockType;
  id: string;
}

export enum UnlockType {
  UNIT = 'unit',
  BUILDING = 'building',
  IMPROVEMENT = 'improvement',
  CIVIC = 'civic',
  RESOURCE = 'resource'
}

/**
 * Technology Effects System - Comprehensive bonuses and abilities
 */
export interface TechnologyEffects {
  // Resource production bonuses
  resourceBonus?: Partial<Resources>;
  
  // Unit-related bonuses
  unitBonuses?: {
    movementBonus?: number;       // Multiplier for unit movement
    strengthBonus?: number;       // Multiplier for unit combat strength
    rangeBonus?: number;          // Multiplier for unit attack range
    siegeBonus?: number;          // Bonus against cities/fortifications
    navyMovementBonus?: number;   // Naval unit movement bonus
    militaryStrength?: number;    // Overall military effectiveness
    automationBonus?: number;    // Automated unit efficiency
  };
  
  // City development bonuses
  cityBonuses?: {
    growthRate?: number;          // Population growth multiplier
    constructionSpeed?: number;   // Building/wonder construction speed
    happinessBonus?: number;      // Citizen happiness multiplier
    efficiency?: number;          // Overall city efficiency
    defensiveBonus?: number;      // City defensive strength
    economicGrowth?: number;      // Economic development rate
  };
  
  // Research and development
  researchSpeed?: number;         // Science generation multiplier
  
  // Trade and economics
  tradeBonus?: number;            // Trade route value multiplier
  tradeRange?: number;            // Trade route range multiplier
  
  // Cultural and social
  culturalInfluence?: number;     // Cultural pressure on other civs
  communicationRange?: number;    // Diplomatic/cultural reach
  globalConnectivity?: number;    // Information age connectivity bonus
  
  // Production and industry
  industrialOutput?: number;      // Manufacturing efficiency
  energyOutput?: number;          // Energy generation multiplier
  
  // Unlocked capabilities
  enablesImprovements?: string[]; // Terrain improvements unlocked
  enablesUnits?: string[];        // Military/civilian units unlocked  
  enablesBuildings?: string[];    // City buildings unlocked
}

/**
 * Player Technology Progress - Enhanced with detailed tracking
 */
export interface PlayerTechnology {
  techId: string;
  isResearched: boolean;
  progress: number;                // Science points invested
  turnsToComplete?: number;        // Estimated turns remaining
  startedTurn?: number;           // When research began
  collaborators?: string[];        // Other players contributing (for collaborative research)
}

/**
 * Technology Trading System
 */
export interface TechnologyTradeOffer {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  offeredTech: string[];           // Technologies being offered
  requestedTech: string[];         // Technologies being requested
  offeredResources?: Partial<Resources>; // Additional resource compensation
  requestedResources?: Partial<Resources>;
  status: TradeOfferStatus;
  expiresAt: Date;
  createdAt: Date;
  message?: string;                // Optional message from proposer
}

export enum TradeOfferStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted', 
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

/**
 * Collaborative Research System
 */
export interface ResearchCollaboration {
  id: string;
  participants: string[];          // Player IDs participating
  targetTech: string;             // Technology being researched together
  contributedResources: Record<string, Partial<Resources>>; // Per-player contributions
  totalRequired: Partial<Resources>; // Total resources needed
  progress: number;               // Overall progress (0-100%)
  sharedBenefits: TechnologyEffects; // Additional bonuses from collaboration
  completionBonus: number;        // Percentage faster completion
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Technology Prerequisite Definition - Enhanced with conditional logic
 */
export interface TechnologyPrerequisite {
  required: string[];             // All of these must be researched
  optional?: string[];            // At least one of these (OR logic)
  civicPrerequisites?: string[];  // Required civic/government techs
  resourcePrerequisites?: string[]; // Required strategic resources
}

/**
 * WebSocket Events for Technology Trading
 */
export const TECH_TRADING_EVENTS = {
  // Technology trading
  TECH_TRADE_OFFER: 'tech:trade:offer',
  TECH_TRADE_RESPONSE: 'tech:trade:response', 
  TECH_TRADE_COMPLETE: 'tech:trade:complete',
  TECH_TRADE_CANCELLED: 'tech:trade:cancelled',
  
  // Collaborative research
  TECH_COLLABORATION_REQUEST: 'tech:collaboration:request',
  TECH_COLLABORATION_JOIN: 'tech:collaboration:join',
  TECH_COLLABORATION_LEAVE: 'tech:collaboration:leave',
  TECH_COLLABORATION_COMPLETE: 'tech:collaboration:complete',
  
  // Technology progress
  TECH_RESEARCH_START: 'tech:research:start',
  TECH_RESEARCH_PROGRESS: 'tech:research:progress',
  TECH_RESEARCH_COMPLETE: 'tech:research:complete',
  
  // Technology tree updates
  TECH_TREE_UPDATE: 'tech:tree:update',
  TECH_AVAILABLE_UPDATE: 'tech:available:update'
} as const;

/**
 * Technology Research Action Enhanced Payload
 */
export interface ResearchTechnologyPayload {
  techId: string;
  playerId: string;
  scienceAllocated?: number;       // Specific science points to allocate
  collaborationId?: string;        // Join existing collaboration
  requestCollaboration?: boolean;  // Request others to join
}

/**
 * Technology Trade Action Payload
 */
export interface TechTradeOfferPayload {
  fromPlayerId: string;
  toPlayerId: string;
  offeredTech: string[];
  requestedTech: string[];
  offeredResources?: Partial<Resources>;
  requestedResources?: Partial<Resources>;
  message?: string;
  expirationTurns?: number;        // How long offer remains valid
}

/**
 * Technology Research Result
 */
export interface TechnologyResearchResult {
  success: boolean;
  techId: string;
  playerId: string;
  progress: number;
  completed: boolean;
  turnsToComplete?: number;
  effectsApplied?: TechnologyEffects;
  unlockedItems?: TechUnlock[];
  message: string;
}

/**
 * Technology Validation Result
 */
export interface TechnologyValidationResult {
  valid: boolean;
  techId: string;
  missingPrerequisites: string[];
  missingResources?: string[];
  insufficientScience?: number;
  message: string;
}