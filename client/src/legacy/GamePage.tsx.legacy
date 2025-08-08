import React, { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { Box, Typography, Paper, Chip } from '@mui/material'
import { RootState } from '../store/store'
import { useSocket } from '../contexts/SocketContext'
import { setCurrentGame } from '../store/gameSlice'
import LoadingScreen from '../components/LoadingScreen'
import GameRenderer from '../components/GameRenderer'
import GameHUD from '../components/GameHUD'
import GameSidebar from '../components/GameSidebar'

const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>()
  const dispatch = useDispatch()
  const { requestGameState } = useSocket()
  
  const { gameState, isInGame, connectionStatus } = useSelector((state: RootState) => state.game)
  const { sidebarOpen } = useSelector((state: RootState) => state.ui)
  
  const gameContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (gameId && gameId !== 'creating') {
      dispatch(setCurrentGame(gameId))
      requestGameState()
    }
  }, [gameId, dispatch, requestGameState])

  if (connectionStatus !== 'connected') {
    return <LoadingScreen message="Connecting to game..." />
  }

  if (!gameState) {
    return <LoadingScreen message="Loading game state..." />
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Game HUD */}
      <GameHUD />
      
      {/* Game Content */}
      <Box 
        ref={gameContainerRef}
        sx={{ 
          flex: 1, 
          position: 'relative', 
          display: 'flex',
          overflow: 'hidden'
        }}
      >
        {/* Game Renderer */}
        <Box sx={{ flex: 1, position: 'relative' }}>
          <GameRenderer gameState={gameState} />
        </Box>
        
        {/* Game Sidebar */}
        <GameSidebar open={sidebarOpen} />
      </Box>

      {/* Game Status Indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 70,
          left: 20,
          zIndex: 1000
        }}
      >
        <Chip
          label={`Turn ${gameState.currentTurn} - ${gameState.phase}`}
          color={gameState.phase === 'active' ? 'success' : 'default'}
          sx={{ 
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            fontWeight: 'bold'
          }}
        />
      </Box>
    </Box>
  )
}

export default GamePage