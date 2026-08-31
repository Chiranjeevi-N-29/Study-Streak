import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/db.js';
import { signToken } from '../auth/auth.utils.js';
import { Status, Priority } from '@prisma/client';

// Mock the prisma database client
vi.mock('../../config/db.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
      studyPlan: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      studyTask: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      streak: {
        upsert: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  };
});

describe('Study Tasks API Endpoints', () => {
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

  const testTask = {
    id: 'task-uuid-456',
    studyPlanId: testPlan.id,
    title: 'Learn Zod',
    description: 'Schema validations',
    category: 'TypeScript',
    priority: Priority.HIGH,
    estimatedDuration: 30,
    actualDuration: 0,
    order: 0,
    status: Status.TODO,
    createdAt: new Date(),
    updatedAt: new Date(),
    studyPlan: testPlan,
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

  describe('POST /api/study-plans/:planId/tasks', () => {
    it('should successfully create a new task in owned study plan', async () => {
      vi.mocked(prisma.studyPlan.findUnique).mockResolvedValue(testPlan);
      vi.mocked(prisma.studyTask.findFirst).mockResolvedValue(null); // No existing tasks
      vi.mocked(prisma.studyTask.create).mockResolvedValue(testTask);

      const res = await request(app)
        .post(`/api/study-plans/${testPlan.id}/tasks`)
        .set('Cookie', [`token=${tokenA}`])
        .send({
          title: 'Learn Zod',
          description: 'Schema validations',
          category: 'TypeScript',
          priority: 'HIGH',
          estimatedDuration: 30,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.studyTask).toHaveProperty('id', testTask.id);
      expect(prisma.studyTask.create).toHaveBeenCalledTimes(1);
    });

    it('should return 403 Forbidden if user A adds a task to user B\'s plan', async () => {
      vi.mocked(prisma.studyPlan.findUnique).mockResolvedValue({
        ...testPlan,
        userId: testUserB.id, // Owned by User B
      });

      const res = await request(app)
        .post(`/api/study-plans/${testPlan.id}/tasks`)
        .set('Cookie', [`token=${tokenA}`]) // User A token
        .send({
          title: 'Hacked Task',
          category: 'Breach',
          estimatedDuration: 10,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    it('should return 400 Bad Request on validation errors (negative duration)', async () => {
      vi.mocked(prisma.studyPlan.findUnique).mockResolvedValue(testPlan);

      const res = await request(app)
        .post(`/api/study-plans/${testPlan.id}/tasks`)
        .set('Cookie', [`token=${tokenA}`])
        .send({
          title: 'Invalid Task',
          category: 'TypeScript',
          estimatedDuration: -10, // Invalid duration
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Validation failed');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should successfully update a task if owned', async () => {
      vi.mocked(prisma.studyTask.findUnique).mockResolvedValue(testTask as any);
      vi.mocked(prisma.studyTask.update).mockResolvedValue({
        ...testTask,
        title: 'Updated Task Title',
        actualDuration: 15,
        status: 'COMPLETED',
      } as any);

      const res = await request(app)
        .put(`/api/tasks/${testTask.id}`)
        .set('Cookie', [`token=${tokenA}`])
        .send({
          title: 'Updated Task Title',
          actualDuration: 15,
          status: 'COMPLETED',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.studyTask.title).toBe('Updated Task Title');
      expect(res.body.studyTask.status).toBe('COMPLETED');
    });

    it('should return 403 Forbidden if user B updates user A\'s task', async () => {
      vi.mocked(prisma.studyTask.findUnique).mockResolvedValue(testTask as any);

      const res = await request(app)
        .put(`/api/tasks/${testTask.id}`)
        .set('Cookie', [`token=${tokenB}`])
        .send({
          title: 'Hacked Task',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('should delete the task successfully if owned', async () => {
      vi.mocked(prisma.studyTask.findUnique).mockResolvedValue(testTask as any);
      vi.mocked(prisma.studyTask.delete).mockResolvedValue(testTask as any);

      const res = await request(app)
        .delete(`/api/tasks/${testTask.id}`)
        .set('Cookie', [`token=${tokenA}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deleted successfully');
    });

    it('should return 403 Forbidden if user B deletes user A\'s task', async () => {
      vi.mocked(prisma.studyTask.findUnique).mockResolvedValue(testTask as any);

      const res = await request(app)
        .delete(`/api/tasks/${testTask.id}`)
        .set('Cookie', [`token=${tokenB}`]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });
  });

  describe('PUT /api/study-plans/:planId/tasks/reorder', () => {
    it('should reorder tasks successfully using a transaction', async () => {
      const task1 = { id: 'da74288b-1bbd-4ef9-813c-83b3e21b212f', studyPlanId: testPlan.id };
      const task2 = { id: 'f1638634-118f-4ad1-9efb-fa39e6a0d4c8', studyPlanId: testPlan.id };

      vi.mocked(prisma.studyPlan.findUnique).mockResolvedValue({
        ...testPlan,
        tasks: [task1, task2],
      } as any);
      vi.mocked(prisma.$transaction).mockResolvedValue([] as any);

      const res = await request(app)
        .put(`/api/study-plans/${testPlan.id}/tasks/reorder`)
        .set('Cookie', [`token=${tokenA}`])
        .send({
          orderedTaskIds: ['f1638634-118f-4ad1-9efb-fa39e6a0d4c8', 'da74288b-1bbd-4ef9-813c-83b3e21b212f'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should return 400 Bad Request if orderedTaskIds length or IDs do not match existing tasks', async () => {
      const task1 = { id: 'da74288b-1bbd-4ef9-813c-83b3e21b212f', studyPlanId: testPlan.id };
      const task2 = { id: 'f1638634-118f-4ad1-9efb-fa39e6a0d4c8', studyPlanId: testPlan.id };

      vi.mocked(prisma.studyPlan.findUnique).mockResolvedValue({
        ...testPlan,
        tasks: [task1, task2],
      } as any);

      const res = await request(app)
        .put(`/api/study-plans/${testPlan.id}/tasks/reorder`)
        .set('Cookie', [`token=${tokenA}`])
        .send({
          orderedTaskIds: ['f1638634-118f-4ad1-9efb-fa39e6a0d4c8'], // Missing first UUID
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid task list');
    });

    it('should return 403 Forbidden if user B reorders user A\'s tasks', async () => {
      vi.mocked(prisma.studyPlan.findUnique).mockResolvedValue(testPlan);

      const res = await request(app)
        .put(`/api/study-plans/${testPlan.id}/tasks/reorder`)
        .set('Cookie', [`token=${tokenB}`])
        .send({
          orderedTaskIds: ['f1638634-118f-4ad1-9efb-fa39e6a0d4c8', 'da74288b-1bbd-4ef9-813c-83b3e21b212f'],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });
  });
});
