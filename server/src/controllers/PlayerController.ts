import { Request, Response } from 'express';
import GameService from '../services/GameService';

export class PlayerController {
  constructor(private gameService: GameService) {}

  // GET /api/players - Get all active players
  getAllPlayers = (req: Request, res: Response): void => {
    try {
      const players = this.gameService.getAllPlayers();
      const playerList = players.map(player => ({
        id: player.id,
        username: player.username,
        civilization: player.civilization,
        score: player.score,
        isOnline: player.isOnline
      }));
      
      res.json(playerList);
    } catch (error) {
      console.error('Error getting players:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // GET /api/players/:id - Get specific player details
  getPlayer = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const player = this.gameService.getPlayer(id);
      
      if (!player) {
        res.status(404).json({ error: 'Player not found' });
        return;
      }
      
      res.json({
        id: player.id,
        username: player.username,
        civilization: player.civilization,
        score: player.score,
        isOnline: player.isOnline,
        lastActivity: player.lastActivity
      });
    } catch (error) {
      console.error('Error getting player:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // PUT /api/players/:id/activity - Update player activity
  updateActivity = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const updated = this.gameService.updatePlayerActivity(id);
      
      if (updated) {
        res.json({ message: 'Activity updated successfully' });
      } else {
        res.status(404).json({ error: 'Player not found' });
      }
    } catch (error) {
      console.error('Error updating activity:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // PUT /api/players/:id/status - Update player online status
  updateStatus = (req: Request, res: Response): void => {
    try {
      const { id } = req.params;
      const { isOnline } = req.body;
      
      if (typeof isOnline !== 'boolean') {
        res.status(400).json({ error: 'isOnline must be a boolean' });
        return;
      }
      
      const updated = this.gameService.setPlayerOnlineStatus(id, isOnline);
      
      if (updated) {
        res.json({ message: 'Status updated successfully' });
      } else {
        res.status(404).json({ error: 'Player not found' });
      }
    } catch (error) {
      console.error('Error updating status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export default PlayerController;