import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Stack,
  Chip,
  Alert,
  Paper,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  Avatar
} from '@mui/material';
import {
  Computer,
  Person,
  Psychology,
  Speed,
  Map as MapIcon,
  PlayArrow,
  Settings,
  SportsEsports
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useWebSocket';
import { useDispatch } from 'react-redux';
import { setGameState, setPlayerId } from '../store/gameSlice';

enum AIDifficulty {
  Easy = 'easy',
  Normal = 'normal',
  Hard = 'hard',
  Insane = 'insane'
}

const SinglePlayerSetup: React.FC = () => {
  const navigate = useNavigate();
  const socket = useSocket();
  const dispatch = useDispatch();

  // Form state
  const [playerName, setPlayerName] = useState('');
  const [aiOpponents, setAiOpponents] = useState(3);
  const [difficulty, setDifficulty] = useState<AIDifficulty>(AIDifficulty.Normal);
  const [mapSize, setMapSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Difficulty descriptions
  const difficultyInfo = {
    [AIDifficulty.Easy]: {
      title: 'Easy',
      description: 'AI makes mistakes, slower decisions, no bonuses',
      color: '#4caf50',
      icon: '😊'
    },
    [AIDifficulty.Normal]: {
      title: 'Normal',
      description: 'Balanced AI with standard decision making',
      color: '#2196f3',
      icon: '🎯'
    },
    [AIDifficulty.Hard]: {
      title: 'Hard',
      description: 'Smart AI with resource bonuses and better vision',
      color: '#ff9800',
      icon: '💪'
    },
    [AIDifficulty.Insane]: {
      title: 'Insane',
      description: 'Perfect decisions, significant bonuses, no mistakes',
      color: '#f44336',
      icon: '🔥'
    }
  };

  const mapSizeInfo = {
    small: { width: 15, height: 15, players: '2-4', icon: '🗺️' },
    medium: { width: 20, height: 20, players: '3-6', icon: '🗺️🗺️' },
    large: { width: 30, height: 30, players: '4-8', icon: '🗺️🗺️🗺️' }
  };

  const handleCreateGame = () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsCreating(true);
    setError(null);

    // Send create single player game request
    socket.emit('create_single_player', {
      playerName: playerName.trim(),
      aiOpponents,
      aiDifficulty: difficulty,
      mapSize
    });

    // Listen for game creation response
    socket.once('game_created', (data) => {
      dispatch(setGameState(data.gameState));
      dispatch(setPlayerId(data.playerId));
      navigate(`/game/${data.gameId}`);
    });

    socket.once('error', (data) => {
      setError(data.message || 'Failed to create game');
      setIsCreating(false);
    });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h3" align="center" gutterBottom sx={{ mb: 4 }}>
        <SportsEsports sx={{ fontSize: 48, mr: 2, verticalAlign: 'middle' }} />
        Single Player Game
      </Typography>

      <Grid container spacing={3}>
        {/* Left Column - Basic Settings */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
                Player Settings
              </Typography>

              <Stack spacing={3} sx={{ mt: 3 }}>
                <TextField
                  label="Your Name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  fullWidth
                  required
                  placeholder="Enter your civilization leader name"
                  InputProps={{
                    startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />

                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    <Computer sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                    Number of AI Opponents: {aiOpponents}
                  </Typography>
                  <Slider
                    value={aiOpponents}
                    onChange={(_, value) => setAiOpponents(value as number)}
                    min={1}
                    max={7}
                    marks
                    valueLabelDisplay="auto"
                    sx={{ mt: 2 }}
                  />
                  <Box display="flex" justifyContent="space-between" sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">1 (Duel)</Typography>
                    <Typography variant="caption" color="text.secondary">7 (Crowded)</Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    <MapIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 20 }} />
                    Map Size
                  </Typography>
                  <ToggleButtonGroup
                    value={mapSize}
                    exclusive
                    onChange={(_, value) => value && setMapSize(value)}
                    fullWidth
                    sx={{ mt: 2 }}
                  >
                    {Object.entries(mapSizeInfo).map(([size, info]) => (
                      <ToggleButton key={size} value={size}>
                        <Stack alignItems="center" spacing={0.5}>
                          <Typography variant="h6">{info.icon}</Typography>
                          <Typography variant="body2" fontWeight="bold">
                            {size.charAt(0).toUpperCase() + size.slice(1)}
                          </Typography>
                          <Typography variant="caption">
                            {info.width}x{info.height}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {info.players} players
                          </Typography>
                        </Stack>
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column - Difficulty Settings */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                <Psychology sx={{ mr: 1, verticalAlign: 'middle' }} />
                Difficulty Level
              </Typography>

              <Stack spacing={2} sx={{ mt: 3 }}>
                {Object.entries(difficultyInfo).map(([level, info]) => (
                  <Paper
                    key={level}
                    elevation={difficulty === level ? 8 : 1}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      border: difficulty === level ? `2px solid ${info.color}` : '2px solid transparent',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: 3
                      }
                    }}
                    onClick={() => setDifficulty(level as AIDifficulty)}
                  >
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar sx={{ bgcolor: info.color, width: 48, height: 48 }}>
                          <Typography variant="h5">{info.icon}</Typography>
                        </Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ color: info.color }}>
                            {info.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {info.description}
                          </Typography>
                        </Box>
                      </Box>
                      {difficulty === level && (
                        <Chip 
                          label="Selected" 
                          color="primary" 
                          size="small"
                          sx={{ bgcolor: info.color }}
                        />
                      )}
                    </Box>
                  </Paper>
                ))}
              </Stack>

              <Alert severity="info" sx={{ mt: 3 }}>
                <Typography variant="body2">
                  <strong>AI Personalities:</strong> Each AI opponent will have a unique personality 
                  (Aggressive, Economic, Scientific, Defensive, or Balanced) that affects their strategy!
                </Typography>
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Game Summary */}
        <Grid item xs={12}>
          <Card elevation={3} sx={{ bgcolor: 'primary.dark' }}>
            <CardContent>
              <Typography variant="h6" color="white" gutterBottom>
                Game Summary
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={3}>
                  <Typography variant="body2" color="grey.300">Players</Typography>
                  <Typography variant="h6" color="white">
                    {aiOpponents + 1} Total
                  </Typography>
                  <Typography variant="caption" color="grey.400">
                    You + {aiOpponents} AI
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="body2" color="grey.300">Map</Typography>
                  <Typography variant="h6" color="white">
                    {mapSize.charAt(0).toUpperCase() + mapSize.slice(1)}
                  </Typography>
                  <Typography variant="caption" color="grey.400">
                    {mapSizeInfo[mapSize].width}x{mapSizeInfo[mapSize].height} hexes
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="body2" color="grey.300">Difficulty</Typography>
                  <Typography variant="h6" color="white">
                    {difficultyInfo[difficulty].title}
                  </Typography>
                  <Typography variant="caption" color="grey.400">
                    {difficultyInfo[difficulty].icon}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="body2" color="grey.300">Victory</Typography>
                  <Typography variant="h6" color="white">
                    Multiple Paths
                  </Typography>
                  <Typography variant="caption" color="grey.400">
                    Domination, Science, Culture
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Error Display */}
        {error && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Grid>
        )}

        {/* Action Buttons */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between">
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/')}
              disabled={isCreating}
            >
              Back to Menu
            </Button>
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrow />}
              onClick={handleCreateGame}
              disabled={isCreating || !playerName.trim()}
              sx={{ minWidth: 200 }}
            >
              {isCreating ? 'Creating Game...' : 'Start Game'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SinglePlayerSetup;
