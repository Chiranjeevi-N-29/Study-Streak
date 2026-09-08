import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import * as goalController from './goal.controller.js';

const router = Router();

// Require authentication for all study goal routes
router.use(requireAuth);

router.post('/', goalController.createGoal);
router.get('/', goalController.getGoals);
router.get('/:id', goalController.getGoalById);
router.patch('/:id', goalController.updateGoal);
router.patch('/:id/progress', goalController.updateManualProgress);
router.post('/:id/complete', goalController.completeGoal);
router.post('/:id/archive', goalController.archiveGoal);
router.post('/:id/unarchive', goalController.unarchiveGoal);
router.delete('/:id', goalController.deleteGoal);

// Milestone routes
router.post('/:id/milestones', goalController.addMilestone);
router.patch('/:id/milestones/:milestoneId', goalController.updateMilestone);
router.delete('/:id/milestones/:milestoneId', goalController.deleteMilestone);

export default router;
