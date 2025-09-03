import { HexMap } from '../../src/game/HexMap';
import { TerrainType } from '@civ-game/shared';

describe('HexMap', () => {
  let hexMap: HexMap;

  beforeEach(() => {
    hexMap = new HexMap(10, 10);
  });

  describe('Map Generation', () => {
    test('should create HexMap with correct dimensions', () => {
      expect(hexMap).toBeDefined();
      expect(hexMap.width).toBe(10);
      expect(hexMap.height).toBe(10);
    });

    test('should generate procedural map without errors', () => {
      expect(() => {
        hexMap.generateProceduralMap(42); // Use fixed seed for consistency
      }).not.toThrow();
    });

    test('should have valid tiles after generation', () => {
      hexMap.generateProceduralMap(42);
      
      expect(hexMap.tiles).toBeDefined();
      expect(hexMap.tiles).toHaveLength(10); // height
      expect(hexMap.tiles[0]).toHaveLength(10); // width
      
      // Check that each tile has a valid terrain type
      const validTerrains = Object.values(TerrainType);
      hexMap.tiles.forEach(row => {
        row.forEach(hex => {
          expect(validTerrains).toContain(hex.terrain);
        });
      });
    });

    test('should access tiles using getTile method', () => {
      hexMap.generateProceduralMap(42);
      
      const tile = hexMap.getTile(5, 5);
      expect(tile).toBeDefined();
      if (tile) {
        expect(Object.values(TerrainType)).toContain(tile.terrain);
      }
    });
  });

  describe('Hex Navigation', () => {
    beforeEach(() => {
      hexMap.generateProceduralMap(42);
    });

    test('should get neighbors for position', () => {
      const neighbors = hexMap.getNeighbors(5, 5);
      expect(Array.isArray(neighbors)).toBe(true);
      expect(neighbors.length).toBeGreaterThanOrEqual(0);
      expect(neighbors.length).toBeLessThanOrEqual(6);
      
      neighbors.forEach(neighbor => {
        expect(Object.values(TerrainType)).toContain(neighbor.terrain);
      });
    });

    test('should handle edge positions', () => {
      // Test corner position
      const cornerNeighbors = hexMap.getNeighbors(0, 0);
      expect(Array.isArray(cornerNeighbors)).toBe(true);
      expect(cornerNeighbors.length).toBeLessThanOrEqual(6);
    });

    test('should validate tile access', () => {
      const validTile = hexMap.getTile(5, 5);
      expect(validTile).toBeDefined();
      
      const invalidTile = hexMap.getTile(-1, -1);
      expect(invalidTile).toBeNull();
      
      const outOfBoundsTile = hexMap.getTile(100, 100);
      expect(outOfBoundsTile).toBeNull();
    });
  });

  describe('Map Properties', () => {
    beforeEach(() => {
      hexMap.generateProceduralMap(42);
    });

    test('should have consistent map dimensions', () => {
      expect(hexMap.width).toBe(10);
      expect(hexMap.height).toBe(10);
      expect(hexMap.tiles.length).toBe(hexMap.height);
      expect(hexMap.tiles[0].length).toBe(hexMap.width);
    });

    test('should contain various terrain types', () => {
      const terrainTypes = new Set<TerrainType>();
      
      hexMap.tiles.forEach(row => {
        row.forEach(tile => {
          terrainTypes.add(tile.terrain);
        });
      });
      
      expect(terrainTypes.size).toBeGreaterThan(1); // Should have multiple terrain types
    });
  });
});