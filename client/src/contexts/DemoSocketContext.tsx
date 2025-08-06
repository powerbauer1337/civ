import React, { createContext, useContext, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { GameState, GameConfig, PlayerInfo, GameUtils, ResourceType, VictoryType } from '@civ-game/shared'
import { 
  setConnectionStatus,
  updateGameState,
  gameStarted,
  gameEnded
} from '../store/gameSlice'
import { showInfo, showSuccess, showWarning } from '../store/uiSlice'
import config from '../config/config'

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
    const defaultConfig: GameConfig = {
      mapSize: gameConfig.mapSize || { width: 20, height: 15 },
      maxPlayers: 4,
      turnTimeLimit: 0, // No time limit in demo
      victoryConditions: [VictoryType.DOMINATION, VictoryType.SCIENCE],
      startingResources: {
        [ResourceType.GOLD]: 100,
        [ResourceType.SCIENCE]: 0,
        [ResourceType.CULTURE]: 0,
        [ResourceType.PRODUCTION]: 0,
        [ResourceType.FOOD]: 0
      }
    }

    const newGameState = new GameState(defaultConfig)
    
    // Add human player
    const humanPlayer: PlayerInfo = {
      id: 'demo-player-1',
      name: playerName,
      color: '#FF6B6B',
      civilization: 'Romans',
      resources: { ...defaultConfig.startingResources },
      technologies: new Set(),
      isActive: true,
      score: 0
    }
    newGameState.addPlayer(humanPlayer)

    // Add AI players for demo
    const aiPlayers = [
      { name: 'AI Caesar', civilization: 'Romans', color: '#4ECDC4' },
      { name: 'AI Cleopatra', civilization: 'Egyptians', color: '#45B7D1' },
      { name: 'AI Gandhi', civilization: 'Indians', color: '#96CEB4' }
    ]

    aiPlayers.forEach((ai, index) => {
      const aiPlayer: PlayerInfo = {
        id: `demo-ai-${index + 2}`,
        name: ai.name,
        color: ai.color,
        civilization: ai.civilization,
        resources: { ...defaultConfig.startingResources },
        technologies: new Set(),
        isActive: true,
        score: 0
      }
      newGameState.addPlayer(aiPlayer)
    })

    return newGameState
  }

  const simulateAITurn = (gameState: GameState) => {
    // Simple AI simulation - just end turn for AI players
    setTimeout(() => {
      if (gameState && gameState.phase === 'active') {
        const currentPlayer = gameState.getCurrentPlayer()
        
        if (currentPlayer.id.startsWith('demo-ai-')) {
          // AI performs some basic actions
          currentPlayer.resources.gold += Math.floor(Math.random() * 20) + 10
          currentPlayer.resources.science += Math.floor(Math.random() * 10) + 5
          
          // End AI turn
          gameState.nextTurn()
          setGameState({ ...gameState })
          dispatch(updateGameState(gameState.serialize()))
          
          // Continue AI simulation if still AI turn
          const newCurrentPlayer = gameState.getCurrentPlayer()
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
      dispatch(updateGameState(newGame.serialize()))
    } catch (error) {
      dispatch(showWarning({ title: 'Demo Error', message: 'Failed to create demo game' }))
    }
  }

  const joinGame = (gameId: string, playerName: string) => {
    // In demo mode, just create a new game
    createGame(playerName, {})
  }

  const leaveGame = () => {
    setGameState(null)
    dispatch(showInfo({ title: 'Left Game', message: 'Returned to demo lobby' }))
  }

  const startGame = () => {
    if (gameState) {
      gameState.startGame()
      setGameState({ ...gameState })
      dispatch(gameStarted(gameState.serialize()))
      dispatch(showSuccess({ title: 'Demo Game Started', message: 'Game has begun! It\'s your turn.' }))
      
      // Start AI simulation for other players
      simulateAITurn(gameState)
    }
  }

  const sendGameAction = (action: any) => {
    if (gameState && gameState.phase === 'active') {
      const success = gameState.executeAction(action)
      
      if (success) {
        setGameState({ ...gameState })
        dispatch(updateGameState(gameState.serialize()))
        
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
      dispatch(updateGameState(gameState.serialize()))
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