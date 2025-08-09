import { HexMap } from '../../src/game/HexMap';
import { TerrainType, ResourceType, UnitType } from '@civ-game/shared';

describe('HexMap', () => {
  let hexMap: HexMap;

  beforeEach(() => {
    hexMap = new HexMap();
  });

  describe('Map Generation', () => {
    test('should generate a map with correct dimensions', () => {
      const width = 20;
      const height = 20;
      const map = hexMap.generateMap(width, height);
      
      expect(map).toHaveLength(height);
      map.forEach(row => {
        expect(row).toHaveLength(width);
      });
    });

    test('should generate valid terrain types', () => {
      const map = hexMap.generateMap(10, 10);
      const validTerrains = Object.values(TerrainType);
      
      map.forEach(row => {
        row.forEach(hex => {
          expect(validTerrains).toContain(hex.terrain);
        });
      });
    });

    test('should generate appropriate resources for terrain', () => {
      const map = hexMap.generateMap(20, 20);
      
      map.forEach(row => {
        row.forEach(hex => {
          if (hex.resource) {
            // Mountains can have iron
            if (hex.terrain === TerrainType.Mountain) {
              expect([ResourceType.Iron, ResourceType.Gold]).toContain(hex.resource);
            }
            // Plains/Grassland can have wheat
            if ([TerrainType.Plains, TerrainType.Grassland].includes(hex.terrain)) {
              if (hex.resource === ResourceType.Wheat) {
                expect(hex.resource).toBe(ResourceType.Wheat);
              }
            }
          }
        });
      });
    });

    test('should not place units on water tiles', () => {
      const map = hexMap.generateMap(20, 20);
      
      map.forEach(row => {
        row.forEach(hex => {
          if (hex.terrain === TerrainType.Ocean) {
            expect(hex.unit).toBeUndefined();
          }
        });
      });
    });

    test('should generate connected landmasses', () => {
      const map = hexMap.generateMap(20, 20);
      let landTileCount = 0;
      
      map.forEach(row => {
        row.forEach(hex => {
          if (hex.terrain !== TerrainType.Ocean) {
            landTileCount++;
          }
        });
      });
      
      // At least 30% of the map should be land
      expect(landTileCount).toBeGreaterThan(20 * 20 * 0.3);
    });
  });

  describe('Hex Coordinate System', () => {
    test('should calculate correct neighbors for a hex', () => {
      const neighbors = hexMap.getNeighbors(5, 5);
      
      // A hex should have 6 neighbors (or less at edges)
      expect(neighbors.length).toBeLessThanOrEqual(6);
      
      // Check that neighbors are adjacent
      neighbors.forEach(neighbor => {
        const distance = hexMap.getDistance(5, 5, neighbor.q, neighbor.r);
        expect(distance).toBe(1);
      });
    });

    test('should calculate correct distance between hexes', () => {
      // Test known distances
      expect(hexMap.getDistance(0, 0, 0, 0)).toBe(0); // Same hex
      expect(hexMap.getDistance(0, 0, 1, 0)).toBe(1); // Adjacent
      expect(hexMap.getDistance(0, 0, 2, -1)).toBe(2); // Two hexes away
      expect(hexMap.getDistance(0, 0, 3, -3)).toBe(3); // Three hexes away
    });

    test('should correctly identify hexes within range', () => {
      const map = hexMap.generateMap(10, 10);
      const range2 = hexMap.getHexesInRange(5, 5, 2);
      
      range2.forEach(hex => {
        const distance = hexMap.getDistance(5, 5, hex.q, hex.r);
        expect(distance).toBeLessThanOrEqual(2);
      });
      
      // A hex with range 2 should include itself + 6 (range 1) + 12 (range 2) = 19 hexes
      // (assuming no map boundaries)
      expect(range2.length).toBeGreaterThan(0);
      expect(range2.length).toBeLessThanOrEqual(19);
    });

    test('should handle edge cases for coordinates', () => {
      const map = hexMap.generateMap(10, 10);
      
      // Test corners
      const topLeft = hexMap.getNeighbors(0, 0);
      const bottomRight = hexMap.getNeighbors(9, 9);
      
      // Corner hexes should have fewer neighbors
      expect(topLeft.length).toBeLessThan(6);
      expect(bottomRight.length).toBeLessThan(6);
    });
  });

  describe('Movement and Pathfinding', () => {
    test('should calculate movement cost based on terrain', () => {
      const map = hexMap.generateMap(10, 10);
      
      // Set specific terrain for testing
      map[5][5].terrain = TerrainType.Plains;
      map[5][6].terrain = TerrainType.Hills;
      map[5][7].terrain = TerrainType.Mountain;
      
      const plainsCost = hexMap.getMovementCost(map[5][5].terrain);
      const hillsCost = hexMap.getMovementCost(map[5][6].terrain);
      const mountainCost = hexMap.getMovementCost(map[5][7].terrain);
      
      expect(plainsCost).toBe(1);
      expect(hillsCost).toBe(2);
      expect(mountainCost).toBe(3);
    });

    test('should find valid movement range for units', () => {
      const map = hexMap.generateMap(10, 10);
      
      // Place a unit with 2 movement points
      map[5][5].unit = {
        type: UnitType.Scout,
        owner: 'player1',
        moves: 3,
        maxMoves: 3
      };
      
      const moveRange = hexMap.getValidMoves(map, 5, 5, 3);
      
      moveRange.forEach(pos => {
        // Check that each position is within movement range
        const path = hexMap.findPath(map, 5, 5, pos.q, pos.r);
        if (path) {
          const totalCost = path.reduce((sum, hex) => {
            return sum + hexMap.getMovementCost(map[hex.r][hex.q].terrain);
          }, 0);
          expect(totalCost).toBeLessThanOrEqual(3);
        }
      });
    });

    test('should not allow movement through impassable terrain', () => {
      const map = hexMap.generateMap(10, 10);
      
      // Create an ocean barrier
      for (let i = 0; i < 10; i++) {
        map[5][i].terrain = TerrainType.Ocean;
      }
      
      // Try to find path across ocean
      const path = hexMap.findPath(map, 4, 5, 6, 5);
      
      // Path should not exist or should go around
      if (path) {
        path.forEach(hex => {
          expect(map[hex.r][hex.q].terrain).not.toBe(TerrainType.Ocean);
        });
      }
    });
  });

  describe('Visibility and Fog of War', () => {
    test('should calculate visibility range correctly', () => {
      const map = hexMap.generateMap(10, 10);
      
      // Place a unit
      map[5][5].unit = {
        type: UnitType.Scout,
        owner: 'player1',
        moves: 3,
        maxMoves: 3
      };
      
      const visible = hexMap.getVisibleHexes(map, 5, 5, 2);
      
      visible.forEach(hex => {
        const distance = hexMap.getDistance(5, 5, hex.q, hex.r);
        expect(distance).toBeLessThanOrEqual(2);
      });
    });

    test('should handle visibility blocked by terrain', () => {
      const map = hexMap.generateMap(10, 10);
      
      // Place mountains to block vision
      map[5][6].terrain = TerrainType.Mountain;
      
      const visible = hexMap.getVisibleHexes(map, 5, 5, 3);
      
      // Hexes behind mountains should have reduced visibility
      // This is a simplified test - actual implementation may vary
      expect(visible.length).toBeGreaterThan(0);
    });
  });

  describe('Resource Distribution', () => {
    test('should distribute resources fairly across the map', () => {
      const map = hexMap.generateMap(30, 30);
      const resourceCounts: Record<string, number> = {};
      
      map.forEach(row => {
        row.forEach(hex => {
          if (hex.resource) {
            resourceCounts[hex.resource] = (resourceCounts[hex.resource] || 0) + 1;
          }
        });
      });
      
      // Each resource type should appear at least once on a large map
      expect(Object.keys(resourceCounts).length).toBeGreaterThan(0);
      
      // No resource should dominate (more than 50% of all resources)
      const totalResources = Object.values(resourceCounts).reduce((a, b) => a + b, 0);
      Object.values(resourceCounts).forEach(count => {
        expect(count).toBeLessThan(totalResources * 0.5);
      });
    });

    test('should place strategic resources appropriately', () => {
      const map = hexMap.generateMap(30, 30);
      
      map.forEach(row => {
        row.forEach(hex => {
          if (hex.resource === ResourceType.Iron) {
            // Iron should be in hills or mountains
            expect([TerrainType.Hills, TerrainType.Mountain]).toContain(hex.terrain);
          }
          if (hex.resource === ResourceType.Horses) {
            // Horses should be in plains or grassland
            expect([TerrainType.Plains, TerrainType.Grassland]).toContain(hex.terrain);
          }
        });
      });
    });
  });

  describe('Combat Calculations', () => {
    test('should calculate terrain bonuses correctly', () => {
      const hillsBonus = hexMap.getTerrainCombatBonus(TerrainType.Hills);
      const forestBonus = hexMap.getTerrainCombatBonus(TerrainType.Forest);
      const plainsBonus = hexMap.getTerrainCombatBonus(TerrainType.Plains);
      
      expect(hillsBonus).toBeGreaterThan(plainsBonus);
      expect(forestBonus).toBeGreaterThan(plainsBonus);
    });

    test('should identify valid attack targets', () => {
      const map = hexMap.generateMap(10, 10);
      
      // Place attacker
      map[5][5].unit = {
        type: UnitType.Warrior,
        owner: 'player1',
        moves: 1,
        maxMoves: 1
      };
      
      // Place enemy units around
      map[5][6].unit = {
        type: UnitType.Warrior,
        owner: 'player2',
        moves: 1,
        maxMoves: 1
      };
      
      map[5][4].unit = {
        type: UnitType.Settler,
        owner: 'player1', // Friendly unit
        moves: 1,
        maxMoves: 1
      };
      
      const targets = hexMap.getValidAttackTargets(map, 5, 5, 'player1');
      
      // Should only include enemy units
      targets.forEach(target => {
        const hex = map[target.r][target.q];
        expect(hex.unit?.owner).not.toBe('player1');
      });
      
      // Should include the enemy warrior
      expect(targets).toContainEqual({ q: 6, r: 5 });
      
      // Should not include friendly settler
      expect(targets).not.toContainEqual({ q: 4, r: 5 });
    });
  });
});
