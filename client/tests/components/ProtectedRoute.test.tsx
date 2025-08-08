import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';

import { ProtectedRoute } from '../../src/components/ProtectedRoute';
import authSlice, { AuthState } from '../../src/store/authSlice';

// Mock LoadingScreen component
vi.mock('../../src/components/LoadingScreen', () => ({
  default: ({ message }: { message: string }) => <div data-testid="loading-screen">{message}</div>,
}));

// Helper function to create store with auth state
const createMockStore = (authState: Partial<AuthState>) => {
  return configureStore({
    reducer: {
      auth: authSlice,
    },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        ...authState,
      },
    },
  });
};

// Test wrapper component
const TestWrapper = ({ 
  children, 
  authState, 
  initialRoute = '/' 
}: { 
  children: React.ReactNode; 
  authState: Partial<AuthState>;
  initialRoute?: string;
}) => {
  const store = createMockStore(authState);
  
  return (
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {children}
      </MemoryRouter>
    </Provider>
  );
};

describe('ProtectedRoute', () => {
  const TestChild = () => <div data-testid="protected-content">Protected Content</div>;

  it('should render children when user is authenticated and not loading', () => {
    render(
      <TestWrapper authState={{ isAuthenticated: true, isLoading: false }}>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
  });

  it('should show loading screen when authentication is loading', () => {
    render(
      <TestWrapper authState={{ isAuthenticated: false, isLoading: true }}>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
    expect(screen.getByText('Authenticating...')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should redirect to login when user is not authenticated and not loading', () => {
    render(
      <TestWrapper authState={{ isAuthenticated: false, isLoading: false }}>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    // Should not render protected content or loading screen
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    
    // Navigate component doesn't render anything visible, but we can check it's not showing our content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should handle transition from loading to authenticated', () => {
    const { rerender } = render(
      <TestWrapper authState={{ isAuthenticated: false, isLoading: true }}>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    // Should show loading initially
    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();

    // Update to authenticated state
    rerender(
      <TestWrapper authState={{ isAuthenticated: true, isLoading: false }}>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    // Should now show protected content
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
  });

  it('should handle transition from loading to unauthenticated', () => {
    const { rerender } = render(
      <TestWrapper authState={{ isAuthenticated: false, isLoading: true }}>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    // Should show loading initially
    expect(screen.getByTestId('loading-screen')).toBeInTheDocument();

    // Update to unauthenticated state
    rerender(
      <TestWrapper authState={{ isAuthenticated: false, isLoading: false }}>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    // Should redirect (not show content or loading)
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
  });

  it('should handle authenticated user with token', () => {
    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com'
    };

    render(
      <TestWrapper 
        authState={{ 
          isAuthenticated: true, 
          isLoading: false,
          user: mockUser,
          token: 'mock-jwt-token'
        }}
      >
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('should handle authenticated user without explicit user object', () => {
    render(
      <TestWrapper 
        authState={{ 
          isAuthenticated: true, 
          isLoading: false,
          user: null,
          token: 'mock-jwt-token'
        }}
      >
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    // Should still protect based on isAuthenticated flag
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('should work with complex children components', () => {
    const ComplexChild = () => (
      <div>
        <h1 data-testid="complex-title">Game Dashboard</h1>
        <button data-testid="complex-button">Start Game</button>
        <p data-testid="complex-text">Welcome to the game!</p>
      </div>
    );

    render(
      <TestWrapper authState={{ isAuthenticated: true, isLoading: false }}>
        <ProtectedRoute>
          <ComplexChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByTestId('complex-title')).toBeInTheDocument();
    expect(screen.getByTestId('complex-button')).toBeInTheDocument();
    expect(screen.getByTestId('complex-text')).toBeInTheDocument();
    expect(screen.getByText('Game Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Start Game')).toBeInTheDocument();
    expect(screen.getByText('Welcome to the game!')).toBeInTheDocument();
  });

  it('should work with nested routes', () => {
    const NestedChild = () => (
      <div data-testid="nested-content">
        <div data-testid="nested-level-1">
          <div data-testid="nested-level-2">Deeply nested content</div>
        </div>
      </div>
    );

    render(
      <TestWrapper authState={{ isAuthenticated: true, isLoading: false }}>
        <ProtectedRoute>
          <NestedChild />
        </ProtectedRoute>
      </TestWrapper>
    );

    expect(screen.getByTestId('nested-content')).toBeInTheDocument();
    expect(screen.getByTestId('nested-level-1')).toBeInTheDocument();
    expect(screen.getByTestId('nested-level-2')).toBeInTheDocument();
    expect(screen.getByText('Deeply nested content')).toBeInTheDocument();
  });

  // Edge cases and error scenarios
  describe('Edge Cases', () => {
    it('should handle auth state with error', () => {
      render(
        <TestWrapper 
          authState={{ 
            isAuthenticated: false, 
            isLoading: false,
            error: 'Authentication failed'
          }}
        >
          <ProtectedRoute>
            <TestChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      // Should redirect when not authenticated, even with error
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });

    it('should handle simultaneous loading and authenticated state', () => {
      render(
        <TestWrapper 
          authState={{ 
            isAuthenticated: true, 
            isLoading: true // This shouldn't normally happen but let's test it
          }}
        >
          <ProtectedRoute>
            <TestChild />
          </ProtectedRoute>
        </TestWrapper>
      );

      // Loading should take precedence
      expect(screen.getByTestId('loading-screen')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should handle empty children', () => {
      render(
        <TestWrapper authState={{ isAuthenticated: true, isLoading: false }}>
          <ProtectedRoute>
            {null}
          </ProtectedRoute>
        </TestWrapper>
      );

      // Should not crash with empty children
      expect(screen.queryByTestId('loading-screen')).not.toBeInTheDocument();
    });

    it('should handle multiple children', () => {
      render(
        <TestWrapper authState={{ isAuthenticated: true, isLoading: false }}>
          <ProtectedRoute>
            <div data-testid="child-1">Child 1</div>
            <div data-testid="child-2">Child 2</div>
          </ProtectedRoute>
        </TestWrapper>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });
});