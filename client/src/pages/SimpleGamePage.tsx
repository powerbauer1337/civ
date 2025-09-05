import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  TextField,
  AppBar,
  Toolbar,
  IconButton,
  Alert,
  LinearProgress,
  CircularProgress
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Send as SendIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useSelector } from 'react-redux';
import { useSocket } from '../contexts/SocketContext';
import { RootState } from '../store/store';
// Lazy load the heavy HexMap component for better performance
const HexMap = React.lazy(() => import('../components/HexMap/HexMap'));
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

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

// GameState is sourced from Redux via SocketContext

// Player type is handled within global game state

interface ChatMessage {
  id: string
  playerId: string
  username: string
  message: string
  timestamp: Date
  type: 'message' | 'system' | 'action'
}

// Game actions are handled by server + store

const SimpleGamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { socket, connected, spectateGame, stopSpectating, sendGameAction, requestGameState } = useSocket();
  const gameState = useSelector((state: RootState) => (state.game.gameState as any) || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const isSpectatorRoute = query.get('spectate') === '1';

  // Player info from localStorage
  const [playerId] = useState(localStorage.getItem('currentPlayerId') || '');
  const [playerName] = useState(localStorage.getItem('playerName') || 'Anonymous');
  const [isSpectator, setIsSpectator] = useState<boolean>(isSpectatorRoute && !playerId);

  // Chat and actions
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedTech, setSelectedTech] = useState<string>('agriculture');
  const techOptions = ['agriculture', 'pottery', 'animal_husbandry', 'mining'];
  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultsData, setResultsData] = useState<any | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gameId) {
      setError('No game ID provided');
      return;
    }
    if (!connected) return;
    if (isSpectatorRoute && !playerId) {
      spectateGame(gameId).catch((e) => setError(e.message));
      setIsSpectator(true);
      addSystemMessage('Connected to game server');
    } else if (playerId) {
      requestGameState();
      addSystemMessage('Connected to game server');
    } else {
      setError('No player ID found. Please join the game from the lobby.');
    }
  }, [connected, gameId, playerId, isSpectatorRoute, spectateGame, requestGameState]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (gameState || error) {
      setLoading(false);
    }
  }, [gameState, error]);

  // Listen for server game_ended event and show results
  useEffect(() => {
    if (!socket) return;
    const onGameEnded = (data: any) => {
      setResultsData(data);
      setResultsOpen(true);
    };
    socket.on('game_ended', onGameEnded);
    return () => {
      socket.off('game_ended', onGameEnded);
    };
  }, [socket]);

  // Also open results if gameState indicates ended
  useEffect(() => {
    const phase = (gameState as any)?.phase;
    if (phase && (String(phase).toLowerCase() === 'ended' || String(phase).toLowerCase() === 'end_game')) {
      setResultsOpen(true);
    }
  }, [gameState]);

  const addSystemMessage = (message: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      playerId: 'system',
      username: 'System',
      message,
      timestamp: new Date(),
      type: 'system'
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  // We rely on SocketContext + Redux for game updates

  const addActionLog = (logEntry: string) => {
    setActionLog(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${logEntry}`]);
  };

  const isMyTurn = React.useMemo(() => {
    if (!gameState || !playerId) return false;
    const cp: any = (gameState as any).currentPlayer;
    const idx = typeof cp === 'number'
      ? cp
      : (Array.isArray((gameState as any).players)
          ? (gameState as any).players.findIndex((p: any) => p.id === cp)
          : -1);
    const current = (gameState as any).players?.[idx];
    return current?.id === playerId;
  }, [gameState, playerId]);

  const sendTestAction = (actionType: string) => {
    if (!socket || !connected) {
      setError('Not connected to server');
      return;
    }
    if (isSpectator) {
      setError('Spectators cannot perform actions');
      return;
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
          location: selectedUnit ? { x: selectedUnit.x, y: selectedUnit.y } : { x: 0, y: 0 },
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
          techId: selectedTech
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
    };

    const actionData = testActions[actionType as keyof typeof testActions];
    if (actionData) {
      console.log('🎮 Sending action:', actionData);
      sendGameAction(actionData);
      addActionLog(`Sent: ${actionData.type}`);
    }
  };

  const handleTileClick = (x: number, y: number) => {
    console.log(`Tile clicked: (${x}, ${y})`);

    if (isSpectator) return;

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
      };

      if (socket && connected) {
        socket.emit('game_action', moveAction);
        addActionLog(`Move unit to (${x}, ${y})`);
        setSelectedUnit(null); // Clear selection
      }
    }
  };

  const handleUnitClick = (unit: Unit) => {
    console.log('Unit selected:', unit);
    setSelectedUnit(unit);
    addActionLog(`Selected ${unit.type}`);
  };

  const handleChatSend = () => {
    if (!chatInput.trim()) return;

    // In a real implementation, you'd have a chat endpoint
    // For now, just add to local chat
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      playerId,
      username: playerName,
      message: chatInput,
      timestamp: new Date(),
      type: 'message'
    };
    setChatMessages(prev => [...prev, newMessage]);
    setChatInput('');
  };

  const handleLeaveGame = () => {
    if (socket && isSpectator) {
      stopSpectating();
    }
    if (!isSpectator) {
      localStorage.removeItem('currentGameId');
      localStorage.removeItem('currentPlayerId');
    }
    navigate('/lobby');
  };

  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
        <Typography sx={{ textAlign: 'center', mt: 2 }}>Loading game...</Typography>
      </Box>
    );
  }

  if (error && !gameState) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="contained" onClick={() => navigate('/lobby')}>
          Back to Lobby
        </Button>
      </Box>
    );
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
            label={connected ? (isSpectator ? 'Spectating' : 'Connected') : 'Disconnected'}
            color={connected ? (isSpectator ? 'info' : 'success') : 'error'}
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
              <Suspense fallback={
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: '400px'
                }}>
                  <CircularProgress size={60} />
                </Box>
              }>
                <HexMap
                  gameState={gameState}
                  playerId={playerId}
                  onTileClick={handleTileClick}
                  onUnitClick={handleUnitClick}
                />
              </Suspense>
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
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
              <TextField
                select
                size="small"
                label="Research"
                value={selectedTech}
                onChange={(e) => setSelectedTech(e.target.value)}
                SelectProps={{ native: true }}
              >
                {techOptions.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </TextField>
              <Chip label={isMyTurn ? 'Your Turn' : 'Waiting'} color={isMyTurn ? 'success' : 'default'} size="small" />
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => sendTestAction('move_unit')}
                disabled={!connected || !selectedUnit || isSpectator || !isMyTurn}
              >
                Move Unit {selectedUnit ? `(${selectedUnit.type})` : ''}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => sendTestAction('build_city')}
                disabled={!connected || isSpectator || !isMyTurn || !selectedUnit || String(selectedUnit.type).toLowerCase() !== 'settler'}
              >
                Found City
              </Button>
              <Button
                variant="contained"
                color="info"
                onClick={() => sendTestAction('research_tech')}
                disabled={!connected || isSpectator || !isMyTurn}
              >
                Research Tech
              </Button>
              <Button
                variant="contained"
                color="warning"
                onClick={() => sendTestAction('end_turn')}
                disabled={!connected || isSpectator || !isMyTurn}
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

      {/* Results Dialog */}
      <Dialog open={resultsOpen} onClose={() => setResultsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Game Over</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" gutterBottom>
            {resultsData?.winner?.playerName
              ? `${resultsData.winner.playerName} wins!`
              : 'A player has won the game.'}
          </Typography>
          {resultsData?.finalScores && (
            <List dense>
              {resultsData.finalScores.map((s: any) => (
                <ListItem key={s.playerId}>
                  <ListItemText primary={`${s.playerName || s.playerId} — ${s.score} pts`} />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setResultsOpen(false); handleLeaveGame(); }} variant="contained" color="primary">
            Return to Lobby
          </Button>
        </DialogActions>
      </Dialog>
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
  );
};

export default SimpleGamePage;
