import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

import HexTile from '../../src/components/HexMap/HexTile';

const mockUnit = {
  id: 'unit-123',
  type: 'warrior',
  playerId: 'player-456',
  x: 5,
  y: 7,
  health: 80,
  maxHealth: 100,
  movement: 2,
  maxMovement: 3
};

const defaultProps = {
  x: 5,
  y: 7,
  size: 50,
  terrain: 'grassland',
  onClick: vi.fn(),
  onMouseEnter: vi.fn(),
  onMouseLeave: vi.fn()
};

// Helper function to render HexTile within SVG context
const renderHexTile = (props: any = {}) => {
  return render(
    <svg>
      <HexTile {...defaultProps} {...props} />
    </svg>
  );
};

describe('HexTile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('should render without crashing', () => {
      render(
        <svg>
          <HexTile {...defaultProps} />
        </svg>
      );

      const hexTile = screen.getByTestId('hex-tile-5-7');
      expect(hexTile).toBeInTheDocument();
    });

    test('should render with correct coordinates', () => {
      renderHexTile();

      expect(screen.getByTestId('hex-tile-5-7')).toBeInTheDocument();
    });

    test('should apply correct terrain styling', () => {
      const { rerender } = renderHexTile({ terrain: "grassland" });

      let hexTile = screen.getByTestId('hex-tile-5-7');
      expect(hexTile).toHaveClass('terrain-grassland');

      rerender(
        <svg>
          <HexTile {...defaultProps} terrain="mountains" />
        </svg>
      );
      hexTile = screen.getByTestId('hex-tile-5-7');
      expect(hexTile).toHaveClass('terrain-mountains');
    });

    test('should render terrain text', () => {
      render(<HexTile {...defaultProps} terrain="plains" />);

      expect(screen.getByText('plains')).toBeInTheDocument();
    });
  });

  describe('Unit Rendering', () => {
    test('should render unit when present', () => {
      render(<HexTile {...defaultProps} unit={mockUnit} />);

      expect(screen.getByTestId('unit-warrior')).toBeInTheDocument();
      expect(screen.getByText('warrior')).toBeInTheDocument();
    });

    test('should show unit health bar when unit present', () => {
      render(<HexTile {...defaultProps} unit={mockUnit} />);

      const healthBar = screen.getByTestId('unit-health-bar');
      expect(healthBar).toBeInTheDocument();
      // Health should be 80/100 = 80%
      expect(healthBar).toHaveStyle('width: 80%');
    });

    test('should not render unit when not present', () => {
      render(<HexTile {...defaultProps} unit={null} />);

      expect(screen.queryByTestId(/unit-/)).not.toBeInTheDocument();
    });

    test('should show unit movement indicators', () => {
      const unitWithMovement = {
        ...mockUnit,
        movement: 1,
        maxMovement: 3
      };

      render(<HexTile {...defaultProps} unit={unitWithMovement} />);

      const movementIndicator = screen.getByTestId('unit-movement');
      expect(movementIndicator).toBeInTheDocument();
      expect(movementIndicator).toHaveTextContent('1/3');
    });
  });

  describe('Interactive States', () => {
    test('should apply highlighted styling when isHighlighted is true', () => {
      render(<HexTile {...defaultProps} isHighlighted={true} />);

      const hexTile = screen.getByTestId('hex-tile-5-7');
      expect(hexTile).toHaveClass('highlighted');
    });

    test('should apply hovered styling when isHovered is true', () => {
      render(<HexTile {...defaultProps} isHovered={true} />);

      const hexTile = screen.getByTestId('hex-tile-5-7');
      expect(hexTile).toHaveClass('hovered');
    });

    test('should apply selected styling when isSelected is true', () => {
      render(<HexTile {...defaultProps} isSelected={true} />);

      const hexTile = screen.getByTestId('hex-tile-5-7');
      expect(hexTile).toHaveClass('selected');
    });

    test('should show resource indicator when hasResource is true', () => {
      render(<HexTile {...defaultProps} hasResource={true} />);

      expect(screen.getByTestId('resource-indicator')).toBeInTheDocument();
    });
  });

  describe('Event Handling', () => {
    test('should call onClick when clicked', () => {
      const onClick = vi.fn();
      render(<HexTile {...defaultProps} onClick={onClick} />);

      const hexTile = screen.getByTestId('hex-tile-5-7');
      fireEvent.click(hexTile);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    test('should call onMouseEnter when mouse enters', () => {
      const onMouseEnter = vi.fn();
      render(<HexTile {...defaultProps} onMouseEnter={onMouseEnter} />);

      const hexTile = screen.getByTestId('hex-tile-5-7');
      fireEvent.mouseEnter(hexTile);

      expect(onMouseEnter).toHaveBeenCalledTimes(1);
    });

    test('should call onMouseLeave when mouse leaves', () => {
      const onMouseLeave = vi.fn();
      render(<HexTile {...defaultProps} onMouseLeave={onMouseLeave} />);

      const hexTile = screen.getByTestId('hex-tile-5-7');
      fireEvent.mouseLeave(hexTile);

      expect(onMouseLeave).toHaveBeenCalledTimes(1);
    });
  });

  describe('Terrain Variations', () => {
    const terrainTypes = ['grassland', 'plains', 'mountains', 'hills', 'forest', 'desert', 'ocean'];

    test.each(terrainTypes)('should render %s terrain correctly', (terrain) => {
      render(<HexTile {...defaultProps} terrain={terrain} />);

      const hexTile = screen.getByTestId('hex-tile-5-7');
      expect(hexTile).toHaveClass(`terrain-${terrain}`);
      expect(screen.getByText(terrain)).toBeInTheDocument();
    });
  });

  describe('Unit Types', () => {
    const unitTypes = ['warrior', 'scout', 'archer', 'spearman', 'settler'];

    test.each(unitTypes)('should render %s unit correctly', (unitType) => {
      const testUnit = { ...mockUnit, type: unitType };
      render(<HexTile {...defaultProps} unit={testUnit} />);

      expect(screen.getByTestId(`unit-${unitType}`)).toBeInTheDocument();
      expect(screen.getByText(unitType)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero health unit', () => {
      const deadUnit = { ...mockUnit, health: 0 };
      render(<HexTile {...defaultProps} unit={deadUnit} />);

      const healthBar = screen.getByTestId('unit-health-bar');
      expect(healthBar).toHaveStyle('width: 0%');
      expect(healthBar).toHaveClass('critical-health');
    });

    test('should handle full health unit', () => {
      const fullHealthUnit = { ...mockUnit, health: 100, maxHealth: 100 };
      render(<HexTile {...defaultProps} unit={fullHealthUnit} />);

      const healthBar = screen.getByTestId('unit-health-bar');
      expect(healthBar).toHaveStyle('width: 100%');
      expect(healthBar).toHaveClass('full-health');
    });

    test('should handle unit with no movement left', () => {
      const noMovementUnit = { ...mockUnit, movement: 0 };
      render(<HexTile {...defaultProps} unit={noMovementUnit} />);

      const movementIndicator = screen.getByTestId('unit-movement');
      expect(movementIndicator).toHaveClass('no-movement');
    });

    test('should handle large coordinates', () => {
      render(<HexTile {...defaultProps} x={999} y={999} />);

      expect(screen.getByTestId('hex-tile-999-999')).toBeInTheDocument();
    });

    test('should handle negative coordinates', () => {
      render(<HexTile {...defaultProps} x={-5} y={-7} />);

      expect(screen.getByTestId('hex-tile--5--7')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('should not re-render when props do not change', () => {
      const { rerender } = render(<HexTile {...defaultProps} />);
      const firstRender = screen.getByTestId('hex-tile-5-7');

      rerender(<HexTile {...defaultProps} />);
      const secondRender = screen.getByTestId('hex-tile-5-7');

      expect(firstRender).toBe(secondRender);
    });

    test('should handle rapid state changes', () => {
      const { rerender } = render(<HexTile {...defaultProps} isHighlighted={false} />);

      // Simulate rapid state changes
      rerender(<HexTile {...defaultProps} isHighlighted={true} />);
      rerender(<HexTile {...defaultProps} isHighlighted={false} />);
      rerender(<HexTile {...defaultProps} isSelected={true} />);

      const hexTile = screen.getByTestId('hex-tile-5-7');
      expect(hexTile).toBeInTheDocument();
      expect(hexTile).toHaveClass('selected');
    });
  });

  describe('Accessibility', () => {
    test('should be keyboard accessible', () => {
      render(<HexTile {...defaultProps} />);

      const hexTile = screen.getByTestId('hex-tile-5-7');
      expect(hexTile).toHaveAttribute('tabIndex', '0');
    });

    test('should have proper ARIA labels', () => {
      render(<HexTile {...defaultProps} terrain="grassland" unit={mockUnit} />);

      const hexTile = screen.getByTestId('hex-tile-5-7');
      expect(hexTile).toHaveAttribute('aria-label');
      expect(hexTile.getAttribute('aria-label')).toContain('grassland');
      expect(hexTile.getAttribute('aria-label')).toContain('warrior');
    });

    test('should handle keyboard navigation', () => {
      const onClick = vi.fn();
      render(<HexTile {...defaultProps} onClick={onClick} />);

      const hexTile = screen.getByTestId('hex-tile-5-7');
      fireEvent.keyDown(hexTile, { key: 'Enter' });

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});
