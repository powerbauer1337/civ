import { useEffect, useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { apiConfig } from '../config/api'

interface UseWebSocketOptions {
  onConnect?: (socket: Socket) => void
  onDisconnect?: () => void
  onError?: (error: Error) => void
  autoConnect?: boolean
}

interface WebSocketState {
  socket: Socket | null
  connected: boolean
  connecting: boolean
  error: string | null
}

export const useWebSocket = (
  gameId?: string,
  playerId?: string,
  options: UseWebSocketOptions = {}
) => {
  const [state, setState] = useState<WebSocketState>({
    socket: null,
    connected: false,
    connecting: false,
    error: null
  })
  
  const socketRef = useRef<Socket | null>(null)
  const { onConnect, onDisconnect, onError, autoConnect = true } = options
  
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return
    
    setState(prev => ({ ...prev, connecting: true, error: null }))
    
    const newSocket = io(apiConfig.socketURL, {
      ...apiConfig.websocket,
      autoConnect: false
    })
    
    newSocket.on('connect', () => {
      console.log('🔌 WebSocket connected:', newSocket.id)
      setState(prev => ({ 
        ...prev, 
        connected: true, 
        connecting: false, 
        socket: newSocket 
      }))
      onConnect?.(newSocket)
      
      // Auto-join game if gameId and playerId provided
      if (gameId && playerId) {
        newSocket.emit('join_game', { gameId, playerId })
      }
    })
    
    newSocket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason)
      setState(prev => ({ 
        ...prev, 
        connected: false, 
        connecting: false 
      }))
      onDisconnect?.()
    })
    
    newSocket.on('connect_error', (error) => {
      console.error('🚨 WebSocket connection error:', error)
      setState(prev => ({ 
        ...prev, 
        connecting: false, 
        error: error.message 
      }))
      onError?.(error)
    })
    
    socketRef.current = newSocket
    newSocket.connect()
  }, [gameId, playerId, onConnect, onDisconnect, onError])
  
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      setState({
        socket: null,
        connected: false,
        connecting: false,
        error: null
      })
    }
  }, [])
  
  const emit = useCallback((event: string, data: any) => {
    if (state.socket?.connected) {
      state.socket.emit(event, data)
    } else {
      console.warn('WebSocket not connected, cannot emit:', event)
    }
  }, [state.socket])
  
  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (state.socket) {
      state.socket.on(event, callback)
    }
  }, [state.socket])
  
  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (state.socket) {
      state.socket.off(event, callback)
    }
  }, [state.socket])
  
  useEffect(() => {
    if (autoConnect) {
      connect()
    }
    
    return () => {
      disconnect()
    }
  }, [connect, disconnect, autoConnect])
  
  return {
    ...state,
    connect,
    disconnect,
    emit,
    on,
    off
  }
}

export default useWebSocket
