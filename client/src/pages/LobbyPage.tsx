import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  AppBar,
  Toolbar,
  Avatar,
  Menu,
  MenuItem,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material'
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  PlayArrow as PlayIcon,
  Person as PersonIcon,
  AccessTime as TimeIcon,
  Public as PublicIcon
} from '@mui/icons-material'
import { RootState } from '../store/store'
import { logout } from '../store/authSlice'
import { useSocket } from '../contexts/SocketContext'
import { VictoryType, ResourceType } from '@civ-game/shared'
import LoadingScreen from '../components/LoadingScreen'

interface GameLobby {
  id: string
  playerCount: number
  maxPlayers: number
  phase: string
  createdAt: string
  joinable: boolean
}

const LobbyPage: React.FC = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)
  const { connected, createGame, joinGame } = useSocket()
  
  const [games, setGames] = useState<GameLobby[]>([])
  const [loading, setLoading] = useState(true)
  const [createGameOpen, setCreateGameOpen] = useState(false)
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null)
  
  const [gameConfig, setGameConfig] = useState({
    playerName: user?.username || '',
    mapWidth: 40,
    mapHeight: 30,
    maxPlayers: 4,
    turnTimeLimit: 300,
    victoryConditions: [VictoryType.DOMINATION, VictoryType.SCIENCE, VictoryType.CULTURE],
    startingGold: 50
  })

  useEffect(() => {
    if (connected) {
      fetchGameList()
      setLoading(false)
    }
  }, [connected])

  const fetchGameList = async () => {
    try {
      const response = await fetch('/api/games')
      const data = await response.json()
      setGames(data.games || [])
    } catch (error) {
      console.error('Error fetching games:', error)
    }
  }

  const handleCreateGame = () => {
    const config = {
      mapSize: { width: gameConfig.mapWidth, height: gameConfig.mapHeight },
      maxPlayers: gameConfig.maxPlayers,
      turnTimeLimit: gameConfig.turnTimeLimit,
      victoryConditions: gameConfig.victoryConditions,
      startingResources: {
        [ResourceType.GOLD]: gameConfig.startingGold,
        [ResourceType.SCIENCE]: 0,
        [ResourceType.CULTURE]: 0,
        [ResourceType.PRODUCTION]: 0,
        [ResourceType.FOOD]: 0
      }
    }
    
    createGame(gameConfig.playerName, config)
    setCreateGameOpen(false)
    navigate('/game/creating')
  }

  const handleJoinGame = (gameId: string) => {
    if (user) {
      joinGame(gameId, user.username)
      navigate(`/game/${gameId}`)
    }
  }

  const handleLogout = () => {
    dispatch(logout())
    setUserMenuAnchor(null)
  }

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'lobby': return 'primary'
      case 'active': return 'success'
      case 'ended': return 'default'
      default: return 'secondary'
    }
  }

  const getPhaseText = (phase: string) => {
    switch (phase) {
      case 'lobby': return 'Waiting'
      case 'active': return 'Playing'
      case 'ended': return 'Finished'
      default: return phase
    }
  }

  if (!connected) {
    return <LoadingScreen message="Connecting to server..." />
  }

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' }}>
      {/* Top Navigation */}
      <AppBar position="static" sx={{ background: 'rgba(0, 0, 0, 0.3)', backdropFilter: 'blur(10px)' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Civilization - Game Lobby
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              icon={<PublicIcon />}
              label={connected ? 'Online' : 'Offline'}
              color={connected ? 'success' : 'error'}
              variant="outlined"
              sx={{ color: 'white', borderColor: 'white' }}
            />
            
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              color="primary"
              onClick={() => setCreateGameOpen(true)}
              sx={{ mr: 1 }}
            >
              Create Game
            </Button>
            
            <IconButton color="inherit" onClick={fetchGameList}>
              <RefreshIcon />
            </IconButton>
            
            <Avatar
              sx={{ cursor: 'pointer', bgcolor: 'primary.main' }}
              onClick={(e) => setUserMenuAnchor(e.currentTarget)}
            >
              <PersonIcon />
            </Avatar>
          </Box>
        </Toolbar>
      </AppBar>

      {/* User Menu */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
      >
        <MenuItem disabled>
          <ListItemIcon><PersonIcon /></ListItemIcon>
          <ListItemText primary={user?.username} secondary={`${user?.gamesWon}/${user?.gamesPlayed} wins`} />
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => setUserMenuAnchor(null)}>
          <ListItemIcon><SettingsIcon /></ListItemIcon>
          <ListItemText primary="Settings" />
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" />
        </MenuItem>
      </Menu>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {/* Game Stats */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, mb: 3, background: 'rgba(255, 255, 255, 0.95)' }}>
              <Typography variant="h4" gutterBottom>
                Welcome back, {user?.username}!
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" color="primary">{games.length}</Typography>
                      <Typography variant="body2">Active Games</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" color="success.main">{user?.gamesWon}</Typography>
                      <Typography variant="body2">Games Won</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" color="secondary">{user?.winRate}%</Typography>
                      <Typography variant="body2">Win Rate</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Available Games */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, background: 'rgba(255, 255, 255, 0.95)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight="bold">
                  Available Games
                </Typography>
                <Button
                  startIcon={<RefreshIcon />}
                  variant="outlined"
                  onClick={fetchGameList}
                >
                  Refresh
                </Button>
              </Box>

              {games.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    No games available
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    Create a new game to get started!
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCreateGameOpen(true)}
                  >
                    Create Game
                  </Button>
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {games.map((game) => (
                    <Grid item xs={12} sm={6} md={4} key={game.id}>
                      <Card variant="outlined" sx={{ height: '100%' }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h6" noWrap>
                              Game #{game.id.slice(-8)}
                            </Typography>
                            <Chip
                              label={getPhaseText(game.phase)}
                              color={getPhaseColor(game.phase) as any}
                              size="small"
                            />
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <PeopleIcon sx={{ mr: 1, fontSize: 16 }} />
                            <Typography variant="body2">
                              {game.playerCount}/{game.maxPlayers} players
                            </Typography>
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <TimeIcon sx={{ mr: 1, fontSize: 16 }} />
                            <Typography variant="body2">
                              Created {new Date(game.createdAt).toLocaleTimeString()}
                            </Typography>
                          </Box>
                          
                          <Button
                            fullWidth
                            variant={game.joinable ? 'contained' : 'outlined'}
                            startIcon={<PlayIcon />}
                            disabled={!game.joinable}
                            onClick={() => handleJoinGame(game.id)}
                          >
                            {game.joinable ? 'Join Game' : 'Game Full'}
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Create Game Dialog */}
      <Dialog open={createGameOpen} onClose={() => setCreateGameOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Game</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Player Name"
            value={gameConfig.playerName}
            onChange={(e) => setGameConfig({ ...gameConfig, playerName: e.target.value })}
            margin="normal"
          />
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Map Width"
                value={gameConfig.mapWidth}
                onChange={(e) => setGameConfig({ ...gameConfig, mapWidth: parseInt(e.target.value) || 40 })}
                inputProps={{ min: 20, max: 100 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Map Height"
                value={gameConfig.mapHeight}
                onChange={(e) => setGameConfig({ ...gameConfig, mapHeight: parseInt(e.target.value) || 30 })}
                inputProps={{ min: 15, max: 80 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Players"
                value={gameConfig.maxPlayers}
                onChange={(e) => setGameConfig({ ...gameConfig, maxPlayers: parseInt(e.target.value) || 4 })}
                inputProps={{ min: 2, max: 8 }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Turn Time (seconds)"
                value={gameConfig.turnTimeLimit}
                onChange={(e) => setGameConfig({ ...gameConfig, turnTimeLimit: parseInt(e.target.value) || 300 })}
                inputProps={{ min: 60, max: 600 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateGameOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateGame}
            disabled={!gameConfig.playerName}
          >
            Create Game
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default LobbyPage