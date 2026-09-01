import { Router } from 'express';
import { handleGetAchievements, handleGetUnlockedAchievements } from './achievement.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

// GET /api/achievements
router.get('/', requireAuth, handleGetAchievements);

// GET /api/achievements/unlocked
router.get('/unlocked', requireAuth, handleGetUnlockedAchievements);

export default router;
