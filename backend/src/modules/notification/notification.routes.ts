import { Router } from 'express';
import {
  handleGetNotifications,
  handleGetUnreadCount,
  handleMarkAsRead,
  handleMarkAllAsRead,
  handleGetPreferences,
  handleUpdatePreferences,
} from './notification.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

// Preferences endpoints (put preferences before :id routes)
router.get('/preferences', requireAuth, handleGetPreferences);
router.put('/preferences', requireAuth, handleUpdatePreferences);

// Notification items endpoints
router.get('/', requireAuth, handleGetNotifications);
router.get('/unread-count', requireAuth, handleGetUnreadCount);
router.put('/read-all', requireAuth, handleMarkAllAsRead);
router.put('/:id/read', requireAuth, handleMarkAsRead);

export default router;
