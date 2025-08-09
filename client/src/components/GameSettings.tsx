import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  Alert
} from '@mui/material';
import {
  Settings,
  VideoSettings,
  Audiotrack,
  Gamepad,
  Notifications,
  Keyboard,
  Save,
  RestoreOutlined
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { updateSettings } from '../store/gameSlice';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface GameSettingsProps {
  open: boolean;
  onClose: () => void;
}

const GameSettings: React.FC<GameSettingsProps> = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.game.settings) || {};
  const [tabValue, setTabValue] = useState(0);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  
  // Local state for settings - using only the properties available in Redux store
  const [localSettings, setLocalSettings] = useState({
    // Graphics
    graphics: settings.graphics || 'medium',
    isFullscreen: settings.isFullscreen || false,
    
    // Audio
    soundEnabled: settings.soundEnabled !== false,
    musicEnabled: settings.musicEnabled !== false,
    
    // Gameplay
    gameSpeed: settings.gameSpeed || 1,
    autoSave: settings.autoSave !== false,
    isPaused: settings.isPaused || false,
    
    // Interface
    darkMode: settings.darkMode || false,
    language: settings.language || 'en',
    
    // Notifications
    notificationsEnabled: settings.notificationsEnabled !== false,
    
    // Extended settings (not in Redux, but used in UI for better experience)
    masterVolume: 100,
    musicVolume: 80,
    sfxVolume: 100,
    voiceVolume: 90,
    difficulty: 'normal',
    autoSaveInterval: 5,
    showTutorials: true,
    confirmActions: true,
    pauseOnFocusLoss: true,
    uiScale: 100,
    showGrid: true,
    showResourceIcons: true,
    showUnitHealth: true,
    showYields: true,
    minimapPosition: 'bottom-right',
    turnNotifications: true,
    combatNotifications: true,
    diplomaticNotifications: true,
    achievementNotifications: true,
    edgePanning: true,
    panSpeed: 5,
    zoomSpeed: 5,
    invertZoom: false,
    keyboardShortcuts: true
  });

  const handleChange = (setting: string, value: any) => {
    setLocalSettings(prev => ({
      ...prev,
      [setting]: value
    }));
    setUnsavedChanges(true);
  };

  const handleSave = () => {
    // Extract only the settings that exist in Redux store
    const reduxSettings = {
      soundEnabled: localSettings.soundEnabled,
      musicEnabled: localSettings.musicEnabled,
      notificationsEnabled: localSettings.notificationsEnabled,
      gameSpeed: localSettings.gameSpeed,
      isPaused: localSettings.isPaused,
      isFullscreen: localSettings.isFullscreen,
      darkMode: localSettings.darkMode,
      graphics: localSettings.graphics,
      autoSave: localSettings.autoSave,
      language: localSettings.language
    };
    dispatch(updateSettings(reduxSettings));
    setUnsavedChanges(false);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings = {
      // Redux store settings
      graphics: 'medium' as 'low' | 'medium' | 'high',
      isFullscreen: false,
      soundEnabled: true,
      musicEnabled: true,
      gameSpeed: 1,
      autoSave: true,
      isPaused: false,
      darkMode: false,
      language: 'en',
      notificationsEnabled: true,
      
      // Extended UI settings
      masterVolume: 100,
      musicVolume: 80,
      sfxVolume: 100,
      voiceVolume: 90,
      difficulty: 'normal',
      autoSaveInterval: 5,
      showTutorials: true,
      confirmActions: true,
      pauseOnFocusLoss: true,
      uiScale: 100,
      showGrid: true,
      showResourceIcons: true,
      showUnitHealth: true,
      showYields: true,
      minimapPosition: 'bottom-right',
      turnNotifications: true,
      combatNotifications: true,
      diplomaticNotifications: true,
      achievementNotifications: true,
      edgePanning: true,
      panSpeed: 5,
      zoomSpeed: 5,
      invertZoom: false,
      keyboardShortcuts: true
    };
    setLocalSettings(defaultSettings);
    setUnsavedChanges(true);
  };

  const applyGraphicsPreset = (preset: 'low' | 'medium' | 'high') => {
    setLocalSettings(prev => ({
      ...prev,
      graphics: preset
    }));
    setUnsavedChanges(true);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Settings />
          <Typography variant="h5">Game Settings</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {unsavedChanges && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You have unsaved changes. Click Save to apply them.
          </Alert>
        )}

        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab icon={<VideoSettings />} label="Graphics" />
          <Tab icon={<Audiotrack />} label="Audio" />
          <Tab icon={<Gamepad />} label="Gameplay" />
          <Tab icon={<Settings />} label="Interface" />
          <Tab icon={<Notifications />} label="Notifications" />
          <Tab icon={<Keyboard />} label="Controls" />
        </Tabs>

        {/* Graphics Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Graphics Quality Preset</InputLabel>
                <Select
                  value={localSettings.graphics}
                  onChange={(e) => applyGraphicsPreset(e.target.value as 'low' | 'medium' | 'high')}
                  label="Graphics Quality Preset"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>


            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Display Options</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.isFullscreen}
                          onChange={(e) => handleChange('isFullscreen', e.target.checked)}
                        />
                      }
                      label="Fullscreen"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Audio Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.soundEnabled}
                    onChange={(e) => handleChange('soundEnabled', e.target.checked)}
                  />
                }
                label="Enable Sound"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.musicEnabled}
                    onChange={(e) => handleChange('musicEnabled', e.target.checked)}
                  />
                }
                label="Enable Music"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography gutterBottom>Master Volume: {localSettings.masterVolume}%</Typography>
              <Slider
                value={localSettings.masterVolume}
                onChange={(_, v) => handleChange('masterVolume', v)}
                disabled={!localSettings.soundEnabled}
                min={0}
                max={100}
                marks
                step={10}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography gutterBottom>Music Volume: {localSettings.musicVolume}%</Typography>
              <Slider
                value={localSettings.musicVolume}
                onChange={(_, v) => handleChange('musicVolume', v)}
                disabled={!localSettings.soundEnabled}
                min={0}
                max={100}
                marks
                step={10}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography gutterBottom>Sound Effects: {localSettings.sfxVolume}%</Typography>
              <Slider
                value={localSettings.sfxVolume}
                onChange={(_, v) => handleChange('sfxVolume', v)}
                disabled={!localSettings.soundEnabled}
                min={0}
                max={100}
                marks
                step={10}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography gutterBottom>Voice Volume: {localSettings.voiceVolume}%</Typography>
              <Slider
                value={localSettings.voiceVolume}
                onChange={(_, v) => handleChange('voiceVolume', v)}
                disabled={!localSettings.soundEnabled}
                min={0}
                max={100}
                marks
                step={10}
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Gameplay Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={localSettings.difficulty}
                  onChange={(e) => handleChange('difficulty', e.target.value)}
                  label="Difficulty"
                >
                  <MenuItem value="easy">Easy</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="hard">Hard</MenuItem>
                  <MenuItem value="insane">Insane</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography gutterBottom>Game Speed: {localSettings.gameSpeed}x</Typography>
              <Slider
                value={localSettings.gameSpeed}
                onChange={(_, v) => handleChange('gameSpeed', v)}
                min={0.5}
                max={3}
                step={0.5}
                marks={[
                  { value: 0.5, label: '0.5x' },
                  { value: 1, label: '1x' },
                  { value: 2, label: '2x' },
                  { value: 3, label: '3x' }
                ]}
              />
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Gameplay Options</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.autoSave}
                          onChange={(e) => handleChange('autoSave', e.target.checked)}
                        />
                      }
                      label="Auto-Save"
                    />
                  </Grid>
                  {localSettings.autoSave && (
                    <Grid item xs={12}>
                      <Typography gutterBottom>Auto-Save Interval: {localSettings.autoSaveInterval} minutes</Typography>
                      <Slider
                        value={localSettings.autoSaveInterval}
                        onChange={(_, v) => handleChange('autoSaveInterval', v)}
                        min={1}
                        max={30}
                        marks
                        step={1}
                      />
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.showTutorials}
                          onChange={(e) => handleChange('showTutorials', e.target.checked)}
                        />
                      }
                      label="Show Tutorials"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.confirmActions}
                          onChange={(e) => handleChange('confirmActions', e.target.checked)}
                        />
                      }
                      label="Confirm Important Actions"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.pauseOnFocusLoss}
                          onChange={(e) => handleChange('pauseOnFocusLoss', e.target.checked)}
                        />
                      }
                      label="Pause When Window Loses Focus"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Interface Tab */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom>UI Scale: {localSettings.uiScale}%</Typography>
              <Slider
                value={localSettings.uiScale}
                onChange={(_, v) => handleChange('uiScale', v)}
                min={75}
                max={150}
                step={5}
                marks={[
                  { value: 75, label: '75%' },
                  { value: 100, label: '100%' },
                  { value: 125, label: '125%' },
                  { value: 150, label: '150%' }
                ]}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Minimap Position</InputLabel>
                <Select
                  value={localSettings.minimapPosition}
                  onChange={(e) => handleChange('minimapPosition', e.target.value)}
                  label="Minimap Position"
                >
                  <MenuItem value="top-left">Top Left</MenuItem>
                  <MenuItem value="top-right">Top Right</MenuItem>
                  <MenuItem value="bottom-left">Bottom Left</MenuItem>
                  <MenuItem value="bottom-right">Bottom Right</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Display Options</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.showGrid}
                          onChange={(e) => handleChange('showGrid', e.target.checked)}
                        />
                      }
                      label="Show Grid"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.showResourceIcons}
                          onChange={(e) => handleChange('showResourceIcons', e.target.checked)}
                        />
                      }
                      label="Show Resource Icons"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.showUnitHealth}
                          onChange={(e) => handleChange('showUnitHealth', e.target.checked)}
                        />
                      }
                      label="Show Unit Health"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.showYields}
                          onChange={(e) => handleChange('showYields', e.target.checked)}
                        />
                      }
                      label="Show Tile Yields"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Language</InputLabel>
                <Select
                  value={localSettings.language}
                  onChange={(e) => handleChange('language', e.target.value)}
                  label="Language"
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="es">Español</MenuItem>
                  <MenuItem value="fr">Français</MenuItem>
                  <MenuItem value="de">Deutsch</MenuItem>
                  <MenuItem value="ja">日本語</MenuItem>
                  <MenuItem value="zh">中文</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Notifications Tab */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.notificationsEnabled}
                    onChange={(e) => handleChange('notificationsEnabled', e.target.checked)}
                  />
                }
                label="Enable All Notifications"
              />
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Notification Types</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.turnNotifications}
                          onChange={(e) => handleChange('turnNotifications', e.target.checked)}
                          disabled={!localSettings.notificationsEnabled}



                        />
                      }
                      label="Turn Notifications"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.combatNotifications}
                          onChange={(e) => handleChange('combatNotifications', e.target.checked)}
                          disabled={!localSettings.notificationsEnabled}

                        />
                      }
                      label="Combat Notifications"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.diplomaticNotifications}
                          onChange={(e) => handleChange('diplomaticNotifications', e.target.checked)}
                          disabled={!localSettings.notificationsEnabled}
                        />
                      }
                      label="Diplomatic Notifications"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.achievementNotifications}
                          onChange={(e) => handleChange('achievementNotifications', e.target.checked)}
                          disabled={!localSettings.notificationsEnabled}
                        />
                      }
                      label="Achievement Notifications"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Controls Tab */}
        <TabPanel value={tabValue} index={5}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.keyboardShortcuts}
                    onChange={(e) => handleChange('keyboardShortcuts', e.target.checked)}
                  />
                }
                label="Enable Keyboard Shortcuts"
              />
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Camera Controls</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.edgePanning}
                          onChange={(e) => handleChange('edgePanning', e.target.checked)}
                        />
                      }
                      label="Edge Panning"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography gutterBottom>Pan Speed: {localSettings.panSpeed}</Typography>
                    <Slider
                      value={localSettings.panSpeed}
                      onChange={(_, v) => handleChange('panSpeed', v)}
                      min={1}
                      max={10}
                      marks
                      step={1}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography gutterBottom>Zoom Speed: {localSettings.zoomSpeed}</Typography>
                    <Slider
                      value={localSettings.zoomSpeed}
                      onChange={(_, v) => handleChange('zoomSpeed', v)}
                      min={1}
                      max={10}
                      marks
                      step={1}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings.invertZoom}
                          onChange={(e) => handleChange('invertZoom', e.target.checked)}
                        />
                      }
                      label="Invert Zoom Direction"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {localSettings.keyboardShortcuts && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Keyboard Shortcuts</Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Next Unit" secondary="Space" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="End Turn" secondary="Enter" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Toggle Grid" secondary="G" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Toggle Yields" secondary="Y" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Quick Save" secondary="F5" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Quick Load" secondary="F9" />
                    </ListItem>
                  </List>
                </Paper>
              </Grid>
            )}
          </Grid>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleReset} startIcon={<RestoreOutlined />}>
          Reset to Defaults
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          variant="contained" 
          onClick={handleSave}
          startIcon={<Save />}
          disabled={!unsavedChanges}
        >
          Save Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GameSettings;
