import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Box, IconButton, Paper, Slider, Typography } from '@mui/material';
import { 
  ZoomIn, 
  ZoomOut, 
  CenterFocusStrong,
  TouchApp,
  PanTool,
  Visibility,
  VisibilityOff 
} from '@mui/icons-material';
import { MapTile } from '@civ-game/shared';

interface Position {
  x: number;
  y: number;
}
import HexTile from './HexTile';

interface MobileHexMapProps {
  map: MapTile[][];
  onTileClick?: (position: Position) => void;
  selectedTile?: Position | null;
  highlightedTiles?: Position[];
  isMobile?: boolean;
}

interface TouchState {
  touches: Touch[];
  lastDistance: number;
  lastCenter: { x: number; y: number };
}

const MobileHexMap: React.FC<MobileHexMapProps> = ({
  map,
  onTileClick,
  selectedTile,
  highlightedTiles = [],
  isMobile = false
}) => {
  // State management
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [touchState, setTouchState] = useState<TouchState>({
    touches: [],
    lastDistance: 0,
    lastCenter: { x: 0, y: 0 }
  });
  const [showGrid, setShowGrid] = useState(true);
  const [interactionMode, setInteractionMode] = useState<'pan' | 'select'>('select');
  
  // Refs
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const lastTapTime = useRef(0);
  
  // Constants
  const HEX_SIZE = isMobile ? 25 : 30;
  const HEX_WIDTH = HEX_SIZE * 2;
  const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE;
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3;
  const DOUBLE_TAP_DELAY = 300;


  // Convert grid to pixel coordinates
  const hexToPixel = useCallback((q: number, r: number) => {
    const x = HEX_SIZE * 3/2 * q;
    const y = HEX_SIZE * Math.sqrt(3) * (r + q/2);
    return { x, y };
  }, [HEX_SIZE]);

  // Convert pixel to grid coordinates
  const pixelToHex = useCallback((x: number, y: number) => {
    const q = (2/3 * x) / HEX_SIZE;
    const r = (-1/3 * x + Math.sqrt(3)/3 * y) / HEX_SIZE;
    
    // Round to nearest hex
    const rx = Math.round(q);
    const ry = Math.round(r);
    const rz = Math.round(-q - r);
    
    const x_diff = Math.abs(rx - q);
    const y_diff = Math.abs(ry - r);
    const z_diff = Math.abs(rz - (-q - r));
    
    if (x_diff > y_diff && x_diff > z_diff) {
      return { q: -ry - rz, r: ry };
    } else if (y_diff > z_diff) {
      return { q: rx, r: -rx - rz };
    } else {
      return { q: rx, r: ry };
    }
  }, [HEX_SIZE]);

  // Zoom controls
  const handleZoom = useCallback((factor: number) => {
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor));
    setScale(newScale);
  }, [scale]);

  // Tile selection
  const handleTileSelect = useCallback((clientX: number, clientY: number) => {
    if (!svgRef.current || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - offset.x) / scale;
    const y = (clientY - rect.top - offset.y) / scale;
    
    const hex = pixelToHex(x, y);
    
    if (hex.q >= 0 && hex.q < map[0].length && hex.r >= 0 && hex.r < map.length) {
      onTileClick?.({ x: hex.q, y: hex.r });
    }
  }, [offset, scale, pixelToHex, map, onTileClick]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touches = Array.from(e.touches);
    
    if (touches.length === 1) {
      // Single touch - check for double tap
      const now = Date.now();
      if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
        // Double tap - zoom in
        handleZoom(2);
        lastTapTime.current = 0;
      } else {
        lastTapTime.current = now;
        
        if (interactionMode === 'pan') {
          setIsDragging(true);
          dragStartPos.current = {
            x: touches[0].clientX - offset.x,
            y: touches[0].clientY - offset.y
          };
        }
      }
    } else if (touches.length === 2) {
      // Two finger touch - prepare for pinch zoom
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      setTouchState({
        touches: touches as unknown as Touch[],
        lastDistance: distance,
        lastCenter: {
          x: (touches[0].clientX + touches[1].clientX) / 2,
          y: (touches[0].clientY + touches[1].clientY) / 2
        }
      });
    }
    
    e.preventDefault();
  }, [interactionMode, offset, handleZoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touches = Array.from(e.touches);
    
    if (touches.length === 1 && isDragging) {
      // Single finger pan
      const newOffset = {
        x: touches[0].clientX - dragStartPos.current.x,
        y: touches[0].clientY - dragStartPos.current.y
      };
      setOffset(newOffset);
    } else if (touches.length === 2) {
      // Pinch zoom
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (touchState.lastDistance > 0) {
        const scaleDelta = distance / touchState.lastDistance;
        const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * scaleDelta));
        setScale(newScale);
      }
      
      // Pan while zooming
      const center = {
        x: (touches[0].clientX + touches[1].clientX) / 2,
        y: (touches[0].clientY + touches[1].clientY) / 2
      };
      
      const deltaX = center.x - touchState.lastCenter.x;
      const deltaY = center.y - touchState.lastCenter.y;
      
      setOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setTouchState({
        touches: touches as unknown as Touch[],
        lastDistance: distance,
        lastCenter: center
      });
    }
    
    e.preventDefault();
  }, [isDragging, scale, touchState]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const touches = Array.from(e.touches);
    
    if (touches.length === 0) {
      setIsDragging(false);
      
      // Check if it was a tap (not a drag)
      if (interactionMode === 'select' && !isDragging) {
        const touch = e.changedTouches[0];
        handleTileSelect(touch.clientX, touch.clientY);
      }
    }
    
    setTouchState({
      touches: [],
      lastDistance: 0,
      lastCenter: { x: 0, y: 0 }
    });
  }, [interactionMode, isDragging, handleTileSelect]);

  // Mouse event handlers (for desktop)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isMobile) {
      setIsDragging(true);
      dragStartPos.current = {
        x: e.clientX - offset.x,
        y: e.clientY - offset.y
      };
    }
  }, [isMobile, offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isMobile && isDragging) {
      const newOffset = {
        x: e.clientX - dragStartPos.current.x,
        y: e.clientY - dragStartPos.current.y
      };
      setOffset(newOffset);
    }
  }, [isMobile, isDragging]);

  const handleMouseUp = useCallback(() => {
    if (!isMobile) {
      setIsDragging(false);
    }
  }, [isMobile]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isMobile) {
      const scaleDelta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * scaleDelta));
      setScale(newScale);
      e.preventDefault();
    }
  }, [isMobile, scale]);

  const handleResetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // Calculate viewport for optimization
  const visibleTiles = useMemo(() => {
    if (!containerRef.current) return { minQ: 0, maxQ: map[0].length, minR: 0, maxR: map.length };
    
    const rect = containerRef.current.getBoundingClientRect();
    const viewportWidth = rect.width / scale;
    const viewportHeight = rect.height / scale;
    
    // Calculate visible area with padding
    const padding = 2;
    const topLeft = pixelToHex(-offset.x / scale - HEX_WIDTH, -offset.y / scale - HEX_HEIGHT);
    const bottomRight = pixelToHex(
      (-offset.x + viewportWidth) / scale + HEX_WIDTH,
      (-offset.y + viewportHeight) / scale + HEX_HEIGHT
    );
    
    return {
      minQ: Math.max(0, topLeft.q - padding),
      maxQ: Math.min(map[0].length, bottomRight.q + padding),
      minR: Math.max(0, topLeft.r - padding),
      maxR: Math.min(map.length, bottomRight.r + padding)
    };
  }, [map, scale, offset, pixelToHex, HEX_WIDTH, HEX_HEIGHT]);

  // Mobile control panel
  const renderMobileControls = () => (
    <Paper
      sx={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(10px)'
      }}
    >
      <IconButton 
        size="small" 
        onClick={() => setInteractionMode(interactionMode === 'pan' ? 'select' : 'pan')}
        color={interactionMode === 'pan' ? 'primary' : 'default'}
      >
        {interactionMode === 'pan' ? <PanTool /> : <TouchApp />}
      </IconButton>
      
      <IconButton size="small" onClick={() => handleZoom(0.8)}>
        <ZoomOut />
      </IconButton>
      
      <Slider
        value={scale}
        min={MIN_SCALE}
        max={MAX_SCALE}
        step={0.1}
        onChange={(_, value) => setScale(value as number)}
        sx={{ width: 100 }}
      />
      
      <IconButton size="small" onClick={() => handleZoom(1.2)}>
        <ZoomIn />
      </IconButton>
      
      <IconButton size="small" onClick={handleResetView}>
        <CenterFocusStrong />
      </IconButton>
      
      <IconButton 
        size="small" 
        onClick={() => setShowGrid(!showGrid)}
        color={showGrid ? 'primary' : 'default'}
      >
        {showGrid ? <Visibility /> : <VisibilityOff />}
      </IconButton>
    </Paper>
  );

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'none',
        userSelect: 'none',
        backgroundColor: '#1a237e'
      }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          transform: `scale(${scale}) translate(${offset.x}px, ${offset.y}px)`,
          transformOrigin: '0 0'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Render only visible tiles for performance */}
        {map.slice(visibleTiles.minR, visibleTiles.maxR).map((row, r) => 
          row.slice(visibleTiles.minQ, visibleTiles.maxQ).map((tile, q) => {
            const actualQ = q + visibleTiles.minQ;
            const actualR = r + visibleTiles.minR;
            const { x, y } = hexToPixel(actualQ, actualR);
            const isSelected = selectedTile?.x === actualQ && selectedTile?.y === actualR;
            const isHighlighted = highlightedTiles.some(h => h.x === actualQ && h.y === actualR);
            
            return (
              <g key={`${actualQ}-${actualR}`} transform={`translate(${x}, ${y})`}>
                <HexTile
                  x={0}
                  y={0}
                  size={HEX_SIZE}
                  terrain={tile.terrain}
                  unit={tile.unit}
                  isHighlighted={isHighlighted}
                  isHovered={false}
                  isSelected={isSelected}
                  hasResource={!!tile.resources}
                  onClick={() => onTileClick?.({ x: actualQ, y: actualR })}
                  onMouseEnter={() => {}}
                  onMouseLeave={() => {}}
                />
              </g>
            );
          })
        )}
      </svg>
      
      {/* Mobile controls */}
      {isMobile && renderMobileControls()}
      
      {/* Scale indicator */}
      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          color: 'white',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          px: 1,
          borderRadius: 1
        }}
      >
        {Math.round(scale * 100)}%
      </Typography>
    </Box>
  );
};

export default MobileHexMap;
