import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import SimpleLobbyPage from './pages/SimpleLobbyPage';
import SimpleGamePage from './pages/SimpleGamePage';
import { civilizationTheme } from './theme/CivilizationTheme';

function SimpleApp() {
  return (
    <ThemeProvider theme={civilizationTheme}>
      <CssBaseline />
      <Router>
        <Routes>
          {/* Default route to lobby */}
          <Route path="/" element={<Navigate to="/lobby" replace />} />

          {/* Main lobby page */}
          <Route path="/lobby" element={<SimpleLobbyPage />} />

          {/* Game page */}
          <Route path="/game/:gameId" element={<SimpleGamePage />} />

          {/* Catch all - redirect to lobby */}
          <Route path="*" element={<Navigate to="/lobby" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default SimpleApp;
