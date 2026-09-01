import { Request, Response } from 'express';
import { analyticsQuerySchema } from './analytics.schema.js';
import * as analyticsService from './analytics.service.js';

export const handleGetAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User authentication required' });
      return;
    }

    const parseResult = analyticsQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.flatten(),
      });
      return;
    }

    const { range } = parseResult.data;
    const analytics = await analyticsService.getUserAnalytics(userId, range);

    res.status(200).json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ error: 'Internal server error while retrieving analytics' });
  }
};
