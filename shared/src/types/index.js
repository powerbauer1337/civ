"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameActionType = exports.ImprovementType = exports.UnlockType = exports.TechEra = exports.ProductionType = exports.UnitStatus = exports.UnitType = exports.ResourceCategory = exports.ResourceType = exports.VisibilityLevel = exports.TerrainFeature = exports.TerrainType = exports.GamePhase = exports.DifficultyLevel = exports.VictoryCondition = exports.GameStatus = void 0;
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
var TechEra;
(function (TechEra) {
    TechEra["ANCIENT"] = "ancient";
    TechEra["CLASSICAL"] = "classical";
    TechEra["MEDIEVAL"] = "medieval";
    TechEra["RENAISSANCE"] = "renaissance";
    TechEra["INDUSTRIAL"] = "industrial";
    TechEra["MODERN"] = "modern";
    TechEra["ATOMIC"] = "atomic";
    TechEra["INFORMATION"] = "information";
})(TechEra || (exports.TechEra = TechEra = {}));
var UnlockType;
(function (UnlockType) {
    UnlockType["UNIT"] = "unit";
    UnlockType["BUILDING"] = "building";
    UnlockType["IMPROVEMENT"] = "improvement";
    UnlockType["CIVIC"] = "civic";
    UnlockType["RESOURCE"] = "resource";
})(UnlockType || (exports.UnlockType = UnlockType = {}));
// Extend PlayerTechnology[] to support add method for client compatibility
if (!Array.prototype.add) {
    Array.prototype.add = function (item) {
        if (!this.includes(item)) {
            this.push(item);
        }
    };
}
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
    GameActionType["END_TURN"] = "end_turn";
})(GameActionType || (exports.GameActionType = GameActionType = {}));
