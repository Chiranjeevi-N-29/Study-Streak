import { vi, describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../../config/db.js';
import * as focusSessionService from './focus-session.service.js';
import { FocusSessionStatus } from '@prisma/client';

vi.mock('../../config/db.js', () => ({
  prisma: {
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
    user: {
      findUnique: vi.fn(),
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

describe('FocusSession Unit Tests', () => {
  const userId = 'user-123';
  const sessionId = 'session-abc';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startFocusSession', () => {
    it('should throw 409 Conflict if user already has a running or paused session', async () => {
      vi.mocked(prisma.focusSession.findFirst).mockResolvedValue({
        id: 'existing-session',
        userId,
        status: FocusSessionStatus.RUNNING,
      } as any);

      await expect(focusSessionService.startFocusSession(userId)).rejects.toThrow(
        'An active focus session is already running or paused'
      );
    });

    it('should throw 404 if task belongs to another user or does not exist', async () => {
      vi.mocked(prisma.focusSession.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.studyTask.findFirst).mockResolvedValue(null);

      await expect(
        focusSessionService.startFocusSession(userId, '00000000-0000-0000-0000-000000000000')
      ).rejects.toThrow('Task not found or access denied');
    });

    it('should create a RUNNING session when no active session exists', async () => {
      vi.mocked(prisma.focusSession.findFirst).mockResolvedValue(null);
      const newSession = {
        id: sessionId,
        userId,
        startedAt: new Date(),
        status: FocusSessionStatus.RUNNING,
        durationSeconds: 0,
        totalPausedSeconds: 0,
      };
      vi.mocked(prisma.focusSession.create).mockResolvedValue(newSession as any);

      const result = await focusSessionService.startFocusSession(userId);
      expect(result.status).toBe(FocusSessionStatus.RUNNING);
      expect(prisma.focusSession.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('pause & resume logic', () => {
    it('should pause a RUNNING session', async () => {
      const activeSession = {
        id: sessionId,
        userId,
        status: FocusSessionStatus.RUNNING,
      };
      vi.mocked(prisma.focusSession.findUnique).mockResolvedValue(activeSession as any);
      vi.mocked(prisma.focusSession.update).mockResolvedValue({
        ...activeSession,
        status: FocusSessionStatus.PAUSED,
        pausedAt: new Date(),
      } as any);

      const result = await focusSessionService.pauseFocusSession(userId, sessionId);
      expect(result.status).toBe(FocusSessionStatus.PAUSED);
    });

    it('should throw 409 if trying to pause a session that is already PAUSED', async () => {
      const pausedSession = {
        id: sessionId,
        userId,
        status: FocusSessionStatus.PAUSED,
      };
      vi.mocked(prisma.focusSession.findUnique).mockResolvedValue(pausedSession as any);

      await expect(
        focusSessionService.pauseFocusSession(userId, sessionId)
      ).rejects.toThrow('Cannot pause session in PAUSED status');
    });
  });

  describe('completeFocusSession duration calculation', () => {
    it('should compute exact active duration excluding total paused seconds', async () => {
      const startedAt = new Date(Date.now() - 300000); // 5 minutes ago (300 sec)
      const session = {
        id: sessionId,
        userId,
        startedAt,
        status: FocusSessionStatus.RUNNING,
        totalPausedSeconds: 60, // 1 minute paused previously
        taskId: null,
      };

      vi.mocked(prisma.focusSession.findUnique).mockResolvedValue(session as any);
      (prisma.focusSession.update as any).mockImplementation((args: any) =>
        Promise.resolve({ ...session, ...args.data })
      );

      const result = await focusSessionService.completeFocusSession(userId, sessionId);
      expect(result.status).toBe(FocusSessionStatus.COMPLETED);
      // Expected duration around 240 seconds (300 - 60)
      expect(result.durationSeconds).toBeGreaterThanOrEqual(235);
      expect(result.durationSeconds).toBeLessThanOrEqual(245);
    });
  });
});
