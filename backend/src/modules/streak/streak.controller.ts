import { Request, Response, NextFunction } from 'express';
import { recalculateUserStreak } from './streak.service.js';

export const handleGetStreak = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const streakInfo = await recalculateUserStreak(req.user.id);
    
    res.status(200).json({
      success: true,
      currentStreak: streakInfo.currentStreak,
      longestStreak: streakInfo.longestStreak,
      successfulStudyDays: streakInfo.successfulStudyDays,
      lastActiveDate: streakInfo.lastActiveDate,
    });
  } catch (error) {
    next(error);
  }
};
