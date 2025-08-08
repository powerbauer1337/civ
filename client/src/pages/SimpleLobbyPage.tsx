import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Snackbar,
  Alert,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Fab
} from '@mui/material'
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  People as PeopleIcon,
  PlayArrow as PlayIcon,
  AccessTime as TimeIcon,
  FilterList as FilterIcon,
  Delete as DeleteIcon,
  Pending as PendingIcon,
  CheckCircle as CheckIcon,
  Info as InfoIcon
} from '@mui/icons-material'

interface Game {
  id: string
  name: string
  status: 'waiting' | 'active' | 'ended'
  playerCount: number
  maxPlayers: number
  currentTurn: number
  createdAt: string
  joinable: boolean
  isTestGame?: boolean
}

interface GameListResponse {
  games: Game[]
  totalGames: number
  currentPage: number
  totalPages: number
  hasMore: boolean
}

interface CreateGameRequest {
  name: string
  maxPlayers?: number
}

interface JoinGameRequest {
  username: string
  civilization?: string
}

const SimpleLobbyPage: React.FC = () => {
  const navigate = useNavigate()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [createGameOpen, setCreateGameOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(!localStorage.getItem('hasVisited'))
  
  // Pagination and filtering
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalGames, setTotalGames] = useState(0)
  const [gameFilter, setGameFilter] = useState<'all' | 'waiting' | 'active' | 'ended'>('all')
  const [hideTestGames, setHideTestGames] = useState(true)
  const [isCleaningUp, setIsCleaningUp] = useState(false)
  
  const [gameForm, setGameForm] = useState({
    name: '',
    maxPlayers: 4
  })
  
  const [playerForm, setPlayerForm] = useState({
    username: localStorage.getItem('playerName') || '',
    civilization: 'Random'
  })

  useEffect(() => {
    fetchGames(1)
  }, [gameFilter, hideTestGames])

  useEffect(() => {
    // Refresh games every 10 seconds (reduced frequency for better UX)
    const interval = setInterval(() => fetchGames(), 10000)
    return () => clearInterval(interval)
  }, [currentPage, gameFilter, hideTestGames])

  const fetchGames = async (page = currentPage) => {
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        filter: gameFilter,
        hideTestGames: hideTestGames.toString()
      })
      
      const response = await fetch(
        `${process.env.VITE_API_BASE_URL || 'http://localhost:4002'}/api/games?${queryParams}`
      )
      
      if (response.ok) {
        const data: GameListResponse = await response.json()
        setGames(data.games || data as any) // Fallback for old API format
        setTotalGames(data.totalGames || data.games?.length || 0)
        setCurrentPage(data.currentPage || page)
        setTotalPages(data.totalPages || Math.ceil((data.totalGames || 0) / 10))
      } else {
        throw new Error('Failed to fetch games')
      }
    } catch (error) {
      console.error('Error fetching games:', error)
      setError('Failed to connect to server')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGame = async () => {
    if (!gameForm.name.trim()) {
      setError('Game name is required')
      return
    }

    try {
      const response = await fetch(`${process.env.VITE_API_BASE_URL || 'http://localhost:4002'}/api/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: gameForm.name.trim(),
          maxPlayers: gameForm.maxPlayers
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setSuccess(`Game "${result.game.name}" created successfully!`)
        setCreateGameOpen(false)
        setGameForm({ name: '', maxPlayers: 4 })
        fetchGames() // Refresh the games list
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create game')
      }
    } catch (error) {
      console.error('Error creating game:', error)
      setError(error instanceof Error ? error.message : 'Failed to create game')
    }
  }

  const handleJoinGame = async (gameId: string, gameName: string) => {
    if (!playerForm.username.trim()) {
      setError('Username is required')
      return
    }

    // Save username for future use
    localStorage.setItem('playerName', playerForm.username.trim())

    try {
      const response = await fetch(`${process.env.VITE_API_BASE_URL || 'http://localhost:4002'}/api/games/${gameId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: playerForm.username.trim(),
          civilization: playerForm.civilization
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setSuccess(`Joined "${gameName}" as ${result.playerId}!`)
        // Store player info for game session
        localStorage.setItem('currentGameId', gameId)
        localStorage.setItem('currentPlayerId', result.playerId)
        
        // Navigate to game (we'll create this route)
        setTimeout(() => {
          navigate(`/game/${gameId}`)
        }, 1000)
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to join game')
      }
    } catch (error) {
      console.error('Error joining game:', error)
      setError(error instanceof Error ? error.message : 'Failed to join game')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'primary'
      case 'active': return 'success' 
      case 'ended': return 'default'
      default: return 'secondary'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'waiting': return 'Waiting for Players'
      case 'active': return 'Game in Progress'
      case 'ended': return 'Game Finished'
      default: return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting': return <PendingIcon />
      case 'active': return <PlayIcon />
      case 'ended': return <CheckIcon />
      default: return <InfoIcon />
    }
  }

  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page)
    fetchGames(page)
  }

  const handleCleanupTestGames = async () => {
    setIsCleaningUp(true)
    try {
      const response = await fetch(
        `${process.env.VITE_API_BASE_URL || 'http://localhost:4002'}/api/games/cleanup-test-games`,
        { method: 'DELETE' }
      )
      
      if (response.ok) {
        const data = await response.json()
        setSuccess(`${data.message}. Refreshing game list...`)
        // Reset to page 1 and refresh
        setCurrentPage(1)
        setTimeout(() => fetchGames(1), 1000)
      } else {
        throw new Error('Failed to cleanup test games')
      }
    } catch (error) {
      console.error('Error cleaning up test games:', error)
      setError('Failed to cleanup test games')
    } finally {
      setIsCleaningUp(false)
    }
  }

  const handleWelcomeComplete = () => {
    setShowWelcome(false)
    localStorage.setItem('hasVisited', 'true')
  }

  // Welcome Screen Component
  const WelcomeScreen = () => (
    <Box sx={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1300
    }}>
      <Container maxWidth="md">
        <Paper sx={{ p: 6, textAlign: 'center', background: 'rgba(255, 255, 255, 0.95)' }}>
          <Typography variant="h2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            🏛️ Civilization Game
          </Typography>
          <Typography variant="h5" gutterBottom color="text.secondary">
            Build Your Empire • Conquer the World • Make History
          </Typography>
          
          <Box sx={{ my: 4 }}>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>⚡ Real-time Multiplayer</Typography>
                  <Typography variant="body2">Play with friends and strangers in live, turn-based strategy battles</Typography>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>🧠 Strategy & Diplomacy</Typography>
                  <Typography variant="body2">Build cities, research technologies, and negotiate with other civilizations</Typography>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>🏆 Multiple Victory Paths</Typography>
                  <Typography variant="body2">Win through conquest, science, culture, or diplomacy</Typography>
                </Card>
              </Grid>
            </Grid>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              size="large"
              onClick={handleWelcomeComplete}
              sx={{ minWidth: 200, py: 1.5 }}
            >
              Start Playing Now
            </Button>
            <Button 
              variant="outlined" 
              size="large"
              onClick={handleWelcomeComplete}
              sx={{ minWidth: 200, py: 1.5 }}
            >
              Quick Tour
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  )

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Connecting to server...</Typography>
      </Box>
    )
  }

  return (
    <>
      {showWelcome && <WelcomeScreen />}
      
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' }}>
      {/* Header */}
      <AppBar position="static" sx={{ background: 'rgba(0, 0, 0, 0.3)' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            🎮 Civilization Game - Live Multiplayer
          </Typography>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            color="primary"
            onClick={() => setCreateGameOpen(true)}
            sx={{ mr: 1 }}
          >
            Create Game
          </Button>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            color="inherit"
            onClick={fetchGames}
          >
            Refresh
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Player Info Section */}
        <Paper sx={{ p: 3, mb: 3, background: 'rgba(255, 255, 255, 0.95)' }}>
          <Typography variant="h5" gutterBottom>
            Player Settings
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Your Username"
                value={playerForm.username}
                onChange={(e) => setPlayerForm({ ...playerForm, username: e.target.value })}
                placeholder="Enter your name to play"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Preferred Civilization"
                value={playerForm.civilization}
                onChange={(e) => setPlayerForm({ ...playerForm, civilization: e.target.value })}
                placeholder="e.g., Romans, Greeks, Egyptians"
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Games List */}
        <Paper sx={{ p: 3, background: 'rgba(255, 255, 255, 0.95)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight="bold">
              Available Games ({totalGames})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                startIcon={<DeleteIcon />}
                variant="outlined"
                color="warning"
                onClick={handleCleanupTestGames}
                disabled={isCleaningUp}
                size="small"
              >
                {isCleaningUp ? 'Cleaning...' : 'Cleanup Tests'}
              </Button>
              <Button
                startIcon={<RefreshIcon />}
                variant="outlined"
                onClick={() => fetchGames()}
              >
                Refresh
              </Button>
            </Box>
          </Box>

          {/* Filters */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Filter Games</InputLabel>
              <Select
                value={gameFilter}
                label="Filter Games"
                onChange={(e) => setGameFilter(e.target.value as any)}
                startAdornment={<FilterIcon sx={{ mr: 1, color: 'action.active' }} />}
              >
                <MenuItem value="all">All Games</MenuItem>
                <MenuItem value="waiting">Waiting for Players</MenuItem>
                <MenuItem value="active">Active Games</MenuItem>
                <MenuItem value="ended">Finished Games</MenuItem>
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Switch
                  checked={hideTestGames}
                  onChange={(e) => setHideTestGames(e.target.checked)}
                  color="primary"
                />
              }
              label="Hide Test Games"
            />
          </Box>

          {games.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No games available
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                Be the first to create a game!
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={() => setCreateGameOpen(true)}
              >
                Create Your First Game
              </Button>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {games.map((game) => (
                <Grid item xs={12} sm={6} md={4} key={game.id}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h6" noWrap fontWeight="bold">
                            {game.name}
                          </Typography>
                          {game.isTestGame && (
                            <Chip
                              label="TEST"
                              color="warning"
                              size="small"
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                          )}
                        </Box>
                        <Chip
                          icon={getStatusIcon(game.status)}
                          label={getStatusText(game.status)}
                          color={getStatusColor(game.status) as any}
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
                          Turn {game.currentTurn} • Created {new Date(game.createdAt).toLocaleTimeString()}
                        </Typography>
                      </Box>
                      
                      <Typography variant="caption" display="block" sx={{ mb: 2, color: 'text.secondary' }}>
                        Game ID: {game.id}
                      </Typography>
                      
                      <Button
                        fullWidth
                        variant={game.status === 'waiting' ? 'contained' : 'outlined'}
                        startIcon={loading ? <CircularProgress size={16} /> : <PlayIcon />}
                        disabled={!game.joinable || loading}
                        onClick={() => handleJoinGame(game.id, game.name)}
                      >
                        {loading ? 'Joining...' : (
                          game.status === 'waiting' 
                            ? (game.playerCount < game.maxPlayers ? 'Join Game' : 'Game Full')
                            : game.status === 'active' ? 'Game In Progress' : 'Game Finished'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </Paper>
      </Container>

      {/* Create Game Dialog */}
      <Dialog open={createGameOpen} onClose={() => setCreateGameOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Game</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Game Name"
            value={gameForm.name}
            onChange={(e) => setGameForm({ ...gameForm, name: e.target.value })}
            margin="normal"
            placeholder="e.g., Epic Civilization Battle"
          />
          
          <TextField
            fullWidth
            type="number"
            label="Maximum Players"
            value={gameForm.maxPlayers}
            onChange={(e) => setGameForm({ ...gameForm, maxPlayers: parseInt(e.target.value) || 4 })}
            margin="normal"
            inputProps={{ min: 2, max: 8 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateGameOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleCreateGame}
            disabled={!gameForm.name.trim()}
          >
            Create Game
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbars */}
      <Snackbar 
        open={!!success} 
        autoHideDuration={4000} 
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess(null)} severity="success">
          {success}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>

      {/* Floating Action Button for Quick Create Game */}
      <Fab
        color="primary"
        aria-label="create game"
        onClick={() => setCreateGameOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
    </>
  )
}

export default SimpleLobbyPage