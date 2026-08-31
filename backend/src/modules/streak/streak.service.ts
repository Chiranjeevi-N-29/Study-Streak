import { prisma } from '../../config/db.js';
import { Status, StudyPlan, StudyTask, Streak } from '@prisma/client';

export interface StreakCalculationResult {
  currentStreak: number;
  longestStreak: number;
  successfulStudyDays: number;
  lastActiveDate: string | null;
}

export const getLocalDateInTimezone = (date: Date, timezone: string): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  } catch (err) {
    return date.toISOString().split('T')[0];
  }
};

export const getDateStringRange = (startDateStr: string, endDateStr: string): string[] => {
  const dates: string[] = [];
  const start = new Date(`${startDateStr}T00:00:00.000Z`);
  const end = new Date(`${endDateStr}T00:00:00.000Z`);
  
  if (start > end) return [];
  
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
};

export const evaluatePlanStatus = (
  plan: StudyPlan & { tasks: StudyTask[] },
  localToday: string
): 'SUCCESS' | 'REST' | 'MISSED' | 'PENDING' => {
  // Check success criteria first
  if (plan.status === Status.COMPLETED || plan.status === Status.PARTIALLY_COMPLETED) {
    return 'SUCCESS';
  }

  // All planned tasks are completed
  const hasTasks = plan.tasks.length > 0;
  const allTasksCompleted = hasTasks && plan.tasks.every((t) => t.status === Status.COMPLETED);
  if (allTasksCompleted) {
    return 'SUCCESS';
  }

  // At least one task is completed and actualDuration >= minimumStudyTarget
  const completedTasks = plan.tasks.filter((t) => t.status === Status.COMPLETED);
  const totalActualDuration = plan.tasks.reduce((sum, t) => sum + t.actualDuration, 0);
  if (completedTasks.length > 0 && totalActualDuration >= plan.minimumStudyTarget) {
    return 'SUCCESS';
  }

  // Check Rest criteria next
  if (plan.status === Status.REST_DAY) {
    return 'REST';
  }

  // Check Missed criteria next
  if (plan.status === Status.MISSED || plan.status === Status.NOT_COMPLETED) {
    return 'MISSED';
  }

  // If it's a past date and doesn't meet success or rest, it's MISSED
  if (plan.date < localToday) {
    return 'MISSED';
  }

  // If it's today or future and has TODO or IN_PROGRESS, it is PENDING
  return 'PENDING';
};

export const calculateStreak = (
  dailyCategories: { date: string; category: 'SUCCESS' | 'REST' | 'MISSED' | 'PENDING' }[]
): StreakCalculationResult => {
  let tempStreak = 0;
  let longestStreak = 0;
  let successfulStudyDays = 0;
  let lastActiveDate: string | null = null;

  for (const day of dailyCategories) {
    if (day.category === 'SUCCESS') {
      tempStreak += 1;
      longestStreak = Math.max(longestStreak, tempStreak);
      successfulStudyDays += 1;
      lastActiveDate = day.date;
    } else if (day.category === 'REST') {
      // Bridge behavior: preserve tempStreak, don't increment, don't reset
    } else if (day.category === 'MISSED') {
      tempStreak = 0;
    } else if (day.category === 'PENDING') {
      // Preserve behavior: don't increment, don't reset
    }
  }

  return {
    currentStreak: tempStreak,
    longestStreak,
    successfulStudyDays,
    lastActiveDate,
  };
};

export const recalculateUserStreak = async (
  userId: string
): Promise<Streak & { successfulStudyDays: number }> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, timezone: true },
  });

  if (!user) {
    const error = new Error('User not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  const timezone = user.timezone;
  const localToday = getLocalDateInTimezone(new Date(), timezone);
  const localStart = getLocalDateInTimezone(user.createdAt, timezone);

  const plans = await prisma.studyPlan.findMany({
    where: { userId },
    include: { tasks: true },
  });

  const planMap = new Map<string, StudyPlan & { tasks: StudyTask[] }>();
  for (const plan of plans) {
    planMap.set(plan.date, plan);
  }

  const dateRange = getDateStringRange(localStart, localToday);

  const dailyCategories: { date: string; category: 'SUCCESS' | 'REST' | 'MISSED' | 'PENDING' }[] = [];
  for (const dateStr of dateRange) {
    const plan = planMap.get(dateStr);
    if (plan) {
      dailyCategories.push({
        date: dateStr,
        category: evaluatePlanStatus(plan, localToday),
      });
    } else {
      dailyCategories.push({
        date: dateStr,
        category: dateStr < localToday ? 'MISSED' : 'PENDING',
      });
    }
  }

  const result = calculateStreak(dailyCategories);

  const streak = await prisma.streak.upsert({
    where: { userId },
    update: {
      currentStreak: result.currentStreak,
      longestStreak: result.longestStreak,
      lastActiveDate: result.lastActiveDate,
    },
    create: {
      userId,
      currentStreak: result.currentStreak,
      longestStreak: result.longestStreak,
      lastActiveDate: result.lastActiveDate,
    },
  });

  return {
    ...streak,
    successfulStudyDays: result.successfulStudyDays,
  };
};
