import { Request, Response } from 'express';
import * as notificationService from './notification.service.js';
import { checkAndGenerateRemindersForUser } from './notification.scheduler.js';
import { updateNotificationPreferencesSchema } from './notification.schema.js';

export const handleGetNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User authentication required' });
      return;
    }

    // Trigger reminder evaluation for user
    await checkAndGenerateRemindersForUser(userId).catch((err) =>
      console.error('Scheduler check error:', err)
    );

    const notifications = await notificationService.getUserNotifications(userId);

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error while fetching notifications' });
  }
};

export const handleGetUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User authentication required' });
      return;
    }

    const result = await notificationService.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      count: result.count,
    });
  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    res.status(500).json({ error: 'Internal server error while fetching unread count' });
  }
};

export const handleMarkAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User authentication required' });
      return;
    }

    const notificationId = req.params.id;
    const notification = await notificationService.markAsRead(userId, notificationId);

    res.status(200).json({
      success: true,
      notification,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    res.status(status).json({ error: error.message || 'Error marking notification as read' });
  }
};

export const handleMarkAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User authentication required' });
      return;
    }

    await notificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Internal server error while marking all as read' });
  }
};

export const handleGetPreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User authentication required' });
      return;
    }

    const preferences = await notificationService.getPreferences(userId);

    res.status(200).json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Internal server error while fetching preferences' });
  }
};

export const handleUpdatePreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: User authentication required' });
      return;
    }

    const parseResult = updateNotificationPreferencesSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.errors,
      });
      return;
    }

    const preferences = await notificationService.updatePreferences(
      userId,
      parseResult.data
    );

    res.status(200).json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Internal server error while updating preferences' });
  }
};
