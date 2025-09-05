import React, { useState, Suspense } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tabs,
  Tab,
  Paper,
  Chip,
  Button,
  CircularProgress
} from '@mui/material';
import {
  People as PeopleIcon,
  LocationCity as CityIcon,
  Science as ScienceIcon,
  Close as CloseIcon,
  AccountTree as TechTreeIcon
} from '@mui/icons-material';

// Lazy load the TechnologyTreeModal to maintain bundle optimization
const TechnologyTreeModal = React.lazy(() => import('./TechnologyTree/TechnologyTreeModal'));
import { RootState } from '../store/store';
import { toggleSidebar, setCurrentPanel } from '../store/uiSlice';
import DiplomacyPanel from './DiplomacyPanel';

interface GameSidebarProps {
  open: boolean
}

const GameSidebar: React.FC<GameSidebarProps> = ({ open }) => {
  const dispatch = useDispatch();
  const { gameState } = useSelector((state: RootState) => state.game);
  const { currentPanel } = useSelector((state: RootState) => state.ui);
  const { user } = useSelector((state: RootState) => state.auth);
  const [technologyTreeOpen, setTechnologyTreeOpen] = useState(false);

  const handleClose = () => {
    dispatch(toggleSidebar());
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    dispatch(setCurrentPanel(newValue as any));
  };

  const currentPlayer = gameState?.players.find(p => p.id === user?.id);

  return (
    <Box
      className={`game-sidebar ${open ? 'open' : ''}`}
      sx={{
        width: { xs: '100%', md: 350 },
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <Box sx={{
        p: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
          Game Info
        </Typography>
        <Button
          onClick={handleClose}
          sx={{ color: 'white', minWidth: 'auto', p: 1 }}
        >
          <CloseIcon />
        </Button>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={currentPanel}
          onChange={handleTabChange}
          textColor="inherit"
          indicatorColor="primary"
          variant="fullWidth"
        >
          <Tab
            label="Players"
            value="units"
            icon={<PeopleIcon />}
            sx={{ color: 'white' }}
          />
          <Tab
            label="Cities"
            value="cities"
            icon={<CityIcon />}
            sx={{ color: 'white' }}
          />
          <Tab
            label="Tech"
            value="tech"
            icon={<ScienceIcon />}
            sx={{ color: 'white' }}
          />
          <Tab
            label="Diplomacy"
            value="diplomacy"
            icon={<PeopleIcon />}
            sx={{ color: 'white' }}
          />
        </Tabs>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {currentPanel === 'units' && (
          <Box>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
              Players ({gameState?.players.length})
            </Typography>
            <List>
              {gameState?.players.map((player) => (
                <ListItem
                  key={player.id}
                  sx={{
                    bgcolor: player.id === user?.id ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <ListItemIcon>
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        backgroundColor: player.color
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography sx={{ color: 'white', fontWeight: 'bold' }}>
                        {player.name} {player.id === user?.id && '(You)'}
                      </Typography>
                    }
                    secondary={
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        {player.civilization} - Score: {player.score}
                      </Typography>
                    }
                  />
                  {player.id === gameState.currentPlayer && (
                    <Chip
                      label="Current"
                      size="small"
                      color="success"
                    />
                  )}
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {currentPanel === 'cities' && (
          <Box>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
              Your Cities
            </Typography>
            {gameState?.cities && Object.entries(gameState.cities)
              .filter(([_, city]) => city.playerId === user?.id)
              .map(([cityId, city]) => (
                <Paper key={cityId} sx={{ p: 2, mb: 2, bgcolor: 'rgba(255, 255, 255, 0.1)' }}>
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {city.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Population: {city.population}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Buildings: {city.buildings?.length || 0}
                  </Typography>
                  {city.production && (
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Producing: {city.production.type}
                    </Typography>
                  )}
                </Paper>
              ))}
            {(!gameState?.cities || Object.entries(gameState.cities).filter(([_, city]) => city.playerId === user?.id).length === 0) && (
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' }}>
                No cities yet. Found a city with a settler!
              </Typography>
            )}
          </Box>
        )}

        {currentPanel === 'tech' && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: 'white' }}>
                Technologies
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<TechTreeIcon />}
                onClick={() => setTechnologyTreeOpen(true)}
                sx={{
                  bgcolor: 'rgba(33, 150, 243, 0.8)',
                  '&:hover': { bgcolor: 'rgba(33, 150, 243, 1)' }
                }}
              >
                Tech Tree
              </Button>
            </Box>
            {currentPlayer && (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                    Science: {currentPlayer.resources?.science || 0} points
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                    Researched: {currentPlayer.technologies?.length || 0} technologies
                  </Typography>
                  {currentPlayer.currentResearch && (
                    <Paper sx={{ p: 1, bgcolor: 'rgba(255, 152, 0, 0.2)', border: '1px solid rgba(255, 152, 0, 0.5)' }}>
                      <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
                        Currently researching:
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                        {currentPlayer.currentResearch.techId?.replace('_', ' ')}
                      </Typography>
                    </Paper>
                  )}
                </Box>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                  Completed Technologies:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 200, overflow: 'auto' }}>
                  {currentPlayer.technologies?.map((tech) => (
                    <Chip
                      key={tech.techId}
                      label={tech.techId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(76, 175, 80, 0.3)',
                        color: 'white',
                        border: '1px solid rgba(76, 175, 80, 0.5)'
                      }}
                    />
                  ))}
                </Box>
                {(!currentPlayer.technologies || currentPlayer.technologies.length === 0) && (
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', py: 2 }}>
                    No technologies researched yet. Click "Tech Tree" to start researching!
                  </Typography>
                )}
              </>
            )}
          </Box>
        )}

        {currentPanel === 'diplomacy' && (
          <DiplomacyPanel />
        )}
      </Box>
      
      {/* Technology Tree Modal */}
      <Suspense fallback={<CircularProgress />}>
        <TechnologyTreeModal
          open={technologyTreeOpen}
          onClose={() => setTechnologyTreeOpen(false)}
        />
      </Suspense>
    </Box>
  );
};

export default GameSidebar;
