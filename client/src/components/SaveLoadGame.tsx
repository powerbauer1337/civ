import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Typography,
  Box,
  Chip,
  Alert,
  LinearProgress,
  Tab,
  Tabs,
  Paper,
  Grid,
  Tooltip,
  Divider,
  Avatar
} from '@mui/material';
import {
  Save as SaveIcon,
  FolderOpen,
  Delete,
  CloudUpload,
  CloudDownload,
  AccessTime,
  SportsEsports,
  People,
  Map as MapIcon,
  EmojiEvents,
  AutorenewRounded,
  BookmarkBorder,
  Bookmark
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useSocket } from '../hooks/useWebSocket';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { setGameState } from '../store/gameSlice';

interface SaveGame {
  id: number;
  gameId: string;
  saveName: string;
  turnNumber: number;
  saveType: 'auto' | 'manual' | 'checkpoint';
  createdAt: string;
  fileSize: number;
  gameName: string;
  status: string;
  gameMode: 'singleplayer' | 'multiplayer';
  difficulty?: string;
}

interface SaveLoadGameProps {
  open: boolean;
  onClose: () => void;
  mode: 'save' | 'load' | 'both';
  currentGameId?: string;
  onGameLoaded?: (gameState: any) => void;
  onGameSaved?: (saveId: number) => void;
}

const SaveLoadGame: React.FC<SaveLoadGameProps> = ({
  open,
  onClose,
  mode = 'both',
  currentGameId,
  onGameLoaded,
  onGameSaved
}) => {
  const socket = useSocket();
  const dispatch = useDispatch();
  const gameState = useSelector((state: RootState) => state.game.gameState);
  const playerId = useSelector((state: RootState) => state.game.playerId);

  const [tabValue, setTabValue] = useState(mode === 'save' ? 0 : 1);
  const [saves, setSaves] = useState<SaveGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [selectedSave, setSelectedSave] = useState<SaveGame | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open && mode !== 'save') {
      loadSavesList();
    }
  }, [open]);

  const loadSavesList = () => {
    setLoading(true);
    socket.emit('get_saves', { playerId });

    socket.once('saves_list', (data) => {
      setSaves(data.saves);
      setLoading(false);
    });

    socket.once('error', (data) => {
      setError(data.message || 'Failed to load saves');
      setLoading(false);
    });
  };

  const handleSaveGame = () => {
    if (!saveName.trim()) {
      setError('Please enter a save name');
      return;
    }

    setSaving(true);
    setError(null);

    socket.emit('save_game', {
      gameId: currentGameId,
      saveName: saveName.trim(),
      saveType: 'manual',
      playerId,
      gameState
    });

    socket.once('game_saved', (data) => {
      setSaving(false);
      setSuccess('Game saved successfully!');
      onGameSaved?.(data.saveId);
      
      // Refresh saves list
      if (mode === 'both') {
        loadSavesList();
      }
      
      setTimeout(() => {
        setSuccess(null);
        setSaveName('');
      }, 3000);
    });

    socket.once('save_error', (data) => {
      setSaving(false);
      setError(data.message || 'Failed to save game');
    });
  };

  const handleLoadGame = () => {
    if (!selectedSave) {
      setError('Please select a save to load');
      return;
    }

    setLoading(true);
    setError(null);

    socket.emit('load_game', {
      saveId: selectedSave.id,
      gameId: selectedSave.gameId,
      playerId
    });

    socket.once('game_loaded', (data) => {
      setLoading(false);
      dispatch(setGameState(data.gameState));
      onGameLoaded?.(data.gameState);
      setSuccess('Game loaded successfully!');
      
      setTimeout(() => {
        onClose();
      }, 1000);
    });

    socket.once('load_error', (data) => {
      setLoading(false);
      setError(data.message || 'Failed to load game');
    });
  };

  const handleDeleteSave = (save: SaveGame) => {
    socket.emit('delete_save', {
      saveId: save.id,
      playerId
    });

    socket.once('save_deleted', () => {
      setSaves(saves.filter(s => s.id !== save.id));
      setSuccess('Save deleted successfully');
      if (selectedSave?.id === save.id) {
        setSelectedSave(null);
      }
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getSaveTypeIcon = (saveType: string) => {
    switch (saveType) {
      case 'auto':
        return <AutorenewRounded color="action" />;
      case 'checkpoint':
        return <Bookmark color="primary" />;
      default:
        return <BookmarkBorder />;
    }
  };

  const getDifficultyColor = (difficulty?: string): string => {
    switch (difficulty) {
      case 'easy': return '#4caf50';
      case 'normal': return '#2196f3';
      case 'hard': return '#ff9800';
      case 'insane': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          {mode === 'save' ? <SaveIcon /> : mode === 'load' ? <FolderOpen /> : <CloudUpload />}
          <Typography variant="h5">
            {mode === 'save' ? 'Save Game' : mode === 'load' ? 'Load Game' : 'Save/Load Game'}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent divider>
        {mode === 'both' && (
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
            <Tab icon={<SaveIcon />} label="Save Game" />
            <Tab icon={<FolderOpen />} label="Load Game" />
          </Tabs>
        )}

        {/* Save Game Tab */}
        {(mode === 'save' || (mode === 'both' && tabValue === 0)) && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Save Current Game
            </Typography>
            
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Save Name"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Enter a name for this save"
                    disabled={saving}
                    InputProps={{
                      startAdornment: <SaveIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>
                
                {gameState && (
                  <Grid item xs={12}>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      <Chip
                        icon={<AccessTime />}
                        label={`Turn ${gameState.turn}`}
                        size="small"
                      />
                      <Chip
                        icon={<People />}
                        label={`${Object.keys(gameState.players).length} Players`}
                        size="small"
                      />
                      <Chip
                        icon={<MapIcon />}
                        label={`${gameState.map[0].length}x${gameState.map.length}`}
                        size="small"
                      />
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Paper>

            {saving && <LinearProgress sx={{ mb: 2 }} />}
          </Box>
        )}

        {/* Load Game Tab */}
        {(mode === 'load' || (mode === 'both' && tabValue === 1)) && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Select a Save to Load
            </Typography>

            {loading ? (
              <Box textAlign="center" py={4}>
                <LinearProgress sx={{ mb: 2 }} />
                <Typography color="text.secondary">Loading saves...</Typography>
              </Box>
            ) : saves.length === 0 ? (
              <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
                <FolderOpen sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No saved games found
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Save a game first to see it here
                </Typography>
              </Paper>
            ) : (
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {saves.map((save) => (
                  <React.Fragment key={save.id}>
                    <ListItem
                      button
                      selected={selectedSave?.id === save.id}
                      onClick={() => setSelectedSave(save)}
                      sx={{
                        borderRadius: 1,
                        mb: 1,
                        '&.Mui-selected': {
                          backgroundColor: 'action.selected'
                        }
                      }}
                    >
                      <ListItemIcon>
                        {getSaveTypeIcon(save.saveType)}
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1">
                              {save.saveName}
                            </Typography>
                            {save.saveType === 'auto' && (
                              <Chip label="Auto" size="small" variant="outlined" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {save.gameName} • Turn {save.turnNumber}
                            </Typography>
                            <Box display="flex" gap={1} mt={0.5}>
                              <Chip
                                icon={<SportsEsports />}
                                label={save.gameMode}
                                size="small"
                                variant="outlined"
                              />
                              {save.difficulty && (
                                <Chip
                                  label={save.difficulty}
                                  size="small"
                                  sx={{
                                    backgroundColor: getDifficultyColor(save.difficulty),
                                    color: 'white'
                                  }}
                                />
                              )}
                              <Chip
                                icon={<AccessTime />}
                                label={format(new Date(save.createdAt), 'MMM d, h:mm a')}
                                size="small"
                                variant="outlined"
                              />
                              <Chip
                                label={formatFileSize(save.fileSize)}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        }
                      />
                      
                      <ListItemSecondaryAction>
                        <Tooltip title="Delete save">
                          <IconButton
                            edge="end"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSave(save);
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        )}

        {/* Status Messages */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading || saving}>
          Cancel
        </Button>
        
        {(mode === 'save' || (mode === 'both' && tabValue === 0)) && (
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            onClick={handleSaveGame}
            disabled={saving || !saveName.trim()}
          >
            {saving ? 'Saving...' : 'Save Game'}
          </Button>
        )}
        
        {(mode === 'load' || (mode === 'both' && tabValue === 1)) && (
          <Button
            variant="contained"
            startIcon={<CloudDownload />}
            onClick={handleLoadGame}
            disabled={loading || !selectedSave}
          >
            {loading ? 'Loading...' : 'Load Game'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default SaveLoadGame;
