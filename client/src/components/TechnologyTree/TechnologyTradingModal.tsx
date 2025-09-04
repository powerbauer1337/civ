import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Tabs,
  Tab,
  Avatar,
  IconButton,
  Alert,
  Badge
} from '@mui/material';
import {
  Close as CloseIcon,
  Science as ScienceIcon,
  Send as SendIcon,
  SwapHoriz as TradeIcon,
  CheckCircle as AcceptIcon,
  Cancel as RejectIcon,
  Handshake as CollaborateIcon
} from '@mui/icons-material';
import { RootState } from '../../store/store';
import { TECHNOLOGY_DATABASE, Technology } from '@civ-game/shared';

interface TechnologyTradingModalProps {
  open: boolean;
  onClose: () => void;
}

interface TradeOffer {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  offeredTechs: string[];
  requestedTechs: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  message?: string;
  expiresAt: Date;
}

interface CollaborationProject {
  id: string;
  techId: string;
  participants: string[];
  contributions: Record<string, number>;
  totalRequired: number;
  status: 'active' | 'completed' | 'abandoned';
}

const TechnologyTradingModal: React.FC<TechnologyTradingModalProps> = ({ open, onClose }) => {
  const { gameState } = useSelector((state: RootState) => state.game);
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [offeredTechs, setOfferedTechs] = useState<string[]>([]);
  const [requestedTechs, setRequestedTechs] = useState<string[]>([]);
  const [tradeMessage, setTradeMessage] = useState('');
  
  // Mock data - in real implementation, this would come from game state
  const [tradeOffers] = useState<TradeOffer[]>([
    {
      id: 'trade_1',
      fromPlayerId: 'player_2',
      toPlayerId: user?.id || '',
      offeredTechs: ['iron_working'],
      requestedTechs: ['mathematics'],
      status: 'pending',
      message: 'Let\'s trade! I need mathematics for my empire\'s development.',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  ]);
  
  const [collaborationProjects] = useState<CollaborationProject[]>([
    {
      id: 'collab_1',
      techId: 'philosophy',
      participants: [user?.id || '', 'player_2'],
      contributions: { [user?.id || '']: 45, 'player_2': 30 },
      totalRequired: 200,
      status: 'active'
    }
  ]);

  const currentPlayer = gameState?.players.find(p => p.id === user?.id);
  const otherPlayers = gameState?.players.filter(p => p.id !== user?.id) || [];
  const researchedTechs = currentPlayer?.technologies?.map(t => t.techId) || [];

  // Get technologies available for trading (researched but not by target player)
  const getAvailableTechnologies = (forPlayer?: string): Technology[] => {
    if (!forPlayer) return [];
    
    const targetPlayer = gameState?.players.find(p => p.id === forPlayer);
    const targetResearched = targetPlayer?.technologies?.map(t => t.techId) || [];
    
    return Object.values(TECHNOLOGY_DATABASE).filter(tech => 
      researchedTechs.includes(tech.id) && !targetResearched.includes(tech.id)
    );
  };

  // Get technologies the current player can request
  const getRequestableTechnologies = (fromPlayer?: string): Technology[] => {
    if (!fromPlayer) return [];
    
    const sourcePlayer = gameState?.players.find(p => p.id === fromPlayer);
    const sourceResearched = sourcePlayer?.technologies?.map(t => t.techId) || [];
    
    return Object.values(TECHNOLOGY_DATABASE).filter(tech => 
      sourceResearched.includes(tech.id) && !researchedTechs.includes(tech.id)
    );
  };

  const handleCreateTrade = () => {
    if (!selectedPlayer || offeredTechs.length === 0 || requestedTechs.length === 0) return;
    
    const tradeData = {
      toPlayerId: selectedPlayer,
      offeredTechs,
      requestedTechs,
      message: tradeMessage
    };
    
    console.log('Creating trade offer:', tradeData);
    // TODO: Send trade offer via WebSocket
    
    // Reset form
    setOfferedTechs([]);
    setRequestedTechs([]);
    setTradeMessage('');
  };

  const handleAcceptTrade = (offerId: string) => {
    console.log('Accepting trade:', offerId);
    // TODO: Accept trade via WebSocket
  };

  const handleRejectTrade = (offerId: string) => {
    console.log('Rejecting trade:', offerId);
    // TODO: Reject trade via WebSocket
  };

  const handleJoinCollaboration = (projectId: string) => {
    console.log('Joining collaboration:', projectId);
    // TODO: Join collaboration project via WebSocket
  };

  const renderCreateTradeTab = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
        Create Technology Trade
      </Typography>
      
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Trade Partner</InputLabel>
        <Select
          value={selectedPlayer}
          onChange={(e) => setSelectedPlayer(e.target.value)}
          sx={{ 
            color: 'white',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255,255,255,0.3)'
            }
          }}
        >
          {otherPlayers.map(player => (
            <MenuItem key={player.id} value={player.id}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 24, height: 24, bgcolor: player.color }}>
                  {player.name.charAt(0)}
                </Avatar>
                {player.name} ({player.civilization})
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedPlayer && (
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Offered Technologies */}
          <Paper sx={{ flex: 1, p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)' }}>
            <Typography variant="subtitle2" sx={{ color: 'white', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScienceIcon color="success" />
              Your Technologies to Offer
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto', mb: 2 }}>
              {getAvailableTechnologies(selectedPlayer).map(tech => (
                <Chip
                  key={tech.id}
                  label={tech.name}
                  onClick={() => {
                    if (!offeredTechs.includes(tech.id)) {
                      setOfferedTechs([...offeredTechs, tech.id]);
                    }
                  }}
                  size="small"
                  sx={{ 
                    m: 0.5,
                    bgcolor: offeredTechs.includes(tech.id) 
                      ? 'rgba(76, 175, 80, 0.8)' 
                      : 'rgba(76, 175, 80, 0.3)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(76, 175, 80, 0.6)' }
                  }}
                />
              ))}
            </Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Selected: {offeredTechs.length} technologies
            </Typography>
          </Paper>

          {/* Requested Technologies */}
          <Paper sx={{ flex: 1, p: 2, bgcolor: 'rgba(33, 150, 243, 0.1)' }}>
            <Typography variant="subtitle2" sx={{ color: 'white', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ScienceIcon color="primary" />
              Technologies to Request
            </Typography>
            <Box sx={{ maxHeight: 200, overflow: 'auto', mb: 2 }}>
              {getRequestableTechnologies(selectedPlayer).map(tech => (
                <Chip
                  key={tech.id}
                  label={tech.name}
                  onClick={() => {
                    if (!requestedTechs.includes(tech.id)) {
                      setRequestedTechs([...requestedTechs, tech.id]);
                    }
                  }}
                  size="small"
                  sx={{ 
                    m: 0.5,
                    bgcolor: requestedTechs.includes(tech.id) 
                      ? 'rgba(33, 150, 243, 0.8)' 
                      : 'rgba(33, 150, 243, 0.3)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(33, 150, 243, 0.6)' }
                  }}
                />
              ))}
            </Box>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              Selected: {requestedTechs.length} technologies
            </Typography>
          </Paper>
        </Box>
      )}

      <TextField
        fullWidth
        multiline
        rows={3}
        label="Trade Message (Optional)"
        value={tradeMessage}
        onChange={(e) => setTradeMessage(e.target.value)}
        sx={{ 
          mt: 2,
          '& .MuiOutlinedInput-root': {
            color: 'white',
            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' }
          },
          '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }
        }}
      />

      <Button
        fullWidth
        variant="contained"
        startIcon={<SendIcon />}
        onClick={handleCreateTrade}
        disabled={!selectedPlayer || offeredTechs.length === 0 || requestedTechs.length === 0}
        sx={{ mt: 2 }}
      >
        Send Trade Offer
      </Button>
    </Box>
  );

  const renderTradeOffersTab = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
        Trade Offers
        {tradeOffers.length > 0 && (
          <Badge badgeContent={tradeOffers.length} color="error" sx={{ ml: 1 }} />
        )}
      </Typography>
      
      {tradeOffers.length === 0 ? (
        <Alert severity="info" sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)', color: 'white' }}>
          No pending trade offers. Create a new trade to get started!
        </Alert>
      ) : (
        <List>
          {tradeOffers.map(offer => {
            const fromPlayer = gameState?.players.find(p => p.id === offer.fromPlayerId);
            return (
              <ListItem key={offer.id} sx={{ bgcolor: 'rgba(255,255,255,0.05)', mb: 1, borderRadius: 1 }}>
                <ListItemIcon>
                  <Avatar sx={{ bgcolor: fromPlayer?.color }}>
                    {fromPlayer?.name.charAt(0)}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography sx={{ color: 'white', fontWeight: 'bold' }}>
                      Trade from {fromPlayer?.name}
                    </Typography>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Offers: {offer.offeredTechs.map(id => 
                          TECHNOLOGY_DATABASE[id]?.name || id
                        ).join(', ')}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Wants: {offer.requestedTechs.map(id => 
                          TECHNOLOGY_DATABASE[id]?.name || id
                        ).join(', ')}
                      </Typography>
                      {offer.message && (
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mt: 1, fontStyle: 'italic' }}>
                          "{offer.message}"
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton 
                      size="small" 
                      onClick={() => handleAcceptTrade(offer.id)}
                      sx={{ color: '#4caf50' }}
                    >
                      <AcceptIcon />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleRejectTrade(offer.id)}
                      sx={{ color: '#f44336' }}
                    >
                      <RejectIcon />
                    </IconButton>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );

  const renderCollaborationTab = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
        Collaborative Research
      </Typography>
      
      {collaborationProjects.length === 0 ? (
        <Alert severity="info" sx={{ bgcolor: 'rgba(33, 150, 243, 0.1)', color: 'white' }}>
          No active collaboration projects. Start a joint research project with other players!
        </Alert>
      ) : (
        <List>
          {collaborationProjects.map(project => {
            const tech = TECHNOLOGY_DATABASE[project.techId];
            const totalContributed = Object.values(project.contributions).reduce((a, b) => a + b, 0);
            const progress = (totalContributed / project.totalRequired) * 100;
            
            return (
              <ListItem key={project.id} sx={{ bgcolor: 'rgba(255,255,255,0.05)', mb: 1, borderRadius: 1 }}>
                <ListItemIcon>
                  <CollaborateIcon sx={{ color: '#ff9800' }} />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography sx={{ color: 'white', fontWeight: 'bold' }}>
                      {tech?.name || project.techId} Research
                    </Typography>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                        Participants: {project.participants.length} players
                      </Typography>
                      <Box sx={{ width: '100%', mr: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                            Progress: {totalContributed} / {project.totalRequired} science points
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                            {Math.round(progress)}%
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          width: '100%', 
                          height: 6, 
                          bgcolor: 'rgba(255,255,255,0.2)', 
                          borderRadius: 3,
                          overflow: 'hidden'
                        }}>
                          <Box sx={{ 
                            width: `${progress}%`, 
                            height: '100%', 
                            bgcolor: '#ff9800',
                            transition: 'width 0.3s ease'
                          }} />
                        </Box>
                      </Box>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 1 }}>
                        Your contribution: {project.contributions[user?.id || ''] || 0} science points
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleJoinCollaboration(project.id)}
                    sx={{ 
                      color: '#ff9800', 
                      borderColor: '#ff9800',
                      '&:hover': { borderColor: '#ffb74d', bgcolor: 'rgba(255, 152, 0, 0.1)' }
                    }}
                  >
                    Contribute
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'rgba(18, 18, 18, 0.95)',
          backdropFilter: 'blur(10px)',
          minHeight: '70vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        color: 'white',
        borderBottom: '1px solid rgba(255,255,255,0.2)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TradeIcon sx={{ color: '#2196f3' }} />
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Technology Trading & Collaboration
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          textColor="inherit"
          indicatorColor="primary"
          variant="fullWidth"
        >
          <Tab label="Create Trade" sx={{ color: 'white' }} />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Trade Offers
                {tradeOffers.length > 0 && (
                  <Badge badgeContent={tradeOffers.length} color="error" />
                )}
              </Box>
            } 
            sx={{ color: 'white' }} 
          />
          <Tab label="Collaboration" sx={{ color: 'white' }} />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {activeTab === 0 && renderCreateTradeTab()}
        {activeTab === 1 && renderTradeOffersTab()}
        {activeTab === 2 && renderCollaborationTab()}
      </DialogContent>

      <DialogActions sx={{ 
        borderTop: '1px solid rgba(255,255,255,0.2)', 
        p: 2,
        justifyContent: 'space-between'
      }}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          Technology trading enables diplomatic relationships and strategic alliances
        </Typography>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TechnologyTradingModal;