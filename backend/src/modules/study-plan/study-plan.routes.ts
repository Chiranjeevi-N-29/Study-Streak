import { Router } from 'express';
import {
  handleCreateStudyPlan,
  handleGetTodayStudyPlan,
  handleGetStudyPlansByRange,
  handleGetStudyPlanById,
  handleUpdateStudyPlan,
  handleDeleteStudyPlan,
} from './study-plan.controller.js';
import {
  handleCreateStudyTask,
  handleReorderStudyTasks,
} from '../study-task/study-task.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { createStudyPlanSchema, updateStudyPlanSchema } from './study-plan.schema.js';
import { createStudyTaskSchema, reorderTasksSchema } from '../study-task/study-task.schema.js';

const router = Router();

// Secure all study plan routes
router.use(requireAuth);

router.post('/', validate(createStudyPlanSchema), handleCreateStudyPlan);
router.get('/today', handleGetTodayStudyPlan);
router.get('/', handleGetStudyPlansByRange);
router.get('/:id', handleGetStudyPlanById);
router.put('/:id', validate(updateStudyPlanSchema), handleUpdateStudyPlan);
router.delete('/:id', handleDeleteStudyPlan);

// Task endpoints nested under study plans
router.post('/:planId/tasks', validate(createStudyTaskSchema), handleCreateStudyTask);
router.put('/:planId/tasks/reorder', validate(reorderTasksSchema), handleReorderStudyTasks);

export default router;
