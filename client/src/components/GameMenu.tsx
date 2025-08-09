import React, { useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  IconButton,
  Badge,
  Typography,
  Box,
  Avatar,
  Chip,
  Tooltip,
  Switch,
  FormControlLabel,
  Collapse,
  Paper,
  useTheme,
  alpha
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close,
  Save,
  FolderOpen,
  Settings,
  Help,
  ExitToApp,
  Pause,
  PlayArrow,
  VolumeUp,
  VolumeOff,
  Fullscreen,
  FullscreenExit,
  Timeline,
  EmojiEvents,
  Group,
  BugReport,
  School,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Brightness4,
  Brightness7,
  Security,
  CloudSync
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { 
  togglePause, 
  setGameSpeed,
  toggleSound,
  toggleFullscreen,
  toggleDarkMode 
} from '../store/gameSlice';
import SaveLoadGame from './SaveLoadGame';
import GameSettings from './GameSettings';
import GameHelp from './GameHelp';
import GameStats from './GameStats';

interface GameMenuProps {
  onExitGame?: () => void;
  onShowTutorial?: () => void;
}

const GameMenu: React.FC<GameMenuProps> = ({ onExitGame, onShowTutorial }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const gameState = useSelector((state: RootState) => state.game.gameState);
  const settings = useSelector((state: RootState) => state.game.settings);
  const currentPlayer = useSelector((state: RootState) => state.game.currentPlayer);
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saveLoadOpen, setSaveLoadOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [notifications] = useState(3); // Example notification count

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleToggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleSaveLoad = (_mode: 'save' | 'load') => {
    setSaveLoadOpen(true);
    setDrawerOpen(false);
  };

  const handleExitGame = () => {
    if (onExitGame) {
      if (window.confirm('Are you sure you want to exit? Any unsaved progress will be lost.')) {
        onExitGame();
      }
    }
    setDrawerOpen(false);
  };

  const gameSpeedOptions = [
    { value: 0.5, label: 'Slow', icon: '🐢' },
    { value: 1, label: 'Normal', icon: '⏱️' },
    { value: 2, label: 'Fast', icon: '⚡' },
    { value: 3, label: 'Very Fast', icon: '🚀' }
  ];

  return (
    <>
      {/* Menu Toggle Button */}
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 1300
        }}
      >
        <Tooltip title="Game Menu" placement="right">
          <IconButton
            onClick={handleToggleDrawer}
            sx={{
              backgroundColor: alpha(theme.palette.background.paper, 0.9),
              backdropFilter: 'blur(10px)',
              '&:hover': {
                backgroundColor: theme.palette.background.paper,
                transform: 'scale(1.1)'
              },
              transition: 'all 0.3s ease',
              boxShadow: theme.shadows[3]
            }}
          >
            <Badge badgeContent={notifications} color="error">
              <MenuIcon />
            </Badge>
          </IconButton>
        </Tooltip>
      </Box>

      {/* Main Menu Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={handleToggleDrawer}
        PaperProps={{
          sx: {
            width: 320,
            backgroundColor: alpha(theme.palette.background.paper, 0.98),
            backdropFilter: 'blur(20px)'
          }
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
            color: 'white',
            position: 'relative'
          }}
        >
          <IconButton
            onClick={handleToggleDrawer}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'white'
            }}
          >
            <Close />
          </IconButton>
          
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                backgroundColor: theme.palette.secondary.main,
                fontSize: '1.5rem'
              }}
            >
              {currentPlayer?.charAt(0) || 'P'}
            </Avatar>
            <Box>
              <Typography variant="h6">{currentPlayer || 'Player'}</Typography>
              <Box display="flex" gap={0.5}>
                <Chip
                  size="small"
                  label={`Turn ${gameState?.turn || 0}`}
                  sx={{ 
                    backgroundColor: alpha(theme.palette.common.white, 0.2),
                    color: 'white'
                  }}
                />
                <Chip
                  size="small"
                  icon={<EmojiEvents sx={{ fontSize: 16 }} />}
                  label={gameState?.players?.find(p => p.id === currentPlayer)?.score || 0}
                  sx={{ 
                    backgroundColor: alpha(theme.palette.common.white, 0.2),
                    color: 'white'
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>

        <List sx={{ flex: 1, py: 0 }}>
          {/* Game Controls Section */}
          <ListItem>
            <ListItemButton onClick={() => toggleSection('controls')}>
              <ListItemIcon>
                <Settings color="primary" />
              </ListItemIcon>
              <ListItemText primary="Game Controls" />
              {expandedSections.includes('controls') ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </ListItemButton>
          </ListItem>
          
          <Collapse in={expandedSections.includes('controls')} timeout="auto" unmountOnExit>
            <Paper sx={{ mx: 2, mb: 1, p: 2, backgroundColor: alpha(theme.palette.background.default, 0.5) }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.isPaused || false}
                    onChange={() => dispatch(togglePause())}
                    color="primary"
                  />
                }
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    {settings?.isPaused ? <Pause /> : <PlayArrow />}
                    {settings?.isPaused ? 'Paused' : 'Playing'}
                  </Box>
                }
              />
              
              <Box mt={2}>
                <Typography variant="body2" gutterBottom>Game Speed</Typography>
                <Box display="flex" gap={1}>
                  {gameSpeedOptions.map(option => (
                    <Chip
                      key={option.value}
                      label={`${option.icon} ${option.label}`}
                      onClick={() => dispatch(setGameSpeed(option.value))}
                      color={settings?.gameSpeed === option.value ? 'primary' : 'default'}
                      variant={settings?.gameSpeed === option.value ? 'filled' : 'outlined'}
                      size="small"
                    />
                  ))}
                </Box>
              </Box>

              <Box mt={2} display="flex" gap={1}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.soundEnabled ?? true}
                      onChange={() => dispatch(toggleSound())}
                      size="small"
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {settings?.soundEnabled ? <VolumeUp fontSize="small" /> : <VolumeOff fontSize="small" />}
                      <Typography variant="body2">Sound</Typography>
                    </Box>
                  }
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.isFullscreen || false}
                      onChange={() => dispatch(toggleFullscreen())}
                      size="small"
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {settings?.isFullscreen ? <FullscreenExit fontSize="small" /> : <Fullscreen fontSize="small" />}
                      <Typography variant="body2">Fullscreen</Typography>
                    </Box>
                  }
                />
              </Box>
            </Paper>
          </Collapse>

          <Divider />

          {/* Save/Load */}
          <ListItem>
            <ListItemButton onClick={() => handleSaveLoad('save')}>
              <ListItemIcon>
                <Save color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Save Game" 
                secondary="Save your current progress"
              />
            </ListItemButton>
          </ListItem>

          <ListItem>
            <ListItemButton onClick={() => handleSaveLoad('load')}>
              <ListItemIcon>
                <FolderOpen color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="Load Game" 
                secondary="Load a previous save"
              />
            </ListItemButton>
          </ListItem>

          <Divider />

          {/* Game Information */}
          <ListItem>
            <ListItemButton onClick={() => setStatsOpen(true)}>
              <ListItemIcon>
                <Timeline color="secondary" />
              </ListItemIcon>
              <ListItemText 
                primary="Statistics" 
                secondary="View game statistics"
              />
            </ListItemButton>
          </ListItem>

          <ListItem>
            <ListItemButton onClick={() => toggleSection('players')}>
              <ListItemIcon>
                <Group color="secondary" />
              </ListItemIcon>
              <ListItemText primary="Players" />
              <Chip size="small" label={gameState?.players?.length || 0} />
            </ListItemButton>
          </ListItem>

          <Collapse in={expandedSections.includes('players')} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {gameState?.players?.map((p: any) => (
                <ListItem key={p.id} sx={{ pl: 4 }}>
                  <ListItemIcon>
                    <Avatar 
                      sx={{ 
                        width: 24, 
                        height: 24,
                        backgroundColor: p.color,
                        fontSize: '0.75rem'
                      }}
                    >
                      {p.name?.charAt(0)}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText 
                    primary={p.name}
                    secondary={`Score: ${p.score || 0}`}
                  />
                  {p.id === gameState?.currentPlayer && (
                    <Chip size="small" label="Current" color="primary" />
                  )}
                </ListItem>
              ))}
            </List>
          </Collapse>

          <Divider />

          {/* Settings & Help */}
          <ListItem>
            <ListItemButton onClick={() => setSettingsOpen(true)}>
              <ListItemIcon>
                <Settings />
              </ListItemIcon>
              <ListItemText 
                primary="Settings" 
                secondary="Configure game options"
              />
            </ListItemButton>
          </ListItem>

          <ListItem>
            <ListItemButton onClick={() => setHelpOpen(true)}>
              <ListItemIcon>
                <Help />
              </ListItemIcon>
              <ListItemText 
                primary="Help & Tutorial" 
                secondary="Learn how to play"
              />
            </ListItemButton>
          </ListItem>

          <ListItem>
            <ListItemButton onClick={onShowTutorial}>
              <ListItemIcon>
                <School />
              </ListItemIcon>
              <ListItemText 
                primary="Interactive Tutorial" 
                secondary="Guided walkthrough"
              />
            </ListItemButton>
          </ListItem>

          <Divider />

          {/* System */}
          <ListItem>
            <ListItemButton onClick={() => dispatch(toggleDarkMode())}>
              <ListItemIcon>
                {theme.palette.mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
              </ListItemIcon>
              <ListItemText 
                primary="Theme" 
                secondary={`${theme.palette.mode === 'dark' ? 'Dark' : 'Light'} Mode`}
              />
            </ListItemButton>
          </ListItem>

          <ListItem>
            <ListItemButton onClick={handleExitGame}>
              <ListItemIcon>
                <ExitToApp color="error" />
              </ListItemIcon>
              <ListItemText 
                primary="Exit Game" 
                secondary="Return to main menu"
              />
            </ListItemButton>
          </ListItem>
        </List>

        {/* Footer */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
            Civilization Game v1.0.0
          </Typography>
          <Box display="flex" justifyContent="center" gap={1} mt={1}>
            <IconButton size="small">
              <CloudSync fontSize="small" />
            </IconButton>
            <IconButton size="small">
              <Security fontSize="small" />
            </IconButton>
            <IconButton size="small">
              <BugReport fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Drawer>

      {/* Dialogs */}
      <SaveLoadGame
        open={saveLoadOpen}
        onClose={() => setSaveLoadOpen(false)}
        mode="both"
        currentGameId={gameState?.id}
      />

      {settingsOpen && (
        <GameSettings
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {helpOpen && (
        <GameHelp
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
        />
      )}

      {statsOpen && (
        <GameStats
          open={statsOpen}
          onClose={() => setStatsOpen(false)}
        />
      )}
    </>
  );
};

export default GameMenu;
