/**
 * Quick database check script to see what's been persisted
 */

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');

const DB_PATH = './data/civilization.db';

async function checkDatabase() {
  console.log('🔍 Checking database for persisted actions...');
  
  if (!fs.existsSync(DB_PATH)) {
    console.log('❌ Database file not found');
    return;
  }
  
  try {
    const db = await open({ filename: DB_PATH, driver: sqlite3.Database });
    
    // Check recent game actions
    const actions = await db.all(
      'SELECT * FROM game_actions ORDER BY timestamp DESC LIMIT 10'
    );
    
    console.log(`📊 Found ${actions.length} actions in database:`);
    
    actions.forEach((action, index) => {
      console.log(`${index + 1}. Game: ${action.game_id}`);
      console.log(`   Action: ${action.action_type} by ${action.player_id}`);
      console.log(`   Turn: ${action.turn_number}, Time: ${action.processing_time}ms`);
      console.log(`   Data: ${action.action_data}`);
      console.log('');
    });
    
    // Check recent games
    const games = await db.all(
      'SELECT id, name, status, turn_count, created_at FROM games ORDER BY created_at DESC LIMIT 5'
    );
    
    console.log(`🎮 Found ${games.length} recent games:`);
    games.forEach((game, index) => {
      console.log(`${index + 1}. ${game.id} - ${game.name || 'Unnamed'}`);
      console.log(`   Status: ${game.status}, Turns: ${game.turn_count}`);
      console.log(`   Created: ${game.created_at}`);
      console.log('');
    });
    
    await db.close();
    console.log('✅ Database check complete');
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

checkDatabase();