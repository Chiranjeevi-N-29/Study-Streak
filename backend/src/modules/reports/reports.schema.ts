import { z } from 'zod';

export const reportQuerySchema = z.object({
  range: z.enum(['7d', '30d', '90d', 'all', 'custom']).default('30d'),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD')
    .optional(),
});

export const exportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).default('json'),
  dataset: z
    .enum(['tasks', 'focus_sessions', 'study_history', 'goals', 'all'])
    .default('all'),
  range: z.enum(['7d', '30d', '90d', 'all', 'custom']).default('all'),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate must be YYYY-MM-DD')
    .optional(),
});

export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type ExportQuery = z.infer<typeof exportQuerySchema>;
