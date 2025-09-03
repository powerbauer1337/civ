import React from 'react';
import TerrainTextures from './TerrainTextures';

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

interface Resource {
  type: string;
  quantity?: number;
}

interface EnhancedHexTileProps {
  x: number;
  y: number;
  size: number;
  terrain: string;
  unit?: Unit | null;
  resource?: Resource | null;
  isHighlighted?: boolean;
  isHovered?: boolean;
  isSelected?: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/**
 * EnhancedHexTile component with advanced SVG terrain textures
 * Provides realistic terrain rendering with pattern fills and enhanced visual effects
 */
const EnhancedHexTile: React.FC<EnhancedHexTileProps> = ({
  x,
  y,
  size,
  terrain,
  unit,
  resource,
  isHighlighted = false,
  isHovered = false,
  isSelected = false,
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
   * Get terrain pattern fill for enhanced textures
   */
  const getTerrainPattern = (terrainType: string): string => {
    const validPatterns = [
      'grassland', 'plains', 'hills', 'mountains', 'desert',
      'ocean', 'coast', 'tundra', 'snow', 'forest', 'jungle'
    ];
    
    if (validPatterns.includes(terrainType)) {
      return `url(#${terrainType})`;
    }
    return 'url(#grassland)'; // Default fallback
  };

  /**
   * Get terrain base color as fallback
   */
  const getTerrainBaseColor = (terrainType: string): string => {
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
      default: return '#90EE90';
    }
  };

  /**
   * Get unit color based on player/ownership
   */
  const getUnitColor = (unitData: Unit): string => {
    const playerColors: { [key: string]: string } = {
      'player_1': '#FF4444',
      'player_2': '#4444FF', 
      'player_3': '#44FF44',
      'player_4': '#FFFF44',
      'player_ai': '#FF8800'
    };
    return playerColors[unitData.playerId] || '#FF6B6B';
  };

  /**
   * Get enhanced unit symbol with better visibility
   */
  const getUnitSymbol = (unitType: string): string => {
    switch (unitType) {
      case 'settler': return '🏘️';
      case 'warrior': return '⚔️';
      case 'scout': return '👁️';
      case 'worker': return '🔨';
      case 'archer': return '🏹';
      case 'spearman': return '🛡️';
      case 'cavalry': return '🐎';
      case 'cannon': return '💣';
      default: return '⚪';
    }
  };

  /**
   * Get resource overlay pattern
   */
  const getResourcePattern = (resourceType: string): string | null => {
    switch (resourceType) {
      case 'gold': return 'url(#gold)';
      case 'iron': return 'url(#iron)';
      case 'oil': return 'url(#oil)';
      default: return null;
    }
  };

  /**
   * Get resource symbol for display
   */
  const getResourceSymbol = (resourceType: string): string => {
    switch (resourceType) {
      case 'gold': return '💰';
      case 'iron': return '⛏️';
      case 'oil': return '🛢️';
      case 'wheat': return '🌾';
      case 'cattle': return '🐄';
      case 'fish': return '🐟';
      case 'stone': return '🗿';
      case 'coal': return '⚫';
      default: return '💎';
    }
  };

  // Calculate visual effects
  let fillPattern = getTerrainPattern(terrain);
  let strokeColor = '#333';
  let strokeWidth = 1;
  let opacity = 1;

  // Apply interaction effects
  if (isSelected) {
    strokeColor = '#FFD700';
    strokeWidth = 4;
  } else if (isHighlighted) {
    strokeColor = '#00FF00';
    strokeWidth = 3;
    opacity = 0.9;
  } else if (isHovered) {
    strokeColor = '#FFFFFF';
    strokeWidth = 2;
    opacity = 0.95;
  }

  return (
    <g>
      {/* Include terrain texture definitions */}
      <TerrainTextures />
      
      {/* Main hex tile with pattern fill */}
      <path
        d={getHexPath(x, y, size)}
        fill={fillPattern}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
        style={{ cursor: 'pointer' }}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />

      {/* Fallback solid color for unsupported browsers */}
      <path
        d={getHexPath(x, y, size * 0.98)}
        fill={getTerrainBaseColor(terrain)}
        opacity={0.1}
        pointerEvents="none"
      />

      {/* Resource overlay */}
      {resource && (
        <g>
          {/* Resource pattern overlay */}
          {getResourcePattern(resource.type) && (
            <path
              d={getHexPath(x, y, size * 0.3)}
              fill={getResourcePattern(resource.type) || 'none'}
              opacity={0.8}
              pointerEvents="none"
            />
          )}
          
          {/* Resource symbol */}
          <text
            x={x + size * 0.6}
            y={y - size * 0.6}
            textAnchor="middle"
            fontSize={size * 0.25}
            fill="#FFF"
            stroke="#000"
            strokeWidth={1}
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {getResourceSymbol(resource.type)}
          </text>

          {/* Resource quantity indicator */}
          {resource.quantity && resource.quantity > 1 && (
            <text
              x={x + size * 0.75}
              y={y - size * 0.45}
              textAnchor="middle"
              fontSize={size * 0.15}
              fill="#FFD700"
              stroke="#000"
              strokeWidth={0.5}
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {resource.quantity}
            </text>
          )}
        </g>
      )}

      {/* Enhanced terrain features */}
      {terrain === 'forest' && (
        <g opacity={0.3} pointerEvents="none">
          <circle cx={x - size * 0.2} cy={y - size * 0.1} r={size * 0.15} fill="#006400" />
          <circle cx={x + size * 0.1} cy={y + size * 0.2} r={size * 0.12} fill="#228B22" />
          <circle cx={x + size * 0.3} cy={y - size * 0.2} r={size * 0.1} fill="#32CD32" />
        </g>
      )}

      {terrain === 'jungle' && (
        <g opacity={0.4} pointerEvents="none">
          <ellipse cx={x} cy={y} rx={size * 0.4} ry={size * 0.2} fill="#228B22" />
          <circle cx={x - size * 0.1} cy={y - size * 0.1} r={size * 0.18} fill="#32CD32" />
          <circle cx={x + size * 0.15} cy={y + size * 0.05} r={size * 0.15} fill="#9ACD32" />
        </g>
      )}

      {/* Unit visualization with enhanced graphics */}
      {unit && (
        <g>
          {/* Unit background with gradient effect */}
          <defs>
            <radialGradient id={`unitGradient-${unit.id}`} cx="0.3" cy="0.3">
              <stop offset="0%" stopColor="#FFF" stopOpacity="0.4" />
              <stop offset="100%" stopColor={getUnitColor(unit)} stopOpacity="1" />
            </radialGradient>
          </defs>
          
          <circle
            cx={x}
            cy={y}
            r={size * 0.35}
            fill={`url(#unitGradient-${unit.id})`}
            stroke="#000"
            strokeWidth={2}
            opacity={0.95}
          />

          {/* Unit type indicator ring */}
          <circle
            cx={x}
            cy={y}
            r={size * 0.4}
            fill="none"
            stroke={getUnitColor(unit)}
            strokeWidth={1.5}
            opacity={0.7}
          />

          {/* Unit symbol */}
          <text
            x={x}
            y={y + size * 0.08}
            textAnchor="middle"
            fontSize={size * 0.3}
            fill="#FFF"
            stroke="#000"
            strokeWidth={0.8}
            style={{ 
              userSelect: 'none', 
              pointerEvents: 'none',
              filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))'
            }}
          >
            {getUnitSymbol(unit.type)}
          </text>

          {/* Enhanced health indicator */}
          {unit.health < unit.maxHealth && (
            <g>
              <rect
                x={x - size * 0.3}
                y={y - size * 0.55}
                width={size * 0.6}
                height={4}
                fill="#000"
                opacity={0.5}
                rx={2}
              />
              <rect
                x={x - size * 0.3}
                y={y - size * 0.55}
                width={size * 0.6 * (unit.health / unit.maxHealth)}
                height={4}
                fill="#00FF00"
                rx={2}
              />
            </g>
          )}

          {/* Enhanced movement points indicator */}
          {unit.movement < unit.maxMovement && (
            <g>
              {[...Array(unit.maxMovement)].map((_, i) => (
                <circle
                  key={i}
                  cx={x - size * 0.35 + i * (size * 0.7 / Math.max(unit.maxMovement - 1, 1))}
                  cy={y + size * 0.45}
                  r={2.5}
                  fill={i < unit.movement ? '#00BFFF' : '#333'}
                  stroke="#FFF"
                  strokeWidth={0.8}
                  opacity={0.8}
                />
              ))}
            </g>
          )}
        </g>
      )}

      {/* Enhanced selection indicator */}
      {isSelected && (
        <g>
          <circle
            cx={x}
            cy={y}
            r={size + 6}
            fill="none"
            stroke="#FFD700"
            strokeWidth={3}
            strokeDasharray="8,4"
            opacity={0.9}
          />
          <circle
            cx={x}
            cy={y}
            r={size + 10}
            fill="none"
            stroke="#FFF"
            strokeWidth={1}
            strokeDasharray="4,6"
            opacity={0.6}
          />
        </g>
      )}

      {/* Highlight glow effect */}
      {isHighlighted && (
        <circle
          cx={x}
          cy={y}
          r={size + 3}
          fill="none"
          stroke="#00FF00"
          strokeWidth={2}
          opacity={0.4}
          style={{
            filter: 'blur(1px)'
          }}
        />
      )}

      {/* Hover shadow effect */}
      {isHovered && !isSelected && (
        <circle
          cx={x + 1}
          cy={y + 1}
          r={size}
          fill="#000"
          opacity={0.2}
          pointerEvents="none"
        />
      )}
    </g>
  );
};

export default EnhancedHexTile;