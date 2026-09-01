export interface AchievementDefinition {
  code: string;
  title: string;
  description: string;
  category: 'STREAK' | 'TASKS' | 'STUDY_TIME' | 'REFLECTION' | 'CONSISTENCY';
  conditionType: 'STREAK' | 'TASKS_COMPLETED' | 'STUDY_TIME' | 'REFLECTIONS' | 'SUCCESSFUL_DAYS';
  conditionValue: number;
  icon: string;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    code: 'FIRST_SUCCESS',
    title: 'First Flame',
    description: 'Complete your first successful study day.',
    category: 'CONSISTENCY',
    conditionType: 'SUCCESSFUL_DAYS',
    conditionValue: 1,
    icon: '🔥',
  },
  {
    code: 'STREAK_3',
    title: '3-Day Streak',
    description: 'Maintain a 3-day study streak.',
    category: 'STREAK',
    conditionType: 'STREAK',
    conditionValue: 3,
    icon: '🔥',
  },
  {
    code: 'STREAK_7',
    title: '7-Day Streak',
    description: 'Maintain a 7-day study streak.',
    category: 'STREAK',
    conditionType: 'STREAK',
    conditionValue: 7,
    icon: '🔥',
  },
  {
    code: 'STREAK_14',
    title: '14-Day Streak',
    description: 'Maintain a 14-day study streak.',
    category: 'STREAK',
    conditionType: 'STREAK',
    conditionValue: 14,
    icon: '🔥',
  },
  {
    code: 'STREAK_30',
    title: '30-Day Streak',
    description: 'Maintain a 30-day study streak.',
    category: 'STREAK',
    conditionType: 'STREAK',
    conditionValue: 30,
    icon: '🔥',
  },
  {
    code: 'TASKS_10',
    title: 'First 10 Tasks',
    description: 'Complete your first 10 study tasks.',
    category: 'TASKS',
    conditionType: 'TASKS_COMPLETED',
    conditionValue: 10,
    icon: '📚',
  },
  {
    code: 'TASKS_50',
    title: 'Task Master',
    description: 'Complete 50 study tasks.',
    category: 'TASKS',
    conditionType: 'TASKS_COMPLETED',
    conditionValue: 50,
    icon: '📚',
  },
  {
    code: 'TASKS_100',
    title: 'Century',
    description: 'Complete 100 study tasks.',
    category: 'TASKS',
    conditionType: 'TASKS_COMPLETED',
    conditionValue: 100,
    icon: '📚',
  },
  {
    code: 'STUDY_HOURS_10',
    title: '10 Hours',
    description: 'Accumulate 10 hours (600 mins) of study.',
    category: 'STUDY_TIME',
    conditionType: 'STUDY_TIME',
    conditionValue: 600,
    icon: '⏱',
  },
  {
    code: 'STUDY_HOURS_50',
    title: '50 Hours',
    description: 'Accumulate 50 hours (3000 mins) of study.',
    category: 'STUDY_TIME',
    conditionType: 'STUDY_TIME',
    conditionValue: 3000,
    icon: '⏱',
  },
  {
    code: 'REFLECTIONS_7',
    title: 'Reflective Learner',
    description: 'Complete 7 daily reflections.',
    category: 'REFLECTION',
    conditionType: 'REFLECTIONS',
    conditionValue: 7,
    icon: '📝',
  },
  {
    code: 'SUCCESSFUL_DAYS_20',
    title: 'Consistent Learner',
    description: 'Complete 20 successful study days.',
    category: 'CONSISTENCY',
    conditionType: 'SUCCESSFUL_DAYS',
    conditionValue: 20,
    icon: '🌱',
  },
];
