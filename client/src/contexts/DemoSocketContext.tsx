import React, { createContext, useContext, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { GameState, GameSettings, VictoryCondition } from '@civ-game/shared'
import { 
  setConnectionStatus,
  updateGameState,
  gameStarted
} from '../store/gameSlice'
import { showInfo, showSuccess, showWarning } from '../store/uiSlice'

interface DemoSocketContextValue {
  socket: null
  connected: boolean
  createGame: (playerName: string, gameConfig: any) => void
  joinGame: (gameId: string, playerName: string) => void
  leaveGame: () => void
  startGame: () => void
  sendGameAction: (action: any) => void
  requestGameState: () => void
}

const DemoSocketContext = createContext<DemoSocketContextValue>({
  socket: null,
  connected: true, // Always connected in demo mode
  createGame: () => {},
  joinGame: () => {},
  leaveGame: () => {},
  startGame: () => {},
  sendGameAction: () => {},
  requestGameState: () => {}
})

export const useDemoSocket = () => {
  const context = useContext(DemoSocketContext)
  if (!context) {
    throw new Error('useDemoSocket must be used within a DemoSocketProvider')
  }
  return context
}

interface DemoSocketProviderProps {
  children: React.ReactNode
}

export const DemoSocketProvider: React.FC<DemoSocketProviderProps> = ({ children }) => {
  const dispatch = useDispatch()
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [connected] = useState(true)

  useEffect(() => {
    // Simulate connection
    dispatch(setConnectionStatus('connected'))
    dispatch(showSuccess({ title: 'Demo Mode', message: 'Running in offline demo mode' }))
  }, [dispatch])

  const createDemoGame = (playerName: string, gameConfig: any): GameState => {
    const defaultSettings: GameSettings = {
      mapSize: gameConfig.mapSize || { width: 20, height: 15 },
      turnTimeLimit: 0, // No time limit in demo
      maxTurns: 200,
      victoryConditions: [VictoryCondition.DOMINATION, VictoryCondition.SCIENCE],
      startingResources: {
        gold: 100,
        science: 0,
        culture: 0,
        production: 0,
        food: 50,
        faith: 0
      },
      difficulty: 'prince' as any
    }

    // Create a basic GameState object
    const newGameState: GameState = {
      id: 'demo-game-1',
      gameId: 'demo-game-1',
      currentPlayer: 'demo-player-1',
      turn: 1,
      currentTurn: 1,
      phase: 'setup' as any,
      map: {
        width: defaultSettings.mapSize.width,
        height: defaultSettings.mapSize.height,
        tiles: []
      },
      players: [],
      cities: {},
      units: {},
      lastUpdate: new Date()
    }
    
    // Add human player to the players array
    
    // Add to GameState players (using PlayerState type)
    newGameState.players.push({
      id: 'demo-player-1',
      name: playerName,
      civilization: 'Romans',
      resources: defaultSettings.startingResources,
      cities: [],
      units: [],
      technologies: [],
      score: 0,
      isAlive: true,
      color: '#FF6B6B'
    } as any)

    // Add AI players for demo
    const aiPlayers = [
      { name: 'AI Caesar', civilization: 'Romans', color: '#4ECDC4' },
      { name: 'AI Cleopatra', civilization: 'Egyptians', color: '#45B7D1' },
      { name: 'AI Gandhi', civilization: 'Indians', color: '#96CEB4' }
    ]

    aiPlayers.forEach((ai, index) => {
      // Add AI players to the players array
      newGameState.players.push({
        id: `demo-ai-${index + 2}`,
        name: ai.name,
        civilization: ai.civilization,
        resources: defaultSettings.startingResources,
        cities: [],
        units: [],
        technologies: [],
        score: 0,
        isAlive: true,
        color: ai.color
      } as any)
    })

    return newGameState
  }

  const simulateAITurn = (gameState: GameState) => {
    // Simple AI simulation - just end turn for AI players
    setTimeout(() => {
      if (gameState && gameState.phase === 'active') {
        const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayer)
        
        if (currentPlayer && currentPlayer.id.startsWith('demo-ai-')) {
          // AI performs some basic actions
          if (currentPlayer.resources) {
            currentPlayer.resources.gold += Math.floor(Math.random() * 20) + 10
            currentPlayer.resources.science += Math.floor(Math.random() * 10) + 5
          }
          
          // Move to next player
          const currentIndex = gameState.players.findIndex(p => p.id === gameState.currentPlayer)
          const nextIndex = (currentIndex + 1) % gameState.players.length
          gameState.currentPlayer = gameState.players[nextIndex].id
          gameState.turn += 1
          gameState.currentTurn = gameState.turn
          
          setGameState({ ...gameState })
          dispatch(updateGameState(gameState))
          
          // Continue AI simulation if still AI turn
          const newCurrentPlayer = gameState.players[nextIndex]
          if (newCurrentPlayer.id.startsWith('demo-ai-')) {
            simulateAITurn(gameState)
          }
        }
      }
    }, 1000) // 1 second delay for AI actions
  }

  // Demo socket functions
  const createGame = (playerName: string, gameConfig: any) => {
    try {
      const newGame = createDemoGame(playerName, gameConfig)
      setGameState(newGame)
      
      dispatch(showSuccess({ title: 'Demo Game Created', message: 'Created offline demo game' }))
      dispatch(updateGameState(newGame))
    } catch (error) {
      dispatch(showWarning({ title: 'Demo Error', message: 'Failed to create demo game' }))
    }
  }

  const joinGame = (_gameId: string, playerName: string) => {
    // In demo mode, just create a new game
    createGame(playerName, {})
  }

  const leaveGame = () => {
    setGameState(null)
    dispatch(showInfo({ title: 'Left Game', message: 'Returned to demo lobby' }))
  }

  const startGame = () => {
    if (gameState) {
      // Update game phase to active
      gameState.phase = 'active' as any
      setGameState({ ...gameState })
      dispatch(gameStarted(gameState))
      dispatch(showSuccess({ title: 'Demo Game Started', message: 'Game has begun! It\'s your turn.' }))
      
      // Start AI simulation for other players
      simulateAITurn(gameState)
    }
  }

  const sendGameAction = (action: any) => {
    if (gameState && gameState.phase === 'active') {
      // Simulate action execution (simplified for demo)
      const success = true // Always succeed in demo mode for simplicity
      
      if (success) {
        setGameState({ ...gameState })
        dispatch(updateGameState(gameState))
        
        if (action.type === 'end_turn') {
          dispatch(showInfo({ title: 'Turn Ended', message: 'AI players are taking their turns...' }))
          simulateAITurn(gameState)
        }
      } else {
        dispatch(showWarning({ title: 'Action Failed', message: 'That action is not valid' }))
      }
    }
  }

  const requestGameState = () => {
    if (gameState) {
      dispatch(updateGameState(gameState))
    }
  }

  const contextValue: DemoSocketContextValue = {
    socket: null,
    connected,
    createGame,
    joinGame,
    leaveGame,
    startGame,
    sendGameAction,
    requestGameState
  }

  return (
    <DemoSocketContext.Provider value={contextValue}>
      {children}
    </DemoSocketContext.Provider>
  )
}

export default DemoSocketContext