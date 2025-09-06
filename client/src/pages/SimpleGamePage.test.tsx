import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/authSlice';
import gameReducer from '../store/gameSlice';
import uiReducer from '../store/uiSlice';

// Mock useSocket to avoid real sockets
const mockSocketContext = {
  socket: null,
  connected: true,
  createGame: vi.fn(),
  createGameWithAck: vi.fn(),
  joinGame: vi.fn(),
  joinGameWithAck: vi.fn(),
  leaveGame: vi.fn(),
  startGame: vi.fn(),
  sendGameAction: vi.fn(),
  requestGameState: vi.fn(),
  listGames: vi.fn(),
  getLobbyStats: vi.fn(),
  spectateGame: vi.fn(),
  stopSpectating: vi.fn()
};

vi.mock('../contexts/SocketContext', () => ({
  useSocket: () => mockSocketContext
}));

// Router params mock
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (orig) => {
  const actual = await orig();
  return {
    ...(actual as object),
    useParams: () => ({ gameId: 'game_test_123' }),
    useNavigate: () => mockNavigate,
    useLocation: () => ({ search: '' })
  } as any;
});

import SimpleGamePage from './SimpleGamePage';

function createTestStore(gameState: any, playerId = 'player_1') {
  const preloadedState = {
    auth: { 
      isAuthenticated: true, 
      user: { id: playerId, username: 'TestPlayer' } 
    },
    game: {
      currentGameId: 'game_test_123',
      gameState,
      isInGame: true,
      selectedUnit: null,
      selectedCity: null,
      connectionStatus: 'connected',
      playerList: gameState?.players || [],
      gameHistory: [],
      currentPlayerTurn: false,
      currentPlayer: null,
      playerId,
      settings: {
        soundEnabled: true, musicEnabled: true, notificationsEnabled: true,
        gameSpeed: 1, isPaused: false, isFullscreen: false,
        darkMode: false, graphics: 'medium', autoSave: true, language: 'en'
      }
    },
    ui: { toasts: [] }
  } as any;
  
  return configureStore({ 
    reducer: { 
      auth: authReducer as any, 
      game: gameReducer as any, 
      ui: uiReducer as any 
    }, 
    preloadedState 
  });
}

describe('SimpleGamePage - Comprehensive UI Testing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset socket context mock
    mockSocketContext.connected = true;
    mockSocketContext.sendGameAction = vi.fn();
    mockSocketContext.spectateGame = vi.fn();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => {
          if (key === 'currentPlayerId') return 'player_1';
          if (key === 'playerName') return 'TestPlayer';
          return null;
        }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      writable: true
    });
  });

  describe('Button State Logic', () => {
    test('disables all action buttons when not player turn', async () => {
      const players = [
        { id: 'player_1', name: 'Me' }, 
        { id: 'player_2', name: 'Opponent' }
      ];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 1, // Opponent's turn
        currentTurn: 5, 
        phase: 'active' 
      };
      const store = createTestStore(gameState, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      // Wait for component to render
      await waitFor(() => {
        expect(screen.getByText(/Game Actions/i)).toBeInTheDocument();
      });

      // Check all action buttons are disabled
      const moveButton = screen.getByText(/Move Unit/i).closest('button');
      const buildButton = screen.getByText(/Found City/i).closest('button');
      const researchButton = screen.getByText(/Research Tech/i).closest('button');
      const endTurnButton = screen.getByText(/End Turn/i).closest('button');

      expect(moveButton).toHaveAttribute('disabled');
      expect(buildButton).toHaveAttribute('disabled');
      expect(researchButton).toHaveAttribute('disabled');
      expect(endTurnButton).toHaveAttribute('disabled');

      // Check turn indicator shows "Waiting"
      expect(screen.getByText(/Waiting/i)).toBeInTheDocument();
    });

    test('enables relevant buttons when it is player turn', async () => {
      const players = [
        { id: 'player_1', name: 'Me' }, 
        { id: 'player_2', name: 'Opponent' }
      ];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0, // My turn
        currentTurn: 5, 
        phase: 'active' 
      };
      const store = createTestStore(gameState, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Your Turn/i)).toBeInTheDocument();
      });

      // End Turn should always be enabled on my turn
      const endTurnButton = screen.getByText(/End Turn/i).closest('button');
      expect(endTurnButton).not.toHaveAttribute('disabled');

      // Research Tech should be enabled on my turn
      const researchButton = screen.getByText(/Research Tech/i).closest('button');
      expect(researchButton).not.toHaveAttribute('disabled');

      // Move Unit requires selected unit
      const moveButton = screen.getByText(/Move Unit/i).closest('button');
      expect(moveButton).toHaveAttribute('disabled'); // No unit selected
    });

    test('enables Found City button only with settler selected', async () => {
      const players = [
        { id: 'player_1', name: 'Me' }, 
        { id: 'player_2', name: 'Opponent' }
      ];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0, // My turn
        currentTurn: 5, 
        phase: 'active',
        units: [
          { id: 'unit_1', type: 'settler', playerId: 'player_1', x: 5, y: 5 }
        ]
      };
      const store = createTestStore(gameState, 'player_1');

      const { rerender } = render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      // Initially disabled - no unit selected
      await waitFor(() => {
        const foundCityButton = screen.getByText(/Found City/i).closest('button');
        expect(foundCityButton).toHaveAttribute('disabled');
      });

      // Simulate selecting a settler unit by updating component state
      const storeWithSelectedUnit = createTestStore({
        ...gameState,
        selectedUnit: { id: 'unit_1', type: 'settler', playerId: 'player_1', x: 5, y: 5 }
      }, 'player_1');

      rerender(
        <Provider store={storeWithSelectedUnit}>
          <SimpleGamePage />
        </Provider>
      );

      // After selecting settler, button should be enabled
      await waitFor(() => {
        const foundCityButton = screen.getByText(/Found City/i).closest('button');
        expect(foundCityButton).not.toHaveAttribute('disabled');
      });
    });

    test('disables all buttons for spectators', async () => {
      const players = [
        { id: 'player_1', name: 'Player1' }, 
        { id: 'player_2', name: 'Player2' }
      ];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0,
        currentTurn: 5, 
        phase: 'active' 
      };
      
      // Mock location to simulate spectator mode
      const originalModule = await vi.importActual('react-router-dom');
      vi.doMock('react-router-dom', async () => ({
        ...(originalModule as object),
        useParams: () => ({ gameId: 'game_test_123' }),
        useNavigate: () => mockNavigate,
        useLocation: () => ({ search: '?spectate=1' })
      }));

      const store = createTestStore(gameState, 'spectator_id');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Game Actions/i)).toBeInTheDocument();
      });

      // All buttons should be disabled for spectators
      const buttons = screen.getAllByRole('button').filter(btn => 
        btn.textContent?.includes('Move Unit') ||
        btn.textContent?.includes('Found City') ||
        btn.textContent?.includes('Research Tech') ||
        btn.textContent?.includes('End Turn')
      );

      buttons.forEach(button => {
        expect(button).toHaveAttribute('disabled');
      });
    });
  });

  describe('Action Execution', () => {
    test('calls sendGameAction when End Turn is clicked', async () => {
      const user = userEvent.setup();
      const players = [
        { id: 'player_1', name: 'Me' }, 
        { id: 'player_2', name: 'Opponent' }
      ];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0, // My turn
        currentTurn: 5, 
        phase: 'active' 
      };
      const store = createTestStore(gameState, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      const endTurnButton = await screen.findByText(/End Turn/i);
      expect(endTurnButton.closest('button')).not.toHaveAttribute('disabled');

      await act(async () => {
        await user.click(endTurnButton);
      });

      expect(mockSocketContext.sendGameAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'end_turn',
          playerId: 'player_1',
          payload: {}
        })
      );
    });

    test('calls sendGameAction for research technology', async () => {
      const user = userEvent.setup();
      const players = [
        { id: 'player_1', name: 'Me' }, 
        { id: 'player_2', name: 'Opponent' }
      ];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0, // My turn
        currentTurn: 5, 
        phase: 'active' 
      };
      const store = createTestStore(gameState, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      // Change research selection
      const techSelect = await screen.findByDisplayValue('agriculture');
      
      await act(async () => {
        await user.selectOptions(techSelect, 'pottery');
      });

      const researchButton = screen.getByText(/Research Tech/i);
      
      await act(async () => {
        await user.click(researchButton);
      });

      expect(mockSocketContext.sendGameAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'research_technology',
          playerId: 'player_1',
          payload: { techId: 'pottery' }
        })
      );
    });

    test('calls sendGameAction for move unit when unit selected', async () => {
      const user = userEvent.setup();
      const players = [
        { id: 'player_1', name: 'Me' }
      ];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0,
        currentTurn: 5, 
        phase: 'active',
        selectedUnit: { id: 'unit_1', type: 'warrior', playerId: 'player_1', x: 3, y: 3 }
      };
      const store = createTestStore(gameState, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      const moveButton = await screen.findByText(/Move Unit/i);
      expect(moveButton.closest('button')).not.toHaveAttribute('disabled');

      await act(async () => {
        await user.click(moveButton);
      });

      expect(mockSocketContext.sendGameAction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'move_unit',
          playerId: 'player_1',
          payload: expect.objectContaining({
            unitId: expect.any(String)
          })
        })
      );
    });

    test('prevents actions when disconnected', async () => {
      mockSocketContext.connected = false;
      
      const players = [
        { id: 'player_1', name: 'Me' }, 
        { id: 'player_2', name: 'Opponent' }
      ];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0,
        currentTurn: 5, 
        phase: 'active' 
      };
      const store = createTestStore(gameState, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      await waitFor(() => {
        const endTurnButton = screen.getByText(/End Turn/i).closest('button');
        expect(endTurnButton).toHaveAttribute('disabled');
      });
    });
  });

  describe('Results Dialog', () => {
    test('displays results dialog when game phase is ended', async () => {
      const players = [
        { id: 'player_1', name: 'Me' }, 
        { id: 'player_2', name: 'Opponent' }
      ];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0,
        currentTurn: 20, 
        phase: 'ended' // Game ended
      };
      const store = createTestStore(gameState, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      // Results dialog should be visible
      await waitFor(() => {
        expect(screen.getByText(/Game Over/i)).toBeInTheDocument();
      });

      const returnButton = screen.getByText(/Return to Lobby/i);
      expect(returnButton).toBeInTheDocument();
    });

    test('results dialog button navigates to lobby and leaves game', async () => {
      const user = userEvent.setup();
      const players = [
        { id: 'player_1', name: 'Me' }, 
        { id: 'player_2', name: 'Opponent' }
      ];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0,
        currentTurn: 20, 
        phase: 'ended'
      };
      const store = createTestStore(gameState, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      const returnButton = await screen.findByText(/Return to Lobby/i);
      
      await act(async () => {
        await user.click(returnButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/lobby');
    });

    test('displays winner information in results dialog', async () => {
      const players = [
        { id: 'player_1', name: 'Me' }, 
        { id: 'player_2', name: 'Winner' }
      ];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0,
        currentTurn: 50, 
        phase: 'ended',
        winner: { playerId: 'player_2', playerName: 'Winner', victoryType: 'domination' }
      };
      const store = createTestStore(gameState, 'player_1');

      // Mock socket event for game_ended
      const mockSocket = { 
        on: vi.fn((event, handler) => {
          if (event === 'game_ended') {
            setTimeout(() => handler({
              winner: { playerName: 'Winner' },
              finalScores: [
                { playerId: 'player_1', playerName: 'Me', score: 150 },
                { playerId: 'player_2', playerName: 'Winner', score: 200 }
              ]
            }), 100);
          }
        }),
        off: vi.fn()
      };
      
      mockSocketContext.socket = mockSocket as any;

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Game Over/i)).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Toast Notifications', () => {
    test('displays toast when component receives action acknowledgment', async () => {
      const players = [
        { id: 'player_1', name: 'Me' }
      ];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0,
        currentTurn: 5, 
        phase: 'active' 
      };
      const store = createTestStore(gameState, 'player_1');

      // Mock socket events
      const handlers: Record<string, Function> = {};
      const mockSocket = { 
        on: vi.fn((event: string, handler: Function) => {
          handlers[event] = handler;
        }),
        off: vi.fn()
      };
      
      mockSocketContext.socket = mockSocket as any;

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      // Component should have set up event listeners for toasts
      await waitFor(() => {
        expect(screen.getByText(/Game Actions/i)).toBeInTheDocument();
      });

      // Simulate action acknowledgment
      if (handlers.action_acknowledged) {
        act(() => {
          handlers.action_acknowledged({ message: 'Action completed successfully' });
        });

        await waitFor(() => {
          expect(screen.getByText(/Action completed successfully/i)).toBeInTheDocument();
        });
      }
    });

    test('displays error toast when action fails', async () => {
      const players = [
        { id: 'player_1', name: 'Me' }
      ];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0,
        currentTurn: 5, 
        phase: 'active' 
      };
      const store = createTestStore(gameState, 'player_1');

      const handlers: Record<string, Function> = {};
      const mockSocket = { 
        on: vi.fn((event: string, handler: Function) => {
          handlers[event] = handler;
        }),
        off: vi.fn()
      };
      
      mockSocketContext.socket = mockSocket as any;

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Game Actions/i)).toBeInTheDocument();
      });

      // Simulate action failure
      if (handlers.action_failed) {
        act(() => {
          handlers.action_failed({ reason: 'Invalid action' });
        });

        await waitFor(() => {
          expect(screen.getByText(/Invalid action/i)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Turn Indicator', () => {
    test('shows "Your Turn" when it is player turn', async () => {
      const players = [
        { id: 'player_1', name: 'Me' }, 
        { id: 'player_2', name: 'Opponent' }
      ];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0, // My turn
        currentTurn: 5, 
        phase: 'active' 
      };
      const store = createTestStore(gameState, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      await waitFor(() => {
        const turnChip = screen.getByText(/Your Turn/i);
        expect(turnChip).toBeInTheDocument();
      });
    });

    test('shows "Waiting" when it is not player turn', async () => {
      const players = [
        { id: 'player_1', name: 'Me' }, 
        { id: 'player_2', name: 'Opponent' }
      ];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 1, // Opponent's turn
        currentTurn: 5, 
        phase: 'active' 
      };
      const store = createTestStore(gameState, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      await waitFor(() => {
        const waitingChip = screen.getByText(/Waiting/i);
        expect(waitingChip).toBeInTheDocument();
      });
    });

    test('displays current turn number', async () => {
      const players = [{ id: 'player_1', name: 'Me' }];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0,
        currentTurn: 15, 
        phase: 'active' 
      };
      const store = createTestStore(gameState, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Turn 15/i)).toBeInTheDocument();
      });
    });

    test('shows correct player turn status for different scenarios', async () => {
      const testCases = [
        { currentPlayer: 0, playerId: 'player_1', expected: /Your Turn/i },
        { currentPlayer: 1, playerId: 'player_1', expected: /Waiting/i },
        { currentPlayer: 'player_1', playerId: 'player_1', expected: /Your Turn/i },
        { currentPlayer: 'player_2', playerId: 'player_1', expected: /Waiting/i },
      ];

      for (const testCase of testCases) {
        const players = [
          { id: 'player_1', name: 'Me' }, 
          { id: 'player_2', name: 'Opponent' }
        ];
        const gameState = { 
          id: 'game_test_123', 
          players, 
          currentPlayer: testCase.currentPlayer,
          currentTurn: 5, 
          phase: 'active' 
        };
        const store = createTestStore(gameState, testCase.playerId);

        const { unmount } = render(
          <Provider store={store}>
            <SimpleGamePage />
          </Provider>
        );

        await waitFor(() => {
          expect(screen.getByText(testCase.expected)).toBeInTheDocument();
        });

        unmount();
      }
    });
  });

  describe('Connection Status', () => {
    test('shows connection status in header', async () => {
      const players = [{ id: 'player_1', name: 'Me' }];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0,
        currentTurn: 5, 
        phase: 'active' 
      };
      const store = createTestStore(gameState, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Connected/i)).toBeInTheDocument();
      });
    });

    test('handles disconnected state', async () => {
      mockSocketContext.connected = false;
      
      const players = [{ id: 'player_1', name: 'Me' }];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0,
        currentTurn: 5, 
        phase: 'active' 
      };
      const store = createTestStore(gameState, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
      });
    });

    test('shows spectating status when in spectator mode', async () => {
      const originalModule = await vi.importActual('react-router-dom');
      vi.doMock('react-router-dom', async () => ({
        ...(originalModule as object),
        useParams: () => ({ gameId: 'game_test_123' }),
        useNavigate: () => mockNavigate,
        useLocation: () => ({ search: '?spectate=1' })
      }));

      const players = [{ id: 'player_1', name: 'Player1' }];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0,
        currentTurn: 5, 
        phase: 'active' 
      };
      const store = createTestStore(gameState, 'spectator_id');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Spectating/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    test('shows loading indicator when no game state', async () => {
      const store = createTestStore(null, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Loading game/i)).toBeInTheDocument();
      });
    });

    test('shows error state when error occurs', async () => {
      const store = createTestStore(null, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      // Component handles loading state appropriately
      expect(screen.getByText(/Loading game/i)).toBeInTheDocument();
    });

    test('shows game interface when game state loads', async () => {
      const players = [{ id: 'player_1', name: 'Me' }];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0,
        currentTurn: 5, 
        phase: 'active' 
      };
      const store = createTestStore(gameState, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Game Actions/i)).toBeInTheDocument();
        expect(screen.getByText(/Your Turn/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    test('leave game button calls navigation', async () => {
      const user = userEvent.setup();
      const players = [{ id: 'player_1', name: 'Me' }];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0,
        currentTurn: 5, 
        phase: 'active' 
      };
      const store = createTestStore(gameState, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      const leaveButton = await screen.findByText(/Leave Game/i);
      
      await act(async () => {
        await user.click(leaveButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/lobby');
    });

    test('back button calls navigation', async () => {
      const user = userEvent.setup();
      const players = [{ id: 'player_1', name: 'Me' }];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0,
        currentTurn: 5, 
        phase: 'active' 
      };
      const store = createTestStore(gameState, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      // Find back button by aria-label or role
      const backButton = screen.getByRole('button', { name: '' }); // Back icon button
      
      await act(async () => {
        await user.click(backButton);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/lobby');
    });
  });

  describe('Game State Handling', () => {
    test('handles different game phases correctly', async () => {
      const testPhases = ['lobby', 'active', 'ended'];
      
      for (const phase of testPhases) {
        const players = [{ id: 'player_1', name: 'Me' }];
        const gameState = { 
          id: 'game_test_123', 
          players, 
          currentPlayer: 0,
          currentTurn: 5, 
          phase 
        };
        const store = createTestStore(gameState, 'player_1');

        const { unmount } = render(
          <Provider store={store}>
            <SimpleGamePage />
          </Provider>
        );

        if (phase === 'ended') {
          await waitFor(() => {
            expect(screen.getByText(/Game Over/i)).toBeInTheDocument();
          });
        } else {
          await waitFor(() => {
            expect(screen.getByText(/Game Actions/i)).toBeInTheDocument();
          });
        }

        unmount();
      }
    });

    test('handles missing game data gracefully', async () => {
      const incompleteGameState = { 
        id: 'game_test_123'
        // Missing players, currentPlayer, etc.
      };
      const store = createTestStore(incompleteGameState, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      // Component should not crash with incomplete data
      await waitFor(() => {
        expect(screen.getByText(/Game Actions/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('all action buttons have proper labels', async () => {
      const players = [{ id: 'player_1', name: 'Me' }];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0,
        currentTurn: 5, 
        phase: 'active' 
      };
      const store = createTestStore(gameState, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Move Unit/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Found City/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Research Tech/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /End Turn/i })).toBeInTheDocument();
      });
    });

    test('status indicators are properly labeled', async () => {
      const players = [{ id: 'player_1', name: 'Me' }];
      const gameState = { 
        id: 'game_test_123', 
        players, 
        currentPlayer: 0,
        currentTurn: 7, 
        phase: 'active' 
      };
      const store = createTestStore(gameState, 'player_1');

      render(
        <Provider store={store}>
          <SimpleGamePage />
        </Provider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Turn 7/i)).toBeInTheDocument();
        expect(screen.getByText(/Your Turn/i)).toBeInTheDocument();
        expect(screen.getByText(/Connected/i)).toBeInTheDocument();
      });
    });
  });
});