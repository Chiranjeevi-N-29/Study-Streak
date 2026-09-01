import { PrismaClient, ConditionType } from '@prisma/client';

const prisma = new PrismaClient();

export const PREDEFINED_ACHIEVEMENTS = [
  {
    code: 'FIRST_SUCCESS',
    title: 'First Flame',
    description: 'Complete your first successful study day.',
    category: 'CONSISTENCY',
    conditionType: ConditionType.SUCCESSFUL_DAYS,
    conditionValue: 1,
    icon: '🔥',
  },
  {
    code: 'STREAK_3',
    title: '3-Day Streak',
    description: 'Maintain a 3-day study streak.',
    category: 'STREAK',
    conditionType: ConditionType.STREAK,
    conditionValue: 3,
    icon: '🔥',
  },
  {
    code: 'STREAK_7',
    title: '7-Day Streak',
    description: 'Maintain a 7-day study streak.',
    category: 'STREAK',
    conditionType: ConditionType.STREAK,
    conditionValue: 7,
    icon: '🔥',
  },
  {
    code: 'STREAK_14',
    title: '14-Day Streak',
    description: 'Maintain a 14-day study streak.',
    category: 'STREAK',
    conditionType: ConditionType.STREAK,
    conditionValue: 14,
    icon: '🔥',
  },
  {
    code: 'STREAK_30',
    title: '30-Day Streak',
    description: 'Maintain a 30-day study streak.',
    category: 'STREAK',
    conditionType: ConditionType.STREAK,
    conditionValue: 30,
    icon: '🔥',
  },
  {
    code: 'TASKS_10',
    title: 'First 10 Tasks',
    description: 'Complete your first 10 study tasks.',
    category: 'TASKS',
    conditionType: ConditionType.TASKS_COMPLETED,
    conditionValue: 10,
    icon: '📚',
  },
  {
    code: 'TASKS_50',
    title: 'Task Master',
    description: 'Complete 50 study tasks.',
    category: 'TASKS',
    conditionType: ConditionType.TASKS_COMPLETED,
    conditionValue: 50,
    icon: '📚',
  },
  {
    code: 'TASKS_100',
    title: 'Century',
    description: 'Complete 100 study tasks.',
    category: 'TASKS',
    conditionType: ConditionType.TASKS_COMPLETED,
    conditionValue: 100,
    icon: '📚',
  },
  {
    code: 'STUDY_HOURS_10',
    title: '10 Hours',
    description: 'Accumulate 10 hours (600 mins) of study.',
    category: 'STUDY_TIME',
    conditionType: ConditionType.STUDY_TIME,
    conditionValue: 600,
    icon: '⏱',
  },
  {
    code: 'STUDY_HOURS_50',
    title: '50 Hours',
    description: 'Accumulate 50 hours (3000 mins) of study.',
    category: 'STUDY_TIME',
    conditionType: ConditionType.STUDY_TIME,
    conditionValue: 3000,
    icon: '⏱',
  },
  {
    code: 'REFLECTIONS_7',
    title: 'Reflective Learner',
    description: 'Complete 7 daily reflections.',
    category: 'REFLECTION',
    conditionType: ConditionType.REFLECTIONS,
    conditionValue: 7,
    icon: '📝',
  },
  {
    code: 'SUCCESSFUL_DAYS_20',
    title: 'Consistent Learner',
    description: 'Complete 20 successful study days.',
    category: 'CONSISTENCY',
    conditionType: ConditionType.SUCCESSFUL_DAYS,
    conditionValue: 20,
    icon: '🌱',
  },
];

export async function seedAchievements() {
  console.log('Seeding achievements...');
  for (const ach of PREDEFINED_ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: ach.code },
      update: {
        title: ach.title,
        description: ach.description,
        category: ach.category,
        conditionType: ach.conditionType,
        conditionValue: ach.conditionValue,
        icon: ach.icon,
      },
      create: {
        code: ach.code,
        title: ach.title,
        description: ach.description,
        category: ach.category,
        conditionType: ach.conditionType,
        conditionValue: ach.conditionValue,
        icon: ach.icon,
      },
    });
  }
  console.log('Achievements seeded successfully.');
}

if (process.env.NODE_ENV !== 'test') {
  seedAchievements()
    .catch((e) => {
      console.warn('Database server not active; seed will run automatically when DB is connected.');
    })
    .finally(async () => {
      await prisma.$disconnect().catch(() => {});
    });
}
