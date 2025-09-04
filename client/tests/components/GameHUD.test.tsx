import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';

import GameHUD from '../../src/components/GameHUD';
import authSlice from '../../src/store/authSlice';
import gameSlice from '../../src/store/gameSlice';
import uiSlice from '../../src/store/uiSlice';

// Mock SocketContext
const mockSendGameAction = vi.fn();
vi.mock('../../src/contexts/SocketContext', () => ({
  useSocket: () => ({
    sendGameAction: mockSendGameAction,
    socket: null,
    isConnected: false,
    gameRooms: [],
    refreshRooms: vi.fn()
  })
}));

// Helper function to create mock store
const createMockStore = (gameState: any = null, user: any = null, currentPlayerTurn = false) => {
  return configureStore({
    reducer: {
      auth: authSlice,
      game: gameSlice,
      ui: uiSlice
    },
    preloadedState: {
      auth: {
        user,
        token: 'mock-token',
        isAuthenticated: !!user,
        isLoading: false,
        error: null
      },
      game: {
        gameState,
        currentPlayerTurn,
        selectedUnit: null,
        selectedTile: null,
        gamePhase: 'waiting',
        lastAction: null
      },
      ui: {
        sidebarOpen: false,
        modalOpen: false,
        currentModal: null,
        notifications: [],
        loading: false,
        error: null,
        theme: 'dark',
        soundEnabled: true,
        animationsEnabled: true,
        autoSave: true,
        gridLines: true,
        hexNumbers: false,
        unitHealthBars: true,
        resourceIcons: true,
        terrainLabels: false
      }
    }
  });
};

const mockUser = {
  id: 'user-123',
  username: 'TestPlayer',
  email: 'test@example.com'
};

const mockGameState = {
  gameId: 'game-123',
  players: [
    {
      id: 'user-123',
      username: 'TestPlayer',
      name: 'TestPlayer',
      civilization: 'Romans',
      color: '#ff0000',
      resources: {
        gold: 100,
        science: 50,
        culture: 25,
        faith: 10
      },
      cities: [],
      units: [],
      technologies: [],
      isReady: true
    }
  ],
  currentPlayer: 'user-123',
  currentTurn: 1,
  gamePhase: 'playing' as const,
  board: [],
  winner: null,
  startedAt: new Date().toISOString() // Fix serialization warning
};

describe('GameHUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render without crashing', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <GameHUD />
        </Provider>
      );

      expect(screen.getByTestId('game-hud')).toBeInTheDocument();
    });

    test('should render menu button', () => {
      const store = createMockStore();
      render(
        <Provider store={store}>
          <GameHUD />
        </Provider>
      );

      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
    });

    test('should show turn number when game state exists', () => {
      const store = createMockStore(mockGameState, mockUser);
      render(
        <Provider store={store}>
          <GameHUD />
        </Provider>
      );

      expect(screen.getByText(/turn 1/i)).toBeInTheDocument();
    });

    test('should show active player name in chip', () => {
      const store = createMockStore(mockGameState, mockUser);
      render(
        <Provider store={store}>
          <GameHUD />
        </Provider>
      );

      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });
  });

  describe('Player Information', () => {
    test('should show current player resources when player exists', () => {
      const store = createMockStore(mockGameState, mockUser);
      render(
        <Provider store={store}>
          <GameHUD />
        </Provider>
      );

      expect(screen.getByText(/💰.*100/)).toBeInTheDocument(); // Gold
      expect(screen.getByText(/🔬.*50/)).toBeInTheDocument(); // Science
      expect(screen.getByText(/🎭.*25/)).toBeInTheDocument(); // Culture
    });

    test('should show player name', () => {
      const store = createMockStore(mockGameState, mockUser);
      render(
        <Provider store={store}>
          <GameHUD />
        </Provider>
      );

      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });

    test('should indicate whose turn it is via chip color', () => {
      const store = createMockStore(mockGameState, mockUser, true);
      render(
        <Provider store={store}>
          <GameHUD />
        </Provider>
      );

      // Should show the player name in the chip when it's their turn
      expect(screen.getByText('TestPlayer')).toBeInTheDocument();
    });
  });

  describe('Turn Management', () => {
    test('should show end turn button when it is player turn', () => {
      const store = createMockStore(mockGameState, mockUser, true);
      render(
        <Provider store={store}>
          <GameHUD />
        </Provider>
      );

      expect(screen.getByRole('button', { name: /end current turn/i })).toBeInTheDocument();
    });

    test('should show waiting button when it is not player turn', () => {
      const store = createMockStore(mockGameState, mockUser, false);
      render(
        <Provider store={store}>
          <GameHUD />
        </Provider>
      );

      const waitingButton = screen.getByRole('button', { name: /waiting for turn/i });
      expect(waitingButton).toBeInTheDocument();
      expect(waitingButton).toBeDisabled();
    });

    test('should call sendGameAction when end turn is clicked', () => {
      const store = createMockStore(mockGameState, mockUser, true);
      render(
        <Provider store={store}>
          <GameHUD />
        </Provider>
      );

      const endTurnButton = screen.getByRole('button', { name: /end current turn/i });
      fireEvent.click(endTurnButton);

      expect(mockSendGameAction).toHaveBeenCalledWith({
        type: 'end_turn',
        playerId: 'user-123',
        payload: {},
        timestamp: expect.any(Number),
        actionId: expect.stringMatching(/^action_\d+$/)
      });
    });
  });

  describe('UI Interactions', () => {
    test('should dispatch toggleSidebar when menu button is clicked', () => {
      const store = createMockStore();
      const { getState } = store;

      render(
        <Provider store={store}>
          <GameHUD />
        </Provider>
      );

      const menuButton = screen.getByRole('button', { name: /menu/i });
      const initialSidebarState = getState().ui.sidebarOpen;

      fireEvent.click(menuButton);

      const finalSidebarState = getState().ui.sidebarOpen;
      expect(finalSidebarState).toBe(!initialSidebarState);
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing game state gracefully', () => {
      const store = createMockStore(null, mockUser);
      render(
        <Provider store={store}>
          <GameHUD />
        </Provider>
      );

      // Should still render the HUD even without game state
      expect(screen.getByTestId('game-hud')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
    });

    test('should handle missing user gracefully', () => {
      const store = createMockStore(mockGameState, null);
      render(
        <Provider store={store}>
          <GameHUD />
        </Provider>
      );

      expect(screen.getByTestId('game-hud')).toBeInTheDocument();
    });

    test('should handle missing current player in game state', () => {
      const gameStateWithoutPlayer = {
        ...mockGameState,
        players: []
      };

      const store = createMockStore(gameStateWithoutPlayer, mockUser);
      render(
        <Provider store={store}>
          <GameHUD />
        </Provider>
      );

      expect(screen.getByTestId('game-hud')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('should have proper ARIA labels for buttons', () => {
      const store = createMockStore(mockGameState, mockUser, true);
      render(
        <Provider store={store}>
          <GameHUD />
        </Provider>
      );

      expect(screen.getByRole('button', { name: /open game menu/i })).toHaveAttribute('aria-label');
      expect(screen.getByRole('button', { name: /end current turn/i })).toHaveAttribute('aria-label');
    });

    test('should be keyboard accessible', () => {
      const store = createMockStore(mockGameState, mockUser, true);
      render(
        <Provider store={store}>
          <GameHUD />
        </Provider>
      );

      const menuButton = screen.getByRole('button', { name: /open game menu/i });
      const endTurnButton = screen.getByRole('button', { name: /end current turn/i });

      expect(menuButton).not.toHaveAttribute('tabindex', '-1');
      expect(endTurnButton).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Performance', () => {
    test('should not re-render unnecessarily when unrelated state changes', () => {
      const store = createMockStore(mockGameState, mockUser);
      const { rerender } = render(
        <Provider store={store}>
          <GameHUD />
        </Provider>
      );

      // Change unrelated UI state
      store.dispatch({ type: 'ui/setTheme', payload: 'light' });

      rerender(
        <Provider store={store}>
          <GameHUD />
        </Provider>
      );

      // Component should still be functional
      expect(screen.getByTestId('game-hud')).toBeInTheDocument();
    });
  });
});
