import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/db.js';
import { signToken } from '../auth/auth.utils.js';
import { Status } from '@prisma/client';

// Mock the prisma database client
vi.mock('../../config/db.js', () => {
  return {
    prisma: {
      user: {
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
      streak: {
        upsert: vi.fn(),
      },
    },
  };
});

describe('Study Plans API Endpoints', () => {
  const testUser = {
    id: 'user-a-id',
    name: 'User A',
    email: 'user-a@example.com',
    timezone: 'UTC',
  };

  const testUserB = {
    id: 'user-b-id',
    name: 'User B',
    email: 'user-b@example.com',
    timezone: 'UTC',
  };

  const tokenA = signToken({ userId: testUser.id });
  const tokenB = signToken({ userId: testUserB.id });

  const testPlan = {
    id: 'plan-uuid-123',
    userId: testUser.id,
    date: '2026-08-31',
    title: 'Study Plan A',
    description: 'Learn TypeScript and Vitest',
    minimumStudyTarget: 60,
    status: Status.TODO,
    createdAt: new Date(),
    updatedAt: new Date(),
    tasks: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default resolve User check in requireAuth middleware
    (prisma.user.findUnique as any).mockImplementation((args: any) => {
      if (args.where.id === testUser.id) return Promise.resolve(testUser as any);
      if (args.where.id === testUserB.id) return Promise.resolve(testUserB as any);
      return Promise.resolve(null);
    });
    vi.mocked(prisma.studyPlan.findMany).mockResolvedValue([]);
    vi.mocked(prisma.streak.upsert).mockResolvedValue({
      id: 'streak-id',
      userId: testUser.id,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      updatedAt: new Date(),
    });
  });

  describe('POST /api/study-plans', () => {
    it('should successfully create a new study plan', async () => {
      vi.mocked(prisma.studyPlan.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.studyPlan.create).mockResolvedValue(testPlan);

      const res = await request(app)
        .post('/api/study-plans')
        .set('Cookie', [`token=${tokenA}`])
        .send({
          date: '2026-08-31',
          title: 'Study Plan A',
          description: 'Learn TypeScript and Vitest',
          minimumStudyTarget: 60,
          status: 'TODO',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.studyPlan).toHaveProperty('id', testPlan.id);
      expect(prisma.studyPlan.create).toHaveBeenCalledTimes(1);
    });

    it('should return 409 Conflict if plan already exists for date', async () => {
      vi.mocked(prisma.studyPlan.findUnique).mockResolvedValue(testPlan);

      const res = await request(app)
        .post('/api/study-plans')
        .set('Cookie', [`token=${tokenA}`])
        .send({
          date: '2026-08-31',
          title: 'Duplicate Plan',
          minimumStudyTarget: 30,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should return 400 Bad Request on validation errors (negative target)', async () => {
      const res = await request(app)
        .post('/api/study-plans')
        .set('Cookie', [`token=${tokenA}`])
        .send({
          date: '2026-08-31',
          minimumStudyTarget: -10, // Invalid target
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Validation failed');
    });
  });

  describe('GET /api/study-plans/today', () => {
    it('should return today\'s study plan if it exists', async () => {
      vi.mocked(prisma.studyPlan.findUnique).mockResolvedValue(testPlan);

      const res = await request(app)
        .get('/api/study-plans/today')
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.studyPlan).toHaveProperty('id', testPlan.id);
    });

    it('should return null studyPlan if no plan exists for today', async () => {
      vi.mocked(prisma.studyPlan.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/study-plans/today')
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.studyPlan).toBeNull();
    });
  });

  describe('GET /api/study-plans/:id', () => {
    it('should return the study plan details if owned by user', async () => {
      vi.mocked(prisma.studyPlan.findUnique).mockResolvedValue(testPlan);

      const res = await request(app)
        .get(`/api/study-plans/${testPlan.id}`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.studyPlan.id).toBe(testPlan.id);
    });

    it('should return 403 Forbidden if accessed by another user', async () => {
      vi.mocked(prisma.studyPlan.findUnique).mockResolvedValue(testPlan);

      const res = await request(app)
        .get(`/api/study-plans/${testPlan.id}`)
        .set('Cookie', [`token=${tokenB}`]); // User B requesting User A's plan

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    it('should return 404 Not Found if plan does not exist', async () => {
      vi.mocked(prisma.studyPlan.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/study-plans/non-existent-id')
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });
  });

  describe('PUT /api/study-plans/:id', () => {
    it('should successfully update the study plan if owned', async () => {
      vi.mocked(prisma.studyPlan.findUnique).mockResolvedValue(testPlan);
      vi.mocked(prisma.studyPlan.update).mockResolvedValue({
        ...testPlan,
        title: 'Updated Title',
        minimumStudyTarget: 90,
      });

      const res = await request(app)
        .put(`/api/study-plans/${testPlan.id}`)
        .set('Cookie', [`token=${tokenA}`])
        .send({
          title: 'Updated Title',
          minimumStudyTarget: 90,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.studyPlan.title).toBe('Updated Title');
      expect(res.body.studyPlan.minimumStudyTarget).toBe(90);
    });

    it('should return 403 Forbidden if another user updates it', async () => {
      vi.mocked(prisma.studyPlan.findUnique).mockResolvedValue(testPlan);

      const res = await request(app)
        .put(`/api/study-plans/${testPlan.id}`)
        .set('Cookie', [`token=${tokenB}`])
        .send({
          title: 'Hacked Title',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });
  });

  describe('DELETE /api/study-plans/:id', () => {
    it('should delete the study plan successfully if owned', async () => {
      vi.mocked(prisma.studyPlan.findUnique).mockResolvedValue(testPlan);
      vi.mocked(prisma.studyPlan.delete).mockResolvedValue(testPlan);

      const res = await request(app)
        .delete(`/api/study-plans/${testPlan.id}`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deleted successfully');
    });

    it('should return 403 Forbidden if another user deletes it', async () => {
      vi.mocked(prisma.studyPlan.findUnique).mockResolvedValue(testPlan);

      const res = await request(app)
        .delete(`/api/study-plans/${testPlan.id}`)
        .set('Cookie', [`token=${tokenB}`]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });
  });
});
