/**
 * Comprehensive Technology Database - Phase 2.2.1 Enhancement
 * 25+ Technologies with Complex Prerequisite Chains and Effects System
 */

import { Technology, TechEra, UnlockType, TechnologyEffects } from '../types/TechnologyTypes';

/**
 * Expanded Technology Database with 25+ technologies across all eras
 */
export const TECHNOLOGY_DATABASE: Record<string, Technology> = {
  // === ANCIENT ERA (4000 BC - 500 BC) ===
  agriculture: {
    id: 'agriculture',
    name: 'Agriculture',
    description: 'The cultivation of crops enables food surplus and population growth',
    cost: 25,
    era: TechEra.ANCIENT,
    prerequisites: [],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'granary' },
      { type: UnlockType.IMPROVEMENT, id: 'farm' }
    ],
    effects: {
      resourceBonus: { food: 1 },
      cityBonuses: { growthRate: 1.2 },
      enablesImprovements: ['farm']
    }
  },

  pottery: {
    id: 'pottery',
    name: 'Pottery',
    description: 'Ceramic vessels enable food storage and early craftsmanship',
    cost: 35,
    era: TechEra.ANCIENT,
    prerequisites: ['agriculture'],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'pottery_workshop' },
      { type: UnlockType.RESOURCE, id: 'clay' }
    ],
    effects: {
      resourceBonus: { food: 0.5 },
      tradeBonus: 1.1
    }
  },

  animal_husbandry: {
    id: 'animal_husbandry',
    name: 'Animal Husbandry',
    description: 'Domestication of animals provides food, labor, and transportation',
    cost: 50,
    era: TechEra.ANCIENT,
    prerequisites: ['agriculture'],
    unlocks: [
      { type: UnlockType.UNIT, id: 'horseman' },
      { type: UnlockType.RESOURCE, id: 'horses' },
      { type: UnlockType.IMPROVEMENT, id: 'pasture' }
    ],
    effects: {
      resourceBonus: { food: 1, production: 0.5 },
      unitBonuses: { movementBonus: 1.2 }
    }
  },

  archery: {
    id: 'archery',
    name: 'Archery',
    description: 'Bow and arrow technology revolutionizes hunting and warfare',
    cost: 45,
    era: TechEra.ANCIENT,
    prerequisites: ['animal_husbandry'],
    unlocks: [
      { type: UnlockType.UNIT, id: 'archer' }
    ],
    effects: {
      unitBonuses: { rangeBonus: 1.5, strengthBonus: 1.1 }
    }
  },

  bronze_working: {
    id: 'bronze_working',
    name: 'Bronze Working',
    description: 'Alloying copper and tin creates stronger tools and weapons',
    cost: 60,
    era: TechEra.ANCIENT,
    prerequisites: ['pottery'],
    unlocks: [
      { type: UnlockType.UNIT, id: 'spearman' },
      { type: UnlockType.BUILDING, id: 'barracks' }
    ],
    effects: {
      resourceBonus: { production: 1 },
      unitBonuses: { strengthBonus: 1.2 }
    }
  },

  writing: {
    id: 'writing',
    name: 'Writing',
    description: 'Recording knowledge enables administration and cultural development',
    cost: 55,
    era: TechEra.ANCIENT,
    prerequisites: ['pottery'],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'library' },
      { type: UnlockType.CIVIC, id: 'code_of_laws' }
    ],
    effects: {
      resourceBonus: { science: 1, culture: 1 },
      researchSpeed: 1.1
    }
  },

  wheel: {
    id: 'wheel',
    name: 'The Wheel',
    description: 'Revolutionary transportation technology improves trade and movement',
    cost: 65,
    era: TechEra.ANCIENT,
    prerequisites: ['bronze_working'],
    unlocks: [
      { type: UnlockType.UNIT, id: 'chariot' },
      { type: UnlockType.IMPROVEMENT, id: 'road' }
    ],
    effects: {
      tradeBonus: 1.3,
      unitBonuses: { movementBonus: 1.4 },
      enablesImprovements: ['road']
    }
  },

  // === CLASSICAL ERA (500 BC - 500 AD) ===

  mathematics: {
    id: 'mathematics',
    name: 'Mathematics',
    description: 'Advanced calculations enable architectural marvels and scientific progress',
    cost: 120,
    era: TechEra.CLASSICAL,
    prerequisites: ['writing', 'pottery'],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'aqueduct' },
      { type: UnlockType.BUILDING, id: 'university' }
    ],
    effects: {
      resourceBonus: { science: 2 },
      cityBonuses: { constructionSpeed: 1.3 },
      researchSpeed: 1.15
    }
  },

  currency: {
    id: 'currency',
    name: 'Currency',
    description: 'Standardized money revolutionizes trade and economic systems',
    cost: 100,
    era: TechEra.CLASSICAL,
    prerequisites: ['bronze_working', 'wheel'],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'market' },
      { type: UnlockType.IMPROVEMENT, id: 'trading_post' }
    ],
    effects: {
      resourceBonus: { gold: 2 },
      tradeBonus: 1.5,
      enablesImprovements: ['trading_post']
    }
  },

  iron_working: {
    id: 'iron_working',
    name: 'Iron Working',
    description: 'Superior iron tools and weapons surpass bronze technology',
    cost: 150,
    era: TechEra.CLASSICAL,
    prerequisites: ['bronze_working'],
    unlocks: [
      { type: UnlockType.UNIT, id: 'swordsman' },
      { type: UnlockType.IMPROVEMENT, id: 'mine' }
    ],
    effects: {
      resourceBonus: { production: 2 },
      unitBonuses: { strengthBonus: 1.5 },
      enablesImprovements: ['mine']
    }
  },

  philosophy: {
    id: 'philosophy',
    name: 'Philosophy',
    description: 'Systematic thinking advances wisdom and governmental concepts',
    cost: 175,
    era: TechEra.CLASSICAL,
    prerequisites: ['writing', 'mathematics'],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'temple' },
      { type: UnlockType.CIVIC, id: 'republic' }
    ],
    effects: {
      resourceBonus: { culture: 2, faith: 1 },
      culturalInfluence: 1.2,
      cityBonuses: { happinessBonus: 1.1 }
    }
  },

  // === MEDIEVAL ERA (500 AD - 1000 AD) ===

  engineering: {
    id: 'engineering',
    name: 'Engineering',
    description: 'Advanced construction techniques enable massive infrastructure projects',
    cost: 250,
    era: TechEra.MEDIEVAL,
    prerequisites: ['mathematics', 'iron_working'],
    unlocks: [
      { type: UnlockType.UNIT, id: 'catapult' },
      { type: UnlockType.BUILDING, id: 'aqueduct_advanced' },
      { type: UnlockType.IMPROVEMENT, id: 'fort' }
    ],
    effects: {
      resourceBonus: { production: 2 },
      unitBonuses: { siegeBonus: 1.5 },
      cityBonuses: { constructionSpeed: 1.4 }
    }
  },

  feudalism: {
    id: 'feudalism',
    name: 'Feudalism',
    description: 'Hierarchical social system organizes medieval society and warfare',
    cost: 300,
    era: TechEra.MEDIEVAL,
    prerequisites: ['philosophy', 'iron_working'],
    unlocks: [
      { type: UnlockType.UNIT, id: 'knight' },
      { type: UnlockType.BUILDING, id: 'castle' }
    ],
    effects: {
      unitBonuses: { strengthBonus: 1.3, movementBonus: 1.2 },
      cityBonuses: { defensiveBonus: 1.4 }
    }
  },

  optics: {
    id: 'optics',
    name: 'Optics',
    description: 'Understanding light enables navigation instruments and telescopes',
    cost: 320,
    era: TechEra.MEDIEVAL,
    prerequisites: ['mathematics', 'philosophy'],
    unlocks: [
      { type: UnlockType.UNIT, id: 'caravel' },
      { type: UnlockType.BUILDING, id: 'lighthouse' }
    ],
    effects: {
      resourceBonus: { science: 1 },
      tradeRange: 1.5,
      unitBonuses: { navyMovementBonus: 1.3 }
    }
  },

  // === RENAISSANCE ERA (1000 AD - 1500 AD) ===

  chemistry_basic: {
    id: 'chemistry_basic',
    name: 'Chemistry',
    description: 'Understanding chemical reactions and compounds',
    cost: 350,
    era: TechEra.RENAISSANCE,
    prerequisites: ['feudalism'],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'alchemist_workshop' }
    ],
    effects: {
      resourceBonus: { science: 1 },
      researchSpeed: 1.1
    }
  },

  paper: {
    id: 'paper',
    name: 'Paper',
    description: 'Lightweight writing material enables record keeping',
    cost: 280,
    era: TechEra.MEDIEVAL,
    prerequisites: ['writing', 'engineering'],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'scriptorium' }
    ],
    effects: {
      resourceBonus: { culture: 1, science: 0.5 }
    }
  },

  mechanics: {
    id: 'mechanics',
    name: 'Mechanics',
    description: 'Understanding of gears, pulleys, and mechanical systems',
    cost: 320,
    era: TechEra.MEDIEVAL,
    prerequisites: ['engineering', 'mathematics'],
    unlocks: [
      { type: UnlockType.IMPROVEMENT, id: 'windmill' },
      { type: UnlockType.BUILDING, id: 'workshop' }
    ],
    effects: {
      resourceBonus: { production: 1 },
      cityBonuses: { constructionSpeed: 1.2 }
    }
  },

  gunpowder: {
    id: 'gunpowder',
    name: 'Gunpowder',
    description: 'Explosive powder revolutionizes warfare and mining',
    cost: 485,
    era: TechEra.RENAISSANCE,
    prerequisites: ['engineering', 'chemistry_basic'],
    unlocks: [
      { type: UnlockType.UNIT, id: 'musketeer' },
      { type: UnlockType.UNIT, id: 'cannon' }
    ],
    effects: {
      unitBonuses: { strengthBonus: 1.6, siegeBonus: 2.0 },
      resourceBonus: { production: 1 }
    }
  },

  printing_press: {
    id: 'printing_press',
    name: 'Printing Press',
    description: 'Mass production of books spreads knowledge and literacy rapidly',
    cost: 420,
    era: TechEra.RENAISSANCE,
    prerequisites: ['paper', 'mechanics'],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'university_advanced' },
      { type: UnlockType.CIVIC, id: 'enlightenment' }
    ],
    effects: {
      resourceBonus: { science: 3, culture: 2 },
      researchSpeed: 1.25,
      culturalInfluence: 1.3
    }
  },

  astronomy: {
    id: 'astronomy',
    name: 'Astronomy',
    description: 'Studying celestial bodies improves navigation and scientific understanding',
    cost: 500,
    era: TechEra.RENAISSANCE,
    prerequisites: ['optics', 'mathematics'],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'observatory' },
      { type: UnlockType.UNIT, id: 'galleon' }
    ],
    effects: {
      resourceBonus: { science: 2 },
      tradeRange: 2.0,
      researchSpeed: 1.2
    }
  },

  banking: {
    id: 'banking',
    name: 'Banking',
    description: 'Financial institutions enable capital accumulation and investment',
    cost: 450,
    era: TechEra.RENAISSANCE,
    prerequisites: ['currency', 'printing_press'],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'bank' },
      { type: UnlockType.CIVIC, id: 'mercantilism' }
    ],
    effects: {
      resourceBonus: { gold: 3 },
      tradeBonus: 1.4,
      cityBonuses: { economicGrowth: 1.3 }
    }
  },

  // === INDUSTRIAL ERA (1500 AD - 1800 AD) ===

  coal_mining: {
    id: 'coal_mining',
    name: 'Coal Mining',
    description: 'Extracting coal provides abundant energy for industry',
    cost: 580,
    era: TechEra.INDUSTRIAL,
    prerequisites: ['gunpowder', 'banking'],
    unlocks: [
      { type: UnlockType.IMPROVEMENT, id: 'coal_mine' },
      { type: UnlockType.RESOURCE, id: 'coal' }
    ],
    effects: {
      resourceBonus: { production: 2 },
      energyOutput: 1.3
    }
  },

  scientific_method: {
    id: 'scientific_method',
    name: 'Scientific Method',
    description: 'Systematic approach to research accelerates discoveries',
    cost: 650,
    era: TechEra.INDUSTRIAL,
    prerequisites: ['astronomy', 'printing_press'],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'academy' }
    ],
    effects: {
      resourceBonus: { science: 3 },
      researchSpeed: 1.3
    }
  },

  physics: {
    id: 'physics',
    name: 'Physics',
    description: 'Understanding natural laws enables technological breakthroughs',
    cost: 680,
    era: TechEra.INDUSTRIAL,
    prerequisites: ['scientific_method', 'mathematics'],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'research_institute' }
    ],
    effects: {
      resourceBonus: { science: 2 },
      researchSpeed: 1.2
    }
  },

  steam_power: {
    id: 'steam_power',
    name: 'Steam Power',
    description: 'Harnessing steam revolutionizes manufacturing and transportation',
    cost: 720,
    era: TechEra.INDUSTRIAL,
    prerequisites: ['coal_mining', 'scientific_method'],
    unlocks: [
      { type: UnlockType.UNIT, id: 'steamship' },
      { type: UnlockType.BUILDING, id: 'factory' },
      { type: UnlockType.IMPROVEMENT, id: 'railroad' }
    ],
    effects: {
      resourceBonus: { production: 4 },
      tradeRange: 2.0,
      industrialOutput: 1.6,
      enablesImprovements: ['railroad']
    }
  },

  electricity: {
    id: 'electricity',
    name: 'Electricity',
    description: 'Electrical power transforms industry and daily life',
    cost: 850,
    era: TechEra.INDUSTRIAL,
    prerequisites: ['steam_power', 'physics'],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'power_plant' },
      { type: UnlockType.IMPROVEMENT, id: 'electrical_grid' }
    ],
    effects: {
      resourceBonus: { production: 3, science: 2 },
      cityBonuses: { efficiency: 1.4, happinessBonus: 1.2 }
    }
  },

  // === MODERN ERA (1800 AD - 1950 AD) ===

  oil: {
    id: 'oil',
    name: 'Oil',
    description: 'Petroleum extraction and refining for modern industry',
    cost: 980,
    era: TechEra.MODERN,
    prerequisites: ['steam_power', 'chemistry_basic'],
    unlocks: [
      { type: UnlockType.IMPROVEMENT, id: 'oil_well' },
      { type: UnlockType.RESOURCE, id: 'petroleum' }
    ],
    effects: {
      resourceBonus: { production: 2, gold: 1 },
      energyOutput: 1.8
    }
  },

  combustion: {
    id: 'combustion',
    name: 'Combustion',
    description: 'Internal combustion engines power automobiles and aircraft',
    cost: 1150,
    era: TechEra.MODERN,
    prerequisites: ['electricity', 'oil'],
    unlocks: [
      { type: UnlockType.UNIT, id: 'tank' },
      { type: UnlockType.UNIT, id: 'fighter' },
      { type: UnlockType.BUILDING, id: 'airport' }
    ],
    effects: {
      resourceBonus: { production: 3 },
      unitBonuses: { movementBonus: 1.8, strengthBonus: 1.4 }
    }
  },

  radio: {
    id: 'radio',
    name: 'Radio',
    description: 'Wireless communication connects the world instantly',
    cost: 980,
    era: TechEra.MODERN,
    prerequisites: ['electricity', 'physics'],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'broadcast_tower' },
      { type: UnlockType.CIVIC, id: 'mass_media' }
    ],
    effects: {
      resourceBonus: { culture: 3 },
      communicationRange: 2.0,
      culturalInfluence: 1.4
    }
  },

  // === ATOMIC ERA (1950 AD - 2000 AD) ===

  chemistry_advanced: {
    id: 'chemistry_advanced',
    name: 'Advanced Chemistry',
    description: 'Complex chemical processes and synthetic materials',
    cost: 1420,
    era: TechEra.ATOMIC,
    prerequisites: ['oil', 'radio'],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'chemical_plant' }
    ],
    effects: {
      resourceBonus: { production: 2, science: 1 },
      industrialOutput: 1.3
    }
  },

  electronics: {
    id: 'electronics',
    name: 'Electronics',
    description: 'Electronic circuits and components enable advanced devices',
    cost: 1580,
    era: TechEra.ATOMIC,
    prerequisites: ['radio', 'physics'],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'electronics_factory' }
    ],
    effects: {
      resourceBonus: { science: 2, production: 1 },
      researchSpeed: 1.15
    }
  },

  nuclear_physics: {
    id: 'nuclear_physics',
    name: 'Nuclear Physics',
    description: 'Atomic theory unlocks tremendous energy and devastating weapons',
    cost: 1680,
    era: TechEra.ATOMIC,
    prerequisites: ['electricity', 'chemistry_advanced'],
    unlocks: [
      { type: UnlockType.UNIT, id: 'nuclear_submarine' },
      { type: UnlockType.BUILDING, id: 'nuclear_plant' },
      { type: UnlockType.UNIT, id: 'nuclear_missile' }
    ],
    effects: {
      resourceBonus: { production: 5, science: 4 },
      energyOutput: 2.5,
      unitBonuses: { militaryStrength: 1.8 }
    }
  },

  rocketry: {
    id: 'rocketry',
    name: 'Rocketry',
    description: 'Rocket technology enables space exploration and advanced missiles',
    cost: 1580,
    era: TechEra.ATOMIC,
    prerequisites: ['combustion', 'nuclear_physics'],
    unlocks: [
      { type: UnlockType.UNIT, id: 'icbm' },
      { type: UnlockType.BUILDING, id: 'space_program' }
    ],
    effects: {
      resourceBonus: { science: 3 },
      unitBonuses: { rangeBonus: 3.0, strengthBonus: 2.0 }
    }
  },

  // === INFORMATION ERA (2000 AD - Present) ===

  computers: {
    id: 'computers',
    name: 'Computers',
    description: 'Digital computing revolutionizes information processing and automation',
    cost: 2250,
    era: TechEra.INFORMATION,
    prerequisites: ['nuclear_physics', 'electronics'],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'research_lab' },
      { type: UnlockType.CIVIC, id: 'digital_democracy' }
    ],
    effects: {
      resourceBonus: { science: 6, culture: 3 },
      researchSpeed: 1.5,
      cityBonuses: { efficiency: 1.6 }
    }
  },

  satellites: {
    id: 'satellites',
    name: 'Satellites',
    description: 'Orbital communication and observation platforms',
    cost: 2150,
    era: TechEra.INFORMATION,
    prerequisites: ['rocketry', 'electronics'],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'satellite_station' }
    ],
    effects: {
      resourceBonus: { science: 2, culture: 1 },
      communicationRange: 2.5
    }
  },

  internet: {
    id: 'internet',
    name: 'Internet',
    description: 'Global computer network creates unprecedented information sharing',
    cost: 2800,
    era: TechEra.INFORMATION,
    prerequisites: ['computers', 'satellites'],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'data_center' },
      { type: UnlockType.CIVIC, id: 'global_connectivity' }
    ],
    effects: {
      resourceBonus: { science: 4, culture: 4, gold: 2 },
      communicationRange: 3.0,
      globalConnectivity: 1.8,
      tradeBonus: 1.6
    }
  },

  advanced_materials: {
    id: 'advanced_materials',
    name: 'Advanced Materials',
    description: 'Synthetic materials with superior properties',
    cost: 2650,
    era: TechEra.INFORMATION,
    prerequisites: ['chemistry_advanced', 'nuclear_physics'],
    unlocks: [
      { type: UnlockType.BUILDING, id: 'materials_lab' }
    ],
    effects: {
      resourceBonus: { production: 3, science: 1 },
      industrialOutput: 1.4
    }
  },

  robotics: {
    id: 'robotics',
    name: 'Robotics',
    description: 'Automated machines transform manufacturing and exploration',
    cost: 3200,
    era: TechEra.INFORMATION,
    prerequisites: ['computers', 'advanced_materials'],
    unlocks: [
      { type: UnlockType.UNIT, id: 'drone' },
      { type: UnlockType.BUILDING, id: 'automated_factory' }
    ],
    effects: {
      resourceBonus: { production: 6 },
      industrialOutput: 2.0,
      unitBonuses: { automationBonus: 1.5 }
    }
  }
};

/**
 * Technology prerequisite validation helper
 */
export function validateTechnologyPrerequisites(
  techId: string,
  playerTechnologies: string[]
): { valid: boolean; missingPrerequisites: string[] } {
  const tech = TECHNOLOGY_DATABASE[techId];
  if (!tech) {
    return { valid: false, missingPrerequisites: [] };
  }

  const missingPrerequisites = tech.prerequisites.filter(
    prereq => !playerTechnologies.includes(prereq)
  );

  return {
    valid: missingPrerequisites.length === 0,
    missingPrerequisites
  };
}

/**
 * Get technologies available for research based on current player technologies
 */
export function getAvailableTechnologies(playerTechnologies: string[]): Technology[] {
  return Object.values(TECHNOLOGY_DATABASE).filter(tech => {
    // Don't include already researched technologies
    if (playerTechnologies.includes(tech.id)) {
      return false;
    }

    // Check if all prerequisites are met
    return tech.prerequisites.every(prereq => playerTechnologies.includes(prereq));
  });
}

/**
 * Calculate research cost with era and civilization modifiers
 */
export function calculateResearchCost(
  tech: Technology,
  baseModifier: number = 1.0,
  eraModifier: number = 1.0
): number {
  return Math.round(tech.cost * baseModifier * eraModifier);
}

/**
 * Get technologies by era
 */
export function getTechnologiesByEra(era: TechEra): Technology[] {
  return Object.values(TECHNOLOGY_DATABASE).filter(tech => tech.era === era);
}
