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
      studyPlan: {
        findMany: vi.fn(),
      },
      dailyReflection: {
        findMany: vi.fn(),
      },
    },
  };
});

describe('Analytics API Integration Tests', () => {
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

  it('GET /api/analytics should return 401 Unauthorized if request has no session cookie', async () => {
    const res = await request(app).get('/api/analytics');
    expect(res.status).toBe(401);
  });

  it('GET /api/analytics?range=invalid should return 400 Bad Request', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(testUserA as any);

    const res = await request(app)
      .get('/api/analytics?range=invalid_range')
      .set('Cookie', `token=${tokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('GET /api/analytics should return analytics payload for authenticated user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(testUserA as any);
    vi.mocked(prisma.streak.findUnique).mockResolvedValue({
      id: 'streak-1',
      userId: testUserA.id,
      currentStreak: 5,
      longestStreak: 10,
      lastActiveDate: '2026-09-01',
      updatedAt: new Date(),
    } as any);

    const todayStr = new Date().toISOString().split('T')[0];

    vi.mocked(prisma.studyPlan.findMany).mockResolvedValue([
      {
        id: 'plan-1',
        userId: testUserA.id,
        date: todayStr,
        status: 'COMPLETED',
        minimumStudyTarget: 60,
        tasks: [
          {
            id: 'task-1',
            studyPlanId: 'plan-1',
            title: 'Master Node.js Streams',
            category: 'Backend',
            priority: 'HIGH',
            estimatedDuration: 60,
            actualDuration: 75,
            status: 'COMPLETED',
          },
        ],
      },
    ] as any);

    vi.mocked(prisma.dailyReflection.findMany).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/analytics?range=30d')
      .set('Cookie', `token=${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.analytics.range).toBe('30d');
    expect(res.body.analytics.kpis.currentStreak).toBe(5);
    expect(res.body.analytics.kpis.totalStudyMinutes).toBe(75);
    expect(res.body.analytics.kpis.successfulDays).toBe(1);
  });

  it('GET /api/analytics should enforce strict data isolation between users', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(testUserB as any);
    vi.mocked(prisma.streak.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.studyPlan.findMany).mockResolvedValue([]);
    vi.mocked(prisma.dailyReflection.findMany).mockResolvedValue([]);

    const resB = await request(app)
      .get('/api/analytics?range=30d')
      .set('Cookie', `token=${tokenB}`);

    expect(resB.status).toBe(200);
    expect(resB.body.analytics.kpis.totalStudyMinutes).toBe(0);
  });
});
