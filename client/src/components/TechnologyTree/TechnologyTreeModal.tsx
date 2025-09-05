import React, { useState, useMemo, Suspense } from 'react';
import { useSelector } from 'react-redux';

// Lazy load the trading modal to keep the main modal lightweight
const TechnologyTradingModal = React.lazy(() => import('./TechnologyTradingModal'));
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Paper,
  Divider,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  Search as SearchIcon,
  Science as ScienceIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  SwapHoriz as TradeIcon
} from '@mui/icons-material';
import { RootState } from '../../store/store';
import { TECHNOLOGY_DATABASE } from '@civ-game/shared';
import { useSocket } from '../../contexts/SocketContext';
import { Technology, TechEra } from '@civ-game/shared';

interface TechnologyTreeModalProps {
  open: boolean;
  onClose: () => void;
}

interface TechnologyNodeProps {
  technology: Technology;
  isResearched: boolean;
  canResearch: boolean;
  currentResearch?: string;
  researchProgress?: number;
  onClick: (techId: string) => void;
  position: { x: number; y: number };
  scale: number;
}

const TechnologyNode: React.FC<TechnologyNodeProps> = ({
  technology,
  isResearched,
  canResearch,
  currentResearch,
  researchProgress = 0,
  onClick,
  position,
  scale
}) => {
  const nodeSize = 120 * scale;
  const fontSize = Math.max(10, 12 * scale);

  return (
    <Paper
      elevation={isResearched ? 8 : canResearch ? 4 : 1}
      sx={{
        position: 'absolute',
        left: position.x - nodeSize / 2,
        top: position.y - nodeSize / 2,
        width: nodeSize,
        height: nodeSize,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: canResearch ? 'pointer' : 'default',
        backgroundColor: isResearched 
          ? 'rgba(76, 175, 80, 0.9)' 
          : canResearch 
            ? 'rgba(33, 150, 243, 0.8)'
            : 'rgba(158, 158, 158, 0.6)',
        border: currentResearch === technology.id ? '3px solid #ff9800' : '1px solid rgba(255,255,255,0.2)',
        borderRadius: 2,
        transition: 'all 0.3s ease',
        '&:hover': canResearch ? {
          transform: 'scale(1.05)',
          boxShadow: '0 8px 32px rgba(33, 150, 243, 0.4)'
        } : {},
        p: 1
      }}
      onClick={() => canResearch && onClick(technology.id)}
    >
      <ScienceIcon 
        sx={{ 
          color: 'white', 
          fontSize: Math.max(16, 20 * scale),
          mb: 0.5
        }} 
      />
      <Typography
        variant="caption"
        sx={{
          color: 'white',
          fontSize: fontSize,
          fontWeight: 'bold',
          textAlign: 'center',
          lineHeight: 1.2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical'
        }}
      >
        {technology.name}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: 'rgba(255,255,255,0.8)',
          fontSize: Math.max(8, 10 * scale),
          textAlign: 'center'
        }}
      >
        {technology.cost} research
      </Typography>
      {currentResearch === technology.id && (
        <LinearProgress
          variant="determinate"
          value={researchProgress}
          sx={{
            width: '90%',
            mt: 0.5,
            height: 4,
            borderRadius: 2,
            backgroundColor: 'rgba(255,255,255,0.3)',
            '& .MuiLinearProgress-bar': {
              backgroundColor: '#ff9800'
            }
          }}
        />
      )}
    </Paper>
  );
};

const TechnologyTreeModal: React.FC<TechnologyTreeModalProps> = ({ open, onClose }) => {
  const { gameState } = useSelector((state: RootState) => state.game);
  const { user } = useSelector((state: RootState) => state.auth);
  const { sendGameAction } = useSocket();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEra, setSelectedEra] = useState<TechEra | 'all'>('all');
  const [scale, setScale] = useState(1);
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [tradingModalOpen, setTradingModalOpen] = useState(false);

  const currentPlayer = gameState?.players.find(p => p.id === user?.id);
  const researchedTechs = currentPlayer?.technologies?.map(t => t.techId) || [];
  const currentResearch = currentPlayer?.currentResearch;
  const sciencePoints = currentPlayer?.resources?.science || 0;

  // Calculate technology positions for tree layout
  const technologyPositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const eraLevels = {
      [TechEra.ANCIENT]: 0,
      [TechEra.CLASSICAL]: 1,
      [TechEra.MEDIEVAL]: 2,
      [TechEra.RENAISSANCE]: 3,
      [TechEra.INDUSTRIAL]: 4,
      [TechEra.MODERN]: 5,
      [TechEra.ATOMIC]: 6,
      [TechEra.INFORMATION]: 7
    };

    const techsByEra = Object.values(TECHNOLOGY_DATABASE).reduce((acc, tech) => {
      if (!acc[tech.era]) acc[tech.era] = [];
      acc[tech.era].push(tech);
      return acc;
    }, {} as Record<TechEra, Technology[]>);

    const nodeSpacing = 180;
    const levelHeight = 150;

    Object.entries(techsByEra).forEach(([era, techs]) => {
      const level = eraLevels[era as TechEra];
      const startX = -(techs.length - 1) * nodeSpacing / 2;
      
      techs.forEach((tech, index) => {
        positions[tech.id] = {
          x: startX + index * nodeSpacing,
          y: level * levelHeight
        };
      });
    });

    return positions;
  }, []);

  // Filter technologies based on search and era
  const filteredTechnologies = useMemo(() => {
    return Object.values(TECHNOLOGY_DATABASE).filter(tech => {
      const matchesSearch = tech.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           tech.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesEra = selectedEra === 'all' || tech.era === selectedEra;
      return matchesSearch && matchesEra;
    });
  }, [searchTerm, selectedEra]);

  // Check if technology can be researched
  const canResearch = (tech: Technology): boolean => {
    if (researchedTechs.includes(tech.id)) return false;
    return tech.prerequisites.every(prereq => researchedTechs.includes(prereq));
  };

  const handleTechnologyClick = (techId: string) => {
    if (!user?.id || !gameState?.id) return;
    sendGameAction({
      type: 'research_technology',
      gameId: gameState.id,
      playerId: user.id,
      payload: { techId },
      timestamp: Date.now(),
      actionId: Math.random().toString(36).slice(2, 11)
    });
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev / 1.2, 0.3));
  const handleCenter = () => {
    setViewOffset({ x: 0, y: 0 });
    setScale(1);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - viewOffset.x, y: e.clientY - viewOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setViewOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      fullScreen
      PaperProps={{
        sx: {
          backgroundColor: 'rgba(18, 18, 18, 0.95)',
          backdropFilter: 'blur(10px)'
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
          <ScienceIcon sx={{ color: '#2196f3' }} />
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Technology Tree
          </Typography>
          <Chip
            label={`${sciencePoints} Science`}
            color="primary"
            size="small"
          />
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search technologies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ 
              minWidth: 250,
              '& .MuiOutlinedInput-root': {
                color: 'white',
                '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                '&.Mui-focused fieldset': { borderColor: '#2196f3' }
              },
              '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
                </InputAdornment>
              )
            }}
          />

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label="All Eras"
              onClick={() => setSelectedEra('all')}
              color={selectedEra === 'all' ? 'primary' : 'default'}
              variant={selectedEra === 'all' ? 'filled' : 'outlined'}
              size="small"
            />
            {Object.values(TechEra).map(era => (
              <Chip
                key={era}
                label={era.charAt(0).toUpperCase() + era.slice(1)}
                onClick={() => setSelectedEra(era)}
                color={selectedEra === era ? 'primary' : 'default'}
                variant={selectedEra === era ? 'filled' : 'outlined'}
                size="small"
              />
            ))}
          </Box>

          <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={handleZoomOut} size="small" sx={{ color: 'white' }}>
              <ZoomOutIcon />
            </IconButton>
            <Chip label={`${Math.round(scale * 100)}%`} size="small" variant="outlined" />
            <IconButton onClick={handleZoomIn} size="small" sx={{ color: 'white' }}>
              <ZoomInIcon />
            </IconButton>
            <IconButton onClick={handleCenter} size="small" sx={{ color: 'white' }}>
              <CenterIcon />
            </IconButton>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />

          <Button
            variant="contained"
            size="small"
            startIcon={<TradeIcon />}
            onClick={() => setTradingModalOpen(true)}
            sx={{
              bgcolor: 'rgba(255, 152, 0, 0.8)',
              '&:hover': { bgcolor: 'rgba(255, 152, 0, 1)' }
            }}
          >
            Technology Trading
          </Button>
        </Box>
      </Box>

      <DialogContent
        sx={{
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'rgba(9, 9, 9, 0.8)',
          cursor: isDragging ? 'grabbing' : 'grab',
          minHeight: 600
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            transform: `translate(${viewOffset.x}px, ${viewOffset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.3s ease'
          }}
        >
          {/* Technology Nodes */}
          {filteredTechnologies.map(tech => {
            const position = technologyPositions[tech.id];
            if (!position) return null;

            const adjustedPosition = {
              x: position.x + 400, // Center offset
              y: position.y + 200
            };

            return (
              <TechnologyNode
                key={tech.id}
                technology={tech}
                isResearched={researchedTechs.includes(tech.id)}
                canResearch={canResearch(tech)}
                currentResearch={currentResearch?.techId}
                researchProgress={currentResearch?.progress || 0}
                onClick={handleTechnologyClick}
                position={adjustedPosition}
                scale={scale}
              />
            );
          })}

          {/* Draw prerequisite lines */}
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 1
            }}
          >
            {filteredTechnologies.map(tech => {
              const position = technologyPositions[tech.id];
              if (!position) return null;

              const adjustedPosition = {
                x: position.x + 400,
                y: position.y + 200
              };

              return tech.prerequisites.map(prereqId => {
                const prereqPosition = technologyPositions[prereqId];
                if (!prereqPosition) return null;

                const adjustedPrereqPosition = {
                  x: prereqPosition.x + 400,
                  y: prereqPosition.y + 200
                };

                return (
                  <line
                    key={`${prereqId}-${tech.id}`}
                    x1={adjustedPrereqPosition.x}
                    y1={adjustedPrereqPosition.y + 60}
                    x2={adjustedPosition.x}
                    y2={adjustedPosition.y - 60}
                    stroke={researchedTechs.includes(prereqId) ? '#4caf50' : 'rgba(255,255,255,0.3)'}
                    strokeWidth={2}
                    markerEnd="url(#arrowhead)"
                  />
                );
              });
            })}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="rgba(255,255,255,0.5)"
                />
              </marker>
            </defs>
          </svg>
        </Box>

        {filteredTechnologies.length === 0 && (
          <Alert
            severity="info"
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              color: 'white',
              '& .MuiAlert-icon': { color: '#2196f3' }
            }}
          >
            No technologies found matching your search criteria.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ 
        borderTop: '1px solid rgba(255,255,255,0.2)', 
        p: 2,
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip
            label={`${researchedTechs.length} / ${Object.keys(TECHNOLOGY_DATABASE).length} Researched`}
            color="success"
            size="small"
          />
          {currentResearch && (
            <Chip
              label={`Researching: ${TECHNOLOGY_DATABASE[currentResearch.techId]?.name || 'Unknown'}`}
              color="warning"
              size="small"
            />
          )}
        </Box>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>

      {/* Technology Trading Modal */}
      <Suspense fallback={<div>Loading...</div>}>
        <TechnologyTradingModal
          open={tradingModalOpen}
          onClose={() => setTradingModalOpen(false)}
        />
      </Suspense>
    </Dialog>
  );
};

export default TechnologyTreeModal;
