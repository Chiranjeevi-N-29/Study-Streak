import { z } from 'zod';

export const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const scheduleTaskSchema = z.object({
  taskId: z.string().uuid({ message: 'Invalid task ID' }),
  date: z.string().regex(dateRegex, { message: 'Date must be in YYYY-MM-DD format' }),
  estimatedDuration: z.number().int().positive({ message: 'Estimated duration must be a positive integer' }).optional(),
});

export const rescheduleTaskSchema = z.object({
  targetDate: z.string().regex(dateRegex, { message: 'Target date must be in YYYY-MM-DD format' }),
  estimatedDuration: z.number().int().positive({ message: 'Estimated duration must be a positive integer' }).optional(),
});

export const plannerWeekQuerySchema = z.object({
  startDate: z.string().regex(dateRegex, { message: 'Start date must be in YYYY-MM-DD format' }).optional(),
});

export const plannerDayQuerySchema = z.object({
  date: z.string().regex(dateRegex, { message: 'Date must be in YYYY-MM-DD format' }).optional(),
});

export const plannerRecommendationQuerySchema = z.object({
  taskId: z.string().uuid({ message: 'Invalid task ID' }),
});

export type ScheduleTaskInput = z.infer<typeof scheduleTaskSchema>;
export type RescheduleTaskInput = z.infer<typeof rescheduleTaskSchema>;
export type PlannerWeekQuery = z.infer<typeof plannerWeekQuerySchema>;
export type PlannerDayQuery = z.infer<typeof plannerDayQuerySchema>;
export type PlannerRecommendationQuery = z.infer<typeof plannerRecommendationQuerySchema>;
