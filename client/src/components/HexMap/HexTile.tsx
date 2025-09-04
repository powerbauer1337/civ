import React from 'react';
// Simplified interface to avoid import issues
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

interface HexTileProps {
  x: number;
  y: number;
  size: number;
  terrain: string;
  unit?: Unit | null;
  isHighlighted?: boolean;
  isHovered?: boolean;
  isSelected?: boolean;
  hasResource?: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/**
 * HexTile component renders individual hexagonal map tiles
 * Includes terrain coloring, unit visualization, and interaction states
 */
const HexTile: React.FC<HexTileProps> = ({
  x,
  y,
  size,
  terrain,
  unit,
  isHighlighted = false,
  isHovered = false,
  isSelected = false,
  hasResource = false,
  onClick,
  onMouseEnter,
  onMouseLeave
}) => {
  /**
   * Generate hexagon path for SVG
   */
  const getHexPath = (centerX: number, centerY: number, hexSize: number): string => {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i);
      const pointX = centerX + hexSize * Math.cos(angle);
      const pointY = centerY + hexSize * Math.sin(angle);
      points.push(`${pointX},${pointY}`);
    }
    return `M${points.join('L')}Z`;
  };

  /**
   * Get terrain color based on terrain type
   */
  const getTerrainColor = (terrainType: string): string => {
    switch (terrainType) {
      case 'grassland': return '#90EE90';
      case 'plains': return '#F0E68C';
      case 'hills': return '#8B4513';
      case 'mountains': return '#A9A9A9';
      case 'desert': return '#F4A460';
      case 'ocean': return '#4682B4';
      case 'coast': return '#87CEEB';
      case 'tundra': return '#D3D3D3';
      case 'snow': return '#FFFAFA';
      case 'forest': return '#228B22';
      case 'jungle': return '#006400';
      default: return '#90EE90'; // Default grassland
    }
  };

  /**
   * Get unit color based on player/ownership
   */
  const getUnitColor = (unitData: Unit): string => {
    // For now, use simple color mapping
    // In a full game, this would map to player civilization colors
    const playerColors: { [key: string]: string } = {
      'player_1': '#FF0000', // Red
      'player_2': '#0000FF', // Blue
      'player_3': '#00FF00', // Green
      'player_4': '#FFFF00' // Yellow
    };

    return playerColors[unitData.playerId] || '#FF6B6B'; // Default red
  };

  /**
   * Get unit symbol for display
   */
  const getUnitSymbol = (unitType: string): string => {
    switch (unitType) {
      case 'settler': return '🏡';
      case 'warrior': return '⚔️';
      case 'scout': return '👁️';
      case 'worker': return '🔨';
      case 'archer': return '🏹';
      case 'spearman': return '🛡️';
      default: return '⚪';
    }
  };

  // Calculate colors and effects
  const baseColor = getTerrainColor(terrain);
  let fillColor = baseColor;
  let strokeColor = '#333';
  let strokeWidth = 1;

  // Apply interaction effects
  if (isSelected) {
    strokeColor = '#FFD700'; // Gold
    strokeWidth = 3;
  } else if (isHighlighted) {
    strokeColor = '#00FF00'; // Green for movement range
    strokeWidth = 2;
    fillColor = `${baseColor}CC`; // Add some transparency
  } else if (isHovered) {
    strokeColor = '#FFFFFF';
    strokeWidth = 2;
  }

  // Resource indicators
  const resourceDots = hasResource ? [
    { x: x - size * 0.3, y: y - size * 0.3, color: '#FFD700' },
    { x: x + size * 0.3, y: y - size * 0.3, color: '#FFD700' }
  ] : [];

  const ariaLabel = `Hex tile at ${x}, ${y} with ${terrain}${unit ? ` and ${unit.type} unit` : ''}`;

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <g
      data-testid={`hex-tile-${x}-${y}`}
      className={`hex-tile terrain-${terrain} ${isHighlighted ? 'highlighted' : ''} ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''}`}
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="button"
      style={{ cursor: 'pointer' }}
    >
      {/* Main hex tile */}
      <path
        d={getHexPath(x, y, size)}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        style={{ cursor: 'pointer' }}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />

      {/* Resource indicators */}
      {hasResource && (
        <g data-testid="resource-indicator">
          {resourceDots.map((dot, index) => (
            <circle
              key={index}
              cx={dot.x}
              cy={dot.y}
              r={3}
              fill={dot.color}
              stroke="#000"
              strokeWidth={0.5}
            />
          ))}
        </g>
      )}

      {/* Terrain features (simple) */}
      {terrain === 'hills' && (
        <polygon
          points={`${x-size*0.3},${y} ${x},${y-size*0.2} ${x+size*0.3},${y}`}
          fill="#654321"
          opacity={0.7}
        />
      )}

      {terrain === 'mountains' && (
        <>
          <polygon
            points={`${x-size*0.4},${y} ${x-size*0.1},${y-size*0.3} ${x+size*0.1},${y-size*0.2} ${x+size*0.4},${y}`}
            fill="#696969"
            stroke="#2F4F4F"
            strokeWidth={1}
          />
          <polygon
            points={`${x-size*0.1},${y-size*0.3} ${x},${y-size*0.4} ${x+size*0.1},${y-size*0.2}`}
            fill="#DCDCDC"
          />
        </>
      )}

      {/* Terrain label */}
      <text
        x={x}
        y={y + size * 0.8}
        textAnchor="middle"
        fontSize="6"
        fill="#333"
        opacity={0.7}
      >
        {terrain}
      </text>

      {/* Unit visualization */}
      {unit && (
        <g data-testid={`unit-${unit.type}`}>
          {/* Unit background circle */}
          <circle
            cx={x}
            cy={y}
            r={size * 0.4}
            fill={getUnitColor(unit)}
            stroke="#000"
            strokeWidth={2}
            opacity={0.9}
          />

          {/* Unit symbol */}
          <text
            x={x}
            y={y + 4}
            textAnchor="middle"
            fontSize={size * 0.4}
            fill="#FFF"
            stroke="#000"
            strokeWidth={0.5}
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {getUnitSymbol(unit.type)}
          </text>

          {/* Unit type text */}
          <text
            x={x}
            y={y - size * 0.8}
            textAnchor="middle"
            fontSize="6"
            fill="#000"
          >
            {unit.type}
          </text>

          {/* Unit health indicator */}
          <rect
            data-testid="unit-health-bar"
            className={`${unit.health === 0 ? 'critical-health' : unit.health === unit.maxHealth ? 'full-health' : ''}`}
            x={x - size * 0.3}
            y={y - size * 0.6}
            width={size * 0.6 * (unit.health / unit.maxHealth)}
            height={3}
            fill={unit.health < unit.maxHealth * 0.3 ? '#FF0000' : '#00FF00'}
            stroke="#000"
            strokeWidth={0.5}
            style={{width: `${(unit.health / unit.maxHealth) * 100}%`}}
          />

          {/* Movement points indicator */}
          <g
            data-testid="unit-movement"
            className={unit.movement === 0 ? 'no-movement' : ''}
          >
            <text
              x={x}
              y={y + size * 0.7}
              textAnchor="middle"
              fontSize="8"
              fill="#000"
            >
              {unit.movement}/{unit.maxMovement}
            </text>
            {[...Array(unit.maxMovement)].map((_, i) => (
                <circle
                  key={i}
                  cx={x - size * 0.4 + i * 8}
                  cy={y + size * 0.5}
                  r={2}
                  fill={i < unit.movement ? '#00BFFF' : '#333'}
                  stroke="#FFF"
                  strokeWidth={0.5}
                />
              ))}
          </g>
        </g>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <circle
          cx={x}
          cy={y}
          r={size + 5}
          fill="none"
          stroke="#FFD700"
          strokeWidth={2}
          strokeDasharray="5,3"
          opacity={0.8}
        />
      )}
    </g>
  );
};

export default HexTile;
