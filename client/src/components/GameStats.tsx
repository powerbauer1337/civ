import React, { useState, useEffect } from 'react';
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
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  Timeline,
  TrendingUp,
  EmojiEvents,
  People,
  Agriculture,
  Science,
  AttachMoney,
  Security,
  AccountBalance,
  Terrain,
  Assessment,
  Star,
  WorkspacePremium,
  MilitaryTech,
  Biotech,
  Castle,
  Flag
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

interface GameStatsProps {
  open: boolean;
  onClose: () => void;
}

const GameStats: React.FC<GameStatsProps> = ({ open, onClose }) => {
  const theme = useTheme();
  const gameState = useSelector((state: RootState) => state.game.gameState);
  const currentPlayer = useSelector((state: RootState) => state.game.currentPlayer);
  const [tabValue, setTabValue] = useState(0);

  // Mock data for demonstration - replace with actual game data
  const mockStats = {
    overview: {
      turn: gameState?.turn || 150,
      year: '1850 AD',
      era: 'Industrial Era',
      gameTime: '2h 35m',
      totalUnits: 45,
      totalCities: 12,
      exploredMap: 75
    },
    resources: {
      food: 245,
      production: 180,
      gold: 1250,
      science: 320,
      culture: 150,
      faith: 85
    },
    military: {
      totalUnits: 25,
      landUnits: 18,
      navalUnits: 5,
      airUnits: 2,
      militaryStrength: 850,
      wars: 2,
      citiesCaptured: 3
    },
    achievements: [
      { name: 'First City', description: 'Founded your first city', icon: <Castle />, unlocked: true },
      { name: 'Explorer', description: 'Explored 50% of the map', icon: <Terrain />, unlocked: true },
      { name: 'Scientist', description: 'Research 20 technologies', icon: <Science />, unlocked: true },
      { name: 'Conqueror', description: 'Capture 5 enemy cities', icon: <Flag />, unlocked: false },
      { name: 'Builder', description: 'Build 10 wonders', icon: <AccountBalance />, unlocked: false }
    ]
  };

  const playerComparison = [
    { 
      name: 'You', 
      score: 850, 
      cities: 12, 
      military: 850, 
      science: 320, 
      culture: 150,
      color: theme.palette.primary.main 
    },
    { 
      name: 'Napoleon', 
      score: 780, 
      cities: 10, 
      military: 920, 
      science: 280, 
      culture: 120,
      color: '#f44336' 
    },
    { 
      name: 'Gandhi', 
      score: 720, 
      cities: 8, 
      military: 450, 
      science: 380, 
      culture: 200,
      color: '#ff9800' 
    },
    { 
      name: 'Caesar', 
      score: 690, 
      cities: 9, 
      military: 780, 
      science: 250, 
      culture: 180,
      color: '#9c27b0' 
    }
  ];

  const turnHistory = [
    { turn: 1, score: 50, gold: 10, science: 5 },
    { turn: 25, score: 150, gold: 50, science: 25 },
    { turn: 50, score: 300, gold: 150, science: 80 },
    { turn: 75, score: 450, gold: 300, science: 150 },
    { turn: 100, score: 620, gold: 580, science: 220 },
    { turn: 125, score: 750, gold: 900, science: 280 },
    { turn: 150, score: 850, gold: 1250, science: 320 }
  ];

  const resourceDistribution = [
    { name: 'Food', value: 30, color: '#4caf50' },
    { name: 'Production', value: 25, color: '#ff9800' },
    { name: 'Gold', value: 20, color: '#ffc107' },
    { name: 'Science', value: 15, color: '#2196f3' },
    { name: 'Culture', value: 10, color: '#9c27b0' }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Timeline />
          <Typography variant="h5">Game Statistics</Typography>
          <Box sx={{ ml: 'auto' }}>
            <Chip 
              label={`Turn ${mockStats.overview.turn}`} 
              color="primary" 
              variant="outlined"
            />
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent divider>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab icon={<Assessment />} label="Overview" />
          <Tab icon={<TrendingUp />} label="Graphs" />
          <Tab icon={<People />} label="Players" />
          <Tab icon={<EmojiEvents />} label="Achievements" />
          <Tab icon={<Timeline />} label="History" />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Game Info */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Timeline />
                      Game Progress
                    </Box>
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Current Year" secondary={mockStats.overview.year} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Era" secondary={mockStats.overview.era} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Game Time" secondary={mockStats.overview.gameTime} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Map Explored" secondary={`${mockStats.overview.exploredMap}%`} />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Resources */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Agriculture />
                      Resources
                    </Box>
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><Agriculture fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Food" />
                      <Typography variant="body2">{mockStats.resources.food}</Typography>
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><AccountBalance fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Production" />
                      <Typography variant="body2">{mockStats.resources.production}</Typography>
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><AttachMoney fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Gold" />
                      <Typography variant="body2">{mockStats.resources.gold}</Typography>
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><Science fontSize="small" /></ListItemIcon>
                      <ListItemText primary="Science" />
                      <Typography variant="body2">{mockStats.resources.science}</Typography>
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Military */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Security />
                      Military
                    </Box>
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Total Units" secondary={mockStats.military.totalUnits} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Military Strength" secondary={mockStats.military.militaryStrength} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Active Wars" secondary={mockStats.military.wars} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Cities Captured" secondary={mockStats.military.citiesCaptured} />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Score Breakdown */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Score Breakdown</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} md={3}>
                    <Box textAlign="center">
                      <CircularProgress
                        variant="determinate"
                        value={75}
                        size={80}
                        thickness={4}
                      />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Territory (150)
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box textAlign="center">
                      <CircularProgress
                        variant="determinate"
                        value={60}
                        size={80}
                        thickness={4}
                        color="secondary"
                      />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Technology (200)
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box textAlign="center">
                      <CircularProgress
                        variant="determinate"
                        value={85}
                        size={80}
                        thickness={4}
                        color="success"
                      />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Military (300)
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Box textAlign="center">
                      <CircularProgress
                        variant="determinate"
                        value={45}
                        size={80}
                        thickness={4}
                        color="warning"
                      />
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Culture (200)
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Graphs Tab */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Score Over Time</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={turnHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="turn" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke={theme.palette.primary.main} />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Resource Distribution</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={resourceDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={entry => entry.name}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {resourceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Economy Growth</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={turnHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="turn" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="gold" stroke="#ffc107" name="Gold" />
                    <Line type="monotone" dataKey="science" stroke="#2196f3" name="Science" />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Players Tab */}
        <TabPanel value={tabValue} index={2}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Player</TableCell>
                  <TableCell align="right">Score</TableCell>
                  <TableCell align="right">Cities</TableCell>
                  <TableCell align="right">Military</TableCell>
                  <TableCell align="right">Science</TableCell>
                  <TableCell align="right">Culture</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {playerComparison.map((player) => (
                  <TableRow key={player.name}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ bgcolor: player.color, width: 32, height: 32 }}>
                          {player.name[0]}
                        </Avatar>
                        <Typography>{player.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold">
                        {player.score}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{player.cities}</TableCell>
                    <TableCell align="right">{player.military}</TableCell>
                    <TableCell align="right">{player.science}</TableCell>
                    <TableCell align="right">{player.culture}</TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={player.name === 'You' ? 'You' : 'AI'} 
                        size="small"
                        color={player.name === 'You' ? 'primary' : 'default'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Paper sx={{ mt: 3, p: 2 }}>
            <Typography variant="h6" gutterBottom>Diplomatic Relations</Typography>
            <Grid container spacing={2}>
              {playerComparison.slice(1).map((player) => (
                <Grid item xs={12} md={4} key={player.name}>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar sx={{ bgcolor: player.color }}>{player.name[0]}</Avatar>
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight="bold">
                        {player.name}
                      </Typography>
                      <Chip 
                        label="Neutral" 
                        size="small" 
                        variant="outlined"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </TabPanel>

        {/* Achievements Tab */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={2}>
            {mockStats.achievements.map((achievement, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Paper 
                  sx={{ 
                    p: 2, 
                    opacity: achievement.unlocked ? 1 : 0.5,
                    border: achievement.unlocked ? `2px solid ${theme.palette.primary.main}` : 'none'
                  }}
                >
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar 
                      sx={{ 
                        bgcolor: achievement.unlocked ? theme.palette.primary.main : 'grey.500',
                        width: 48,
                        height: 48
                      }}
                    >
                      {achievement.icon}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="h6">
                        {achievement.name}
                        {achievement.unlocked && (
                          <Star sx={{ ml: 1, color: 'gold', fontSize: 20 }} />
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {achievement.description}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Paper sx={{ mt: 3, p: 2 }}>
            <Typography variant="h6" gutterBottom>Achievement Progress</Typography>
            <Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2">Overall Progress</Typography>
                <Typography variant="body2">3 / 5 (60%)</Typography>
              </Box>
              <LinearProgress variant="determinate" value={60} sx={{ height: 8 }} />
            </Box>
          </Paper>
        </TabPanel>

        {/* History Tab */}
        <TabPanel value={tabValue} index={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Game Timeline</Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <Castle />
                </ListItemIcon>
                <ListItemText 
                  primary="Capital Founded" 
                  secondary="Turn 1 - Founded Rome"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Science />
                </ListItemIcon>
                <ListItemText 
                  primary="First Technology" 
                  secondary="Turn 5 - Researched Agriculture"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <People />
                </ListItemIcon>
                <ListItemText 
                  primary="First Contact" 
                  secondary="Turn 12 - Met Napoleon"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Security />
                </ListItemIcon>
                <ListItemText 
                  primary="First Battle" 
                  secondary="Turn 25 - Defeated barbarians"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <AccountBalance />
                </ListItemIcon>
                <ListItemText 
                  primary="Wonder Built" 
                  secondary="Turn 45 - Completed Pyramids"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Flag />
                </ListItemIcon>
                <ListItemText 
                  primary="War Declared" 
                  secondary="Turn 78 - Napoleon declared war"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <EmojiEvents />
                </ListItemIcon>
                <ListItemText 
                  primary="Victory Achieved" 
                  secondary="Turn 150 - Leading in score"
                />
              </ListItem>
            </List>
          </Paper>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default GameStats;
