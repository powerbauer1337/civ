-- Civilization Game Database Schema
-- SQLite3 Database for game persistence

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    total_games INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    games_lost INTEGER DEFAULT 0,
    total_playtime INTEGER DEFAULT 0, -- in seconds
    elo_rating INTEGER DEFAULT 1200,
    achievements TEXT, -- JSON array of achievement IDs
    preferences TEXT -- JSON object of user preferences
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    name TEXT,
    host_player_id TEXT NOT NULL,
    map_width INTEGER NOT NULL,
    map_height INTEGER NOT NULL,
    max_players INTEGER NOT NULL,
    game_mode TEXT CHECK(game_mode IN ('multiplayer', 'singleplayer')) NOT NULL,
    difficulty TEXT CHECK(difficulty IN ('easy', 'normal', 'hard', 'insane')),
    victory_conditions TEXT NOT NULL, -- JSON array
    status TEXT CHECK(status IN ('setup', 'in_progress', 'completed', 'abandoned')) NOT NULL,
    winner_id TEXT,
    victory_type TEXT,
    turn_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    completed_at DATETIME,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    game_state TEXT, -- Compressed JSON of full game state
    FOREIGN KEY (host_player_id) REFERENCES players(id),
    FOREIGN KEY (winner_id) REFERENCES players(id)
);

-- Game participants (players in a game)
CREATE TABLE IF NOT EXISTS game_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    civilization TEXT NOT NULL,
    color TEXT NOT NULL,
    is_ai BOOLEAN DEFAULT 0,
    ai_personality TEXT,
    ai_difficulty TEXT,
    join_order INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    eliminated_turn INTEGER,
    final_score INTEGER,
    statistics TEXT, -- JSON object of game statistics
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id),
    UNIQUE(game_id, player_id)
);

-- Game saves (for resumable games)
CREATE TABLE IF NOT EXISTS game_saves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    save_name TEXT NOT NULL,
    turn_number INTEGER NOT NULL,
    save_type TEXT CHECK(save_type IN ('auto', 'manual', 'checkpoint')) NOT NULL,
    game_state TEXT NOT NULL, -- Compressed JSON
    map_data TEXT NOT NULL, -- Compressed JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT NOT NULL,
    file_size INTEGER,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES players(id)
);

-- Game actions history (for replay system)
CREATE TABLE IF NOT EXISTS game_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    turn_number INTEGER NOT NULL,
    action_index INTEGER NOT NULL,
    player_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_data TEXT NOT NULL, -- JSON
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    processing_time INTEGER, -- milliseconds
    result TEXT, -- JSON result of action
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Player statistics
CREATE TABLE IF NOT EXISTS player_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    units_built INTEGER DEFAULT 0,
    units_lost INTEGER DEFAULT 0,
    units_killed INTEGER DEFAULT 0,
    cities_founded INTEGER DEFAULT 0,
    cities_captured INTEGER DEFAULT 0,
    cities_lost INTEGER DEFAULT 0,
    technologies_researched INTEGER DEFAULT 0,
    buildings_constructed INTEGER DEFAULT 0,
    tiles_explored INTEGER DEFAULT 0,
    resources_collected TEXT, -- JSON object
    peak_score INTEGER DEFAULT 0,
    peak_military_strength INTEGER DEFAULT 0,
    peak_city_count INTEGER DEFAULT 0,
    total_damage_dealt INTEGER DEFAULT 0,
    total_damage_received INTEGER DEFAULT 0,
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    UNIQUE(player_id, game_id)
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT,
    category TEXT NOT NULL,
    points INTEGER DEFAULT 10,
    hidden BOOLEAN DEFAULT 0,
    requirement_data TEXT -- JSON criteria
);

-- Player achievements (unlocked achievements)
CREATE TABLE IF NOT EXISTS player_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    game_id TEXT,
    FOREIGN KEY (player_id) REFERENCES players(id),
    FOREIGN KEY (achievement_id) REFERENCES achievements(id),
    FOREIGN KEY (game_id) REFERENCES games(id),
    UNIQUE(player_id, achievement_id)
);

-- Leaderboards
CREATE TABLE IF NOT EXISTS leaderboards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season TEXT NOT NULL,
    player_id TEXT NOT NULL,
    rank INTEGER NOT NULL,
    elo_rating INTEGER NOT NULL,
    games_played INTEGER DEFAULT 0,
    win_rate REAL DEFAULT 0,
    favorite_civilization TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id),
    UNIQUE(season, player_id)
);

-- Chat messages (for game chat history)
CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    message TEXT NOT NULL,
    message_type TEXT CHECK(message_type IN ('chat', 'system', 'announcement')) DEFAULT 'chat',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_host ON games(host_player_id);
CREATE INDEX IF NOT EXISTS idx_games_activity ON games(last_activity);
CREATE INDEX IF NOT EXISTS idx_participants_game ON game_participants(game_id);
CREATE INDEX IF NOT EXISTS idx_participants_player ON game_participants(player_id);
CREATE INDEX IF NOT EXISTS idx_saves_game ON game_saves(game_id);
CREATE INDEX IF NOT EXISTS idx_actions_game_turn ON game_actions(game_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_statistics_player ON player_statistics(player_id);
CREATE INDEX IF NOT EXISTS idx_achievements_player ON player_achievements(player_id);
CREATE INDEX IF NOT EXISTS idx_chat_game ON chat_messages(game_id);

-- Views for common queries
CREATE VIEW IF NOT EXISTS active_games AS
SELECT 
    g.id,
    g.name,
    g.status,
    g.turn_count,
    g.created_at,
    g.last_activity,
    COUNT(gp.id) as player_count,
    GROUP_CONCAT(p.username) as players
FROM games g
LEFT JOIN game_participants gp ON g.id = gp.game_id
LEFT JOIN players p ON gp.player_id = p.id
WHERE g.status IN ('setup', 'in_progress')
GROUP BY g.id;

CREATE VIEW IF NOT EXISTS player_stats_summary AS
SELECT 
    p.id,
    p.username,
    p.total_games,
    p.games_won,
    p.games_lost,
    ROUND(CAST(p.games_won AS REAL) / NULLIF(p.total_games, 0) * 100, 2) as win_rate,
    p.elo_rating,
    COUNT(pa.id) as achievements_unlocked
FROM players p
LEFT JOIN player_achievements pa ON p.id = pa.player_id
GROUP BY p.id;
