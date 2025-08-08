# 🎮 User Guide - Civilization Game

Welcome to the Civilization Game! This guide will help you get started playing this real-time multiplayer strategy game.

## 🚀 Getting Started

### Accessing the Game
1. **Open your web browser** (Chrome, Firefox, Safari, or Edge)
2. **Navigate to**: `http://localhost:5173/civ/`
3. **Wait for loading**: The game should load within 2-3 seconds

### System Requirements
- **Internet Connection**: Required for multiplayer features
- **Modern Browser**: Support for WebSocket and ES2020 features
- **Screen Size**: Works on desktop, tablet, and mobile (responsive design)
- **JavaScript**: Must be enabled

## 🎯 Game Overview

### What is Civilization Game?
A turn-based strategy game where you:
- **Build Cities**: Establish and grow your civilization
- **Research Technologies**: Advance through different eras
- **Manage Resources**: Food, production, gold, and science
- **Interact with Players**: Diplomacy, trade, and warfare
- **Achieve Victory**: Multiple paths to win the game

### Current Features (Version 1.0)
✅ **Real-time Multiplayer**: Play with up to 8 players simultaneously  
✅ **Game Lobby**: Create and join games with friends  
✅ **Player Communication**: Built-in chat system  
✅ **Cross-Platform**: Play on any device with a web browser  
✅ **No Downloads**: Runs entirely in your browser  

## 🏠 Game Lobby

### Setting Your Player Info

#### 1. Enter Your Username
- **Location**: Top section of the lobby page
- **Requirements**: 1-30 characters, unique per game
- **Tips**: 
  - Choose a memorable name
  - Your username is saved for future games
  - Can't be changed once you join a game

#### 2. Choose Your Civilization
- **Default**: "Random" if you don't specify
- **Examples**: Romans, Greeks, Egyptians, Chinese, etc.
- **Note**: Currently cosmetic, but will affect gameplay in future updates

### Creating a New Game

#### Step 1: Click "Create Game"
- **Button**: Blue "Create Game" button in the top navigation
- **Opens**: Game creation dialog box

#### Step 2: Configure Game Settings
- **Game Name**: Give your game a unique name (required)
- **Max Players**: Choose 2-8 players (default: 4)
- **Tips**:
  - Descriptive names help others find your game
  - Start with 2-4 players for faster games
  - Larger games (6-8 players) take longer but are more complex

#### Step 3: Create and Wait
- **Click**: "Create Game" button
- **Result**: Game appears in the lobby list with "Waiting for Players" status
- **Share**: Tell friends the game name or ID to join

### Joining an Existing Game

#### Finding Games
- **Game List**: All available games are shown in the main area
- **Auto-Refresh**: List updates every 5 seconds automatically
- **Manual Refresh**: Click the refresh button for instant updates

#### Game Information
Each game card shows:
- **Game Name**: Creator's chosen name
- **Player Count**: Current players / maximum players (e.g., "2/4")
- **Status**: 
  - 🟢 **Waiting for Players**: Can join
  - 🟡 **Game in Progress**: Cannot join
  - 🔴 **Game Full**: Cannot join
- **Turn Number**: Current game turn
- **Created Time**: When the game was created

#### Joining Process
1. **Select Game**: Click "Join Game" on any available game
2. **Automatic**: Your username and civilization are used
3. **Confirmation**: Success message confirms you've joined
4. **Redirection**: Automatically taken to the game interface

## 🎮 Game Interface

### Main Game Screen Layout

#### Left Side: Game Map (Future)
- **Current**: Placeholder with test action buttons
- **Future**: Interactive hex-grid world map
- **Actions**: Click to select units, cities, and tiles

#### Right Side: Game Information

##### Player Info Panel
- **Your Name**: Displays your username
- **Player ID**: Unique identifier for this game session
- **Game ID**: Current game identifier

##### Action Log
- **Purpose**: Shows history of your actions
- **Content**: Timestamps and action confirmations
- **Auto-scroll**: Newest actions at the bottom

##### Game Events & Chat
- **System Messages**: Game notifications and status updates
- **Player Chat**: Real-time communication with other players
- **Message History**: Scrollable chat log
- **Send Messages**: Type and send chat messages

### Current Gameplay Features

#### Test Actions (Current Version)
These buttons let you test the real-time multiplayer system:

**Move Unit**
- **Purpose**: Simulates moving a military or civilian unit
- **Effect**: Sends action to all other players instantly
- **Feedback**: Confirmation message in action log

**Build City**
- **Purpose**: Simulates founding a new city
- **Effect**: Other players see your city-building action
- **Location**: Random coordinates generated

**Research Technology**
- **Purpose**: Simulates technology research
- **Effect**: Advances your civilization's knowledge
- **Options**: Pottery, Bronze Working, Animal Husbandry

#### Real-time Communication
- **Instant Updates**: See other players' actions immediately
- **Chat System**: Communicate with all players in the game
- **Connection Status**: Green = connected, Red = disconnected
- **Auto-Reconnect**: Automatically reconnects if connection drops

## 💬 Communication & Social Features

### Chat System
- **Location**: Bottom right panel of game interface
- **Real-time**: Messages appear instantly for all players
- **History**: Scroll up to see previous messages
- **Send**: Type message and press Enter or click Send button

### System Messages
The game automatically sends messages about:
- **Player Connections**: "Player joined/left the game"
- **Game Events**: "Game started with X players"
- **Action Updates**: "Alice built a city at (3,3)"
- **Server Status**: Connection/disconnection notices

### Etiquette Tips
- **Be Friendly**: Remember there are real people behind the screen
- **Stay Engaged**: Communicate your plans and strategies
- **Respect Others**: No spam, harassment, or inappropriate content
- **Have Fun**: It's a game - enjoy the experience!

## 🔧 Game Settings & Controls

### Connection Management
- **Connection Status**: Displayed in top right corner
- **Auto-Reconnect**: Game attempts to reconnect automatically
- **Manual Refresh**: Refresh browser if issues persist

### Browser Settings
- **JavaScript**: Must be enabled for the game to work
- **Cookies**: Used to remember your username
- **WebSocket**: Required for real-time multiplayer
- **Local Storage**: Saves your player preferences

### Performance Tips
- **Close Unnecessary Tabs**: For better performance
- **Stable Internet**: Required for smooth multiplayer experience
- **Modern Browser**: Use the latest version of your browser
- **Screen Size**: Game works on all sizes, but larger screens are more comfortable

## ⚠️ Troubleshooting

### Common Issues & Solutions

#### "Cannot Connect to Server"
**Problem**: Game won't load or shows connection errors  
**Solutions**:
1. Check if server is running (developers)
2. Refresh the browser page
3. Check your internet connection
4. Try a different browser
5. Disable browser extensions temporarily

#### "Game Not Found" Error
**Problem**: Trying to join a game that doesn't exist  
**Solutions**:
1. Refresh the game list
2. Check if the game was closed by the creator
3. Create a new game instead

#### WebSocket Connection Issues
**Problem**: Real-time features not working  
**Solutions**:
1. Check browser console for errors (F12)
2. Try refreshing the page
3. Check firewall/antivirus settings
4. Try incognito/private browsing mode

#### Game Interface Not Loading
**Problem**: Stuck on loading screen  
**Solutions**:
1. Wait 30 seconds for full loading
2. Check browser console for JavaScript errors
3. Clear browser cache and cookies
4. Try a different browser

### Getting Help
- **Browser Console**: Press F12 to see technical error messages
- **Developer Tools**: Network tab shows connection issues
- **Refresh Page**: Often fixes temporary glitches
- **Report Issues**: Contact administrators with specific error messages

## 🎯 Gameplay Tips

### For New Players
- **Start Small**: Join 2-3 player games to learn the interface
- **Observe**: Watch what other players do
- **Communicate**: Ask questions - most players are helpful
- **Experiment**: Try different actions to see what happens
- **Be Patient**: Real Civilization gameplay features are coming soon!

### Strategy Basics (Future Features)
- **City Placement**: Choose locations with good resources
- **Technology Focus**: Decide between military, economic, or cultural advancement
- **Resource Management**: Balance food, production, gold, and science
- **Diplomacy**: Build alliances and trade agreements
- **Victory Paths**: Choose domination, science, culture, or diplomatic victory

## 🔮 Coming Soon

### Phase 1: Visual Game Map
- **Interactive Hex Grid**: Click to select tiles and units
- **Terrain Types**: Different landscapes with unique benefits
- **Unit Movement**: Drag and drop units around the map
- **City Management**: Visual city building and improvement

### Phase 2: Core Civilization Features
- **Technology Tree**: Research new technologies to unlock abilities
- **Resource System**: Manage food, production, gold, and science
- **Combat System**: Engage in tactical battles with other players
- **City Building**: Construct buildings and wonders

### Phase 3: Advanced Features
- **Victory Conditions**: Multiple ways to win the game
- **Diplomacy System**: Trade, alliances, and negotiations
- **AI Players**: Play against computer opponents
- **Tournaments**: Ranked competitive play

## 📊 Game Statistics

### Your Performance
- **Games Played**: Track your game history (future)
- **Win Rate**: Success percentage across all games (future)
- **Favorite Civilization**: Most-played civilization (future)
- **Average Game Time**: How long your games typically last (future)

### Global Statistics
- **Active Players**: Currently online players
- **Games in Progress**: Real-time count of active games
- **Total Games Created**: All-time game count
- **Peak Concurrent Users**: Maximum simultaneous players

## 📞 Support & Community

### Getting Help
- **In-Game Issues**: Use browser developer tools (F12) to check for errors
- **Technical Problems**: Contact system administrators
- **Gameplay Questions**: Ask other players via chat system
- **Feature Requests**: Suggest new features to the development team

### Community Guidelines
- **Respectful Play**: Treat all players with courtesy
- **Fair Play**: No cheating, exploitation, or griefing
- **Constructive Feedback**: Help improve the game with suggestions
- **Report Issues**: Help identify and fix bugs

### Future Community Features
- **Player Profiles**: Persistent accounts with statistics
- **Friend Lists**: Connect with regular players
- **Private Games**: Password-protected games for friends
- **Spectator Mode**: Watch games in progress
- **Replay System**: Review completed games

---

## 🎮 Ready to Play?

**Start your civilization journey at: http://localhost:5173/civ/**

1. **Set your username** and preferred civilization
2. **Create a game** or **join an existing one**
3. **Chat with other players** and test the real-time features
4. **Have fun** building your empire!

---

*This guide covers the current version of the game. As new features are added, this guide will be updated to include comprehensive gameplay instructions.*