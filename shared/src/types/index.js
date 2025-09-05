"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameActionType = exports.ImprovementType = exports.ProductionType = exports.UnitStatus = exports.UnitType = exports.ResourceCategory = exports.ResourceType = exports.VisibilityLevel = exports.TerrainFeature = exports.TerrainType = exports.GamePhase = exports.DifficultyLevel = exports.VictoryCondition = exports.GameStatus = void 0;
var GameStatus;
(function (GameStatus) {
    GameStatus["WAITING"] = "waiting";
    GameStatus["STARTING"] = "starting";
    GameStatus["IN_PROGRESS"] = "in_progress";
    GameStatus["PAUSED"] = "paused";
    GameStatus["FINISHED"] = "finished";
    GameStatus["CANCELLED"] = "cancelled";
})(GameStatus || (exports.GameStatus = GameStatus = {}));
var VictoryCondition;
(function (VictoryCondition) {
    VictoryCondition["DOMINATION"] = "domination";
    VictoryCondition["SCIENCE"] = "science";
    VictoryCondition["CULTURAL"] = "cultural";
    VictoryCondition["DIPLOMATIC"] = "diplomatic";
    VictoryCondition["TIME"] = "time";
})(VictoryCondition || (exports.VictoryCondition = VictoryCondition = {}));
var DifficultyLevel;
(function (DifficultyLevel) {
    DifficultyLevel["SETTLER"] = "settler";
    DifficultyLevel["CHIEFTAIN"] = "chieftain";
    DifficultyLevel["WARLORD"] = "warlord";
    DifficultyLevel["PRINCE"] = "prince";
    DifficultyLevel["KING"] = "king";
    DifficultyLevel["EMPEROR"] = "emperor";
    DifficultyLevel["IMMORTAL"] = "immortal";
    DifficultyLevel["DEITY"] = "deity";
})(DifficultyLevel || (exports.DifficultyLevel = DifficultyLevel = {}));
var GamePhase;
(function (GamePhase) {
    GamePhase["SETUP"] = "setup";
    GamePhase["PLAYER_TURN"] = "player_turn";
    GamePhase["BETWEEN_TURNS"] = "between_turns";
    GamePhase["END_GAME"] = "end_game";
    GamePhase["ENDED"] = "ended";
    GamePhase["ACTIVE"] = "active";
    GamePhase["LOBBY"] = "lobby"; // Add compatibility with server code
})(GamePhase || (exports.GamePhase = GamePhase = {}));
var TerrainType;
(function (TerrainType) {
    TerrainType["GRASSLAND"] = "grassland";
    TerrainType["PLAINS"] = "plains";
    TerrainType["DESERT"] = "desert";
    TerrainType["TUNDRA"] = "tundra";
    TerrainType["SNOW"] = "snow";
    TerrainType["OCEAN"] = "ocean";
    TerrainType["COAST"] = "coast";
    TerrainType["HILLS"] = "hills";
    TerrainType["MOUNTAINS"] = "mountains";
})(TerrainType || (exports.TerrainType = TerrainType = {}));
var TerrainFeature;
(function (TerrainFeature) {
    TerrainFeature["FOREST"] = "forest";
    TerrainFeature["JUNGLE"] = "jungle";
    TerrainFeature["MARSH"] = "marsh";
    TerrainFeature["OASIS"] = "oasis";
    TerrainFeature["FLOOD_PLAINS"] = "flood_plains";
    TerrainFeature["ICE"] = "ice";
})(TerrainFeature || (exports.TerrainFeature = TerrainFeature = {}));
var VisibilityLevel;
(function (VisibilityLevel) {
    VisibilityLevel[VisibilityLevel["HIDDEN"] = 0] = "HIDDEN";
    VisibilityLevel[VisibilityLevel["DISCOVERED"] = 1] = "DISCOVERED";
    VisibilityLevel[VisibilityLevel["VISIBLE"] = 2] = "VISIBLE";
})(VisibilityLevel || (exports.VisibilityLevel = VisibilityLevel = {}));
var ResourceType;
(function (ResourceType) {
    // Bonus Resources
    ResourceType["WHEAT"] = "wheat";
    ResourceType["RICE"] = "rice";
    ResourceType["CORN"] = "corn";
    ResourceType["CATTLE"] = "cattle";
    ResourceType["SHEEP"] = "sheep";
    ResourceType["DEER"] = "deer";
    ResourceType["FISH"] = "fish";
    // Luxury Resources
    ResourceType["GOLD"] = "gold";
    ResourceType["SILVER"] = "silver";
    ResourceType["GEMS"] = "gems";
    ResourceType["SILK"] = "silk";
    ResourceType["SPICES"] = "spices";
    // Strategic Resources
    ResourceType["IRON"] = "iron";
    ResourceType["HORSES"] = "horses";
    ResourceType["COAL"] = "coal";
    ResourceType["OIL"] = "oil";
    ResourceType["ALUMINUM"] = "aluminum";
    ResourceType["URANIUM"] = "uranium";
})(ResourceType || (exports.ResourceType = ResourceType = {}));
var ResourceCategory;
(function (ResourceCategory) {
    ResourceCategory["BONUS"] = "bonus";
    ResourceCategory["LUXURY"] = "luxury";
    ResourceCategory["STRATEGIC"] = "strategic";
})(ResourceCategory || (exports.ResourceCategory = ResourceCategory = {}));
var UnitType;
(function (UnitType) {
    UnitType["WARRIOR"] = "warrior";
    UnitType["SCOUT"] = "scout";
    UnitType["SETTLER"] = "settler";
    UnitType["WORKER"] = "worker";
    UnitType["ARCHER"] = "archer";
    UnitType["SPEARMAN"] = "spearman";
    UnitType["SWORDSMAN"] = "swordsman";
    UnitType["HORSEMAN"] = "horseman";
})(UnitType || (exports.UnitType = UnitType = {}));
var UnitStatus;
(function (UnitStatus) {
    UnitStatus["FORTIFIED"] = "fortified";
    UnitStatus["SLEEP"] = "sleep";
    UnitStatus["ALERT"] = "alert";
    UnitStatus["EMBARKED"] = "embarked";
    UnitStatus["PILLAGING"] = "pillaging";
})(UnitStatus || (exports.UnitStatus = UnitStatus = {}));
var ProductionType;
(function (ProductionType) {
    ProductionType["UNIT"] = "unit";
    ProductionType["BUILDING"] = "building";
    ProductionType["WONDER"] = "wonder";
    ProductionType["PROJECT"] = "project";
})(ProductionType || (exports.ProductionType = ProductionType = {}));
__exportStar(require("./TechnologyTypes"), exports);
var ImprovementType;
(function (ImprovementType) {
    ImprovementType["FARM"] = "farm";
    ImprovementType["MINE"] = "mine";
    ImprovementType["PASTURE"] = "pasture";
    ImprovementType["CAMP"] = "camp";
    ImprovementType["FISHING_BOATS"] = "fishing_boats";
    ImprovementType["PLANTATION"] = "plantation";
    ImprovementType["QUARRY"] = "quarry";
    ImprovementType["TRADING_POST"] = "trading_post";
    ImprovementType["ROAD"] = "road";
    ImprovementType["RAILROAD"] = "railroad";
})(ImprovementType || (exports.ImprovementType = ImprovementType = {}));
var GameActionType;
(function (GameActionType) {
    GameActionType["MOVE_UNIT"] = "move_unit";
    GameActionType["ATTACK_UNIT"] = "attack_unit";
    GameActionType["FOUND_CITY"] = "found_city";
    GameActionType["BUILD_IMPROVEMENT"] = "build_improvement";
    GameActionType["CHANGE_PRODUCTION"] = "change_production";
    GameActionType["RESEARCH_TECHNOLOGY"] = "research_technology";
    // Phase 2.2.1 Technology Trading Actions
    GameActionType["TECH_TRADE_OFFER"] = "tech_trade_offer";
    GameActionType["TECH_TRADE_ACCEPT"] = "tech_trade_accept";
    GameActionType["TECH_TRADE_REJECT"] = "tech_trade_reject";
    GameActionType["TECH_TRADE_CANCEL"] = "tech_trade_cancel";
    GameActionType["TECH_COLLABORATION_REQUEST"] = "tech_collaboration_request";
    GameActionType["TECH_COLLABORATION_JOIN"] = "tech_collaboration_join";
    GameActionType["TECH_COLLABORATION_LEAVE"] = "tech_collaboration_leave";
    GameActionType["END_TURN"] = "end_turn";
})(GameActionType || (exports.GameActionType = GameActionType = {}));
