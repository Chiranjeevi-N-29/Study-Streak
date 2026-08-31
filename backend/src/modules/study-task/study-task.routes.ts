import { Router } from 'express';
import {
  handleUpdateStudyTask,
  handleDeleteStudyTask,
} from './study-task.controller.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { updateStudyTaskSchema } from './study-task.schema.js';

const router = Router();

// Secure all task routes
router.use(requireAuth);

router.put('/:id', validate(updateStudyTaskSchema), handleUpdateStudyTask);
router.delete('/:id', handleDeleteStudyTask);

export default router;
