import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress, Typography } from '@mui/material';
import { civilizationTheme } from './theme/CivilizationTheme';

// Lazy load main page components for code splitting
const SimpleLobbyPage = React.lazy(() => import('./pages/SimpleLobbyPage'));
const SimpleGamePage = React.lazy(() => import('./pages/SimpleGamePage'));

// Loading component for Suspense fallback
const LoadingScreen = ({ message = "Loading..." }: { message?: string }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: 'background.default',
      gap: 2
    }}
  >
    <CircularProgress size={60} />
    <Typography variant="h6" color="text.secondary">
      {message}
    </Typography>
  </Box>
);

function SimpleApp() {
  return (
    <ThemeProvider theme={civilizationTheme}>
      <CssBaseline />
      <Router>
        <Suspense fallback={<LoadingScreen message="Loading Application..." />}>
          <Routes>
            {/* Default route to lobby */}
            <Route path="/" element={<Navigate to="/lobby" replace />} />

            {/* Main lobby page */}
            <Route 
              path="/lobby" 
              element={
                <Suspense fallback={<LoadingScreen message="Loading Lobby..." />}>
                  <SimpleLobbyPage />
                </Suspense>
              } 
            />

            {/* Game page */}
            <Route 
              path="/game/:gameId" 
              element={
                <Suspense fallback={<LoadingScreen message="Loading Game..." />}>
                  <SimpleGamePage />
                </Suspense>
              } 
            />

            {/* Catch all - redirect to lobby */}
            <Route path="*" element={<Navigate to="/lobby" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}

export default SimpleApp;
