import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface UIState {
  sidebarOpen: boolean
  bottomPanelOpen: boolean
  currentPanel: 'units' | 'cities' | 'tech' | 'diplomacy' | 'none'
  notifications: Notification[]
  modalOpen: string | null
  cameraPosition: { x: number; y: number }
  zoomLevel: number
  showGrid: boolean
  showResourceIcons: boolean
  showUnitPaths: boolean
  gameSpeed: number
  soundEnabled: boolean
  musicEnabled: boolean
}

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: number
  duration?: number
  actions?: { label: string; action: string }[]
}

const initialState: UIState = {
  sidebarOpen: false,
  bottomPanelOpen: false,
  currentPanel: 'none',
  notifications: [],
  modalOpen: null,
  cameraPosition: { x: 0, y: 0 },
  zoomLevel: 1.0,
  showGrid: true,
  showResourceIcons: true,
  showUnitPaths: true,
  gameSpeed: 1,
  soundEnabled: true,
  musicEnabled: true
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Panel management
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen
    },

    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload
    },

    toggleBottomPanel: (state) => {
      state.bottomPanelOpen = !state.bottomPanelOpen
    },

    setBottomPanelOpen: (state, action: PayloadAction<boolean>) => {
      state.bottomPanelOpen = action.payload
    },

    setCurrentPanel: (state, action: PayloadAction<typeof state.currentPanel>) => {
      state.currentPanel = action.payload
      
      // Open sidebar if switching to a panel
      if (action.payload !== 'none') {
        state.sidebarOpen = true
      }
    },

    // Modal management
    openModal: (state, action: PayloadAction<string>) => {
      state.modalOpen = action.payload
    },

    closeModal: (state) => {
      state.modalOpen = null
    },

    // Camera and view
    setCameraPosition: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.cameraPosition = action.payload
    },

    setZoomLevel: (state, action: PayloadAction<number>) => {
      state.zoomLevel = Math.max(0.5, Math.min(3.0, action.payload))
    },

    zoomIn: (state) => {
      state.zoomLevel = Math.min(3.0, state.zoomLevel * 1.2)
    },

    zoomOut: (state) => {
      state.zoomLevel = Math.max(0.5, state.zoomLevel / 1.2)
    },

    // Display options
    toggleGrid: (state) => {
      state.showGrid = !state.showGrid
    },

    setShowGrid: (state, action: PayloadAction<boolean>) => {
      state.showGrid = action.payload
    },

    toggleResourceIcons: (state) => {
      state.showResourceIcons = !state.showResourceIcons
    },

    setShowResourceIcons: (state, action: PayloadAction<boolean>) => {
      state.showResourceIcons = action.payload
    },

    toggleUnitPaths: (state) => {
      state.showUnitPaths = !state.showUnitPaths
    },

    setShowUnitPaths: (state, action: PayloadAction<boolean>) => {
      state.showUnitPaths = action.payload
    },

    // Game settings
    setGameSpeed: (state, action: PayloadAction<number>) => {
      state.gameSpeed = Math.max(0.5, Math.min(3.0, action.payload))
    },

    toggleSound: (state) => {
      state.soundEnabled = !state.soundEnabled
    },

    setSoundEnabled: (state, action: PayloadAction<boolean>) => {
      state.soundEnabled = action.payload
    },

    toggleMusic: (state) => {
      state.musicEnabled = !state.musicEnabled
    },

    setMusicEnabled: (state, action: PayloadAction<boolean>) => {
      state.musicEnabled = action.payload
    },

    // Notifications
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now()
      }
      
      state.notifications.push(notification)
      
      // Automatically remove notifications after duration (default 5 seconds)
      if (!notification.duration) {
        notification.duration = 5000
      }
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload)
    },

    clearNotifications: (state) => {
      state.notifications = []
    },

    // Quick action creators for common notifications
    showInfo: (state, action: PayloadAction<{ title: string; message: string }>) => {
      const notification: Notification = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: 'info',
        title: action.payload.title,
        message: action.payload.message,
        timestamp: Date.now(),
        duration: 5000
      }
      state.notifications.push(notification)
    },

    showSuccess: (state, action: PayloadAction<{ title: string; message: string }>) => {
      const notification: Notification = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: 'success',
        title: action.payload.title,
        message: action.payload.message,
        timestamp: Date.now(),
        duration: 5000
      }
      state.notifications.push(notification)
    },

    showWarning: (state, action: PayloadAction<{ title: string; message: string }>) => {
      const notification: Notification = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: 'warning',
        title: action.payload.title,
        message: action.payload.message,
        timestamp: Date.now(),
        duration: 7000
      }
      state.notifications.push(notification)
    },

    showError: (state, action: PayloadAction<{ title: string; message: string }>) => {
      const notification: Notification = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: 'error',
        title: action.payload.title,
        message: action.payload.message,
        timestamp: Date.now(),
        duration: 10000
      }
      state.notifications.push(notification)
    },

    // Bulk UI state updates for performance
    updateUIState: (state, action: PayloadAction<Partial<UIState>>) => {
      Object.assign(state, action.payload)
    },

    // Reset UI to default state
    resetUI: (state) => {
      Object.assign(state, initialState)
    }
  }
})

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleBottomPanel,
  setBottomPanelOpen,
  setCurrentPanel,
  openModal,
  closeModal,
  setCameraPosition,
  setZoomLevel,
  zoomIn,
  zoomOut,
  toggleGrid,
  setShowGrid,
  toggleResourceIcons,
  setShowResourceIcons,
  toggleUnitPaths,
  setShowUnitPaths,
  setGameSpeed,
  toggleSound,
  setSoundEnabled,
  toggleMusic,
  setMusicEnabled,
  addNotification,
  removeNotification,
  clearNotifications,
  showInfo,
  showSuccess,
  showWarning,
  showError,
  updateUIState,
  resetUI
} = uiSlice.actions

export default uiSlice.reducer