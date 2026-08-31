import { Router } from 'express';
import { handleGetStreak } from './streak.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

// Secure streak route
router.get('/', requireAuth, handleGetStreak);

export default router;
