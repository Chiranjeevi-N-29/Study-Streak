import { Router } from 'express';
import { handleGetAnalytics } from './analytics.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

// GET /api/analytics?range=30d
router.get('/analytics', requireAuth, handleGetAnalytics);

export default router;
