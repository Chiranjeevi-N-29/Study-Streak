import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as achievementService from './achievement.service.js';
import { prisma } from '../../config/db.js';

// Mock the prisma database client
vi.mock('../../config/db.js', () => {
  return {
    prisma: {
      streak: {
        findUnique: vi.fn(),
      },
      studyTask: {
        findMany: vi.fn(),
      },
      dailyReflection: {
        count: vi.fn(),
      },
      studyPlan: {
        count: vi.fn(),
      },
      achievement: {
        findMany: vi.fn(),
        upsert: vi.fn(),
      },
      userAchievement: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

describe('AchievementService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should evaluate user achievements and return newly unlocked items', async () => {
    vi.mocked(prisma.streak.findUnique).mockResolvedValue({
      id: 'streak-1',
      userId: 'user-1',
      currentStreak: 7,
      longestStreak: 7,
      lastActiveDate: '2026-09-01',
      updatedAt: new Date(),
    });

    vi.mocked(prisma.studyTask.findMany).mockResolvedValue([
      { actualDuration: 60 },
      { actualDuration: 45 },
    ] as any);

    vi.mocked(prisma.dailyReflection.count).mockResolvedValue(8);
    vi.mocked(prisma.studyPlan.count).mockResolvedValue(1);

    vi.mocked(prisma.achievement.findMany).mockResolvedValue([
      {
        id: 'ach-1',
        code: 'STREAK_7',
        title: '7-Day Streak',
        description: 'Maintain a 7-day streak.',
        category: 'STREAK',
        conditionType: 'STREAK',
        conditionValue: 7,
        icon: '🔥',
      },
      {
        id: 'ach-2',
        code: 'REFLECTIONS_7',
        title: 'Reflective Learner',
        description: 'Complete 7 daily reflections.',
        category: 'REFLECTION',
        conditionType: 'REFLECTIONS',
        conditionValue: 7,
        icon: '📝',
      },
    ] as any);

    vi.mocked(prisma.userAchievement.findMany).mockResolvedValue([]);
    vi.mocked(prisma.userAchievement.create).mockResolvedValue({} as any);

    const res = await achievementService.evaluateUserAchievements('user-1');

    expect(res.newlyUnlocked).toContain('STREAK_7');
    expect(res.newlyUnlocked).toContain('REFLECTIONS_7');
    expect(prisma.userAchievement.create).toHaveBeenCalledTimes(2);
  });

  it('should be idempotent and NOT unlock the same achievement twice', async () => {
    vi.mocked(prisma.streak.findUnique).mockResolvedValue({
      id: 'streak-1',
      userId: 'user-1',
      currentStreak: 7,
      longestStreak: 7,
      lastActiveDate: '2026-09-01',
      updatedAt: new Date(),
    });

    vi.mocked(prisma.studyTask.findMany).mockResolvedValue([]);
    vi.mocked(prisma.dailyReflection.count).mockResolvedValue(0);
    vi.mocked(prisma.studyPlan.count).mockResolvedValue(0);

    const mockAch = {
      id: 'ach-1',
      code: 'STREAK_7',
      title: '7-Day Streak',
      description: 'Maintain a 7-day streak.',
      category: 'STREAK',
      conditionType: 'STREAK',
      conditionValue: 7,
      icon: '🔥',
    };

    vi.mocked(prisma.achievement.findMany).mockResolvedValue([mockAch] as any);

    // Mock that UserAchievement is ALREADY unlocked
    vi.mocked(prisma.userAchievement.findMany).mockResolvedValue([
      {
        id: 'ua-1',
        userId: 'user-1',
        achievementId: 'ach-1',
        progress: 7,
        unlockedAt: new Date('2026-08-30'),
      },
    ] as any);

    const res = await achievementService.evaluateUserAchievements('user-1');

    expect(res.newlyUnlocked).toEqual([]);
    expect(prisma.userAchievement.create).not.toHaveBeenCalled();
  });
});
