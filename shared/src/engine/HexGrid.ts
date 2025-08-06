import { HexCoordinate, TerrainType, Position } from '../types/GameTypes';

export interface HexTile {
  coordinate: HexCoordinate;
  terrain: TerrainType;
  resources: string[]; // Strategic/luxury resources
  improvements: string[]; // Roads, farms, mines, etc.
  visibility: Map<string, boolean>; // Player visibility (fog of war)
}

export class HexGrid {
  public width: number;
  public height: number;
  public tiles: Map<string, HexTile>;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.tiles = new Map();
    this.initializeGrid();
  }

  private initializeGrid(): void {
    // Initialize hex grid with offset coordinates
    for (let r = 0; r < this.height; r++) {
      for (let q = 0; q < this.width; q++) {
        const s = -q - r;
        const coordinate: HexCoordinate = { q, r, s };
        const key = this.getKey(coordinate);
        
        const tile: HexTile = {
          coordinate,
          terrain: TerrainType.GRASSLAND, // Default terrain
          resources: [],
          improvements: [],
          visibility: new Map()
        };
        
        this.tiles.set(key, tile);
      }
    }
  }

  public generateTerrain(): void {
    // Simple terrain generation algorithm
    const terrains = [
      TerrainType.GRASSLAND,
      TerrainType.PLAINS,
      TerrainType.DESERT,
      TerrainType.TUNDRA,
      TerrainType.HILLS,
      TerrainType.FOREST
    ];

    for (const [key, tile] of this.tiles) {
      // Use Perlin noise or simple random for terrain generation
      const terrainIndex = Math.floor(Math.random() * terrains.length);
      tile.terrain = terrains[terrainIndex];
      
      // Add some water bodies
      if (Math.random() < 0.15) {
        tile.terrain = TerrainType.OCEAN;
      }
      
      // Add resources randomly
      if (Math.random() < 0.3) {
        const resources = ['iron', 'horses', 'wheat', 'wine', 'luxury'];
        const resourceIndex = Math.floor(Math.random() * resources.length);
        tile.resources.push(resources[resourceIndex]);
      }
    }
  }

  public getKey(coordinate: HexCoordinate): string {
    return `${coordinate.q},${coordinate.r}`;
  }

  public getTile(coordinate: HexCoordinate): HexTile | undefined {
    const key = this.getKey(coordinate);
    return this.tiles.get(key);
  }

  public getNeighbors(coordinate: HexCoordinate): HexCoordinate[] {
    const directions = [
      { q: 1, r: 0, s: -1 },
      { q: 1, r: -1, s: 0 },
      { q: 0, r: -1, s: 1 },
      { q: -1, r: 0, s: 1 },
      { q: -1, r: 1, s: 0 },
      { q: 0, r: 1, s: -1 }
    ];

    return directions
      .map(dir => ({
        q: coordinate.q + dir.q,
        r: coordinate.r + dir.r,
        s: coordinate.s + dir.s
      }))
      .filter(coord => this.isValidCoordinate(coord));
  }

  public getAdjacentHex(coordinate: HexCoordinate, direction: number): HexCoordinate {
    const directions = [
      { q: 1, r: 0, s: -1 },
      { q: 1, r: -1, s: 0 },
      { q: 0, r: -1, s: 1 },
      { q: -1, r: 0, s: 1 },
      { q: -1, r: 1, s: 0 },
      { q: 0, r: 1, s: -1 }
    ];

    const dir = directions[direction % 6];
    return {
      q: coordinate.q + dir.q,
      r: coordinate.r + dir.r,
      s: coordinate.s + dir.s
    };
  }

  public getDistance(a: HexCoordinate, b: HexCoordinate): number {
    return Math.max(
      Math.abs(a.q - b.q),
      Math.abs(a.r - b.r),
      Math.abs(a.s - b.s)
    );
  }

  public getPath(start: HexCoordinate, end: HexCoordinate): HexCoordinate[] {
    // Simple A* pathfinding for hex grid
    const openSet = new Set([this.getKey(start)]);
    const cameFrom = new Map<string, HexCoordinate>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    gScore.set(this.getKey(start), 0);
    fScore.set(this.getKey(start), this.getDistance(start, end));

    while (openSet.size > 0) {
      // Get node with lowest fScore
      let current: HexCoordinate | undefined;
      let lowestF = Infinity;
      
      for (const nodeKey of openSet) {
        const f = fScore.get(nodeKey) || Infinity;
        if (f < lowestF) {
          lowestF = f;
          const tile = this.tiles.get(nodeKey);
          if (tile) current = tile.coordinate;
        }
      }

      if (!current) break;
      
      const currentKey = this.getKey(current);
      
      if (this.getDistance(current, end) === 0) {
        // Reconstruct path
        const path: HexCoordinate[] = [current];
        let pathNode = current;
        
        while (cameFrom.has(this.getKey(pathNode))) {
          pathNode = cameFrom.get(this.getKey(pathNode))!;
          path.unshift(pathNode);
        }
        
        return path;
      }

      openSet.delete(currentKey);
      const neighbors = this.getNeighbors(current);
      
      for (const neighbor of neighbors) {
        const neighborKey = this.getKey(neighbor);
        const tile = this.getTile(neighbor);
        
        if (!tile || tile.terrain === TerrainType.OCEAN) {
          continue; // Skip impassable terrain
        }

        const tentativeG = (gScore.get(currentKey) || 0) + 1;
        
        if (!gScore.has(neighborKey) || tentativeG < (gScore.get(neighborKey) || Infinity)) {
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeG);
          fScore.set(neighborKey, tentativeG + this.getDistance(neighbor, end));
          
          if (!openSet.has(neighborKey)) {
            openSet.add(neighborKey);
          }
        }
      }
    }

    return []; // No path found
  }

  public getPlayerStartPosition(playerIndex: number): HexCoordinate {
    // Distribute players around the map
    const centerQ = Math.floor(this.width / 2);
    const centerR = Math.floor(this.height / 2);
    
    const angle = (playerIndex * 2 * Math.PI) / 6; // Max 6 players
    const radius = Math.min(this.width, this.height) / 4;
    
    const q = Math.floor(centerQ + radius * Math.cos(angle));
    const r = Math.floor(centerR + radius * Math.sin(angle));
    const s = -q - r;
    
    return { q, r, s };
  }

  public isValidCoordinate(coordinate: HexCoordinate): boolean {
    return coordinate.q >= 0 && 
           coordinate.q < this.width && 
           coordinate.r >= 0 && 
           coordinate.r < this.height &&
           coordinate.q + coordinate.r + coordinate.s === 0;
  }

  public hexToPixel(coordinate: HexCoordinate, hexSize: number): Position {
    const x = hexSize * (3/2 * coordinate.q);
    const y = hexSize * (Math.sqrt(3)/2 * coordinate.q + Math.sqrt(3) * coordinate.r);
    return { x, y };
  }

  public pixelToHex(position: Position, hexSize: number): HexCoordinate {
    const q = (2/3 * position.x) / hexSize;
    const r = (-1/3 * position.x + Math.sqrt(3)/3 * position.y) / hexSize;
    const s = -q - r;
    
    // Round to nearest hex
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);
    
    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);
    
    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    } else {
      rs = -rq - rr;
    }
    
    return { q: rq, r: rr, s: rs };
  }

  public serialize(): any {
    const tilesArray = Array.from(this.tiles.entries()).map(([key, tile]) => [
      key,
      {
        ...tile,
        visibility: Array.from(tile.visibility.entries())
      }
    ]);
    
    return {
      width: this.width,
      height: this.height,
      tiles: tilesArray
    };
  }

  public static deserialize(data: any): HexGrid {
    const grid = new HexGrid(data.width, data.height);
    
    const tilesMap = new Map(
      data.tiles.map(([key, tileData]: [string, any]) => [
        key,
        {
          ...tileData,
          visibility: new Map(tileData.visibility)
        }
      ])
    );
    
    grid.tiles = tilesMap;
    return grid;
  }
}