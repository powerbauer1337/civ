import React from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'

interface LoadingScreenProps {
  message?: string
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...' }) => {
  return (
    <Box
      className="loading-spinner"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        color: 'white'
      }}
    >
      <CircularProgress 
        size={60} 
        sx={{ 
          color: '#FFD700',
          mb: 3
        }} 
      />
      <Typography 
        variant="h5" 
        sx={{ 
          fontWeight: 300,
          letterSpacing: 1,
          textAlign: 'center'
        }}
      >
        {message}
      </Typography>
    </Box>
  )
}

export default LoadingScreen