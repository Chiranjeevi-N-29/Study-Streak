import { z } from 'zod';

export const updateNotificationPreferencesSchema = z.object({
  studyRemindersEnabled: z.boolean().optional(),
  reflectionRemindersEnabled: z.boolean().optional(),
  achievementNotificationsEnabled: z.boolean().optional(),
  streakNotificationsEnabled: z.boolean().optional(),
  dailyReminderTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Reminder time must be in HH:MM format (24-hour)')
    .optional(),
  timezone: z.string().min(1, 'Timezone is required').optional(),
});

export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;
