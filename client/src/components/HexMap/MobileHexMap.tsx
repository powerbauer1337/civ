import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Box, IconButton, Paper, Slider, Typography, Fade, Chip } from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  TouchApp,
  PanTool,
  Visibility,
  VisibilityOff,
  MyLocation
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
  gameStats?: {
    turn: number;
    currentPlayer?: string;
    resources?: Record<string, number>;
  };
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
  isMobile = false,
  gameStats
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
  const [showControls, setShowControls] = useState(true);
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const [perfStats, setPerfStats] = useState({ fps: 60, renderTime: 0 });

  // Refs
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const lastTapTime = useRef(0);

  // Constants
  const HEX_SIZE = isMobile ? 25 : 30;
  const HEX_WIDTH = HEX_SIZE * 2;
  const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE;
  const MIN_SCALE = 0.3;
  const MAX_SCALE = 4;
  const DOUBLE_TAP_DELAY = 300;
  const CONTROLS_HIDE_DELAY = 3000; // Hide controls after 3 seconds of inactivity
  
  // Auto-hide controls on mobile
  useEffect(() => {
    if (!isMobile) return;
    
    const timer = setTimeout(() => {
      if (Date.now() - lastInteraction > CONTROLS_HIDE_DELAY) {
        setShowControls(false);
      }
    }, CONTROLS_HIDE_DELAY);

    return () => clearTimeout(timer);
  }, [lastInteraction, isMobile]);

  // Performance monitoring
  useEffect(() => {
    const startTime = window.performance.now();
    const endTime = window.performance.now();
    const renderTime = endTime - startTime;
    
    setPerfStats(() => ({
      fps: Math.round(1000 / Math.max(renderTime, 16)), // Estimate FPS
      renderTime: Math.round(renderTime * 100) / 100
    }));
  }, [scale, offset, map]);


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

  // Touch event handlers with improved gesture detection
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setLastInteraction(Date.now());
    setShowControls(true);
    
    const touches = Array.from(e.touches);

    if (touches.length === 1) {
      // Single touch - check for double tap
      const now = Date.now();
      if (now - lastTapTime.current < DOUBLE_TAP_DELAY) {
        // Double tap - smart zoom to selected tile or zoom in
        if (selectedTile && containerRef.current) {
          const { x: tilePixelX, y: tilePixelY } = hexToPixel(selectedTile.x, selectedTile.y);
          const rect = containerRef.current.getBoundingClientRect();
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          
          setOffset({
            x: centerX - tilePixelX * scale,
            y: centerY - tilePixelY * scale
          });
          setScale(Math.min(MAX_SCALE, scale * 1.5));
        } else {
          handleZoom(1.5);
        }
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
  }, [interactionMode, offset, handleZoom, selectedTile, hexToPixel, scale]);

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

  const centerOnTile = useCallback((position: Position) => {
    if (!containerRef.current) return;
    
    const { x: tilePixelX, y: tilePixelY } = hexToPixel(position.x, position.y);
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    setOffset({
      x: centerX - tilePixelX * scale,
      y: centerY - tilePixelY * scale
    });
  }, [hexToPixel, scale]);

  const centerOnSelectedTile = useCallback(() => {
    if (selectedTile) {
      centerOnTile(selectedTile);
    }
  }, [selectedTile, centerOnTile]);

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

  // Mobile control panel with improved design
  const renderMobileControls = () => (
    <Fade in={showControls} timeout={300}>
      <Box>
        {/* Game Status Bar */}
        {gameStats && (
          <Paper
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              right: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Box display="flex" gap={1}>
              <Chip label={`Turn ${gameStats.turn}`} size="small" color="primary" />
              {gameStats.currentPlayer && (
                <Chip label={gameStats.currentPlayer} size="small" variant="outlined" />
              )}
            </Box>
            
            {perfStats.renderTime > 0 && (
              <Chip 
                label={`${perfStats.fps} FPS`} 
                size="small" 
                color={perfStats.fps > 30 ? 'success' : 'warning'} 
                variant="outlined" 
              />
            )}
          </Paper>
        )}

        {/* Main Control Panel */}
        <Paper
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 8,
            right: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            p: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton
              size="small"
              onClick={() => {
                setInteractionMode(interactionMode === 'pan' ? 'select' : 'pan');
                setLastInteraction(Date.now());
              }}
              color={interactionMode === 'pan' ? 'primary' : 'default'}
              sx={{
                backgroundColor: interactionMode === 'pan' ? 'rgba(25, 118, 210, 0.2)' : 'transparent'
              }}
            >
              {interactionMode === 'pan' ? <PanTool /> : <TouchApp />}
            </IconButton>

            <IconButton 
              size="small" 
              onClick={() => {
                handleZoom(0.8);
                setLastInteraction(Date.now());
              }}
            >
              <ZoomOut />
            </IconButton>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Slider
              value={scale}
              min={MIN_SCALE}
              max={MAX_SCALE}
              step={0.1}
              onChange={(_, value) => {
                setScale(value as number);
                setLastInteraction(Date.now());
              }}
              sx={{ width: 80 }}
            />
            <Typography variant="caption" color="white" minWidth={40}>
              {Math.round(scale * 100)}%
            </Typography>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <IconButton 
              size="small" 
              onClick={() => {
                handleZoom(1.2);
                setLastInteraction(Date.now());
              }}
            >
              <ZoomIn />
            </IconButton>

            <IconButton 
              size="small" 
              onClick={() => {
                centerOnSelectedTile();
                setLastInteraction(Date.now());
              }}
              disabled={!selectedTile}
              color={selectedTile ? 'primary' : 'default'}
            >
              <MyLocation />
            </IconButton>

            <IconButton 
              size="small" 
              onClick={() => {
                handleResetView();
                setLastInteraction(Date.now());
              }}
            >
              <CenterFocusStrong />
            </IconButton>

            <IconButton
              size="small"
              onClick={() => {
                setShowGrid(!showGrid);
                setLastInteraction(Date.now());
              }}
              color={showGrid ? 'primary' : 'default'}
            >
              {showGrid ? <Visibility /> : <VisibilityOff />}
            </IconButton>
          </Box>
        </Paper>
      </Box>
    </Fade>
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
        onClick={() => {
          if (isMobile) {
            setShowControls(!showControls);
            setLastInteraction(Date.now());
          }
        }}
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
    </Box>
  );
};

export default MobileHexMap;
