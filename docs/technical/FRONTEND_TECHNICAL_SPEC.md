# 🎨 Frontend Client - Technical Specification

## 🎯 **PHASE 1 PRIORITY: REACT CLIENT ARCHITECTURE**

### 📁 **Project Structure**
```
civ-game/client/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── assets/
│       ├── images/        # Game graphics and icons
│       ├── sounds/        # Audio effects
│       └── fonts/         # Custom fonts
├── src/
│   ├── components/        # React components
│   │   ├── common/        # Reusable UI components
│   │   ├── lobby/         # Game lobby components
│   │   ├── game/          # Main game interface
│   │   └── ui/            # Game UI elements
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API and WebSocket clients
│   ├── store/             # State management (Zustand)
│   ├── types/             # TypeScript definitions
│   ├── utils/             # Helper functions
│   └── styles/            # CSS modules and themes
├── package.json
├── vite.config.ts         # Vite build configuration
└── tsconfig.json          # TypeScript configuration
```

### 🛠️ **Technology Stack**

#### **Core Framework**
- **React 18**: Latest features with concurrent rendering
- **TypeScript**: Full type safety across the application
- **Vite**: Fast build tool with hot module replacement
- **React Router**: Client-side routing for different game screens

#### **State Management**
- **Zustand**: Lightweight state management for game state
- **React Query**: Server state synchronization and caching
- **Socket.io Client**: Real-time WebSocket communication

#### **UI/UX Libraries**
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Smooth animations and transitions
- **React Spring**: Physics-based animations for game elements
- **Lucide React**: Beautiful, customizable icons

#### **Game-Specific Libraries**
- **Konva.js + React-Konva**: 2D canvas rendering for game map
- **React DnD**: Drag and drop for unit movement
- **React Hotkeys**: Keyboard shortcuts for power users

---

## 🎮 **COMPONENT ARCHITECTURE**

### 🏠 **1. App Shell Components**

#### **App.tsx - Main Application**
```typescript
// Main app component with routing
interface AppProps {}

const App: React.FC<AppProps> = () => {
  return (
    <BrowserRouter>
      <div className="app min-h-screen bg-stone-900 text-white">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/lobby" element={<GameLobby />} />
          <Route path="/game/:gameId" element={<GameInterface />} />
          <Route path="/profile" element={<PlayerProfile />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};
```

#### **Layout Components**
- **`<Header>`**: Navigation, player info, notifications
- **`<Sidebar>`**: Game controls, chat, player list  
- **`<Footer>`**: Status bar, connection info
- **`<Modal>`**: Reusable modal for dialogs and forms

### 🎯 **2. Game Lobby Components**

#### **GameLobby.tsx - Main Lobby Interface**
```typescript
interface GameLobbyProps {}

const GameLobby: React.FC<GameLobbyProps> = () => {
  const { games, createGame, joinGame } = useGameLobby();
  
  return (
    <div className="lobby-container">
      <CreateGameForm onSubmit={createGame} />
      <GamesList games={games} onJoin={joinGame} />
      <PlayerStats />
    </div>
  );
};
```

#### **Supporting Components**
- **`<CreateGameForm>`**: Form to create new games
- **`<GamesList>`**: List of available games to join
- **`<GameCard>`**: Individual game info card
- **`<PlayerList>`**: List of players in lobby

### 🗺️ **3. Main Game Interface**

#### **GameInterface.tsx - Core Game Screen**
```typescript
interface GameInterfaceProps {
  gameId: string;
}

const GameInterface: React.FC<GameInterfaceProps> = ({ gameId }) => {
  const { gameState, sendAction } = useGameState(gameId);
  
  return (
    <div className="game-interface h-screen flex">
      <GameMap 
        gameState={gameState} 
        onTileClick={handleTileClick}
        onUnitMove={handleUnitMove}
      />
      <GameSidebar 
        player={gameState.currentPlayer}
        resources={gameState.resources}
        technologies={gameState.technologies}
      />
      <GameChat gameId={gameId} />
    </div>
  );
};
```

#### **Map Components**
- **`<GameMap>`**: Main hex-grid map with Konva.js
- **`<HexTile>`**: Individual map tile component
- **`<Unit>`**: Draggable unit representations
- **`<City>`**: City markers with population info
- **`<MapControls>`**: Zoom, pan, minimap controls

#### **UI Components**  
- **`<ResourcePanel>`**: Player resources display
- **`<TechnologyTree>`**: Research progress interface
- **`<CityPanel>`**: City management interface
- **`<UnitPanel>`**: Unit information and actions
- **`<GameChat>`**: Real-time player communication

---

## 🔗 **SERVICE LAYER ARCHITECTURE**

### 🌐 **API Service**
```typescript
// services/api.ts
class GameAPIService {
  private baseURL: string;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }
  
  async getGames(): Promise<Game[]> {
    const response = await fetch(`${this.baseURL}/api/games`);
    return response.json();
  }
  
  async createGame(gameData: CreateGameRequest): Promise<Game> {
    const response = await fetch(`${this.baseURL}/api/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gameData)
    });
    return response.json();
  }
  
  async joinGame(gameId: string, playerData: JoinGameRequest): Promise<JoinGameResponse> {
    const response = await fetch(`${this.baseURL}/api/games/${gameId}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playerData)
    });
    return response.json();
  }
}
```

### 🔌 **WebSocket Service**
```typescript
// services/websocket.ts
class GameWebSocketService {
  private socket: Socket;
  private eventHandlers: Map<string, Function[]>;
  
  constructor(serverURL: string) {
    this.socket = io(serverURL);
    this.eventHandlers = new Map();
    this.setupEventListeners();
  }
  
  joinGameRoom(gameId: string, playerId: string): void {
    this.socket.emit('join_game', { gameId, playerId });
  }
  
  sendGameAction(gameId: string, playerId: string, action: GameAction): void {
    this.socket.emit('game_action', {
      gameId,
      playerId, 
      action: action.type,
      payload: action.payload
    });
  }
  
  onGameUpdate(callback: (update: GameUpdate) => void): void {
    this.socket.on('game_update', callback);
  }
  
  onPlayerJoined(callback: (player: Player) => void): void {
    this.socket.on('player_joined', callback);
  }
}
```

---

## 🏪 **STATE MANAGEMENT**

### 🎯 **Game State Store (Zustand)**
```typescript
// store/gameStore.ts
interface GameState {
  // Game data
  currentGame: Game | null;
  gameMap: GameMap | null;
  players: Player[];
  currentPlayer: Player | null;
  
  // UI state
  selectedTile: Coordinate | null;
  selectedUnit: Unit | null;
  isLoading: boolean;
  
  // Actions
  setCurrentGame: (game: Game) => void;
  updateGameState: (update: Partial<GameState>) => void;
  selectTile: (coordinate: Coordinate) => void;
  selectUnit: (unit: Unit) => void;
  sendAction: (action: GameAction) => void;
}

const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  currentGame: null,
  gameMap: null,
  players: [],
  currentPlayer: null,
  selectedTile: null,
  selectedUnit: null,
  isLoading: false,
  
  // Actions
  setCurrentGame: (game) => set({ currentGame: game }),
  updateGameState: (update) => set((state) => ({ ...state, ...update })),
  selectTile: (coordinate) => set({ selectedTile: coordinate }),
  selectUnit: (unit) => set({ selectedUnit: unit }),
  sendAction: (action) => {
    // Send action through WebSocket
    gameWebSocketService.sendGameAction(
      get().currentGame?.id!, 
      get().currentPlayer?.id!,
      action
    );
  }
}));
```

### 📡 **API State Management (React Query)**
```typescript
// hooks/useGameQueries.ts
export const useGames = () => {
  return useQuery({
    queryKey: ['games'],
    queryFn: () => gameAPIService.getGames(),
    refetchInterval: 5000 // Refresh every 5 seconds
  });
};

export const useCreateGame = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (gameData: CreateGameRequest) => gameAPIService.createGame(gameData),
    onSuccess: () => {
      // Invalidate games list to refresh
      queryClient.invalidateQueries({ queryKey: ['games'] });
    }
  });
};

export const useJoinGame = () => {
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: ({ gameId, playerData }: { gameId: string; playerData: JoinGameRequest }) => 
      gameAPIService.joinGame(gameId, playerData),
    onSuccess: (response) => {
      // Navigate to game interface on successful join
      navigate(`/game/${response.game.id}`);
    }
  });
};
```

---

## 🎨 **CUSTOM HOOKS**

### 🎮 **Game Logic Hooks**
```typescript
// hooks/useGameState.ts
export const useGameState = (gameId: string) => {
  const { 
    currentGame, 
    updateGameState, 
    sendAction 
  } = useGameStore();
  
  useEffect(() => {
    // Connect to WebSocket for this game
    gameWebSocketService.joinGameRoom(gameId, getCurrentPlayer().id);
    
    // Listen for game updates
    gameWebSocketService.onGameUpdate((update) => {
      updateGameState(update);
    });
    
    return () => {
      // Cleanup WebSocket listeners
      gameWebSocketService.disconnect();
    };
  }, [gameId]);
  
  const moveUnit = (unitId: string, from: Coordinate, to: Coordinate) => {
    sendAction({
      type: 'MOVE_UNIT',
      payload: { unitId, from, to }
    });
  };
  
  const buildCity = (location: Coordinate, name: string) => {
    sendAction({
      type: 'BUILD_CITY', 
      payload: { location, name }
    });
  };
  
  return {
    gameState: currentGame,
    moveUnit,
    buildCity,
    sendAction
  };
};
```

### 🗺️ **Map Interaction Hooks**
```typescript
// hooks/useMapInteraction.ts
export const useMapInteraction = () => {
  const { selectedTile, selectedUnit, selectTile, selectUnit } = useGameStore();
  
  const handleTileClick = (coordinate: Coordinate) => {
    if (selectedUnit) {
      // Move unit to clicked tile
      moveUnit(selectedUnit.id, selectedUnit.location, coordinate);
      selectUnit(null);
    } else {
      // Select tile
      selectTile(coordinate);
    }
  };
  
  const handleUnitClick = (unit: Unit) => {
    if (unit.ownerId === getCurrentPlayer().id) {
      selectUnit(unit);
    }
  };
  
  return {
    selectedTile,
    selectedUnit,
    handleTileClick,
    handleUnitClick
  };
};
```

---

## 🎨 **STYLING SYSTEM**

### 🎨 **Theme Configuration (Tailwind)**
```typescript
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Game-specific color palette
        civilization: {
          gold: '#D4AF37',
          bronze: '#CD7F32', 
          stone: '#708090',
          water: '#4682B4',
          forest: '#228B22',
          desert: '#F4A460'
        },
        ui: {
          primary: '#1E40AF',
          secondary: '#7C3AED',
          success: '#059669', 
          warning: '#D97706',
          error: '#DC2626'
        }
      },
      fontFamily: {
        game: ['Cinzel', 'serif'], // Classic civilization font
        ui: ['Inter', 'sans-serif']  // Modern UI font
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
};
```

### 🎯 **Component Styling Patterns**
```typescript
// Consistent styling patterns across components
const buttonStyles = {
  base: 'px-4 py-2 rounded-lg font-medium transition-all duration-200',
  primary: 'bg-ui-primary hover:bg-blue-700 text-white',
  secondary: 'bg-gray-600 hover:bg-gray-700 text-white', 
  success: 'bg-ui-success hover:bg-green-700 text-white'
};

const cardStyles = {
  base: 'bg-stone-800 rounded-xl border border-stone-700 shadow-lg',
  interactive: 'hover:bg-stone-750 cursor-pointer transition-colors duration-200'
};
```

---

## ⚡ **PERFORMANCE OPTIMIZATION**

### 🚀 **React Performance**
- **Memoization**: Use `React.memo()` for expensive components
- **Virtual Scrolling**: For large lists (player lists, chat messages)
- **Code Splitting**: Lazy load game screens with `React.lazy()`
- **Bundle Optimization**: Tree shaking and dynamic imports

### 🗺️ **Map Rendering Performance**
- **Canvas Optimization**: Use Konva.js for efficient 2D rendering
- **Viewport Culling**: Only render visible map tiles
- **Sprite Batching**: Batch similar map elements for GPU efficiency
- **Level of Detail**: Simplify graphics at far zoom levels

### 🔌 **WebSocket Optimization**  
- **Message Batching**: Group rapid updates together
- **Delta Updates**: Send only changed game state
- **Connection Pooling**: Reuse WebSocket connections
- **Offline Support**: Queue actions when disconnected

---

## 📱 **RESPONSIVE DESIGN**

### 📐 **Breakpoint Strategy**
```css
/* Mobile First Approach */
.game-interface {
  /* Mobile: Stack vertically */
  @apply flex-col;
}

@screen md {
  .game-interface {
    /* Tablet: Side by side */
    @apply flex-row;
  }
}

@screen lg {
  .game-interface {
    /* Desktop: Full layout */
    @apply grid grid-cols-4;
  }
}
```

### 📱 **Mobile Adaptations**
- **Touch Controls**: Tap to select, long press for context menus
- **Simplified UI**: Hide less important elements on small screens
- **Gesture Support**: Pinch to zoom, swipe to pan map
- **Reduced Animations**: Minimize battery drain on mobile

---

## 🧪 **TESTING STRATEGY**

### ✅ **Unit Testing (Jest + React Testing Library)**
```typescript
// __tests__/components/GameLobby.test.tsx
describe('GameLobby', () => {
  it('displays list of available games', () => {
    const mockGames = [
      { id: '1', name: 'Test Game', status: 'waiting' }
    ];
    
    render(<GameLobby />, {
      wrapper: createTestWrapper({ games: mockGames })
    });
    
    expect(screen.getByText('Test Game')).toBeInTheDocument();
  });
  
  it('creates new game when form submitted', async () => {
    const user = userEvent.setup();
    render(<GameLobby />);
    
    await user.type(screen.getByLabelText('Game Name'), 'My Game');
    await user.click(screen.getByRole('button', { name: 'Create Game' }));
    
    expect(mockCreateGame).toHaveBeenCalledWith({ name: 'My Game' });
  });
});
```

### 🔗 **Integration Testing (Cypress)**
```typescript
// cypress/e2e/game-flow.cy.ts
describe('Complete Game Flow', () => {
  it('allows player to create and join game', () => {
    cy.visit('/');
    cy.get('[data-cy=create-game-btn]').click();
    cy.get('[data-cy=game-name-input]').type('E2E Test Game');
    cy.get('[data-cy=create-btn]').click();
    
    // Should navigate to game lobby
    cy.url().should('include', '/lobby');
    cy.contains('E2E Test Game').should('be.visible');
  });
});
```

---

## 🚀 **DEPLOYMENT & BUILD**

### 📦 **Build Configuration (Vite)**
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2015',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          game: ['konva', 'react-konva'],
          ui: ['framer-motion', 'lucide-react']
        }
      }
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:4002',
      '/socket.io': {
        target: 'http://localhost:4002',
        ws: true
      }
    }
  }
});
```

### 🌐 **Production Deployment**
- **Static Hosting**: Deploy to Vercel, Netlify, or AWS S3
- **CDN**: Use CloudFront for global asset distribution  
- **Environment Variables**: Separate dev/staging/prod configurations
- **CI/CD Pipeline**: Automated testing and deployment with GitHub Actions

---

This technical specification provides the complete foundation for building a professional, scalable React frontend that will make the Civilization game playable and engaging for users.