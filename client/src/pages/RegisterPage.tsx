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
import { PersonAdd as PersonAddIcon } from '@mui/icons-material'
import { RootState } from '../store/store'
import { register, clearError } from '../store/authSlice'

const RegisterPage: React.FC = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isLoading, error } = useSelector((state: RootState) => state.auth)
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const validateForm = () => {
    const errors: string[] = []
    
    if (formData.username.length < 2 || formData.username.length > 20) {
      errors.push('Username must be between 2 and 20 characters')
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.push('Username can only contain letters, numbers, and underscores')
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('Please enter a valid email address')
    }
    
    if (formData.password.length < 6) {
      errors.push('Password must be at least 6 characters')
    }
    
    if (formData.password !== formData.confirmPassword) {
      errors.push('Passwords do not match')
    }
    
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const errors = validateForm()
    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }
    
    setValidationErrors([])
    
    const userData = {
      username: formData.username,
      email: formData.email,
      password: formData.password
    }

    const result = await dispatch(register(userData) as any)
    if (register.fulfilled.match(result)) {
      navigate('/lobby')
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear errors when user starts typing
    if (error) {
      dispatch(clearError())
    }
    if (validationErrors.length > 0) {
      setValidationErrors([])
    }
  }

  const allErrors = [...validationErrors, ...(error ? [error] : [])]

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
              background: 'linear-gradient(45deg, #4CAF50 30%, #45a049 90%)',
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
              <PersonAddIcon sx={{ fontSize: 40, color: 'white' }} />
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
              Join the Empire
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontWeight: 300
              }}
            >
              Create Your Civilization Account
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
              Create Account
            </Typography>

            {allErrors.length > 0 && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {allErrors.map((err, index) => (
                  <div key={index}>{err}</div>
                ))}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                name="username"
                label="Username"
                value={formData.username}
                onChange={handleChange}
                margin="normal"
                variant="outlined"
                required
                autoFocus
                helperText="2-20 characters, letters, numbers, and underscores only"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                name="email"
                type="email"
                label="Email Address"
                value={formData.email}
                onChange={handleChange}
                margin="normal"
                variant="outlined"
                required
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                name="password"
                type="password"
                label="Password"
                value={formData.password}
                onChange={handleChange}
                margin="normal"
                variant="outlined"
                required
                helperText="Minimum 6 characters"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                name="confirmPassword"
                type="password"
                label="Confirm Password"
                value={formData.confirmPassword}
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
                disabled={isLoading}
                sx={{
                  py: 2,
                  background: 'linear-gradient(45deg, #4CAF50 30%, #45a049 90%)',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  mb: 3,
                  '&:hover': {
                    background: 'linear-gradient(45deg, #45a049 30%, #4CAF50 90%)',
                  }
                }}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body1" color="textSecondary">
                  Already have an account?{' '}
                  <Link 
                    to="/login" 
                    style={{ 
                      color: '#1976d2', 
                      textDecoration: 'none',
                      fontWeight: 'bold'
                    }}
                  >
                    Sign In
                  </Link>
                </Typography>
              </Box>
            </form>
          </CardContent>
        </Paper>

        {/* Benefits preview */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255, 255, 255, 0.8)',
              mb: 2
            }}
          >
            🏆 Track Stats • 👥 Multiplayer Matches • 🎖️ Achievements
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.6)',
              maxWidth: 400,
              mx: 'auto'
            }}
          >
            Join thousands of players building empires, conducting diplomacy, 
            and competing for world domination in epic multiplayer battles.
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}

export default RegisterPage