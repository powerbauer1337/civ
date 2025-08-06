import React, { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  Avatar
} from '@mui/material'
import { Person as PersonIcon } from '@mui/icons-material'
import { RootState } from '../store/store'
import { login, clearError } from '../store/authSlice'

const LoginPage: React.FC = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isLoading, error } = useSelector((state: RootState) => state.auth)
  
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!credentials.username || !credentials.password) {
      return
    }

    const result = await dispatch(login(credentials) as any)
    if (login.fulfilled.match(result)) {
      navigate('/lobby')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error when user starts typing
    if (error) {
      dispatch(clearError())
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={10}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <Box
            sx={{
              background: 'linear-gradient(45deg, #FFD700 30%, #FFA500 90%)',
              padding: 4,
              textAlign: 'center'
            }}
          >
            <Avatar
              sx={{
                width: 80,
                height: 80,
                mx: 'auto',
                mb: 2,
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <PersonIcon sx={{ fontSize: 40, color: 'white' }} />
            </Avatar>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 'bold',
                color: 'white',
                textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
                mb: 1
              }}
            >
              Civilization
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: 300
              }}
            >
              Browser Strategy Game
            </Typography>
          </Box>

          <CardContent sx={{ p: 4 }}>
            <Typography
              variant="h4"
              sx={{
                textAlign: 'center',
                mb: 3,
                color: '#1e3c72',
                fontWeight: 'bold'
              }}
            >
              Welcome Back
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                name="username"
                label="Username or Email"
                value={credentials.username}
                onChange={handleChange}
                margin="normal"
                variant="outlined"
                required
                autoFocus
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                name="password"
                type="password"
                label="Password"
                value={credentials.password}
                onChange={handleChange}
                margin="normal"
                variant="outlined"
                required
                sx={{ mb: 3 }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading || !credentials.username || !credentials.password}
                sx={{
                  py: 2,
                  background: 'linear-gradient(45deg, #1e3c72 30%, #2a5298 90%)',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  mb: 3,
                  '&:hover': {
                    background: 'linear-gradient(45deg, #2a5298 30%, #1e3c72 90%)',
                  }
                }}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body1" color="textSecondary">
                  Don't have an account?{' '}
                  <Link 
                    to="/register" 
                    style={{ 
                      color: '#1976d2', 
                      textDecoration: 'none',
                      fontWeight: 'bold'
                    }}
                  >
                    Create Account
                  </Link>
                </Typography>
              </Box>
            </form>
          </CardContent>
        </Paper>

        {/* Game features preview */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              mb: 2
            }}
          >
            🌍 Explore • 🏗️ Expand • 🔬 Research • ⚔️ Conquer
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.6)',
              maxWidth: 400,
              mx: 'auto'
            }}
          >
            Build your civilization from the ground up. Research technologies, 
            expand your empire, and compete against players worldwide in this 
            turn-based strategy game.
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}

export default LoginPage