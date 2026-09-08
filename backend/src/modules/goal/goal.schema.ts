import { z } from 'zod';
import { GoalProgressType, GoalStatus } from '@prisma/client';

export const goalProgressTypeEnum = z.nativeEnum(GoalProgressType);
export const goalStatusEnum = z.nativeEnum(GoalStatus);

export const createMilestoneInputSchema = z.object({
  title: z.string().min(1, 'Milestone title is required').max(150),
  description: z.string().max(500).optional().nullable(),
});

export const createGoalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150, 'Title must be 150 characters or less'),
  description: z.string().max(1000).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Target date must be YYYY-MM-DD format')
    .optional()
    .nullable(),
  progressType: goalProgressTypeEnum.default(GoalProgressType.FOCUS_TIME),
  targetValue: z.number().int().positive('Target value must be a positive integer').optional().nullable(),
  milestones: z.array(createMilestoneInputSchema).optional(),
});

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  description: z.string().max(1000).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Target date must be YYYY-MM-DD format')
    .optional()
    .nullable(),
  progressType: goalProgressTypeEnum.optional(),
  targetValue: z.number().int().positive('Target value must be a positive integer').optional().nullable(),
});

export const updateManualProgressSchema = z.object({
  currentValue: z.number().int().min(0, 'Current value cannot be negative'),
});

export const createMilestoneSchema = createMilestoneInputSchema;

export const updateMilestoneSchema = z.object({
  title: z.string().min(1).max(150).optional(),
  description: z.string().max(500).optional().nullable(),
  completed: z.boolean().optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type UpdateManualProgressInput = z.infer<typeof updateManualProgressSchema>;
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;
