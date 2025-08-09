import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  Paper,
  Grid,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert
} from '@mui/material';
import {
  ExpandMore,
  Help,
  School,
  Gamepad,
  Agriculture,
  Science,
  AccountBalance,
  Security,
  FlightTakeoff,
  EmojiEvents,
  Keyboard,
  Mouse,
  TouchApp,
  PlayArrow,
  CheckCircle
} from '@mui/icons-material';

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
      id={`help-tabpanel-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

interface GameHelpProps {
  open: boolean;
  onClose: () => void;
}

const GameHelp: React.FC<GameHelpProps> = ({ open, onClose }) => {
  const [tabValue, setTabValue] = useState(0);
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  const handleAccordionChange = (panel: string) => (_event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const basicConcepts = [
    {
      id: 'turns',
      title: 'Turn-Based Gameplay',
      icon: <PlayArrow />,
      content: `The game progresses in turns. Each turn, you can:
        • Move your units
        • Build improvements and cities
        • Research technologies
        • Manage diplomacy
        • End your turn when ready`
    },
    {
      id: 'resources',
      title: 'Resources',
      icon: <Agriculture />,
      content: `Key resources to manage:
        • Food: Grows your cities
        • Production: Builds units and buildings
        • Gold: Maintains your empire
        • Science: Researches technologies
        • Culture: Expands borders and policies`
    },
    {
      id: 'cities',
      title: 'Cities',
      icon: <AccountBalance />,
      content: `Cities are the heart of your civilization:
        • Found cities with settlers
        • Build improvements to increase yields
        • Specialize cities for different purposes
        • Defend cities from enemies
        • Manage citizen happiness`
    },
    {
      id: 'units',
      title: 'Units',
      icon: <Security />,
      content: `Units perform various tasks:
        • Military units for combat and defense
        • Settlers to found new cities
        • Workers to improve tiles
        • Scouts for exploration
        • Great People for special abilities`
    },
    {
      id: 'combat',
      title: 'Combat',
      icon: <Security />,
      content: `Combat basics:
        • Melee units attack adjacent enemies
        • Ranged units attack from distance
        • Consider terrain bonuses
        • Use formations and tactics
        • Siege units for city attacks`
    },
    {
      id: 'technology',
      title: 'Technology',
      icon: <Science />,
      content: `Research advances your civilization:
        • Unlock new units and buildings
        • Discover new resources
        • Enable new abilities
        • Progress through eras
        • Choose your research path wisely`
    }
  ];

  const tutorialSteps = [
    {
      label: 'Welcome to Civilization',
      description: 'Build an empire to stand the test of time! This tutorial will guide you through the basics of gameplay.'
    },
    {
      label: 'Founding Your First City',
      description: 'Start by selecting your Settler unit and choosing a good location for your capital. Look for tiles with fresh water, resources, and good terrain.'
    },
    {
      label: 'Exploring the Map',
      description: 'Use Scout units to explore the map. Discover natural wonders, meet other civilizations, and find good spots for expansion.'
    },
    {
      label: 'Building Your Economy',
      description: 'Build improvements in your cities to increase production, food, gold, and science output. Balance growth with infrastructure.'
    },
    {
      label: 'Research & Development',
      description: 'Choose technologies to research based on your strategy. Science leads to new units, buildings, and abilities.'
    },
    {
      label: 'Military & Defense',
      description: 'Build military units to defend your cities and expand your territory. Balance military strength with economic development.'
    },
    {
      label: 'Diplomacy',
      description: 'Interact with other civilizations through trade, alliances, and negotiations. Diplomacy can be as powerful as military might.'
    },
    {
      label: 'Victory Conditions',
      description: 'Win the game through Domination, Science, Culture, Diplomatic, or Score victory. Choose your path and work towards it!'
    }
  ];

  const controls = {
    keyboard: [
      { key: 'WASD / Arrow Keys', action: 'Pan camera' },
      { key: 'Q/E', action: 'Rotate camera' },
      { key: '+/-', action: 'Zoom in/out' },
      { key: 'Space', action: 'Next unit' },
      { key: 'Enter', action: 'End turn' },
      { key: 'G', action: 'Toggle grid' },
      { key: 'Y', action: 'Toggle yields' },
      { key: 'Escape', action: 'Cancel/Menu' },
      { key: 'F5', action: 'Quick save' },
      { key: 'F9', action: 'Quick load' }
    ],
    mouse: [
      { key: 'Left Click', action: 'Select unit/city' },
      { key: 'Right Click', action: 'Move unit/Open context menu' },
      { key: 'Middle Mouse', action: 'Pan camera' },
      { key: 'Scroll Wheel', action: 'Zoom in/out' },
      { key: 'Drag', action: 'Box select units' }
    ],
    touch: [
      { key: 'Tap', action: 'Select unit/city' },
      { key: 'Long Press', action: 'Context menu' },
      { key: 'Drag', action: 'Pan camera' },
      { key: 'Pinch', action: 'Zoom in/out' },
      { key: 'Two-finger drag', action: 'Rotate camera' }
    ]
  };

  const strategies = [
    {
      title: 'Early Game Strategy',
      tips: [
        'Focus on exploration and expansion',
        'Build scouts to discover the map',
        'Settle cities near resources',
        'Research basic technologies',
        'Build a small defensive force'
      ]
    },
    {
      title: 'Economic Development',
      tips: [
        'Balance food and production',
        'Build commercial hubs for gold',
        'Establish trade routes',
        'Improve tiles with workers',
        'Manage city specialization'
      ]
    },
    {
      title: 'Military Conquest',
      tips: [
        'Build a strong military early',
        'Research military technologies',
        'Use combined arms tactics',
        'Capture strategic cities',
        'Maintain supply lines'
      ]
    },
    {
      title: 'Scientific Victory',
      tips: [
        'Prioritize science output',
        'Build campuses in all cities',
        'Research key technologies',
        'Build space program projects',
        'Protect your cities while researching'
      ]
    },
    {
      title: 'Cultural Victory',
      tips: [
        'Build theater squares',
        'Generate great artists and writers',
        'Build wonders',
        'Spread your culture',
        'Attract tourists'
      ]
    }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Help />
          <Typography variant="h5">Help & Tutorial</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab icon={<School />} label="Tutorial" />
          <Tab icon={<Gamepad />} label="Basics" />
          <Tab icon={<Keyboard />} label="Controls" />
          <Tab icon={<FlightTakeoff />} label="Strategies" />
          <Tab icon={<EmojiEvents />} label="Victory" />
        </Tabs>

        {/* Tutorial Tab */}
        <TabPanel value={tabValue} index={0}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Follow this step-by-step guide to learn the basics of the game
          </Alert>
          
          <Stepper activeStep={tutorialStep} orientation="vertical">
            {tutorialSteps.map((step, index) => (
              <Step key={step.label}>
                <StepLabel>{step.label}</StepLabel>
                <StepContent>
                  <Typography>{step.description}</Typography>
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={() => setTutorialStep(index + 1)}
                      disabled={index === tutorialSteps.length - 1}
                    >
                      Next
                    </Button>
                    <Button
                      onClick={() => setTutorialStep(index - 1)}
                      disabled={index === 0}
                      sx={{ ml: 1 }}
                    >
                      Back
                    </Button>
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
          
          {tutorialStep === tutorialSteps.length && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Box display="flex" alignItems="center" gap={1}>
                <CheckCircle color="success" />
                <Typography>
                  Tutorial completed! You're ready to start playing.
                </Typography>
              </Box>
              <Button
                onClick={() => setTutorialStep(0)}
                sx={{ mt: 2 }}
              >
                Restart Tutorial
              </Button>
            </Paper>
          )}
        </TabPanel>

        {/* Basics Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Basic Game Concepts
          </Typography>
          
          {basicConcepts.map((concept) => (
            <Accordion
              key={concept.id}
              expanded={expandedPanel === concept.id}
              onChange={handleAccordionChange(concept.id)}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={1}>
                  {concept.icon}
                  <Typography>{concept.title}</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" style={{ whiteSpace: 'pre-line' }}>
                  {concept.content}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </TabPanel>

        {/* Controls Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Keyboard />
                  <Typography variant="h6">Keyboard</Typography>
                </Box>
                <List dense>
                  {controls.keyboard.map((control, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={control.key}
                        secondary={control.action}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <Mouse />
                  <Typography variant="h6">Mouse</Typography>
                </Box>
                <List dense>
                  {controls.mouse.map((control, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={control.key}
                        secondary={control.action}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <TouchApp />
                  <Typography variant="h6">Touch</Typography>
                </Box>
                <List dense>
                  {controls.touch.map((control, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={control.key}
                        secondary={control.action}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 'bold' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Strategies Tab */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Strategic Tips
          </Typography>
          
          <Grid container spacing={2}>
            {strategies.map((strategy, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {strategy.title}
                    </Typography>
                    <List dense>
                      {strategy.tips.map((tip, tipIndex) => (
                        <ListItem key={tipIndex}>
                          <ListItemIcon>
                            <CheckCircle color="primary" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={tip} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Victory Tab */}
        <TabPanel value={tabValue} index={4}>
          <Typography variant="h6" gutterBottom>
            Victory Conditions
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="primary">
                    Domination Victory
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Conquer all other civilizations' capitals
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Build a strong military" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Research military technologies" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Capture enemy capitals" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="primary">
                    Science Victory
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Complete the space program and colonize Mars
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Build campuses and libraries" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Research space technologies" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Launch space projects" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="primary">
                    Culture Victory
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Become the dominant culture in the world
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Build theater squares" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Create great works" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Attract tourists" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" color="primary">
                    Diplomatic Victory
                  </Typography>
                  <Typography variant="body2" paragraph>
                    Win through diplomatic dominance
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Build alliances" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Win World Congress votes" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Complete diplomatic projects" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default GameHelp;
