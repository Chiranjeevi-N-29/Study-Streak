import { prisma } from '../../config/db.js';
import { ACHIEVEMENTS } from './achievement.definitions.js';

export interface UserAchievementItem {
  id?: string;
  code: string;
  title: string;
  description: string;
  category: string;
  conditionType: string;
  threshold: number;
  icon: string;
  progress: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export const evaluateUserAchievements = async (userId: string) => {
  // 1. Fetch user metrics across Streak, StudyPlans, Tasks, and Reflections
  const streak = await prisma.streak.findUnique({
    where: { userId },
  });

  const currentStreak = streak?.currentStreak ?? 0;
  const longestStreak = streak?.longestStreak ?? 0;
  const streakMetric = Math.max(currentStreak, longestStreak);

  // Count completed tasks
  const completedTasks = await prisma.studyTask.findMany({
    where: {
      studyPlan: { userId },
      status: 'COMPLETED',
    },
    select: {
      actualDuration: true,
    },
  });

  const completedTaskCount = completedTasks.length;

  // Sum actual study minutes across tasks
  const totalStudyMinutes = completedTasks.reduce(
    (sum, t) => sum + (t.actualDuration || 0),
    0
  );

  // Count daily reflections
  const reflectionsCount = await prisma.dailyReflection.count({
    where: { userId },
  });

  // Count successful study days
  const successfulDaysCount = await prisma.studyPlan.count({
    where: {
      userId,
      status: 'COMPLETED',
    },
  });

  // Map metric values by conditionType
  const metricValues: Record<string, number> = {
    STREAK: streakMetric,
    TASKS_COMPLETED: completedTaskCount,
    STUDY_TIME: totalStudyMinutes,
    REFLECTIONS: reflectionsCount,
    SUCCESSFUL_DAYS: successfulDaysCount,
  };

  // Fetch all achievements from database (or predefined if seeding not completed yet)
  let dbAchievements = await prisma.achievement.findMany({});
  if (dbAchievements.length === 0) {
    // Upsert predefined achievements dynamically if empty
    for (const def of ACHIEVEMENTS) {
      await prisma.achievement.upsert({
        where: { code: def.code },
        update: {},
        create: {
          code: def.code,
          title: def.title,
          description: def.description,
          category: def.category,
          conditionType: def.conditionType as any,
          conditionValue: def.conditionValue,
          icon: def.icon,
        },
      });
    }
    dbAchievements = await prisma.achievement.findMany({});
  }

  // Fetch existing UserAchievements for this user
  const userAchievements = await prisma.userAchievement.findMany({
    where: { userId },
  });

  const unlockedMap = new Map<string, (typeof userAchievements)[0]>();
  userAchievements.forEach((ua) => unlockedMap.set(ua.achievementId, ua));

  const newlyUnlocked: string[] = [];

  for (const ach of dbAchievements) {
    const rawVal = metricValues[ach.conditionType] || 0;
    const progress = Math.min(ach.conditionValue, rawVal);
    const existing = unlockedMap.get(ach.id);

    const isQualified = rawVal >= ach.conditionValue;

    if (existing) {
      // Idempotently update progress if not already full or update unlockedAt if qualified
      if (!existing.unlockedAt && isQualified) {
        await prisma.userAchievement.update({
          where: { id: existing.id },
          data: {
            progress: ach.conditionValue,
            unlockedAt: new Date(),
          },
        });
        newlyUnlocked.push(ach.code);
      } else if (existing.progress !== progress) {
        await prisma.userAchievement.update({
          where: { id: existing.id },
          data: { progress },
        });
      }
    } else {
      // Create UserAchievement record idempotently
      const unlockedAt = isQualified ? new Date() : null;
      await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: ach.id,
          progress,
          ...(unlockedAt ? { unlockedAt } : {}),
        },
      });

      if (isQualified) {
        newlyUnlocked.push(ach.code);
      }
    }
  }

  return { newlyUnlocked };
};

export const getUserAchievements = async (
  userId: string
): Promise<UserAchievementItem[]> => {
  // Evaluate fresh progress & unlocks first
  await evaluateUserAchievements(userId);

  // Fetch achievements with user's progress
  const dbAchievements = await prisma.achievement.findMany({
    include: {
      users: {
        where: { userId },
      },
    },
    orderBy: {
      conditionValue: 'asc',
    },
  });

  return dbAchievements.map((ach) => {
    const userRecord = ach.users[0];
    const unlocked = Boolean(userRecord?.unlockedAt);
    return {
      id: ach.id,
      code: ach.code,
      title: ach.title,
      description: ach.description,
      category: ach.category,
      conditionType: ach.conditionType,
      threshold: ach.conditionValue,
      icon: ach.icon,
      progress: userRecord?.progress ?? 0,
      unlocked,
      unlockedAt: userRecord?.unlockedAt ? userRecord.unlockedAt.toISOString() : null,
    };
  });
};
