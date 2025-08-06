import { configureStore } from '@reduxjs/toolkit'
import authSlice from './authSlice'
import gameSlice from './gameSlice'
import uiSlice from './uiSlice'

export const store = configureStore({
  reducer: {
    auth: authSlice,
    game: gameSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['game/updateGameState'],
        ignoredPaths: ['game.gameState.technologies', 'game.gameState.grid']
      }
    })
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch