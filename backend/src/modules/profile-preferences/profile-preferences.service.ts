import { prisma } from '../../config/db.js';
import { UpdateProfileInput, UpdatePreferencesInput } from './profile-preferences.schema.js';

export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      timezone: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    const error = new Error('User profile not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.name,
    timezone: user.timezone,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

export const updateUserProfile = async (userId: string, input: UpdateProfileInput) => {
  // Ensure user exists
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) {
    const error = new Error('User not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const dataToUpdate: Record<string, unknown> = {};
  if (input.displayName !== undefined) {
    dataToUpdate.name = input.displayName;
  }
  if (input.timezone !== undefined) {
    dataToUpdate.timezone = input.timezone;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: dataToUpdate,
    select: {
      id: true,
      email: true,
      name: true,
      timezone: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    displayName: updatedUser.name,
    timezone: updatedUser.timezone,
    createdAt: updatedUser.createdAt,
    updatedAt: updatedUser.updatedAt,
  };
};

export const getUserPreferences = async (userId: string) => {
  let prefs = await prisma.userPreferences.findUnique({
    where: { userId },
  });

  if (!prefs) {
    // Lazy-initialize default preferences record for user
    prefs = await prisma.userPreferences.create({
      data: {
        userId,
        dailyStudyGoalMinutes: 60,
        preferredStudyDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        preferredStudyStartTime: '09:00',
        preferredStudyEndTime: '18:00',
        defaultFocusDurationMinutes: 25,
        defaultBreakDurationMinutes: 5,
        longBreakDurationMinutes: 15,
        autoStartBreak: false,
        weekStartsOn: 'Monday',
      },
    });
  }

  return prefs;
};

export const updateUserPreferences = async (userId: string, input: UpdatePreferencesInput) => {
  const prefs = await prisma.userPreferences.upsert({
    where: { userId },
    create: {
      userId,
      dailyStudyGoalMinutes: input.dailyStudyGoalMinutes ?? 60,
      preferredStudyDays: input.preferredStudyDays ?? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      preferredStudyStartTime: input.preferredStudyStartTime ?? '09:00',
      preferredStudyEndTime: input.preferredStudyEndTime ?? '18:00',
      defaultFocusDurationMinutes: input.defaultFocusDurationMinutes ?? 25,
      defaultBreakDurationMinutes: input.defaultBreakDurationMinutes ?? 5,
      longBreakDurationMinutes: input.longBreakDurationMinutes ?? 15,
      autoStartBreak: input.autoStartBreak ?? false,
      weekStartsOn: input.weekStartsOn ?? 'Monday',
    },
    update: {
      ...(input.dailyStudyGoalMinutes !== undefined && { dailyStudyGoalMinutes: input.dailyStudyGoalMinutes }),
      ...(input.preferredStudyDays !== undefined && { preferredStudyDays: input.preferredStudyDays }),
      ...(input.preferredStudyStartTime !== undefined && { preferredStudyStartTime: input.preferredStudyStartTime }),
      ...(input.preferredStudyEndTime !== undefined && { preferredStudyEndTime: input.preferredStudyEndTime }),
      ...(input.defaultFocusDurationMinutes !== undefined && { defaultFocusDurationMinutes: input.defaultFocusDurationMinutes }),
      ...(input.defaultBreakDurationMinutes !== undefined && { defaultBreakDurationMinutes: input.defaultBreakDurationMinutes }),
      ...(input.longBreakDurationMinutes !== undefined && { longBreakDurationMinutes: input.longBreakDurationMinutes }),
      ...(input.autoStartBreak !== undefined && { autoStartBreak: input.autoStartBreak }),
      ...(input.weekStartsOn !== undefined && { weekStartsOn: input.weekStartsOn }),
    },
  });

  return prefs;
};
