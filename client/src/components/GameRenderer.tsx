import React, { useEffect, useRef, useState } from 'react'
import { Box, Typography, Paper } from '@mui/material'
import { GameState } from '@civ-game/shared'
import Phaser from 'phaser'

interface GameRendererProps {
  gameState: GameState
}

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' })
  }

  preload() {
    // Create simple colored rectangles for tiles, units, and cities
    this.load.image('hex-tile', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
  }

  create() {
    // Set up the hexagonal grid
    this.setupHexGrid()
    
    // Enable camera controls
    this.cameras.main.setZoom(0.8)
    
    // Add input handling
    this.input.on('wheel', (pointer: any, gameObjects: any, deltaX: number, deltaY: number) => {
      const camera = this.cameras.main
      const zoomFactor = deltaY > 0 ? 0.9 : 1.1
      camera.setZoom(Phaser.Math.Clamp(camera.zoom * zoomFactor, 0.3, 2.0))
    })
    
    // Enable camera dragging
    this.input.on('pointerdown', () => {
      this.input.dragTimeThreshold = 16
    })
    
    this.input.on('pointermove', (pointer: any) => {
      if (pointer.isDown) {
        const camera = this.cameras.main
        camera.scrollX -= (pointer.x - pointer.prevPosition.x) / camera.zoom
        camera.scrollY -= (pointer.y - pointer.prevPosition.y) / camera.zoom
      }
    })
  }

  setupHexGrid() {
    const hexSize = 30
    const hexWidth = hexSize * 2
    const hexHeight = Math.sqrt(3) * hexSize
    
    // Create a simple grid of hexagons
    for (let q = -10; q <= 10; q++) {
      for (let r = -8; r <= 8; r++) {
        const s = -q - r
        if (Math.abs(q) + Math.abs(r) + Math.abs(s) > 16) continue
        
        const x = hexSize * (3/2 * q)
        const y = hexSize * (Math.sqrt(3)/2 * q + Math.sqrt(3) * r)
        
        // Create hex tile graphics
        const hex = this.add.graphics()
        
        // Random terrain color
        const terrainColors = [0x90EE90, 0xDEB887, 0x8FBC8F, 0x228B22, 0x4682B4]
        const color = terrainColors[Math.floor(Math.random() * terrainColors.length)]
        
        hex.fillStyle(color, 0.8)
        hex.lineStyle(1, 0x000000, 0.3)
        
        // Draw hexagon
        const points = []
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i
          points.push(x + hexSize * Math.cos(angle))
          points.push(y + hexSize * Math.sin(angle))
        }
        
        hex.fillPoints(points)
        hex.strokePoints(points)
        
        // Add coordinate text
        const coordText = this.add.text(x, y, `${q},${r}`, {
          fontSize: '8px',
          color: '#000000'
        })
        coordText.setOrigin(0.5, 0.5)
        
        // Make hex interactive
        const hexZone = this.add.zone(x, y, hexWidth, hexHeight)
        hexZone.setInteractive()
        hexZone.on('pointerdown', () => {
          console.log(`Clicked hex: ${q}, ${r}, ${s}`)
          hex.clear()
          hex.fillStyle(0xFFFF00, 0.8)
          hex.lineStyle(2, 0x000000, 0.8)
          hex.fillPoints(points)
          hex.strokePoints(points)
        })
      }
    }
    
    // Add some sample units
    for (let i = 0; i < 5; i++) {
      const x = (Math.random() - 0.5) * 600
      const y = (Math.random() - 0.5) * 400
      
      const unit = this.add.graphics()
      unit.fillStyle(0xFF0000, 1.0)
      unit.fillCircle(x, y, 8)
      unit.lineStyle(2, 0x000000, 1.0)
      unit.strokeCircle(x, y, 8)
      
      // Add unit label
      const unitText = this.add.text(x, y - 20, 'Warrior', {
        fontSize: '10px',
        color: '#FFFFFF',
        backgroundColor: '#000000',
        padding: { x: 2, y: 1 }
      })
      unitText.setOrigin(0.5, 0.5)
    }
    
    // Add some sample cities
    for (let i = 0; i < 3; i++) {
      const x = (Math.random() - 0.5) * 400
      const y = (Math.random() - 0.5) * 300
      
      const city = this.add.graphics()
      city.fillStyle(0x0000FF, 1.0)
      city.fillRect(x - 10, y - 10, 20, 20)
      city.lineStyle(2, 0x000000, 1.0)
      city.strokeRect(x - 10, y - 10, 20, 20)
      
      // Add city label
      const cityText = this.add.text(x, y - 25, `City ${i + 1}`, {
        fontSize: '12px',
        color: '#FFFFFF',
        backgroundColor: '#000000',
        padding: { x: 4, y: 2 }
      })
      cityText.setOrigin(0.5, 0.5)
    }
  }

  update() {
    // Game update loop
  }
}

const GameRenderer: React.FC<GameRendererProps> = ({ gameState }) => {
  const gameRef = useRef<HTMLDivElement>(null)
  const phaserGameRef = useRef<Phaser.Game | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (gameRef.current && !phaserGameRef.current) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: '100%',
        height: '100%',
        parent: gameRef.current,
        backgroundColor: '#87CEEB',
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        scene: [GameScene],
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 0 },
            debug: false
          }
        }
      }

      phaserGameRef.current = new Phaser.Game(config)
      setInitialized(true)
    }

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true)
        phaserGameRef.current = null
        setInitialized(false)
      }
    }
  }, [])

  // Update game when gameState changes
  useEffect(() => {
    if (initialized && phaserGameRef.current) {
      // Update Phaser scene with new game state
      const scene = phaserGameRef.current.scene.getScene('GameScene') as GameScene
      if (scene) {
        // Update units, cities, etc. based on gameState
        console.log('Updating game scene with new state:', gameState)
      }
    }
  }, [gameState, initialized])

  if (!initialized) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#87CEEB'
      }}>
        <Typography variant="h6" sx={{ color: 'white' }}>
          Initializing Game Renderer...
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      ref={gameRef}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        '& canvas': {
          display: 'block'
        }
      }}
    />
  )
}

export default GameRenderer