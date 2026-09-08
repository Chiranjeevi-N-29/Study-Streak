import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/db.js';
import { signToken } from '../auth/auth.utils.js';

vi.mock('../../config/db.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
      userPreferences: {
        findUnique: vi.fn(),
      },
      studyPlan: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      studyTask: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      focusSession: {
        findMany: vi.fn(),
      },
      studyGoal: {
        findUnique: vi.fn(),
      },
      streak: {
        upsert: vi.fn(),
      },
    },
  };
});

describe('Planner API Endpoints', () => {
  const testUserA = {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'User A',
    email: 'user-a@example.com',
    timezone: 'UTC',
  };

  const testUserB = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'User B',
    email: 'user-b@example.com',
    timezone: 'UTC',
  };

  const tokenA = signToken({ userId: testUserA.id });
  const tokenB = signToken({ userId: testUserB.id });

  const mockPlanA = {
    id: '33333333-3333-3333-3333-333333333333',
    userId: testUserA.id,
    date: '2026-09-08',
    title: 'Plan A',
    description: null,
    minimumStudyTarget: 60,
    status: 'TODO',
    createdAt: new Date(),
    updatedAt: new Date(),
    tasks: [],
  };

  const mockTaskA = {
    id: '44444444-4444-4444-4444-444444444444',
    studyPlanId: mockPlanA.id,
    goalId: null,
    title: 'DSA Practice',
    description: 'Solve 3 tree questions',
    category: 'CS',
    priority: 'HIGH',
    estimatedDuration: 60,
    actualDuration: 0,
    order: 0,
    status: 'TODO',
    createdAt: new Date(),
    updatedAt: new Date(),
    studyPlan: mockPlanA,
    goal: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (prisma.user.findUnique as any).mockImplementation((args: any) => {
      if (args.where.id === testUserA.id) return Promise.resolve(testUserA as any);
      if (args.where.id === testUserB.id) return Promise.resolve(testUserB as any);
      return Promise.resolve(null);
    });

    vi.mocked(prisma.userPreferences.findUnique).mockResolvedValue({
      id: 'pref-id',
      userId: testUserA.id,
      dailyStudyGoalMinutes: 120,
      preferredStudyDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      preferredStudyStartTime: '09:00',
      preferredStudyEndTime: '18:00',
      defaultFocusDurationMinutes: 25,
      defaultBreakDurationMinutes: 5,
      longBreakDurationMinutes: 15,
      autoStartBreak: false,
      weekStartsOn: 'Monday',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(prisma.studyPlan.findMany).mockResolvedValue([]);
    vi.mocked(prisma.focusSession.findMany).mockResolvedValue([]);
    vi.mocked(prisma.streak.upsert).mockResolvedValue({
      id: 'streak-id',
      userId: testUserA.id,
      currentStreak: 1,
      longestStreak: 5,
      lastActiveDate: '2026-09-07',
      updatedAt: new Date(),
    });
  });

  describe('GET /api/planner/week', () => {
    it('should return weekly planning data for the authenticated user', async () => {
      vi.mocked(prisma.studyPlan.findMany).mockResolvedValue([
        {
          ...mockPlanA,
          tasks: [mockTaskA],
        } as any,
      ]);

      const res = await request(app)
        .get('/api/planner/week?startDate=2026-09-07')
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('days');
      expect(res.body.data.days).toHaveLength(7);
      expect(res.body.data.weeklySummary.totalTasks).toBe(1);
    });
  });

  describe('GET /api/planner/day', () => {
    it('should return daily plan details and capacity calculation', async () => {
      vi.mocked(prisma.studyPlan.findUnique).mockResolvedValue({
        ...mockPlanA,
        tasks: [mockTaskA],
      } as any);

      const res = await request(app)
        .get('/api/planner/day?date=2026-09-08')
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.plannedMinutes).toBe(60);
      expect(res.body.data.dailyGoalMinutes).toBe(120);
      expect(res.body.data.workloadStatus).toBe('Moderate');
    });
  });

  describe('POST /api/planner/tasks/:id/schedule', () => {
    it('should schedule a task for a target date', async () => {
      vi.mocked(prisma.studyTask.findUnique).mockResolvedValue(mockTaskA as any);
      vi.mocked(prisma.studyPlan.findUnique).mockResolvedValue(mockPlanA as any);
      vi.mocked(prisma.studyTask.update).mockResolvedValue({
        ...mockTaskA,
        studyPlanId: mockPlanA.id,
      } as any);

      const res = await request(app)
        .post(`/api/planner/tasks/${mockTaskA.id}/schedule`)
        .set('Cookie', [`token=${tokenA}`])
        .send({
          date: '2026-09-10',
          estimatedDuration: 90,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('scheduled successfully');
    });

    it('should reject unauthorized user trying to schedule another user\'s task', async () => {
      vi.mocked(prisma.studyTask.findUnique).mockResolvedValue(mockTaskA as any);

      const res = await request(app)
        .post(`/api/planner/tasks/${mockTaskA.id}/schedule`)
        .set('Cookie', [`token=${tokenB}`])
        .send({
          date: '2026-09-10',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });
  });

  describe('GET /api/planner/overdue', () => {
    it('should return list of incomplete tasks past their planned date', async () => {
      const overdueTask = {
        ...mockTaskA,
        studyPlan: {
          id: 'old-plan',
          date: '2026-09-01',
        },
      };
      vi.mocked(prisma.studyTask.findMany).mockResolvedValue([overdueTask as any]);

      const res = await request(app)
        .get('/api/planner/overdue')
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(1);
      expect(res.body.data.tasks[0].plannedDate).toBe('2026-09-01');
    });
  });

  describe('GET /api/planner/recommendations', () => {
    it('should return a deterministic scheduling recommendation', async () => {
      vi.mocked(prisma.studyTask.findUnique).mockResolvedValue(mockTaskA as any);

      const res = await request(app)
        .get(`/api/planner/recommendations?taskId=${mockTaskA.id}`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('recommendedDate');
      expect(res.body.data).toHaveProperty('reason');
      expect(res.body.data.candidates.length).toBeGreaterThan(0);
    });
  });
});
