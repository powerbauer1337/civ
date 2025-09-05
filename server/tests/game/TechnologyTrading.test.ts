import { GameEngine } from '../../src/game/GameEngine';
import { GameState, GameAction, GameActionType, PlayerState, TradeOfferStatus } from '../../../shared/src/types';
import { TechnologyType } from '../../../shared/src/types/GameTypes';

describe('GameEngine Technology Trading', () => {
  let mockGameState: GameState;
  let player1: PlayerState;
  let player2: PlayerState;

  beforeEach(() => {
    // Create mock players with different technologies
    player1 = {
      id: 'player1',
      userId: 'user1',
      name: 'Player 1',
      color: 'red',
      civilization: 'romans',
      resources: { food: 100, production: 50, gold: 200, science: 100, culture: 50, faith: 25 },
      technologies: [
        { techId: TechnologyType.AGRICULTURE, isResearched: true, progress: 0 },
        { techId: TechnologyType.POTTERY, isResearched: true, progress: 0 },
      ],
      cities: ['city1'],
      units: ['unit1'],
      visibilityData: {}
    };

    player2 = {
      id: 'player2',
      userId: 'user2',
      name: 'Player 2',
      color: 'blue',
      civilization: 'greeks',
      resources: { food: 80, production: 60, gold: 150, science: 120, culture: 40, faith: 30 },
      technologies: [
        { techId: TechnologyType.BRONZE_WORKING, isResearched: true, progress: 0 },
        { techId: TechnologyType.ARCHERY, isResearched: true, progress: 0 },
      ],
      cities: ['city2'],
      units: ['unit2'],
      visibilityData: {}
    };

    mockGameState = {
      id: 'game1',
      gameId: 'game1',
      currentPlayer: 'player1',
      turn: 5,
      currentTurn: 5,
      phase: 'player_turn' as any,
      map: {} as any,
      players: [player1, player2],
      cities: {},
      units: {},
      tradeOffers: [],
      lastUpdate: new Date()
    };
  });

  describe('processTechTradeOffer', () => {
    it('should create a technology trade offer successfully', () => {
      const action: GameAction = {
        type: GameActionType.TECH_TRADE_OFFER,
        payload: {
          fromPlayerId: 'player1',
          toPlayerId: 'player2',
          offeredTech: [TechnologyType.AGRICULTURE],
          requestedTech: [TechnologyType.BRONZE_WORKING],
          message: 'Let\'s trade technologies!'
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, action);

      expect(result.success).toBe(true);
      expect(result.gameState.tradeOffers).toHaveLength(1);
      
      const tradeOffer = result.gameState.tradeOffers![0];
      expect(tradeOffer.fromPlayerId).toBe('player1');
      expect(tradeOffer.toPlayerId).toBe('player2');
      expect(tradeOffer.offeredTech).toEqual([TechnologyType.AGRICULTURE]);
      expect(tradeOffer.requestedTech).toEqual([TechnologyType.BRONZE_WORKING]);
      expect(tradeOffer.status).toBe(TradeOfferStatus.PENDING);
      expect(tradeOffer.message).toBe('Let\'s trade technologies!');
    });

    it('should reject trade offer if player does not have offered technology', () => {
      const action: GameAction = {
        type: GameActionType.TECH_TRADE_OFFER,
        payload: {
          fromPlayerId: 'player1',
          toPlayerId: 'player2',
          offeredTech: [TechnologyType.BRONZE_WORKING], // Player 1 doesn't have this
          requestedTech: [TechnologyType.BRONZE_WORKING]
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, action);

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not have technology');
    });

    it('should reject trade offer if target player does not have requested technology', () => {
      const action: GameAction = {
        type: GameActionType.TECH_TRADE_OFFER,
        payload: {
          fromPlayerId: 'player1',
          toPlayerId: 'player2',
          offeredTech: [TechnologyType.AGRICULTURE],
          requestedTech: [TechnologyType.POTTERY] // Player 2 doesn't have this
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, action);

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not have technology');
    });

    it('should reject trade offer from non-current player', () => {
      const action: GameAction = {
        type: GameActionType.TECH_TRADE_OFFER,
        payload: {
          fromPlayerId: 'player2', // Not current player
          toPlayerId: 'player1',
          offeredTech: [TechnologyType.MINING],
          requestedTech: [TechnologyType.AGRICULTURE]
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, action);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Tech trade offer not from current player');
    });

    it('should handle multiple technologies in trade offer', () => {
      // Add more technologies to players
      player1.technologies.push({ techId: TechnologyType.ANIMAL_HUSBANDRY, isResearched: true, progress: 0 });
      player2.technologies.push({ techId: TechnologyType.ARCHERY, isResearched: true, progress: 0 });

      const action: GameAction = {
        type: GameActionType.TECH_TRADE_OFFER,
        payload: {
          fromPlayerId: 'player1',
          toPlayerId: 'player2',
          offeredTech: [TechnologyType.AGRICULTURE, TechnologyType.ANIMAL_HUSBANDRY],
          requestedTech: [TechnologyType.BRONZE_WORKING, TechnologyType.ARCHERY]
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, action);

      expect(result.success).toBe(true);
      expect(result.gameState.tradeOffers![0].offeredTech).toHaveLength(2);
      expect(result.gameState.tradeOffers![0].requestedTech).toHaveLength(2);
    });

    it('should include resource compensation in trade offer', () => {
      const action: GameAction = {
        type: GameActionType.TECH_TRADE_OFFER,
        payload: {
          fromPlayerId: 'player1',
          toPlayerId: 'player2',
          offeredTech: [TechnologyType.AGRICULTURE],
          requestedTech: [TechnologyType.BRONZE_WORKING],
          offeredResources: { gold: 50 },
          requestedResources: { science: 20 }
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, action);

      expect(result.success).toBe(true);
      
      const tradeOffer = result.gameState.tradeOffers![0];
      expect(tradeOffer.offeredResources).toEqual({ gold: 50 });
      expect(tradeOffer.requestedResources).toEqual({ science: 20 });
    });
  });

  describe('processTechTradeAccept', () => {
    let tradeOfferId: string;

    beforeEach(() => {
      // Create a pending trade offer
      const offerAction: GameAction = {
        type: GameActionType.TECH_TRADE_OFFER,
        payload: {
          fromPlayerId: 'player1',
          toPlayerId: 'player2',
          offeredTech: [TechnologyType.AGRICULTURE],
          requestedTech: [TechnologyType.BRONZE_WORKING]
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, offerAction);
      tradeOfferId = result.gameState.tradeOffers![0].id;
      
      // Switch to player 2 for acceptance
      mockGameState.currentPlayer = 'player2';
    });

    it('should accept trade offer and exchange technologies', () => {
      const action: GameAction = {
        type: GameActionType.TECH_TRADE_ACCEPT,
        payload: {
          tradeOfferId
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, action);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Technology trade completed successfully');

      // Check that technologies were exchanged
      const player1Tech = result.gameState.players[0].technologies;
      const player2Tech = result.gameState.players[1].technologies;

      expect(player1Tech.find(t => t.techId === TechnologyType.BRONZE_WORKING)?.isResearched).toBe(true);
      expect(player2Tech.find(t => t.techId === TechnologyType.AGRICULTURE)?.isResearched).toBe(true);

      // Check trade offer status
      expect(result.gameState.tradeOffers![0].status).toBe(TradeOfferStatus.ACCEPTED);
    });

    it('should reject acceptance from wrong player', () => {
      // Switch back to player 1 (not the target)
      mockGameState.currentPlayer = 'player1';

      const action: GameAction = {
        type: GameActionType.TECH_TRADE_ACCEPT,
        payload: {
          tradeOfferId
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, action);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the target player can accept this trade');
    });

    it('should reject acceptance of non-existent trade offer', () => {
      const action: GameAction = {
        type: GameActionType.TECH_TRADE_ACCEPT,
        payload: {
          tradeOfferId: 'non-existent-id'
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, action);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Trade offer not found');
    });

    it('should exchange resources when specified in trade', () => {
      // Create a trade with resources
      mockGameState.currentPlayer = 'player1';
      const offerAction: GameAction = {
        type: GameActionType.TECH_TRADE_OFFER,
        payload: {
          fromPlayerId: 'player1',
          toPlayerId: 'player2',
          offeredTech: [TechnologyType.AGRICULTURE],
          requestedTech: [TechnologyType.BRONZE_WORKING],
          offeredResources: { gold: 50 },
          requestedResources: { science: 20 }
        }
      };

      const offerResult = GameEngine.processPlayerAction(mockGameState, offerAction);
      const newTradeOfferId = offerResult.gameState.tradeOffers![1].id;

      mockGameState.currentPlayer = 'player2';
      const acceptAction: GameAction = {
        type: GameActionType.TECH_TRADE_ACCEPT,
        payload: {
          tradeOfferId: newTradeOfferId
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, acceptAction);

      expect(result.success).toBe(true);

      // Check resource exchange
      const player1Resources = result.gameState.players[0].resources;
      const player2Resources = result.gameState.players[1].resources;

      expect(player1Resources.gold).toBe(150); // 200 - 50
      expect(player2Resources.gold).toBe(200); // 150 + 50
      expect(player1Resources.science).toBe(120); // 100 + 20
      expect(player2Resources.science).toBe(100); // 120 - 20
    });
  });

  describe('processTechTradeReject', () => {
    let tradeOfferId: string;

    beforeEach(() => {
      // Create a pending trade offer
      const offerAction: GameAction = {
        type: GameActionType.TECH_TRADE_OFFER,
        payload: {
          fromPlayerId: 'player1',
          toPlayerId: 'player2',
          offeredTech: [TechnologyType.AGRICULTURE],
          requestedTech: [TechnologyType.BRONZE_WORKING]
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, offerAction);
      tradeOfferId = result.gameState.tradeOffers![0].id;
      
      // Switch to player 2 for rejection
      mockGameState.currentPlayer = 'player2';
    });

    it('should reject trade offer successfully', () => {
      const action: GameAction = {
        type: GameActionType.TECH_TRADE_REJECT,
        payload: {
          tradeOfferId
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, action);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Technology trade offer rejected');
      expect(result.gameState.tradeOffers![0].status).toBe(TradeOfferStatus.REJECTED);
    });

    it('should reject rejection from wrong player', () => {
      // Switch back to player 1 (not the target)
      mockGameState.currentPlayer = 'player1';

      const action: GameAction = {
        type: GameActionType.TECH_TRADE_REJECT,
        payload: {
          tradeOfferId
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, action);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the target player can reject this trade');
    });
  });

  describe('processTechTradeCancel', () => {
    let tradeOfferId: string;

    beforeEach(() => {
      // Create a pending trade offer
      const offerAction: GameAction = {
        type: GameActionType.TECH_TRADE_OFFER,
        payload: {
          fromPlayerId: 'player1',
          toPlayerId: 'player2',
          offeredTech: [TechnologyType.AGRICULTURE],
          requestedTech: [TechnologyType.BRONZE_WORKING]
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, offerAction);
      tradeOfferId = result.gameState.tradeOffers![0].id;
    });

    it('should cancel trade offer successfully', () => {
      const action: GameAction = {
        type: GameActionType.TECH_TRADE_CANCEL,
        payload: {
          tradeOfferId
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, action);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Technology trade offer cancelled');
      expect(result.gameState.tradeOffers![0].status).toBe(TradeOfferStatus.CANCELLED);
    });

    it('should reject cancellation from wrong player', () => {
      // Switch to player 2 (not the offering player)
      mockGameState.currentPlayer = 'player2';

      const action: GameAction = {
        type: GameActionType.TECH_TRADE_CANCEL,
        payload: {
          tradeOfferId
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, action);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Only the offering player can cancel this trade');
    });

    it('should reject cancellation of non-existent trade offer', () => {
      const action: GameAction = {
        type: GameActionType.TECH_TRADE_CANCEL,
        payload: {
          tradeOfferId: 'non-existent-id'
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, action);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Trade offer not found');
    });
  });

  describe('Trade Offer Expiration', () => {
    it('should reject expired trade offer', () => {
      // Create a trade offer
      const offerAction: GameAction = {
        type: GameActionType.TECH_TRADE_OFFER,
        payload: {
          fromPlayerId: 'player1',
          toPlayerId: 'player2',
          offeredTech: [TechnologyType.AGRICULTURE],
          requestedTech: [TechnologyType.BRONZE_WORKING]
        }
      };

      const offerResult = GameEngine.processPlayerAction(mockGameState, offerAction);
      const tradeOfferId = offerResult.gameState.tradeOffers![0].id;

      // Manually expire the trade offer
      offerResult.gameState.tradeOffers![0].expiresAt = new Date(Date.now() - 1000);

      mockGameState.currentPlayer = 'player2';
      const acceptAction: GameAction = {
        type: GameActionType.TECH_TRADE_ACCEPT,
        payload: {
          tradeOfferId
        }
      };

      const result = GameEngine.processPlayerAction(offerResult.gameState, acceptAction);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Trade offer has expired');
      expect(result.gameState.tradeOffers![0].status).toBe(TradeOfferStatus.EXPIRED);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing parameters gracefully', () => {
      const action: GameAction = {
        type: GameActionType.TECH_TRADE_OFFER,
        payload: {
          fromPlayerId: 'player1'
          // Missing other required fields
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, action);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Missing required parameters for tech trade offer');
    });

    it('should handle non-array technology parameters', () => {
      const action: GameAction = {
        type: GameActionType.TECH_TRADE_OFFER,
        payload: {
          fromPlayerId: 'player1',
          toPlayerId: 'player2',
          offeredTech: TechnologyType.AGRICULTURE, // Single tech instead of array
          requestedTech: TechnologyType.BRONZE_WORKING
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, action);

      expect(result.success).toBe(true);
      expect(result.gameState.tradeOffers![0].offeredTech).toEqual([TechnologyType.AGRICULTURE]);
      expect(result.gameState.tradeOffers![0].requestedTech).toEqual([TechnologyType.BRONZE_WORKING]);
    });

    it('should initialize tradeOffers array if it does not exist', () => {
      // Remove tradeOffers from game state
      delete mockGameState.tradeOffers;

      const action: GameAction = {
        type: GameActionType.TECH_TRADE_OFFER,
        payload: {
          fromPlayerId: 'player1',
          toPlayerId: 'player2',
          offeredTech: [TechnologyType.AGRICULTURE],
          requestedTech: [TechnologyType.BRONZE_WORKING]
        }
      };

      const result = GameEngine.processPlayerAction(mockGameState, action);

      expect(result.success).toBe(true);
      expect(result.gameState.tradeOffers).toBeDefined();
      expect(result.gameState.tradeOffers!.length).toBe(1);
    });
  });
});