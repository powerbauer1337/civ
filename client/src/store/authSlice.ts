import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'
import config from '../config/config'

interface User {
  id: string
  username: string
  email: string
  gamesPlayed: number
  gamesWon: number
  winRate: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: config.ENABLE_DEMO_MODE, // Auto-authenticate in demo mode
  isLoading: false,
  error: null
}

// API base URL
const API_BASE = config.API_BASE_URL + '/api'

// Demo mode user
const DEMO_USER: User = {
  id: 'demo-user',
  username: 'Demo Player',
  email: 'demo@example.com',
  gamesPlayed: 5,
  gamesWon: 3,
  winRate: '60.0'
}

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { username: string; password: string }, { rejectWithValue }) => {
    // Demo mode - auto login
    if (config.ENABLE_DEMO_MODE) {
      return new Promise<{ user: User; token: string }>((resolve) => {
        setTimeout(() => {
          const token = 'demo-token'
          localStorage.setItem('token', token)
          resolve({ user: DEMO_USER, token })
        }, 1000)
      })
    }

    try {
      const response = await axios.post(`${API_BASE}/auth/login`, credentials)
      const { user, token } = response.data
      localStorage.setItem('token', token)
      return { user, token }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Login failed')
    }
  }
)

export const register = createAsyncThunk(
  'auth/register',
  async (userData: { username: string; email: string; password: string }, { rejectWithValue }) => {
    // Demo mode - auto register
    if (config.ENABLE_DEMO_MODE) {
      return new Promise<{ user: User; token: string }>((resolve) => {
        setTimeout(() => {
          const token = 'demo-token'
          const user = { ...DEMO_USER, username: userData.username, email: userData.email }
          localStorage.setItem('token', token)
          resolve({ user, token })
        }, 1000)
      })
    }

    try {
      const response = await axios.post(`${API_BASE}/auth/register`, userData)
      const { user, token } = response.data
      localStorage.setItem('token', token)
      return { user, token }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Registration failed')
    }
  }
)

export const verifyToken = createAsyncThunk(
  'auth/verify',
  async (_, { rejectWithValue }) => {
    // Demo mode - always valid token
    if (config.ENABLE_DEMO_MODE) {
      const token = localStorage.getItem('token')
      if (token === 'demo-token') {
        return { user: DEMO_USER, token }
      }
    }

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('No token found')
      }
      
      const response = await axios.get(`${API_BASE}/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      return { user: response.data.user, token }
    } catch (error: any) {
      localStorage.removeItem('token')
      return rejectWithValue(error.response?.data?.error || 'Token verification failed')
    }
  }
)

export const getProfile = createAsyncThunk(
  'auth/profile',
  async (_, { rejectWithValue }) => {
    // Demo mode
    if (config.ENABLE_DEMO_MODE) {
      return DEMO_USER
    }

    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to get profile')
    }
  }
)

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData: { email?: string; currentPassword?: string; newPassword?: string }, { rejectWithValue }) => {
    // Demo mode
    if (config.ENABLE_DEMO_MODE) {
      return { ...DEMO_USER, ...profileData }
    }

    try {
      const token = localStorage.getItem('token')
      const response = await axios.put(`${API_BASE}/auth/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      return response.data.user
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Profile update failed')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    ...initialState,
    // Auto-login in demo mode
    user: config.ENABLE_DEMO_MODE ? DEMO_USER : null,
    token: config.ENABLE_DEMO_MODE ? 'demo-token' : initialState.token
  },
  reducers: {
    logout: (state) => {
      localStorage.removeItem('token')
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.error = null
    },
    clearError: (state) => {
      state.error = null
    },
    updateUserStats: (state, action: PayloadAction<{ gamesPlayed: number; gamesWon: number }>) => {
      if (state.user) {
        state.user.gamesPlayed = action.payload.gamesPlayed
        state.user.gamesWon = action.payload.gamesWon
        state.user.winRate = state.user.gamesPlayed > 0 
          ? ((state.user.gamesWon / state.user.gamesPlayed) * 100).toFixed(1)
          : '0.0'
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        state.isAuthenticated = false
      })
      
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        state.isAuthenticated = false
      })
      
      // Verify token
      .addCase(verifyToken.pending, (state) => {
        state.isLoading = true
      })
      .addCase(verifyToken.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(verifyToken.rejected, (state) => {
        state.isLoading = false
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.error = null
      })
      
      // Get profile
      .addCase(getProfile.fulfilled, (state, action) => {
        state.user = action.payload
      })
      
      // Update profile
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload
      })
  }
})

export const { logout, clearError, updateUserStats } = authSlice.actions
export default authSlice.reducer