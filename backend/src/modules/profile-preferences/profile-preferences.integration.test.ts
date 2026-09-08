import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/db.js';
import { signToken } from '../auth/auth.utils.js';
import { User, UserPreferences } from '@prisma/client';

vi.mock('../../config/db.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      userPreferences: {
        findUnique: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

describe('Profile & User Preferences API Integration Tests', () => {
  const testUserA = {
    id: 'user-a-id',
    name: 'Alice Learner',
    email: 'alice@example.com',
    passwordHash: 'hashed_pw',
    timezone: 'UTC',
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies User;

  const testUserB = {
    id: 'user-b-id',
    name: 'Bob Learner',
    email: 'bob@example.com',
    passwordHash: 'hashed_pw',
    timezone: 'Asia/Kolkata',
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies User;

  const tokenA = signToken({ userId: testUserA.id });
  const tokenB = signToken({ userId: testUserB.id });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/profile', () => {
    it('should return 401 Unauthorized if unauthenticated', async () => {
      const res = await request(app).get('/api/profile');
      expect(res.status).toBe(401);
    });

    it('should return user profile for authenticated user', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(testUserA as unknown as User);

      const res = await request(app)
        .get('/api/profile')
        .set('Cookie', `token=${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile.displayName).toBe('Alice Learner');
      expect(res.body.profile.email).toBe('alice@example.com');
      expect(res.body.profile.timezone).toBe('UTC');
    });
  });

  describe('PATCH /api/profile', () => {
    it('should update authenticated user profile', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(testUserA as unknown as User);
      vi.mocked(prisma.user.update).mockResolvedValue({
        ...testUserA,
        name: 'Alice Updated',
        timezone: 'America/New_York',
      } as unknown as User);

      const res = await request(app)
        .patch('/api/profile')
        .set('Cookie', `token=${tokenA}`)
        .send({
          displayName: 'Alice Updated',
          timezone: 'America/New_York',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile.displayName).toBe('Alice Updated');
      expect(res.body.profile.timezone).toBe('America/New_York');
    });

    it('should reject invalid timezone', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(testUserA as unknown as User);

      const res = await request(app)
        .patch('/api/profile')
        .set('Cookie', `token=${tokenA}`)
        .send({
          timezone: 'Invalid/City_Name',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/preferences', () => {
    it('should fetch user preferences or lazy-create default record', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(testUserA as unknown as User);
      vi.mocked(prisma.userPreferences.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.userPreferences.create).mockResolvedValue({
        id: 'pref-a',
        userId: testUserA.id,
        dailyStudyGoalMinutes: 60,
        preferredStudyDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        preferredStudyStartTime: '09:00',
        preferredStudyEndTime: '18:00',
        defaultFocusDurationMinutes: 25,
        defaultBreakDurationMinutes: 5,
        longBreakDurationMinutes: 15,
        autoStartBreak: false,
        weekStartsOn: 'Monday',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as UserPreferences);

      const res = await request(app)
        .get('/api/preferences')
        .set('Cookie', `token=${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.preferences.dailyStudyGoalMinutes).toBe(60);
      expect(res.body.preferences.defaultFocusDurationMinutes).toBe(25);
    });
  });

  describe('PATCH /api/preferences', () => {
    it('should update preferences with valid input', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(testUserA as unknown as User);
      vi.mocked(prisma.userPreferences.upsert).mockResolvedValue({
        id: 'pref-a',
        userId: testUserA.id,
        dailyStudyGoalMinutes: 120,
        preferredStudyDays: ['Monday', 'Wednesday', 'Friday'],
        preferredStudyStartTime: '10:00',
        preferredStudyEndTime: '19:00',
        defaultFocusDurationMinutes: 50,
        defaultBreakDurationMinutes: 10,
        longBreakDurationMinutes: 20,
        autoStartBreak: true,
        weekStartsOn: 'Monday',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as UserPreferences);

      const res = await request(app)
        .patch('/api/preferences')
        .set('Cookie', `token=${tokenA}`)
        .send({
          dailyStudyGoalMinutes: 120,
          defaultFocusDurationMinutes: 50,
          preferredStudyDays: ['Monday', 'Wednesday', 'Friday'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.preferences.dailyStudyGoalMinutes).toBe(120);
      expect(res.body.preferences.defaultFocusDurationMinutes).toBe(50);
    });

    it('should reject invalid daily study goal (negative or > 1440)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(testUserA as unknown as User);

      const res = await request(app)
        .patch('/api/preferences')
        .set('Cookie', `token=${tokenA}`)
        .send({
          dailyStudyGoalMinutes: -30,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should enforce user data isolation (User A cannot access or mutate User B data)', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(testUserB as unknown as User);
      vi.mocked(prisma.userPreferences.upsert).mockResolvedValue({
        id: 'pref-b',
        userId: testUserB.id,
        dailyStudyGoalMinutes: 90,
        defaultFocusDurationMinutes: 30,
        preferredStudyDays: ['Monday'],
        preferredStudyStartTime: '09:00',
        preferredStudyEndTime: '18:00',
        defaultBreakDurationMinutes: 5,
        longBreakDurationMinutes: 15,
        autoStartBreak: false,
        weekStartsOn: 'Monday',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as UserPreferences);

      // User B request
      const res = await request(app)
        .patch('/api/preferences')
        .set('Cookie', `token=${tokenB}`)
        .send({
          dailyStudyGoalMinutes: 90,
        });

      expect(res.status).toBe(200);
      expect(prisma.userPreferences.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: testUserB.id },
        })
      );
    });
  });
});
