import { vi, describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { prisma } from '../../config/db.js';
import { signToken } from '../auth/auth.utils.js';

// Mock prisma
vi.mock('../../config/db.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    streak: { findUnique: vi.fn() },
    studyPlan: { findMany: vi.fn() },
    dailyReflection: { findMany: vi.fn() },
    focusSession: { findMany: vi.fn() },
    studyGoal: { findMany: vi.fn() },
  },
}));

const TODAY = new Date().toISOString().split('T')[0];

const USER_A = { id: 'report-user-a', name: 'Alice', email: 'alice@test.com', timezone: 'UTC' };
const TOKEN_A = signToken({ userId: USER_A.id });

const MOCK_PLAN = {
  id: 'plan-1',
  userId: USER_A.id,
  date: TODAY,
  status: 'COMPLETED',
  minimumStudyTarget: 60,
  title: 'Today Plan',
  description: '',
  createdAt: new Date(),
  updatedAt: new Date(),
  tasks: [
    {
      id: 'task-1',
      studyPlanId: 'plan-1',
      goalId: null,
      title: 'Read Chapter 5',
      description: null,
      category: 'Reading',
      priority: 'HIGH',
      estimatedDuration: 45,
      actualDuration: 50,
      order: 0,
      status: 'COMPLETED',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

function setupMocks() {
  vi.mocked(prisma.user.findUnique).mockResolvedValue(USER_A as any);
  vi.mocked(prisma.streak.findUnique).mockResolvedValue({
    id: 'streak-1',
    userId: USER_A.id,
    currentStreak: 3,
    longestStreak: 7,
    lastActiveDate: TODAY,
    updatedAt: new Date(),
  } as any);
  vi.mocked(prisma.studyPlan.findMany).mockResolvedValue([MOCK_PLAN] as any);
  vi.mocked(prisma.dailyReflection.findMany).mockResolvedValue([]);
  vi.mocked(prisma.focusSession.findMany).mockResolvedValue([]);
  vi.mocked(prisma.studyGoal.findMany).mockResolvedValue([]);
}

describe('Reports API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/reports returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/reports');
    expect(res.status).toBe(401);
  });

  it('GET /api/reports?range=invalid returns 400', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER_A as any);
    const res = await request(app)
      .get('/api/reports?range=invalid')
      .set('Cookie', `token=${TOKEN_A}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('GET /api/reports?range=custom without dates returns 400', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER_A as any);
    const res = await request(app)
      .get('/api/reports?range=custom')
      .set('Cookie', `token=${TOKEN_A}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('startDate');
  });

  it('GET /api/reports returns full report structure for authenticated user', async () => {
    setupMocks();
    const res = await request(app)
      .get('/api/reports?range=30d')
      .set('Cookie', `token=${TOKEN_A}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { report } = res.body;
    expect(report.range).toBe('30d');
    expect(report.dateRange).toHaveProperty('startDate');
    expect(report.dateRange).toHaveProperty('endDate');
    expect(report.overview).toHaveProperty('totalStudyMinutes');
    expect(report.overview.totalStudyMinutes).toBe(50);
    expect(report.overview.successfulDays).toBe(1);
    expect(report.categoryStats).toBeInstanceOf(Array);
    expect(report.priorityStats).toBeInstanceOf(Array);
    expect(report.goalReport).toBeInstanceOf(Array);
    expect(report.streakReport.currentStreak).toBe(3);
    expect(report.streakReport.consistencyScore).toBeGreaterThan(0);
    expect(report.insights).toBeInstanceOf(Array);
    expect(report.focusSessionReport).toHaveProperty('totalSessions');
    expect(report.plannedVsActual).toBeInstanceOf(Array);
  });

  it('GET /api/reports?range=7d returns 7-day report', async () => {
    setupMocks();
    const res = await request(app)
      .get('/api/reports?range=7d')
      .set('Cookie', `token=${TOKEN_A}`);
    expect(res.status).toBe(200);
    expect(res.body.report.dateRange.numDays).toBe(7);
  });

  it('GET /api/reports returns empty report when user has no data', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(USER_A as any);
    vi.mocked(prisma.streak.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.studyPlan.findMany).mockResolvedValue([]);
    vi.mocked(prisma.dailyReflection.findMany).mockResolvedValue([]);
    vi.mocked(prisma.focusSession.findMany).mockResolvedValue([]);
    vi.mocked(prisma.studyGoal.findMany).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/reports?range=30d')
      .set('Cookie', `token=${TOKEN_A}`);

    expect(res.status).toBe(200);
    expect(res.body.report.overview.totalStudyMinutes).toBe(0);
    expect(res.body.report.categoryStats).toHaveLength(0);
  });

  it('GET /api/reports/export returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/reports/export?format=json&dataset=all');
    expect(res.status).toBe(401);
  });

  it('GET /api/reports/export?format=csv&dataset=all returns 400 (csv+all not supported)', async () => {
    setupMocks();
    const res = await request(app)
      .get('/api/reports/export?format=csv&dataset=all')
      .set('Cookie', `token=${TOKEN_A}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('CSV export requires');
  });

  it('GET /api/reports/export?format=json&dataset=tasks returns 200 with file download', async () => {
    setupMocks();
    const res = await request(app)
      .get('/api/reports/export?format=json&dataset=tasks&range=30d')
      .set('Cookie', `token=${TOKEN_A}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('.json');
    const body = JSON.parse(res.text);
    expect(body).toHaveProperty('exportedAt');
    expect(body).toHaveProperty('tasks');
  });
});
