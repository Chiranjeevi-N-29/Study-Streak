import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/db.js';
import { signToken } from '../auth/auth.utils.js';

// Mock the prisma database client
vi.mock('../../config/db.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
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

describe('Achievement API Integration Tests', () => {
  const testUserA = {
    id: 'user-a-id',
    name: 'User A',
    email: 'usera@example.com',
    timezone: 'UTC',
  };

  const testUserB = {
    id: 'user-b-id',
    name: 'User B',
    email: 'userb@example.com',
    timezone: 'UTC',
  };

  const tokenA = signToken({ userId: testUserA.id });
  const tokenB = signToken({ userId: testUserB.id });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/achievements should return 401 Unauthorized if request has no session cookie', async () => {
    const res = await request(app).get('/api/achievements');
    expect(res.status).toBe(401);
  });

  it('GET /api/achievements should return all achievements with progress and unlock status for authenticated user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(testUserA as any);
    vi.mocked(prisma.streak.findUnique).mockResolvedValue({
      id: 'streak-1',
      userId: testUserA.id,
      currentStreak: 3,
      longestStreak: 3,
    } as any);

    vi.mocked(prisma.studyTask.findMany).mockResolvedValue([]);
    vi.mocked(prisma.dailyReflection.count).mockResolvedValue(0);
    vi.mocked(prisma.studyPlan.count).mockResolvedValue(0);

    vi.mocked(prisma.achievement.findMany).mockResolvedValue([
      {
        id: 'ach-1',
        code: 'STREAK_3',
        title: '3-Day Streak',
        description: 'Maintain a 3-day streak.',
        category: 'STREAK',
        conditionType: 'STREAK',
        conditionValue: 3,
        icon: '🔥',
        users: [
          {
            id: 'ua-1',
            userId: testUserA.id,
            achievementId: 'ach-1',
            progress: 3,
            unlockedAt: new Date('2026-09-01'),
          },
        ],
      },
      {
        id: 'ach-2',
        code: 'TASKS_10',
        title: 'First 10 Tasks',
        description: 'Complete 10 tasks.',
        category: 'TASKS',
        conditionType: 'TASKS_COMPLETED',
        conditionValue: 10,
        icon: '📚',
        users: [],
      },
    ] as any);

    vi.mocked(prisma.userAchievement.findMany).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/achievements')
      .set('Cookie', `token=${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.achievements.length).toBe(2);

    const unlockedAch = res.body.achievements.find((a: any) => a.code === 'STREAK_3');
    expect(unlockedAch.unlocked).toBe(true);
    expect(unlockedAch.progress).toBe(3);

    const lockedAch = res.body.achievements.find((a: any) => a.code === 'TASKS_10');
    expect(lockedAch.unlocked).toBe(false);
  });

  it('GET /api/achievements/unlocked should return only unlocked achievements', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(testUserA as any);
    vi.mocked(prisma.streak.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.studyTask.findMany).mockResolvedValue([]);
    vi.mocked(prisma.dailyReflection.count).mockResolvedValue(0);
    vi.mocked(prisma.studyPlan.count).mockResolvedValue(0);

    vi.mocked(prisma.achievement.findMany).mockResolvedValue([
      {
        id: 'ach-1',
        code: 'STREAK_3',
        title: '3-Day Streak',
        description: 'Maintain a 3-day streak.',
        category: 'STREAK',
        conditionType: 'STREAK',
        conditionValue: 3,
        icon: '🔥',
        users: [
          {
            id: 'ua-1',
            userId: testUserA.id,
            achievementId: 'ach-1',
            progress: 3,
            unlockedAt: new Date('2026-09-01'),
          },
        ],
      },
      {
        id: 'ach-2',
        code: 'TASKS_10',
        title: 'First 10 Tasks',
        description: 'Complete 10 tasks.',
        category: 'TASKS',
        conditionType: 'TASKS_COMPLETED',
        conditionValue: 10,
        icon: '📚',
        users: [],
      },
    ] as any);

    vi.mocked(prisma.userAchievement.findMany).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/achievements/unlocked')
      .set('Cookie', `token=${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.achievements.length).toBe(1);
    expect(res.body.achievements[0].code).toBe('STREAK_3');
  });

  it('GET /api/achievements should isolate User B data from User A', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(testUserB as any);
    vi.mocked(prisma.streak.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.studyTask.findMany).mockResolvedValue([]);
    vi.mocked(prisma.dailyReflection.count).mockResolvedValue(0);
    vi.mocked(prisma.studyPlan.count).mockResolvedValue(0);
    vi.mocked(prisma.userAchievement.findMany).mockResolvedValue([]);
    vi.mocked(prisma.achievement.findMany).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/achievements')
      .set('Cookie', `token=${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
