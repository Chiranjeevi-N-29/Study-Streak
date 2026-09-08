import { z } from 'zod';
import { FocusSessionStatus } from '@prisma/client';

export const startFocusSessionSchema = z.object({
  taskId: z.string().uuid('Invalid task ID format').optional(),
});

export const listFocusSessionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(FocusSessionStatus).optional(),
  taskId: z.string().uuid('Invalid task ID format').optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type StartFocusSessionInput = z.infer<typeof startFocusSessionSchema>;
export type ListFocusSessionsQuery = z.infer<typeof listFocusSessionsSchema>;
