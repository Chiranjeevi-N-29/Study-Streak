import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/db.js';
import { signToken } from '../auth/auth.utils.js';
import { GoalProgressType, GoalStatus } from '@prisma/client';

vi.mock('../../config/db.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    studyGoal: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    goalMilestone: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    studyTask: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
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
    streak: {
      findUnique: vi.fn(),
    },
    studyPlan: {
      count: vi.fn(),
    },
    dailyReflection: {
      count: vi.fn(),
    },
  },
}));

describe('Study Goal API Endpoints', () => {
  const userA = {
    id: 'user-a-uuid',
    name: 'User A',
    email: 'usera@example.com',
    timezone: 'UTC',
  };

  const userB = {
    id: 'user-b-uuid',
    name: 'User B',
    email: 'userb@example.com',
    timezone: 'UTC',
  };

  const tokenA = signToken({ userId: userA.id });
  const tokenB = signToken({ userId: userB.id });

  const sampleGoal = {
    id: 'goal-123',
    userId: userA.id,
    title: 'Master React & Next.js',
    description: 'Build production frontend apps',
    category: 'Frontend',
    targetDate: '2026-12-31',
    status: GoalStatus.ACTIVE,
    progressType: GoalProgressType.FOCUS_TIME,
    targetValue: 6000, // 100 hours
    currentValue: 1200, // 20 hours
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    tasks: [],
    milestones: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockImplementation((args: any) => {
      if (args.where.id === userA.id) return Promise.resolve(userA as any);
      if (args.where.id === userB.id) return Promise.resolve(userB as any);
      return Promise.resolve(null);
    });
  });

  describe('POST /api/goals', () => {
    it('should create a new study goal for user', async () => {
      vi.mocked(prisma.studyGoal.create).mockResolvedValue(sampleGoal as any);
      vi.mocked(prisma.studyGoal.findUnique).mockResolvedValue(sampleGoal as any);
      vi.mocked(prisma.studyGoal.update).mockResolvedValue(sampleGoal as any);

      const response = await request(app)
        .post('/api/goals')
        .set('Cookie', [`token=${tokenA}`])
        .send({
          title: 'Master React & Next.js',
          description: 'Build production frontend apps',
          category: 'Frontend',
          targetDate: '2026-12-31',
          progressType: 'FOCUS_TIME',
          targetValue: 100, // 100 hours
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.goal).toBeDefined();
      expect(response.body.goal.title).toBe(sampleGoal.title);
    });

    it('should reject unauthenticated creation', async () => {
      const response = await request(app).post('/api/goals').send({
        title: 'Unauthorized Goal',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/goals', () => {
    it('should retrieve list of goals for authenticated user', async () => {
      vi.mocked(prisma.studyGoal.findMany).mockResolvedValue([sampleGoal] as any);

      const response = await request(app)
        .get('/api/goals')
        .set('Cookie', [`token=${tokenA}`]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.goals)).toBe(true);
      expect(response.body.goals.length).toBe(1);
    });
  });

  describe('GET /api/goals/:id', () => {
    it('should retrieve goal details by ID for owner', async () => {
      vi.mocked(prisma.studyGoal.findUnique).mockResolvedValue(sampleGoal as any);

      const response = await request(app)
        .get(`/api/goals/${sampleGoal.id}`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.goal.id).toBe(sampleGoal.id);
    });

    it('should prevent User B from reading User A goal', async () => {
      vi.mocked(prisma.studyGoal.findUnique).mockResolvedValue(sampleGoal as any);

      const response = await request(app)
        .get(`/api/goals/${sampleGoal.id}`)
        .set('Cookie', [`token=${tokenB}`]);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Access denied');
    });
  });

  describe('PATCH /api/goals/:id', () => {
    it('should update goal details for owner', async () => {
      vi.mocked(prisma.studyGoal.findUnique).mockResolvedValue(sampleGoal as any);
      vi.mocked(prisma.studyGoal.update).mockResolvedValue({
        ...sampleGoal,
        title: 'Master React 19',
      } as any);

      const response = await request(app)
        .patch(`/api/goals/${sampleGoal.id}`)
        .set('Cookie', [`token=${tokenA}`])
        .send({
          title: 'Master React 19',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/goals/:id/complete', () => {
    it('should mark goal complete and trigger achievements check', async () => {
      vi.mocked(prisma.studyGoal.findUnique).mockResolvedValue(sampleGoal as any);
      vi.mocked(prisma.studyGoal.update).mockResolvedValue({
        ...sampleGoal,
        status: GoalStatus.COMPLETED,
        completedAt: new Date(),
      } as any);

      vi.mocked(prisma.streak.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.studyTask.findMany).mockResolvedValue([]);
      vi.mocked(prisma.dailyReflection.count).mockResolvedValue(0);
      vi.mocked(prisma.studyPlan.count).mockResolvedValue(0);
      vi.mocked(prisma.studyGoal.count).mockResolvedValue(1);
      vi.mocked(prisma.achievement.findMany).mockResolvedValue([]);
      vi.mocked(prisma.userAchievement.findMany).mockResolvedValue([]);

      const response = await request(app)
        .post(`/api/goals/${sampleGoal.id}/complete`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.goal.status).toBe(GoalStatus.COMPLETED);
    });
  });

  describe('POST /api/goals/:id/archive & unarchive', () => {
    it('should archive and unarchive goal', async () => {
      vi.mocked(prisma.studyGoal.findUnique).mockResolvedValue(sampleGoal as any);
      vi.mocked(prisma.studyGoal.update).mockResolvedValue({
        ...sampleGoal,
        status: GoalStatus.ARCHIVED,
      } as any);

      const archiveRes = await request(app)
        .post(`/api/goals/${sampleGoal.id}/archive`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.goal.status).toBe(GoalStatus.ARCHIVED);

      vi.mocked(prisma.studyGoal.update).mockResolvedValue({
        ...sampleGoal,
        status: GoalStatus.ACTIVE,
      } as any);

      const unarchiveRes = await request(app)
        .post(`/api/goals/${sampleGoal.id}/unarchive`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(unarchiveRes.status).toBe(200);
      expect(unarchiveRes.body.goal.status).toBe(GoalStatus.ACTIVE);
    });
  });

  describe('DELETE /api/goals/:id', () => {
    it('should delete goal for owner', async () => {
      vi.mocked(prisma.studyGoal.findUnique).mockResolvedValue(sampleGoal as any);
      vi.mocked(prisma.studyGoal.delete).mockResolvedValue(sampleGoal as any);

      const response = await request(app)
        .delete(`/api/goals/${sampleGoal.id}`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Milestones management', () => {
    it('should add milestone to goal', async () => {
      vi.mocked(prisma.studyGoal.findUnique).mockResolvedValue(sampleGoal as any);
      vi.mocked(prisma.goalMilestone.create).mockResolvedValue({
        id: 'milestone-1',
        goalId: sampleGoal.id,
        title: 'Learn Hooks',
        completed: false,
        order: 0,
      } as any);

      const response = await request(app)
        .post(`/api/goals/${sampleGoal.id}/milestones`)
        .set('Cookie', [`token=${tokenA}`])
        .send({
          title: 'Learn Hooks',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.milestone.title).toBe('Learn Hooks');
    });
  });
});
