import React, { useState, useCallback } from 'react';
import {
  Box,
  IconButton,
  Fab,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Typography,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  TouchApp,
  PanTool,
  Visibility,
  VisibilityOff,
  Settings,
  Info,
  Fullscreen,
  FullscreenExit,
  VolumeUp,
  VolumeOff,
  Save,
  Refresh
} from '@mui/icons-material';

export interface MobileFriendlyControlsProps {
  interactionMode: 'pan' | 'select';
  onModeChange: (mode: 'pan' | 'select') => void;
  showGrid: boolean;
  onGridToggle: () => void;
  onSave?: () => void;
  onRefresh?: () => void;
  onSettings?: () => void;
  onInfo?: () => void;
  gameStats?: {
    turn: number;
    resources: Record<string, number>;
    selectedUnit?: string;
  };
}

/**
 * Mobile-friendly controls with collapsible menu system
 */
const MobileFriendlyControls: React.FC<MobileFriendlyControlsProps> = ({
  interactionMode,
  onModeChange,
  showGrid,
  onGridToggle,
  onSave,
  onRefresh,
  onSettings,
  onInfo,
  gameStats
}) => {
  const theme = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleFullscreenToggle = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        // Fallback for iOS Safari
        if ((document.documentElement as any).webkitRequestFullscreen) {
          (document.documentElement as any).webkitRequestFullscreen();
          setIsFullscreen(true);
        }
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {
        // Fallback for iOS Safari
        if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
          setIsFullscreen(false);
        }
      });
    }
  }, []);

  // Quick action buttons that are always visible
  const renderQuickActions = () => (
    <Box
      sx={{
        position: 'fixed',
        bottom: theme.spacing(2),
        left: theme.spacing(2),
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        zIndex: 1200
      }}
    >
      {/* Mode Toggle - Most frequently used */}
      <Fab
        size="medium"
        color={interactionMode === 'pan' ? 'primary' : 'secondary'}
        onClick={() => onModeChange(interactionMode === 'pan' ? 'select' : 'pan')}
        sx={{
          backgroundColor: interactionMode === 'pan' 
            ? theme.palette.primary.main 
            : theme.palette.secondary.main,
          '&:hover': {
            backgroundColor: interactionMode === 'pan'
              ? theme.palette.primary.dark
              : theme.palette.secondary.dark,
          }
        }}
      >
        {interactionMode === 'pan' ? <PanTool /> : <TouchApp />}
      </Fab>

      {/* Menu Toggle */}
      <Fab
        size="medium"
        onClick={() => setIsMenuOpen(true)}
        sx={{
          backgroundColor: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: 'blur(10px)',
          '&:hover': {
            backgroundColor: alpha(theme.palette.background.paper, 1),
          }
        }}
      >
        <MenuIcon />
      </Fab>
    </Box>
  );

  // Status bar with game info
  const renderStatusBar = () => (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 48,
        backgroundColor: alpha(theme.palette.background.paper, 0.95),
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        zIndex: 1100
      }}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="body2" fontWeight="bold">
          Turn {gameStats?.turn || 1}
        </Typography>
        {gameStats?.selectedUnit && (
          <Chip 
            label={gameStats.selectedUnit} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
        )}
      </Box>

      <Box display="flex" alignItems="center" gap={1}>
        {gameStats?.resources && Object.entries(gameStats.resources).map(([type, amount]) => (
          <Chip
            key={type}
            label={`${type}: ${amount}`}
            size="small"
            variant="outlined"
          />
        ))}
      </Box>
    </Box>
  );

  // Main menu drawer
  const renderMenuDrawer = () => (
    <Drawer
      anchor="right"
      open={isMenuOpen}
      onClose={() => setIsMenuOpen(false)}
      PaperProps={{
        sx: {
          width: 300,
          backgroundColor: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(20px)',
        }
      }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Game Controls</Typography>
        <IconButton onClick={() => setIsMenuOpen(false)}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />

      <List>
        {/* View Controls */}
        <ListItem>
          <ListItemText 
            primary="View Controls" 
            primaryTypographyProps={{ variant: 'subtitle2', color: 'primary' }}
          />
        </ListItem>

        <ListItem button onClick={onGridToggle}>
          <ListItemIcon>
            {showGrid ? <Visibility /> : <VisibilityOff />}
          </ListItemIcon>
          <ListItemText primary={`${showGrid ? 'Hide' : 'Show'} Grid`} />
        </ListItem>

        <ListItem button onClick={handleFullscreenToggle}>
          <ListItemIcon>
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </ListItemIcon>
          <ListItemText primary={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'} />
        </ListItem>

        <Divider />

        {/* Game Actions */}
        <ListItem>
          <ListItemText 
            primary="Game Actions" 
            primaryTypographyProps={{ variant: 'subtitle2', color: 'primary' }}
          />
        </ListItem>

        {onSave && (
          <ListItem button onClick={onSave}>
            <ListItemIcon><Save /></ListItemIcon>
            <ListItemText primary="Save Game" />
          </ListItem>
        )}

        {onRefresh && (
          <ListItem button onClick={onRefresh}>
            <ListItemIcon><Refresh /></ListItemIcon>
            <ListItemText primary="Refresh" />
          </ListItem>
        )}

        <Divider />

        {/* System Controls */}
        <ListItem>
          <ListItemText 
            primary="System" 
            primaryTypographyProps={{ variant: 'subtitle2', color: 'primary' }}
          />
        </ListItem>

        <ListItem button onClick={() => setSoundEnabled(!soundEnabled)}>
          <ListItemIcon>
            {soundEnabled ? <VolumeUp /> : <VolumeOff />}
          </ListItemIcon>
          <ListItemText primary={`${soundEnabled ? 'Disable' : 'Enable'} Sound`} />
        </ListItem>

        {onSettings && (
          <ListItem button onClick={onSettings}>
            <ListItemIcon><Settings /></ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItem>
        )}

        {onInfo && (
          <ListItem button onClick={onInfo}>
            <ListItemIcon><Info /></ListItemIcon>
            <ListItemText primary="Help" />
          </ListItem>
        )}
      </List>
    </Drawer>
  );

  return (
    <>
      {renderStatusBar()}
      {renderQuickActions()}
      {renderMenuDrawer()}
    </>
  );
};

export default MobileFriendlyControls;