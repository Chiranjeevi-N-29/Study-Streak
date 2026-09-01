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
      notification: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      notificationPreference: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      studyPlan: {
        findUnique: vi.fn(),
      },
      dailyReflection: {
        findUnique: vi.fn(),
      },
    },
  };
});

describe('Notification API Integration Tests', () => {
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

  it('GET /api/notifications should return 401 Unauthorized if no auth cookie', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });

  it('GET /api/notifications should return list of notifications for authenticated user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(testUserA as any);
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue({
      id: 'pref-1',
      userId: testUserA.id,
      studyRemindersEnabled: true,
      reflectionRemindersEnabled: true,
      achievementNotificationsEnabled: true,
      streakNotificationsEnabled: true,
      dailyReminderTime: '18:00',
      timezone: 'UTC',
    } as any);

    vi.mocked(prisma.notification.findMany).mockResolvedValue([
      {
        id: 'notif-1',
        userId: testUserA.id,
        type: 'STUDY_REMINDER',
        title: '📚 Study Reminder',
        message: 'Your study plan is waiting.',
        read: false,
        link: '/app/planner',
        createdAt: new Date(),
      },
    ] as any);

    const res = await request(app)
      .get('/api/notifications')
      .set('Cookie', `token=${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.notifications.length).toBe(1);
    expect(res.body.notifications[0].title).toBe('📚 Study Reminder');
  });

  it('GET /api/notifications/unread-count should return count of unread notifications', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(testUserA as any);
    vi.mocked(prisma.notification.count).mockResolvedValue(3);

    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Cookie', `token=${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(3);
  });

  it('PUT /api/notifications/:id/read should mark notification as read', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(testUserA as any);
    vi.mocked(prisma.notification.findUnique).mockResolvedValue({
      id: 'notif-1',
      userId: testUserA.id,
      read: false,
    } as any);

    vi.mocked(prisma.notification.update).mockResolvedValue({
      id: 'notif-1',
      userId: testUserA.id,
      read: true,
    } as any);

    const res = await request(app)
      .put('/api/notifications/notif-1/read')
      .set('Cookie', `token=${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.notification.read).toBe(true);
  });

  it('PUT /api/notifications/preferences should update notification settings', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(testUserA as any);
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue({
      id: 'pref-1',
      userId: testUserA.id,
    } as any);

    vi.mocked(prisma.notificationPreference.update).mockResolvedValue({
      id: 'pref-1',
      userId: testUserA.id,
      dailyReminderTime: '20:00',
      timezone: 'Asia/Kolkata',
    } as any);

    const res = await request(app)
      .put('/api/notifications/preferences')
      .set('Cookie', `token=${tokenA}`)
      .send({
        dailyReminderTime: '20:00',
        timezone: 'Asia/Kolkata',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.preferences.dailyReminderTime).toBe('20:00');
  });

  it('PUT /api/notifications/:id/read should return 403 Forbidden if User B attempts to modify User A notification', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(testUserB as any);
    vi.mocked(prisma.notification.findUnique).mockResolvedValue({
      id: 'notif-a',
      userId: testUserA.id,
      read: false,
    } as any);

    const res = await request(app)
      .put('/api/notifications/notif-a/read')
      .set('Cookie', `token=${tokenB}`);

    expect(res.status).toBe(403);
  });
});
