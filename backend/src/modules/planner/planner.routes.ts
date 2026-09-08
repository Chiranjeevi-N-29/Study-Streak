import { Router } from 'express';
import {
  handleGetWeeklyPlan,
  handleGetDailyPlan,
  handleScheduleTask,
  handleRescheduleTask,
  handleGetOverdueTasks,
  handleGetRecommendation,
  handleGetPlannerAnalytics,
} from './planner.controller.js';
import { requireAuth } from '../../middleware/auth.js';

const router = Router();

// Secure all planner routes
router.use(requireAuth);

router.get('/week', handleGetWeeklyPlan);
router.get('/day', handleGetDailyPlan);
router.get('/overdue', handleGetOverdueTasks);
router.get('/recommendations', handleGetRecommendation);
router.get('/analytics', handleGetPlannerAnalytics);

router.post('/tasks/:id/schedule', handleScheduleTask);
router.patch('/tasks/:id/schedule', handleScheduleTask);
router.post('/tasks/:id/reschedule', handleRescheduleTask);
router.post('/schedule', handleScheduleTask);

export default router;
