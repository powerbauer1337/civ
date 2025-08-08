import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import SimpleLobbyPage from './pages/SimpleLobbyPage'
import SimpleGamePage from './pages/SimpleGamePage'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    success: {
      main: '#2e7d32',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
})

function SimpleApp() {
  return (
    <ThemeProvider theme={theme}>
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
  )
}

export default SimpleApp