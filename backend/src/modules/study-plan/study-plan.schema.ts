import { z } from 'zod';
import { Status } from '@prisma/client';

export const createStudyPlanSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  title: z.string().trim().max(200, 'Title must be 200 characters or less').optional(),
  description: z.string().trim().max(1000, 'Description must be 1000 characters or less').optional(),
  minimumStudyTarget: z
    .number({ invalid_type_error: 'Minimum study target must be a number' })
    .int('Minimum study target must be an integer')
    .min(0, 'Minimum study target cannot be negative')
    .default(30),
  status: z.nativeEnum(Status).default(Status.TODO),
});

export const updateStudyPlanSchema = z.object({
  title: z.string().trim().max(200, 'Title must be 200 characters or less').optional(),
  description: z.string().trim().max(1000, 'Description must be 1000 characters or less').optional(),
  minimumStudyTarget: z
    .number({ invalid_type_error: 'Minimum study target must be a number' })
    .int('Minimum study target must be an integer')
    .min(0, 'Minimum study target cannot be negative')
    .optional(),
  status: z.nativeEnum(Status).optional(),
});

export const dateRangeQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be in YYYY-MM-DD format'),
});

export type CreateStudyPlanInput = z.infer<typeof createStudyPlanSchema>;
export type UpdateStudyPlanInput = z.infer<typeof updateStudyPlanSchema>;
