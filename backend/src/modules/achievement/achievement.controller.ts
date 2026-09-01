import { Request, Response } from 'express';
import * as achievementService from './achievement.service.js';

export const handleGetAchievements = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User authentication required' });
      return;
    }

    const achievements = await achievementService.getUserAchievements(userId);

    res.status(200).json({
      success: true,
      achievements,
    });
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    res.status(500).json({ error: 'Internal server error while retrieving achievements' });
  }
};

export const handleGetUnlockedAchievements = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User authentication required' });
      return;
    }

    const all = await achievementService.getUserAchievements(userId);
    const unlocked = all.filter((a) => a.unlocked);

    res.status(200).json({
      success: true,
      achievements: unlocked,
    });
  } catch (error) {
    console.error('Error fetching unlocked achievements:', error);
    res.status(500).json({ error: 'Internal server error while retrieving unlocked achievements' });
  }
};
