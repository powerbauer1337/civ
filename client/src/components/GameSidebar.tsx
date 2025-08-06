import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Tabs,
  Tab,
  Paper,
  Chip,
  Button
} from '@mui/material'
import {
  People as PeopleIcon,
  LocationCity as CityIcon,
  Group as GroupIcon,
  Science as ScienceIcon,
  Close as CloseIcon
} from '@mui/icons-material'
import { RootState } from '../store/store'
import { toggleSidebar, setCurrentPanel } from '../store/uiSlice'

interface GameSidebarProps {
  open: boolean
}

const GameSidebar: React.FC<GameSidebarProps> = ({ open }) => {
  const dispatch = useDispatch()
  const { gameState } = useSelector((state: RootState) => state.game)
  const { currentPanel } = useSelector((state: RootState) => state.ui)
  const { user } = useSelector((state: RootState) => state.auth)

  const handleClose = () => {
    dispatch(toggleSidebar())
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    dispatch(setCurrentPanel(newValue as any))
  }

  const currentPlayer = gameState?.players.find(p => p.id === user?.id)

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
              {gameState?.players.map((player, index) => (
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
                  {index === gameState.currentPlayer && (
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
            {gameState?.cities && Array.from(gameState.cities.entries())
              .filter(([_, city]) => city.ownerId === user?.id)
              .map(([cityId, city]) => (
                <Paper key={cityId} sx={{ p: 2, mb: 2, bgcolor: 'rgba(255, 255, 255, 0.1)' }}>
                  <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {city.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Population: {city.population}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    Buildings: {city.buildings.size}
                  </Typography>
                  {city.currentProduction && (
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      Producing: {city.currentProduction}
                    </Typography>
                  )}
                </Paper>
              ))}
            {(!gameState?.cities || Array.from(gameState.cities.entries()).filter(([_, city]) => city.ownerId === user?.id).length === 0) && (
              <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' }}>
                No cities yet. Found a city with a settler!
              </Typography>
            )}
          </Box>
        )}

        {currentPanel === 'tech' && (
          <Box>
            <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
              Technologies
            </Typography>
            {currentPlayer && (
              <>
                <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
                  Researched: {currentPlayer.technologies.size} technologies
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Array.from(currentPlayer.technologies).map((tech) => (
                    <Chip
                      key={tech}
                      label={tech.replace('_', ' ')}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(33, 150, 243, 0.3)',
                        color: 'white'
                      }}
                    />
                  ))}
                </Box>
                {currentPlayer.technologies.size === 0 && (
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center' }}>
                    No technologies researched yet.
                  </Typography>
                )}
              </>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default GameSidebar