import { z } from 'zod';

const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export const isValidTimezone = (tz: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name cannot be empty').max(100, 'Display name too long').optional(),
  timezone: z.string().refine((tz) => isValidTimezone(tz), {
    message: 'Invalid IANA timezone identifier',
  }).optional(),
  avatarUrl: z.string().trim().max(500, 'Avatar URL too long').nullable().optional(),
});

export const updatePreferencesSchema = z.object({
  dailyStudyGoalMinutes: z
    .number()
    .int('Daily study goal must be an integer')
    .min(1, 'Daily study goal must be at least 1 minute')
    .max(1440, 'Daily study goal cannot exceed 24 hours (1440 minutes)')
    .optional(),
  preferredStudyDays: z
    .array(z.enum(VALID_DAYS, { errorMap: () => ({ message: 'Invalid study day name' }) }))
    .min(1, 'At least one preferred study day must be selected')
    .optional(),
  preferredStudyStartTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Start time must be in 24-hour HH:MM format')
    .optional(),
  preferredStudyEndTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'End time must be in 24-hour HH:MM format')
    .optional(),
  defaultFocusDurationMinutes: z
    .number()
    .int()
    .min(1, 'Focus duration must be at least 1 minute')
    .max(720, 'Focus duration cannot exceed 12 hours')
    .optional(),
  defaultBreakDurationMinutes: z
    .number()
    .int()
    .min(1, 'Break duration must be at least 1 minute')
    .max(120, 'Break duration cannot exceed 2 hours')
    .optional(),
  longBreakDurationMinutes: z
    .number()
    .int()
    .min(1, 'Long break duration must be at least 1 minute')
    .max(120, 'Long break duration cannot exceed 2 hours')
    .optional(),
  autoStartBreak: z.boolean().optional(),
  weekStartsOn: z.enum(['Monday', 'Sunday'], {
    errorMap: () => ({ message: 'Week start day must be Monday or Sunday' }),
  }).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
