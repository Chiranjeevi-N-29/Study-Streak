import { z } from 'zod';
import { Priority, Status } from '@prisma/client';

export const createStudyTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  description: z.string().trim().max(1000, 'Description must be 1000 characters or less').optional(),
  category: z.string().trim().min(1, 'Category is required').max(100, 'Category must be 100 characters or less'),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  estimatedDuration: z
    .number({ invalid_type_error: 'Estimated duration must be a number' })
    .int('Estimated duration must be an integer')
    .min(0, 'Estimated duration cannot be negative'),
});

export const updateStudyTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be 200 characters or less').optional(),
  description: z.string().trim().max(1000, 'Description must be 1000 characters or less').optional(),
  category: z.string().trim().min(1, 'Category is required').max(100, 'Category must be 100 characters or less').optional(),
  priority: z.nativeEnum(Priority).optional(),
  estimatedDuration: z
    .number({ invalid_type_error: 'Estimated duration must be a number' })
    .int('Estimated duration must be an integer')
    .min(0, 'Estimated duration cannot be negative')
    .optional(),
  actualDuration: z
    .number({ invalid_type_error: 'Actual duration must be a number' })
    .int('Actual duration must be an integer')
    .min(0, 'Actual duration cannot be negative')
    .optional(),
  status: z.nativeEnum(Status).optional(),
});

export const reorderTasksSchema = z.object({
  orderedTaskIds: z.array(z.string().uuid('Invalid task ID format')),
});

export type CreateStudyTaskInput = z.infer<typeof createStudyTaskSchema>;
export type UpdateStudyTaskInput = z.infer<typeof updateStudyTaskSchema>;
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>;
