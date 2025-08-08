const { io } = require('socket.io-client');

console.log('🔌 Starting multi-client WebSocket test...');

// Create two clients to simulate multiplayer interaction
const client1 = io('http://localhost:4002', { transports: ['websocket'] });
const client2 = io('http://localhost:4002', { transports: ['websocket'] });

let client1Connected = false;
let client2Connected = false;

// Client 1 setup
client1.on('connect', () => {
  console.log('✅ Client 1 connected:', client1.id);
  client1Connected = true;
});

client1.on('welcome', (data) => {
  console.log('👋 Client 1 welcome:', data.message);
});

client1.on('game_joined', (data) => {
  console.log('🏁 Client 1 joined game:', data.gameId);
});

client1.on('player_joined', (data) => {
  console.log('👥 Client 1 sees player joined:', data.playerId);
});

client1.on('game_update', (data) => {
  console.log('📊 Client 1 received update:', data.action, 'from', data.playerId);
});

// Client 2 setup
client2.on('connect', () => {
  console.log('✅ Client 2 connected:', client2.id);
  client2Connected = true;
});

client2.on('welcome', (data) => {
  console.log('👋 Client 2 welcome:', data.message);
});

client2.on('game_joined', (data) => {
  console.log('🏁 Client 2 joined game:', data.gameId);
});

client2.on('player_joined', (data) => {
  console.log('👥 Client 2 sees player joined:', data.playerId);
});

client2.on('game_update', (data) => {
  console.log('📊 Client 2 received update:', data.action, 'from', data.playerId);
});

// Test multiplayer interaction
setTimeout(() => {
  if (client1Connected && client2Connected) {
    console.log('🎯 Both clients connected, starting multiplayer test...');
    
    // Both clients join the same game
    client1.emit('join_game', {
      gameId: 'game_1754583173679',
      playerId: 'player_1754583184444_utlqvifgx' // Alice
    });
    
    client2.emit('join_game', {
      gameId: 'game_1754583173679', 
      playerId: 'player_1754583185816_3olgadi5t' // Bob
    });
    
    // Client 1 sends action after joining
    setTimeout(() => {
      console.log('🎮 Client 1 (Alice) sending action...');
      client1.emit('game_action', {
        gameId: 'game_1754583173679',
        playerId: 'player_1754583184444_utlqvifgx',
        action: 'build_city',
        payload: { location: { x: 3, y: 3 }, name: 'New Rome' }
      });
    }, 1000);
    
    // Client 2 sends different action
    setTimeout(() => {
      console.log('🎮 Client 2 (Bob) sending action...');
      client2.emit('game_action', {
        gameId: 'game_1754583173679',
        playerId: 'player_1754583185816_3olgadi5t',
        action: 'train_unit',
        payload: { unitType: 'warrior', cityId: 'city_456' }
      });
    }, 2000);
    
  } else {
    console.log('❌ Not all clients connected');
  }
}, 1000);

// Clean up after test
setTimeout(() => {
  console.log('🔚 Multi-client test complete');
  client1.disconnect();
  client2.disconnect();
  process.exit(0);
}, 8000);