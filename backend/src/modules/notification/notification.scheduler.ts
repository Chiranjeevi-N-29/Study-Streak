import { prisma } from '../../config/db.js';
import * as notificationService from './notification.service.js';

/**
 * Get current date string YYYY-MM-DD in a target IANA timezone
 */
export const getLocalDateInTimezone = (timezone: string = 'UTC'): string => {
  try {
    const d = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d);
  } catch {
    // Fallback to UTC if timezone invalid
    return new Date().toISOString().split('T')[0];
  }
};

/**
 * Check and generate study and reflection reminders for a user
 */
export const checkAndGenerateRemindersForUser = async (userId: string) => {
  const prefs = await notificationService.getPreferences(userId);
  const timezone = prefs.timezone || 'UTC';
  const localDate = getLocalDateInTimezone(timezone);

  // 1. Study Reminder
  if (prefs.studyRemindersEnabled) {
    const plan = await prisma.studyPlan.findUnique({
      where: {
        userId_date: {
          userId,
          date: localDate,
        },
      },
    });

    if (plan && plan.status !== 'REST_DAY' && plan.status !== 'COMPLETED') {
      const eventKey = `STUDY_REMINDER:${userId}:${localDate}`;
      await notificationService.createNotification({
        userId,
        type: 'STUDY_REMINDER',
        title: '📚 Study Reminder',
        message: `Your study plan "${plan.title || 'Today\'s Study Plan'}" is waiting for you today.`,
        link: '/app/planner',
        eventKey,
      });
    }
  }

  // 2. Reflection Reminder
  if (prefs.reflectionRemindersEnabled) {
    const reflection = await prisma.dailyReflection.findUnique({
      where: {
        userId_date: {
          userId,
          date: localDate,
        },
      },
    });

    if (!reflection) {
      const plan = await prisma.studyPlan.findUnique({
        where: {
          userId_date: {
            userId,
            date: localDate,
          },
        },
      });

      if (plan && plan.status !== 'REST_DAY') {
        const eventKey = `REFLECTION_REMINDER:${userId}:${localDate}`;
        await notificationService.createNotification({
          userId,
          type: 'REFLECTION_REMINDER',
          title: '📝 Daily Reflection',
          message: 'Take a moment to record what you learned and accomplished today.',
          link: '/app/reflections',
          eventKey,
        });
      }
    }
  }
};

/**
 * Trigger notification when an achievement is newly unlocked
 */
export const notifyAchievementUnlocked = async (
  userId: string,
  code: string,
  title: string,
  icon: string
) => {
  const prefs = await notificationService.getPreferences(userId);
  if (!prefs.achievementNotificationsEnabled) return;

  const eventKey = `ACHIEVEMENT_UNLOCKED:${userId}:${code}`;
  await notificationService.createNotification({
    userId,
    type: 'ACHIEVEMENT_UNLOCKED',
    title: `🎉 Achievement Unlocked! ${icon}`,
    message: `You unlocked the "${title}" milestone!`,
    link: '/app/achievements',
    eventKey,
  });
};

/**
 * Trigger notification when a streak milestone is reached
 */
export const notifyStreakMilestone = async (userId: string, streakCount: number) => {
  const prefs = await notificationService.getPreferences(userId);
  if (!prefs.streakNotificationsEnabled) return;

  const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100];
  if (!STREAK_MILESTONES.includes(streakCount)) return;

  const eventKey = `STREAK_MILESTONE:${userId}:${streakCount}`;
  await notificationService.createNotification({
    userId,
    type: 'STREAK_MILESTONE',
    title: `🔥 ${streakCount}-Day Streak Milestone!`,
    message: `Incredible consistency! You've maintained a ${streakCount}-day study streak.`,
    link: '/app',
    eventKey,
  });
};
