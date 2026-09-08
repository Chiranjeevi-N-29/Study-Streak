import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/db.js';
import { signToken } from '../auth/auth.utils.js';
import { FocusSessionStatus } from '@prisma/client';

vi.mock('../../config/db.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    focusSession: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    studyTask: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    studyPlan: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    streak: {
      upsert: vi.fn(),
    },
    achievement: {
      findMany: vi.fn(),
    },
    userAchievement: {
      findMany: vi.fn(),
    },
    notification: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('Focus Session API Endpoints', () => {
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

  const sampleTask = {
    id: '11111111-1111-1111-1111-111111111111',
    studyPlanId: 'plan-123',
    title: 'Study React',
    category: 'Frontend',
    actualDuration: 0,
  };

  const sampleSession = {
    id: 'session-123',
    userId: userA.id,
    taskId: sampleTask.id,
    task: sampleTask,
    startedAt: new Date(Date.now() - 1800000), // Started 30 mins ago
    endedAt: null,
    durationSeconds: 0,
    pausedAt: null,
    totalPausedSeconds: 0,
    status: FocusSessionStatus.RUNNING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockImplementation((args: any) => {
      if (args.where.id === userA.id) return Promise.resolve(userA as any);
      if (args.where.id === userB.id) return Promise.resolve(userB as any);
      return Promise.resolve(null);
    });
  });

  describe('POST /api/focus-sessions', () => {
    it('should start a focus session for an authenticated user', async () => {
      vi.mocked(prisma.focusSession.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.studyTask.findFirst).mockResolvedValue(sampleTask as any);
      vi.mocked(prisma.focusSession.create).mockResolvedValue(sampleSession as any);

      const res = await request(app)
        .post('/api/focus-sessions')
        .set('Cookie', [`token=${tokenA}`])
        .send({ taskId: sampleTask.id });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.session.id).toBe(sampleSession.id);
    });

    it('should return 409 Conflict if an active focus session already exists', async () => {
      vi.mocked(prisma.focusSession.findFirst).mockResolvedValue(sampleSession as any);

      const res = await request(app)
        .post('/api/focus-sessions')
        .set('Cookie', [`token=${tokenA}`])
        .send({});

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('active focus session');
    });

    it('should return 401 Unauthorized if request has no token', async () => {
      const res = await request(app).post('/api/focus-sessions').send({});
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/focus-sessions/active', () => {
    it('should return active focus session if one exists', async () => {
      vi.mocked(prisma.focusSession.findFirst).mockResolvedValue(sampleSession as any);

      const res = await request(app)
        .get('/api/focus-sessions/active')
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.activeSession.id).toBe(sampleSession.id);
    });

    it('should return null activeSession if no running/paused session', async () => {
      vi.mocked(prisma.focusSession.findFirst).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/focus-sessions/active')
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.activeSession).toBeNull();
    });
  });

  describe('POST /api/focus-sessions/:id/pause & /resume', () => {
    it('should pause a running session', async () => {
      vi.mocked(prisma.focusSession.findUnique).mockResolvedValue(sampleSession as any);
      vi.mocked(prisma.focusSession.update).mockResolvedValue({
        ...sampleSession,
        status: FocusSessionStatus.PAUSED,
        pausedAt: new Date(),
      } as any);

      const res = await request(app)
        .post(`/api/focus-sessions/${sampleSession.id}/pause`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.session.status).toBe('PAUSED');
    });

    it('should return 403 Forbidden if User B attempts to pause User A session', async () => {
      vi.mocked(prisma.focusSession.findUnique).mockResolvedValue(sampleSession as any);

      const res = await request(app)
        .post(`/api/focus-sessions/${sampleSession.id}/pause`)
        .set('Cookie', [`token=${tokenB}`]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/focus-sessions/:id/complete', () => {
    it('should complete session and increment task actualDuration', async () => {
      vi.mocked(prisma.focusSession.findUnique).mockResolvedValue(sampleSession as any);
      vi.mocked(prisma.focusSession.update).mockResolvedValue({
        ...sampleSession,
        status: FocusSessionStatus.COMPLETED,
        durationSeconds: 1800, // 30 minutes
      } as any);

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...userA,
        createdAt: new Date(),
      } as any);
      vi.mocked(prisma.studyPlan.findMany).mockResolvedValue([]);
      vi.mocked(prisma.streak.upsert).mockResolvedValue({} as any);
      vi.mocked(prisma.achievement.findMany).mockResolvedValue([]);

      const res = await request(app)
        .post(`/api/focus-sessions/${sampleSession.id}/complete`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.session.status).toBe('COMPLETED');
      expect(prisma.studyTask.update).toHaveBeenCalledWith({
        where: { id: sampleTask.id },
        data: { actualDuration: { increment: 30 } },
      });
    });
  });

  describe('GET /api/focus-sessions/stats', () => {
    it('should return focus stats for authenticated user', async () => {
      vi.mocked(prisma.focusSession.findMany).mockResolvedValue([
        { durationSeconds: 1800, startedAt: new Date() },
        { durationSeconds: 1200, startedAt: new Date() },
      ] as any);

      const res = await request(app)
        .get('/api/focus-sessions/stats')
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats.completedSessionsCount).toBe(2);
      expect(res.body.stats.totalFocusSeconds).toBe(3000);
    });
  });
});
