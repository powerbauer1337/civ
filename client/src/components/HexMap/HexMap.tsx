import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, Alert } from '@mui/material';
import HexTile from './HexTile';
// Simplified interfaces to avoid import issues
interface Unit {
  id: string;
  type: string;
  playerId: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  movement: number;
  maxMovement: number;
}

interface MapTile {
  x: number;
  y: number;
  terrain: string;
  unit?: Unit | null;
  resources?: any;
}

interface HexMapProps {
  gameState: any;
  playerId: string;
  onTileClick: (x: number, y: number) => void;
  onUnitClick: (unit: Unit) => void;
}

/**
 * HexMap component renders the main game map with hexagonal tiles
 * Replaces the green placeholder with real hex grid visualization
 */
const HexMap: React.FC<HexMapProps> = ({ gameState, playerId, onTileClick, onUnitClick }) => {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [hoveredTile, setHoveredTile] = useState<{ x: number; y: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan] = useState({ x: 0, y: 0 });
  
  // Extract map data from game state
  const mapData = gameState?.board || gameState?.map;
  const tiles: MapTile[][] = mapData?.tiles || [];
  const mapWidth = mapData?.width || 20;
  const mapHeight = mapData?.height || 20;

  // Hex tile dimensions
  const HEX_SIZE = 40;
  const HEX_WIDTH = HEX_SIZE * 2;
  const HEX_HEIGHT = HEX_SIZE * Math.sqrt(3);
  const HEX_VERTICAL_SPACING = HEX_HEIGHT * 0.75;

  useEffect(() => {
    console.log('HexMap received game state:', { 
      hasBoard: !!gameState?.board,
      hasMap: !!gameState?.map,
      tilesLength: tiles.length,
      mapWidth,
      mapHeight,
      firstTile: tiles[0]?.[0]
    });
  }, [gameState, tiles.length, mapWidth, mapHeight]);

  /**
   * Convert hex coordinates to pixel position
   */
  const hexToPixel = (x: number, y: number) => {
    const pixelX = HEX_SIZE * (3/2 * x);
    const pixelY = HEX_SIZE * (Math.sqrt(3) * (y - x/2));
    return { x: pixelX, y: pixelY };
  };

  /**
   * Handle tile click with unit selection logic
   */
  const handleTileClick = (x: number, y: number) => {
    console.log(`Tile clicked: (${x}, ${y})`);
    
    // Check if tile has a unit
    const tile = tiles[y]?.[x];
    if (tile?.unit) {
      // If unit belongs to current player, select it
      if (tile.unit.playerId === playerId) {
        setSelectedUnit(tile.unit);
        onUnitClick(tile.unit);
        console.log('Selected unit:', tile.unit);
      } else {
        console.log('Cannot select enemy unit');
      }
    } else if (selectedUnit) {
      // If we have a selected unit and clicked empty tile, try to move
      console.log(`Attempting to move unit ${selectedUnit.id} to (${x}, ${y})`);
      onTileClick(x, y);
      setSelectedUnit(null); // Clear selection after move attempt
    } else {
      // Just a regular tile click
      onTileClick(x, y);
    }
  };


  /**
   * Check if tile should be highlighted (movement range, etc.)
   */
  const shouldHighlightTile = (x: number, y: number): boolean => {
    if (!selectedUnit) return false;
    
    // Simple range check - highlight tiles within movement range
    const distance = Math.abs(selectedUnit.x - x) + Math.abs(selectedUnit.y - y);
    return distance <= (selectedUnit.maxMovement || 2);
  };

  if (!mapData || tiles.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', minHeight: 400 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Map data loading...
        </Alert>
        <Typography variant="h6">
          🗺️ Hex Grid Map
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Waiting for game state with map data...
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      {/* Map Controls */}
      <Box sx={{ 
        position: 'absolute', 
        top: 10, 
        left: 10, 
        zIndex: 10,
        background: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 1,
        p: 1
      }}>
        <Typography variant="caption" display="block">
          Map: {mapWidth}x{mapHeight}
        </Typography>
        <Typography variant="caption" display="block">
          Zoom: {zoom.toFixed(1)}x
        </Typography>
        {selectedUnit && (
          <Typography variant="caption" display="block" color="primary">
            Selected: {selectedUnit.type}
          </Typography>
        )}
      </Box>

      {/* Map Container */}
      <Box
        ref={mapRef}
        sx={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: 'top left',
          cursor: 'grab',
          overflow: 'hidden'
        }}
        onWheel={(e) => {
          e.preventDefault();
          const newZoom = zoom + (e.deltaY > 0 ? -0.1 : 0.1);
          setZoom(Math.max(0.3, Math.min(3, newZoom)));
        }}
      >
        <svg
          width={mapWidth * HEX_WIDTH * 0.75 + HEX_WIDTH}
          height={mapHeight * HEX_VERTICAL_SPACING + HEX_HEIGHT}
          style={{ background: '#2c3e50' }}
        >
          {/* Render hex tiles */}
          {tiles.map((row, y) =>
            row.map((tile, x) => {
              const { x: pixelX, y: pixelY } = hexToPixel(x, y);
              const isHighlighted = shouldHighlightTile(x, y);
              const isHovered = hoveredTile?.x === x && hoveredTile?.y === y;
              const isSelected = selectedUnit?.x === x && selectedUnit?.y === y;

              return (
                <HexTile
                  key={`${x}-${y}`}
                  x={pixelX + HEX_WIDTH/2}
                  y={pixelY + HEX_HEIGHT/2}
                  size={HEX_SIZE}
                  terrain={tile.terrain}
                  unit={tile.unit}
                  isHighlighted={isHighlighted}
                  isHovered={isHovered}
                  isSelected={isSelected}
                  hasResource={!!tile.resources}
                  onClick={() => handleTileClick(x, y)}
                  onMouseEnter={() => setHoveredTile({ x, y })}
                  onMouseLeave={() => setHoveredTile(null)}
                />
              );
            })
          )}
        </svg>
      </Box>

      {/* Tile Info Panel */}
      {hoveredTile && (
        <Box sx={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          p: 1,
          borderRadius: 1,
          minWidth: 200
        }}>
          <Typography variant="body2">
            Tile ({hoveredTile.x}, {hoveredTile.y})
          </Typography>
          {tiles[hoveredTile.y]?.[hoveredTile.x] && (
            <>
              <Typography variant="caption" display="block">
                Terrain: {tiles[hoveredTile.y][hoveredTile.x].terrain}
              </Typography>
              {tiles[hoveredTile.y][hoveredTile.x].unit && (
                <Typography variant="caption" display="block" color="yellow">
                  Unit: {tiles[hoveredTile.y][hoveredTile.x].unit?.type}
                </Typography>
              )}
              {tiles[hoveredTile.y][hoveredTile.x].resources && (
                <Typography variant="caption" display="block" color="lightgreen">
                  Resource: {tiles[hoveredTile.y][hoveredTile.x].resources?.type}
                </Typography>
              )}
            </>
          )}
        </Box>
      )}
    </Box>
  );
};

export default HexMap;