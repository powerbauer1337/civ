const { io } = require('socket.io-client');

console.log('🔌 Starting WebSocket test client...');

// Connect to the test server
const socket = io('http://localhost:4002', {
  transports: ['websocket']
});

// Connection events
socket.on('connect', () => {
  console.log('✅ Connected to server with socket ID:', socket.id);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.log('❌ Connection error:', error.message);
});

// Game events
socket.on('welcome', (data) => {
  console.log('👋 Welcome message:', JSON.stringify(data, null, 2));
});

socket.on('game_started', (data) => {
  console.log('🎮 Game started:', JSON.stringify(data, null, 2));
});

socket.on('game_joined', (data) => {
  console.log('🏁 Joined game:', JSON.stringify(data, null, 2));
});

socket.on('player_joined', (data) => {
  console.log('👥 Player joined:', JSON.stringify(data, null, 2));
});

socket.on('game_update', (data) => {
  console.log('📊 Game update:', JSON.stringify(data, null, 2));
});

socket.on('action_acknowledged', (data) => {
  console.log('✅ Action acknowledged:', JSON.stringify(data, null, 2));
});

// Wait for connection then test game actions
setTimeout(() => {
  if (socket.connected) {
    console.log('🎯 Testing game room joining...');
    
    // Join game room
    socket.emit('join_game', {
      gameId: 'game_1754583173679',
      playerId: 'player_1754583184444_utlqvifgx'
    });
    
    // Send a game action after joining
    setTimeout(() => {
      console.log('🎮 Sending test game action...');
      socket.emit('game_action', {
        gameId: 'game_1754583173679',
        playerId: 'player_1754583184444_utlqvifgx',
        action: 'move_unit',
        payload: {
          unitId: 'unit_123',
          from: { x: 1, y: 1 },
          to: { x: 2, y: 1 }
        }
      });
    }, 1000);
    
  } else {
    console.log('❌ Socket not connected for testing');
  }
}, 500);

// Keep the client running for 10 seconds to see all responses
setTimeout(() => {
  console.log('🔚 Test complete, disconnecting...');
  socket.disconnect();
  process.exit(0);
}, 10000);