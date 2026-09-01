import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as notificationService from './notification.service.js';
import * as notificationScheduler from './notification.scheduler.js';
import { prisma } from '../../config/db.js';

// Mock the prisma database client
vi.mock('../../config/db.js', () => {
  return {
    prisma: {
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
      user: {
        findUnique: vi.fn(),
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

describe('NotificationService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new notification idempotently when eventKey does not exist', async () => {
    vi.mocked(prisma.notification.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.notification.create).mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      type: 'STUDY_REMINDER',
      title: '📚 Study Reminder',
      message: 'Your study plan is waiting.',
      read: false,
      link: '/app/planner',
      eventKey: 'STUDY_REMINDER:user-1:2026-09-01',
      createdAt: new Date(),
    } as any);

    const res = await notificationService.createNotification({
      userId: 'user-1',
      type: 'STUDY_REMINDER',
      title: '📚 Study Reminder',
      message: 'Your study plan is waiting.',
      eventKey: 'STUDY_REMINDER:user-1:2026-09-01',
    });

    expect(res.id).toBe('notif-1');
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
  });

  it('should return existing notification and NOT create duplicate when eventKey exists', async () => {
    const existing = {
      id: 'notif-1',
      userId: 'user-1',
      type: 'STUDY_REMINDER',
      title: '📚 Study Reminder',
      message: 'Your study plan is waiting.',
      read: false,
      eventKey: 'STUDY_REMINDER:user-1:2026-09-01',
      createdAt: new Date(),
    };

    vi.mocked(prisma.notification.findUnique).mockResolvedValue(existing as any);

    const res = await notificationService.createNotification({
      userId: 'user-1',
      type: 'STUDY_REMINDER',
      title: '📚 Study Reminder',
      message: 'Your study plan is waiting.',
      eventKey: 'STUDY_REMINDER:user-1:2026-09-01',
    });

    expect(res.id).toBe('notif-1');
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('should mark single notification as read after authorization check', async () => {
    vi.mocked(prisma.notification.findUnique).mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      read: false,
    } as any);

    vi.mocked(prisma.notification.update).mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      read: true,
    } as any);

    const res = await notificationService.markAsRead('user-1', 'notif-1');
    expect(res.read).toBe(true);
  });

  it('should throw 403 error if user tries to mark another user notification as read', async () => {
    vi.mocked(prisma.notification.findUnique).mockResolvedValue({
      id: 'notif-1',
      userId: 'other-user',
      read: false,
    } as any);

    await expect(notificationService.markAsRead('user-1', 'notif-1')).rejects.toThrow(
      'Access denied'
    );
  });

  it('should calculate local date string formatted in user IANA timezone', () => {
    const dateStr = notificationScheduler.getLocalDateInTimezone('Asia/Kolkata');
    expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
