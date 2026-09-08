import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as focusSessionController from './focus-session.controller.js';

const router = Router();

// Require authentication for all focus session routes
router.use(requireAuth);

router.post('/', focusSessionController.startSession);
router.get('/active', focusSessionController.getActiveSession);
router.get('/stats', focusSessionController.getStats);
router.get('/', focusSessionController.listSessions);
router.get('/:id', focusSessionController.getSessionById);
router.post('/:id/pause', focusSessionController.pauseSession);
router.post('/:id/resume', focusSessionController.resumeSession);
router.post('/:id/complete', focusSessionController.completeSession);
router.post('/:id/cancel', focusSessionController.cancelSession);

export default router;
