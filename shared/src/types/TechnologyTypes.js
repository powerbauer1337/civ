"use strict";
/**
 * Enhanced Technology Types - Phase 2.2.1
 * Comprehensive technology effects and trading system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TECH_TRADING_EVENTS = exports.TradeOfferStatus = exports.UnlockType = exports.TechEra = void 0;
/**
 * Technology Eras - Extended for comprehensive progression
 */
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
var TradeOfferStatus;
(function (TradeOfferStatus) {
    TradeOfferStatus["PENDING"] = "pending";
    TradeOfferStatus["ACCEPTED"] = "accepted";
    TradeOfferStatus["REJECTED"] = "rejected";
    TradeOfferStatus["EXPIRED"] = "expired";
    TradeOfferStatus["CANCELLED"] = "cancelled";
})(TradeOfferStatus || (exports.TradeOfferStatus = TradeOfferStatus = {}));
/**
 * WebSocket Events for Technology Trading
 */
exports.TECH_TRADING_EVENTS = {
    // Technology trading
    TECH_TRADE_OFFER: 'tech:trade:offer',
    TECH_TRADE_RESPONSE: 'tech:trade:response',
    TECH_TRADE_COMPLETE: 'tech:trade:complete',
    TECH_TRADE_CANCELLED: 'tech:trade:cancelled',
    // Collaborative research
    TECH_COLLABORATION_REQUEST: 'tech:collaboration:request',
    TECH_COLLABORATION_JOIN: 'tech:collaboration:join',
    TECH_COLLABORATION_LEAVE: 'tech:collaboration:leave',
    TECH_COLLABORATION_COMPLETE: 'tech:collaboration:complete',
    // Technology progress
    TECH_RESEARCH_START: 'tech:research:start',
    TECH_RESEARCH_PROGRESS: 'tech:research:progress',
    TECH_RESEARCH_COMPLETE: 'tech:research:complete',
    // Technology tree updates
    TECH_TREE_UPDATE: 'tech:tree:update',
    TECH_AVAILABLE_UPDATE: 'tech:available:update'
};
