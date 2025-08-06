import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from './store/store'
import { verifyToken } from './store/authSlice'
import LoadingScreen from './components/LoadingScreen'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import LobbyPage from './pages/LobbyPage'
import GamePage from './pages/GamePage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SocketProvider } from './contexts/SocketContext'
import { DemoSocketProvider } from './contexts/DemoSocketContext'
import config from './config/config'

function App() {
  const dispatch = useDispatch()
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    // Check if user has a valid token on app start (skip in demo mode)
    if (!config.DEMO_MODE.ENABLE_LOCAL_STORAGE_PERSISTENCE) {
      const token = localStorage.getItem('token')
      if (token) {
        dispatch(verifyToken() as any)
      }
    }
  }, [dispatch])

  if (isLoading) {
    return <LoadingScreen message="Initializing..." />
  }

  // Choose socket provider based on demo mode
  const SocketProviderComponent = config.ENABLE_DEMO_MODE ? DemoSocketProvider : SocketProvider

  return (
    <SocketProviderComponent>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/lobby" replace /> : <LoginPage />
          } 
        />
        <Route 
          path="/register" 
          element={
            isAuthenticated ? <Navigate to="/lobby" replace /> : <RegisterPage />
          } 
        />

        {/* Protected routes */}
        <Route
          path="/lobby"
          element={
            <ProtectedRoute>
              <LobbyPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/:gameId"
          element={
            <ProtectedRoute>
              <GamePage />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route 
          path="/" 
          element={
            <Navigate to={isAuthenticated ? "/lobby" : "/login"} replace />
          } 
        />

        {/* Catch all redirect */}
        <Route 
          path="*" 
          element={
            <Navigate to={isAuthenticated ? "/lobby" : "/login"} replace />
          } 
        />
      </Routes>
    </SocketProviderComponent>
  )
}

export default App