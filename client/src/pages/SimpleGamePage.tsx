import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  TextField,
  AppBar,
  Toolbar,
  IconButton,
  Divider,
  Alert,
  LinearProgress
} from '@mui/material'
import {
  ArrowBack as BackIcon,
  Send as SendIcon,
  People as PeopleIcon,
  Settings as SettingsIcon
} from '@mui/icons-material'
import { io, Socket } from 'socket.io-client'
import HexMap from '../components/HexMap/HexMap'

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

interface GameState {
  gameId: string
  name: string
  status: string
  players: Player[]
  currentTurn: number
}

interface Player {
  id: string
  username: string
  civilization: string
  isOnline: boolean
}

interface ChatMessage {
  id: string
  playerId: string
  username: string
  message: string
  timestamp: Date
  type: 'message' | 'system' | 'action'
}

interface GameAction {
  id: string
  playerId: string
  action: string
  payload: any
  timestamp: Date
}

const SimpleGamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Player info from localStorage
  const [playerId] = useState(localStorage.getItem('currentPlayerId') || '')
  const [playerName] = useState(localStorage.getItem('playerName') || 'Anonymous')
  
  // Chat and actions
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [gameActions, setGameActions] = useState<GameAction[]>([])
  const [chatInput, setChatInput] = useState('')
  const [actionLog, setActionLog] = useState<string[]>([])
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!gameId) {
      setError('No game ID provided')
      return
    }

    if (!playerId) {
      setError('No player ID found. Please join the game from the lobby.')
      return
    }

    // Initialize WebSocket connection
    const newSocket = io(process.env.VITE_SOCKET_URL || 'http://localhost:4002', {
      transports: ['websocket']
    })

    newSocket.on('connect', () => {
      console.log('🔌 Connected to game server:', newSocket.id)
      setConnected(true)
      setSocket(newSocket)
      
      // Join the game room
      newSocket.emit('join_game', {
        gameId: gameId,
        playerId: playerId
      })
      
      addSystemMessage('Connected to game server')
    })

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server')
      setConnected(false)
      addSystemMessage('Disconnected from server')
    })

    newSocket.on('welcome', (data) => {
      console.log('👋 Welcome message:', data)
      addSystemMessage(`Welcome! ${data.message}`)
    })

    newSocket.on('game_joined', (data) => {
      console.log('🏁 Joined game room:', data)
      addSystemMessage(`Joined game room: ${data.gameId}`)
      fetchGameState()
    })

    newSocket.on('player_joined', (data) => {
      console.log('👥 Player joined:', data)
      addSystemMessage(`New player joined: ${data.playerId}`)
      fetchGameState() // Refresh game state when someone joins
    })

    newSocket.on('game_started', (data) => {
      console.log('🎮 Game started:', data)
      addSystemMessage(`Game started with ${data.players.length} players!`)
      fetchGameState()
    })

    newSocket.on('game_update', (data) => {
      console.log('📊 Game update received:', data)
      addGameAction(data)
      addSystemMessage(`${data.playerId}: ${data.action}`)
    })

    newSocket.on('action_acknowledged', (data) => {
      console.log('✅ Action acknowledged:', data)
      addActionLog(`✅ ${data.action} - ${data.success ? 'Success' : 'Failed'}`)
    })

    setSocket(newSocket)

    // Cleanup
    return () => {
      newSocket.disconnect()
    }
  }, [gameId, playerId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const fetchGameState = async () => {
    try {
      // In a real implementation, you'd have a game state endpoint
      // For now, we'll simulate with the games list
      const response = await fetch(`${process.env.VITE_API_BASE_URL || 'http://localhost:4002'}/api/games`)
      if (response.ok) {
        const games = await response.json()
        const currentGame = games.find((g: any) => g.id === gameId)
        if (currentGame) {
          setGameState({
            gameId: currentGame.id,
            name: currentGame.name,
            status: currentGame.status,
            players: [], // We'll get this from WebSocket events
            currentTurn: currentGame.currentTurn
          })
        }
      }
    } catch (error) {
      console.error('Error fetching game state:', error)
      setError('Failed to load game state')
    } finally {
      setLoading(false)
    }
  }

  const addSystemMessage = (message: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      playerId: 'system',
      username: 'System',
      message,
      timestamp: new Date(),
      type: 'system'
    }
    setChatMessages(prev => [...prev, newMessage])
  }

  const addGameAction = (actionData: any) => {
    const newAction: GameAction = {
      id: Date.now().toString(),
      playerId: actionData.playerId,
      action: actionData.action,
      payload: actionData.payload,
      timestamp: new Date()
    }
    setGameActions(prev => [...prev, newAction])
  }

  const addActionLog = (logEntry: string) => {
    setActionLog(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${logEntry}`])
  }

  const sendTestAction = (actionType: string) => {
    if (!socket || !connected) {
      setError('Not connected to server')
      return
    }

    const testActions = {
      'move_unit': {
        type: 'move_unit',
        gameId,
        playerId,
        payload: {
          unitId: selectedUnit?.id || 'unit_' + Math.random().toString(36).substr(2, 9),
          from: { x: selectedUnit?.x || Math.floor(Math.random() * 10), y: selectedUnit?.y || Math.floor(Math.random() * 10) },
          to: { x: Math.floor(Math.random() * 10), y: Math.floor(Math.random() * 10) }
        },
        timestamp: Date.now(),
        actionId: Math.random().toString(36).substr(2, 9)
      },
      'build_city': {
        type: 'found_city',
        gameId,
        playerId,
        payload: {
          settlerId: selectedUnit?.id,
          location: { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) },
          cityName: `${playerName}'s City`
        },
        timestamp: Date.now(),
        actionId: Math.random().toString(36).substr(2, 9)
      },
      'research_tech': {
        type: 'research_technology',
        gameId,
        playerId,
        payload: {
          techId: ['pottery', 'bronze_working', 'animal_husbandry'][Math.floor(Math.random() * 3)]
        },
        timestamp: Date.now(),
        actionId: Math.random().toString(36).substr(2, 9)
      },
      'end_turn': {
        type: 'end_turn',
        gameId,
        playerId,
        payload: {},
        timestamp: Date.now(),
        actionId: Math.random().toString(36).substr(2, 9)
      }
    }

    const actionData = testActions[actionType as keyof typeof testActions]
    if (actionData) {
      console.log('🎮 Sending action:', actionData)
      socket.emit('game_action', actionData)
      addActionLog(`Sent: ${actionData.type}`)
    }
  }

  const handleTileClick = (x: number, y: number) => {
    console.log(`Tile clicked: (${x}, ${y})`)
    
    if (selectedUnit) {
      // Try to move selected unit to this tile
      const moveAction = {
        type: 'move_unit',
        gameId,
        playerId,
        payload: {
          unitId: selectedUnit.id,
          from: { x: selectedUnit.x, y: selectedUnit.y },
          to: { x, y }
        },
        timestamp: Date.now(),
        actionId: Math.random().toString(36).substr(2, 9)
      }
      
      if (socket && connected) {
        socket.emit('game_action', moveAction)
        addActionLog(`Move unit to (${x}, ${y})`)
        setSelectedUnit(null) // Clear selection
      }
    }
  }

  const handleUnitClick = (unit: Unit) => {
    console.log('Unit selected:', unit)
    setSelectedUnit(unit)
    addActionLog(`Selected ${unit.type}`)
  }

  const handleChatSend = () => {
    if (!chatInput.trim()) return

    // In a real implementation, you'd have a chat endpoint
    // For now, just add to local chat
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      playerId,
      username: playerName,
      message: chatInput,
      timestamp: new Date(),
      type: 'message'
    }
    setChatMessages(prev => [...prev, newMessage])
    setChatInput('')
  }

  const handleLeaveGame = () => {
    if (socket) {
      socket.disconnect()
    }
    localStorage.removeItem('currentGameId')
    localStorage.removeItem('currentPlayerId')
    navigate('/lobby')
  }

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography sx={{ textAlign: 'center', mt: 2 }}>Loading game...</Typography>
      </Box>
    )
  }

  if (error && !gameState) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="contained" onClick={() => navigate('/lobby')}>
          Back to Lobby
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)' }}>
      {/* Game Header */}
      <AppBar position="static" sx={{ background: 'rgba(0, 0, 0, 0.4)' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={handleLeaveGame}>
            <BackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, ml: 1 }}>
            🎮 {gameState?.name || `Game ${gameId?.slice(-8)}`}
          </Typography>
          <Chip 
            label={connected ? 'Connected' : 'Disconnected'}
            color={connected ? 'success' : 'error'}
            sx={{ mr: 2 }}
          />
          <Chip 
            label={`Turn ${gameState?.currentTurn || 0}`}
            color="primary"
            sx={{ mr: 2 }}
          />
          <Button 
            color="inherit" 
            onClick={handleLeaveGame}
            sx={{ border: 1, borderColor: 'white' }}
          >
            Leave Game
          </Button>
        </Toolbar>
      </AppBar>

      <Grid container sx={{ height: 'calc(100vh - 64px)' }}>
        {/* Main Game Area */}
        <Grid item xs={12} md={8} sx={{ display: 'flex', flexDirection: 'column' }}>
          {/* Real Hex Map */}
          <Paper sx={{ 
            flexGrow: 1, 
            m: 2, 
            p: 0,
            position: 'relative',
            overflow: 'hidden'
          }}>
            {gameState ? (
              <HexMap 
                gameState={gameState}
                playerId={playerId}
                onTileClick={handleTileClick}
                onUnitClick={handleUnitClick}
              />
            ) : (
              <Box sx={{ 
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(45deg, #27ae60 30%, #2ecc71 90%)',
                color: 'white'
              }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h2" gutterBottom>🗺️</Typography>
                  <Typography variant="h5" gutterBottom>Loading Game Map</Typography>
                  <Typography variant="body1">
                    Waiting for game state...
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>
          
          {/* Action Buttons */}
          <Paper sx={{ m: 2, p: 2 }}>
            <Typography variant="h6" gutterBottom>Game Actions</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={() => sendTestAction('move_unit')}
                disabled={!connected || !selectedUnit}
              >
                Move Unit {selectedUnit ? `(${selectedUnit.type})` : ''}
              </Button>
              <Button 
                variant="contained" 
                color="secondary"
                onClick={() => sendTestAction('build_city')}
                disabled={!connected}
              >
                Found City
              </Button>
              <Button 
                variant="contained" 
                color="info"
                onClick={() => sendTestAction('research_tech')}
                disabled={!connected}
              >
                Research Tech
              </Button>
              <Button 
                variant="contained" 
                color="warning"
                onClick={() => sendTestAction('end_turn')}
                disabled={!connected}
              >
                End Turn
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Right Sidebar */}
        <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Player Info */}
          <Paper sx={{ m: 2, p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <PeopleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              You: {playerName}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Player ID: {playerId}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Game ID: {gameId}
            </Typography>
          </Paper>

          {/* Action Log */}
          <Paper sx={{ mx: 2, mb: 2, p: 2, flexGrow: 1 }}>
            <Typography variant="h6" gutterBottom>Action Log</Typography>
            <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
              {actionLog.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  No actions yet. Try the buttons above!
                </Typography>
              ) : (
                <List dense>
                  {actionLog.map((log, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemText 
                        primary={log}
                        primaryTypographyProps={{ fontSize: 12 }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Paper>

          {/* Game Events/Chat */}
          <Paper sx={{ mx: 2, mb: 2, p: 2, flexGrow: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>Game Events & Chat</Typography>
            
            {/* Messages */}
            <Box sx={{ 
              flexGrow: 1, 
              overflow: 'auto', 
              maxHeight: 300,
              border: 1, 
              borderColor: 'divider', 
              borderRadius: 1, 
              p: 1, 
              mb: 2 
            }}>
              {chatMessages.map((msg) => (
                <Box key={msg.id} sx={{ mb: 1 }}>
                  <Typography 
                    variant="body2" 
                    color={msg.type === 'system' ? 'primary' : 'textPrimary'}
                    sx={{ fontWeight: msg.type === 'system' ? 'bold' : 'normal' }}
                  >
                    <strong>{msg.username}:</strong> {msg.message}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {msg.timestamp.toLocaleTimeString()}
                  </Typography>
                </Box>
              ))}
              <div ref={chatEndRef} />
            </Box>

            {/* Chat Input */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleChatSend}
                disabled={!chatInput.trim()}
              >
                <SendIcon />
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default SimpleGamePage