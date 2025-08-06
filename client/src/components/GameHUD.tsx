import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material'
import {
  Menu as MenuIcon,
  Settings as SettingsIcon,
  ExitToApp as ExitIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon
} from '@mui/icons-material'
import { RootState } from '../store/store'
import { toggleSidebar } from '../store/uiSlice'
import { useSocket } from '../contexts/SocketContext'

const GameHUD: React.FC = () => {
  const dispatch = useDispatch()
  const { sendGameAction } = useSocket()
  
  const { gameState, currentPlayerTurn } = useSelector((state: RootState) => state.game)
  const { user } = useSelector((state: RootState) => state.auth)

  const currentPlayer = gameState?.players.find(p => p.id === user?.id)
  const activePlayer = gameState?.players[gameState.currentPlayer]

  const handleEndTurn = () => {
    if (currentPlayerTurn) {
      sendGameAction({
        type: 'end_turn',
        playerId: user?.id,
        payload: {},
        timestamp: Date.now(),
        actionId: `action_${Date.now()}`
      })
    }
  }

  const handleMenuClick = () => {
    dispatch(toggleSidebar())
  }

  return (
    <Box className="game-hud">
      {/* Left side - Menu and game info */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton 
          color="inherit" 
          onClick={handleMenuClick}
          sx={{ color: 'white' }}
        >
          <MenuIcon />
        </IconButton>
        
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
          Turn {gameState?.currentTurn || 1}
        </Typography>
        
        <Chip
          label={activePlayer?.name || 'Unknown'}
          color={currentPlayerTurn ? 'success' : 'default'}
          sx={{ 
            color: 'white',
            fontWeight: 'bold'
          }}
        />
      </Box>

      {/* Center - Resources */}
      {currentPlayer && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#FFD700' }}>
              💰 {currentPlayer.resources.gold}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#87CEEB' }}>
              🔬 {currentPlayer.resources.science}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#FF69B4' }}>
              🎭 {currentPlayer.resources.culture}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#8B4513' }}>
              🔨 {currentPlayer.resources.production}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ color: '#90EE90' }}>
              🌾 {currentPlayer.resources.food}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Right side - Actions */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="contained"
          color={currentPlayerTurn ? 'success' : 'primary'}
          disabled={!currentPlayerTurn}
          onClick={handleEndTurn}
          startIcon={currentPlayerTurn ? <PlayIcon /> : <PauseIcon />}
        >
          {currentPlayerTurn ? 'End Turn' : 'Waiting...'}
        </Button>
        
        <Tooltip title="Game Settings">
          <IconButton color="inherit" sx={{ color: 'white' }}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Leave Game">
          <IconButton color="inherit" sx={{ color: 'white' }}>
            <ExitIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

export default GameHUD