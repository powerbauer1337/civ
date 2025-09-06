# Milestone 2: Persistence & Rejoin - Implementation Plan

## Current Status Analysis

✅ **Database Foundation Complete**
- SQLite database path creation working (`./data/` directory created)
- GamePersistence class fully implemented with comprehensive schema
- SaveLoadHandlers integrated in server startup
- Database tables and indexes properly defined

✅ **Partial Implementation Exists**
- Basic persistence infrastructure in place
- Client reconnection logic partially implemented
- Spectator functionality framework exists

## Implementation Tasks

### 1. SQLite Database Setup ✅
**Status**: COMPLETED
- ✅ Directory creation on server startup working
- ✅ GamePersistence initialization functional
- ✅ Database schema fully created with all tables

### 2. Game Action Persistence (PRIORITY 1)
**Status**: NEEDS INTEGRATION
- ❌ Action persistence not integrated with GameManager.handleGameAction
- ❌ Critical actions (end_turn, found_city) not being recorded
- ❌ Action replay system not connected

### 3. Player Rejoin Workflow (PRIORITY 2)  
**Status**: PARTIALLY IMPLEMENTED
- ✅ `requestGameState` method exists in SocketContext
- ❌ Rejoin logic needs server-side integration
- ❌ Rejoin→spectate prompt needs refinement
- ❌ State synchronization on rejoin needs testing

### 4. Spectator Functionality (PRIORITY 3)
**Status**: BASIC IMPLEMENTATION
- ✅ Spectate game methods exist in SocketContext
- ✅ GameManager has spectator handling
- ❌ Spectator snapshot delivery needs testing
- ❌ Live turn updates for spectators need validation

## Detailed Implementation Steps

### Phase 1: Action Persistence Integration

1. **Modify GameManager.handleGameAction** to call GamePersistence.recordGameAction
2. **Test critical actions**: end_turn, found_city persistence
3. **Evaluate move_unit persistence** based on performance impact
4. **Add error handling** for persistence failures

### Phase 2: Rejoin Workflow Enhancement

1. **Server-side rejoin logic** in GameManager.handleRequestGameState
2. **Enhanced client rejoin flow** with better error handling
3. **Rejoin failure → spectate transition** workflow
4. **State persistence mapping** cleanup on successful rejoin

### Phase 3: Spectator System Validation

1. **Test spectator snapshot delivery** functionality
2. **Validate live turn updates** for spectators
3. **Ensure spectator isolation** (read-only enforcement)
4. **Test spectator disconnection** handling

### Phase 4: Integration Testing

1. **End-to-end persistence testing**
2. **Rejoin workflow validation**
3. **Spectator functionality testing**
4. **Performance impact assessment**

## Success Criteria

- ✅ All actions save and load without errors
- ✅ Refresh Tab A → continue in Tab B → A can spectate
- ✅ Spectators see turns advance live  
- ✅ All existing tests continue to pass (579/579)
- ✅ New persistence tests added and passing

## Implementation Priority

1. **IMMEDIATE**: Action persistence integration (GameManager)
2. **HIGH**: Rejoin workflow server-side logic
3. **MEDIUM**: Spectator functionality validation
4. **LOW**: Performance optimization and testing

---
*Implementation Target: Complete persistence and rejoin system for production deployment*