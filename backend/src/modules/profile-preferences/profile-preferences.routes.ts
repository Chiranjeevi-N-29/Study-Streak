import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import {
  handleGetProfile,
  handleUpdateProfile,
  handleGetPreferences,
  handleUpdatePreferences,
} from './profile-preferences.controller.js';

const router = Router();

router.get('/profile', requireAuth, handleGetProfile);
router.patch('/profile', requireAuth, handleUpdateProfile);

router.get('/preferences', requireAuth, handleGetPreferences);
router.patch('/preferences', requireAuth, handleUpdatePreferences);

export default router;
