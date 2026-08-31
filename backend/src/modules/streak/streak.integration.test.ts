import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/db.js';
import { signToken } from '../auth/auth.utils.js';
import { Status } from '@prisma/client';
import { getLocalDateInTimezone, getDateStringRange } from './streak.service.js';

// Mock the prisma database client
vi.mock('../../config/db.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
      studyPlan: {
        findMany: vi.fn(),
      },
      streak: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
      },
    },
  };
});

describe('Streak API and Recalculation Integration Tests', () => {
  const testUser = {
    id: 'user-a-id',
    name: 'User A',
    email: 'user-a@example.com',
    timezone: 'Asia/Kolkata',
    createdAt: new Date('2026-08-25T12:00:00.000Z'),
  };

  const testUserB = {
    id: 'user-b-id',
    name: 'User B',
    email: 'user-b@example.com',
    timezone: 'America/New_York',
    createdAt: new Date('2026-08-25T12:00:00.000Z'),
  };

  const tokenA = signToken({ userId: testUser.id });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock user lookup
    (prisma.user.findUnique as any).mockImplementation((args: any) => {
      if (args.where.id === testUser.id) return Promise.resolve(testUser as any);
      if (args.where.id === testUserB.id) return Promise.resolve(testUserB as any);
      return Promise.resolve(null);
    });
  });

  describe('GET /api/streak', () => {
    it('should return 401 Unauthorized if no cookie token is provided', async () => {
      const res = await request(app).get('/api/streak');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should successfully calculate and return streak for authenticated user', async () => {
      // Mock historical plans: 2 consecutive successful days
      const mockPlans = [
        {
          id: 'plan-1',
          userId: testUser.id,
          date: '2026-08-25',
          minimumStudyTarget: 60,
          status: Status.COMPLETED,
          tasks: [],
        },
        {
          id: 'plan-2',
          userId: testUser.id,
          date: '2026-08-26',
          minimumStudyTarget: 60,
          status: Status.PARTIALLY_COMPLETED, // Dynamically success since it has tasks or is marked success
          tasks: [
            { id: 't-1', status: Status.COMPLETED, actualDuration: 40 },
            { id: 't-2', status: Status.COMPLETED, actualDuration: 30 },
          ],
        },
      ];

      vi.mocked(prisma.studyPlan.findMany).mockResolvedValue(mockPlans as any);
      vi.mocked(prisma.streak.upsert).mockImplementation((args: any) => {
        return Promise.resolve({
          id: 'streak-id',
          userId: testUser.id,
          currentStreak: args.create.currentStreak,
          longestStreak: args.create.longestStreak,
          lastActiveDate: args.create.lastActiveDate,
          updatedAt: new Date(),
        }) as any;
      });

      const res = await request(app)
        .get('/api/streak')
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.currentStreak).toBeDefined();
      expect(res.body.longestStreak).toBeDefined();
      expect(res.body.successfulStudyDays).toBe(2);
      expect(res.body.lastActiveDate).toBe('2026-08-26');
      expect(prisma.streak.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('Timezone Boundary Logic', () => {
    it('should determine local date strings correctly based on timezone offset at boundary', () => {
      // Midnight UTC instance
      const midnightUtc = new Date('2026-08-31T00:00:00.000Z');

      // Asia/Kolkata is +5:30 -> local calendar date is 2026-08-31
      const kolkataDate = getLocalDateInTimezone(midnightUtc, 'Asia/Kolkata');
      expect(kolkataDate).toBe('2026-08-31');

      // America/New_York is -4:00 (EDT in August) -> local calendar date is 2026-08-30
      const nyDate = getLocalDateInTimezone(midnightUtc, 'America/New_York');
      expect(nyDate).toBe('2026-08-30');
    });

    it('should generate correct range list of calendar days inclusive', () => {
      const dates = getDateStringRange('2026-08-25', '2026-08-28');
      expect(dates).toEqual(['2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28']);
    });

    it('should handle zero date ranges gracefully', () => {
      const dates = getDateStringRange('2026-08-28', '2026-08-25');
      expect(dates).toEqual([]);
    });
  });

  describe('Cache Reconstruction Behavior', () => {
    it('should recreate and save a missing Streak cache row in the database', async () => {
      vi.mocked(prisma.studyPlan.findMany).mockResolvedValue([]);
      
      let upsertCalled = false;
      vi.mocked(prisma.streak.upsert).mockImplementation((args: any) => {
        upsertCalled = true;
        return Promise.resolve({
          id: 'streak-id',
          userId: testUser.id,
          currentStreak: args.create.currentStreak,
          longestStreak: args.create.longestStreak,
          lastActiveDate: args.create.lastActiveDate,
          updatedAt: new Date(),
        }) as any;
      });

      const res = await request(app)
        .get('/api/streak')
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(upsertCalled).toBe(true);
      expect(res.body.currentStreak).toBe(0);
      expect(res.body.longestStreak).toBe(0);
    });
  });
});
