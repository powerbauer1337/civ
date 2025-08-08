import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { GameState, GameAction, PlayerInfo, PlayerState, GamePhase } from '@civ-game/shared'

interface GameSliceState {
  currentGameId: string | null
  gameState: GameState | null
  isInGame: boolean
  selectedUnit: string | null
  selectedCity: string | null
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
  playerList: PlayerState[]  // Use PlayerState for consistency
  gameHistory: GameAction[]
  currentPlayerTurn: boolean
}

const initialState: GameSliceState = {
  currentGameId: null,
  gameState: null,
  isInGame: false,
  selectedUnit: null,
  selectedCity: null,
  connectionStatus: 'disconnected',
  playerList: [],
  gameHistory: [],
  currentPlayerTurn: false
}

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    // Connection management
    setConnectionStatus: (state, action: PayloadAction<typeof state.connectionStatus>) => {
      state.connectionStatus = action.payload
    },

    // Game state management
    setCurrentGame: (state, action: PayloadAction<string>) => {
      state.currentGameId = action.payload
      state.isInGame = true
    },

    updateGameState: (state, action: PayloadAction<any>) => {
      // Deserialize the game state from server
      try {
        state.gameState = action.payload
        if (state.gameState) {
          state.playerList = state.gameState.players || []
        }
      } catch (error) {
        console.error('Error updating game state:', error)
      }
    },

    // Player interaction
    setCurrentPlayerTurn: (state, action: PayloadAction<boolean>) => {
      state.currentPlayerTurn = action.payload
    },

    // Selection management
    selectUnit: (state, action: PayloadAction<string | null>) => {
      state.selectedUnit = action.payload
      state.selectedCity = null // Clear city selection
    },

    selectCity: (state, action: PayloadAction<string | null>) => {
      state.selectedCity = action.payload
      state.selectedUnit = null // Clear unit selection
    },

    clearSelection: (state) => {
      state.selectedUnit = null
      state.selectedCity = null
    },

    // Game actions
    addGameAction: (state, action: PayloadAction<GameAction>) => {
      state.gameHistory.push(action.payload)
    },

    // Player management
    updatePlayerList: (state, action: PayloadAction<PlayerState[]>) => {
      state.playerList = action.payload
    },

    playerJoined: (state, action: PayloadAction<PlayerState>) => {
      const existingPlayerIndex = state.playerList.findIndex(p => p.id === action.payload.id)
      if (existingPlayerIndex >= 0) {
        state.playerList[existingPlayerIndex] = action.payload
      } else {
        state.playerList.push(action.payload)
      }
    },

    playerLeft: (state, action: PayloadAction<string>) => {
      state.playerList = state.playerList.filter(p => p.id !== action.payload)
    },

    // Game lifecycle
    gameStarted: (state, action: PayloadAction<any>) => {
      state.gameState = action.payload
      state.gameHistory = []
    },

    gameEnded: (state, action: PayloadAction<{ winner: PlayerInfo; finalScores: any[] }>) => {
      if (state.gameState) {
        state.gameState.phase = GamePhase.END_GAME
      }
      // Keep the game state for viewing results
    },

    leaveGame: (state) => {
      state.currentGameId = null
      state.gameState = null
      state.isInGame = false
      state.selectedUnit = null
      state.selectedCity = null
      state.playerList = []
      state.gameHistory = []
      state.currentPlayerTurn = false
    },

    // Game actions for UI feedback
    unitMoved: (state, action: PayloadAction<{ unitId: string; newPosition: any }>) => {
      // Update unit position in local state for immediate feedback
      // Skip unit updates for now - needs proper implementation
      console.log('Unit moved:', action.payload);
    },

    unitAttacked: (state, action: PayloadAction<{ attackerId: string; defenderId: string; result: any }>) => {
      // Handle combat result in local state
      console.log('Combat result:', action.payload.result)
    },

    cityFounded: (state, action: PayloadAction<{ cityId: string; city: any }>) => {
      // Add new city to local state  
      if (state.gameState?.cities) {
        state.gameState.cities[action.payload.cityId] = action.payload.city;
      }
    },

    // Turn management
    turnChanged: (state, action: PayloadAction<{ currentPlayer: number; currentTurn: number }>) => {
      if (state.gameState) {
        state.gameState.currentPlayer = action.payload.currentPlayer.toString()  // Convert to string
        state.gameState.currentTurn = action.payload.currentTurn
      }
    },

    // Resource updates
    resourcesUpdated: (state, action: PayloadAction<{ playerId: string; resources: any }>) => {
      if (state.gameState) {
        const player = state.gameState.players.find(p => p.id === action.payload.playerId)
        if (player) {
          player.resources = action.payload.resources
        }
      }
    },

    // Technology updates
    technologyResearched: (state, action: PayloadAction<{ playerId: string; technology: string }>) => {
      // Skip technology updates for now - needs proper implementation
      console.log('Technology researched:', action.payload);
    }
  }
})

export const {
  setConnectionStatus,
  setCurrentGame,
  updateGameState,
  setCurrentPlayerTurn,
  selectUnit,
  selectCity,
  clearSelection,
  addGameAction,
  updatePlayerList,
  playerJoined,
  playerLeft,
  gameStarted,
  gameEnded,
  leaveGame,
  unitMoved,
  unitAttacked,
  cityFounded,
  turnChanged,
  resourcesUpdated,
  technologyResearched
} = gameSlice.actions

export default gameSlice.reducer