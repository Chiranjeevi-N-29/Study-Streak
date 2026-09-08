import { prisma } from '../../config/db.js';
import { FocusSessionStatus, Prisma } from '@prisma/client';
import { ListFocusSessionsQuery } from './focus-session.schema.js';
import { recalculateUserStreak } from '../streak/streak.service.js';
import { evaluateUserAchievements } from '../achievement/achievement.service.js';
import { createNotification } from '../notification/notification.service.js';
import { recalculateGoalProgress } from '../goal/goal.service.js';

export interface FocusStats {
  totalFocusSeconds: number;
  todayFocusSeconds: number;
  thisWeekFocusSeconds: number;
  completedSessionsCount: number;
  avgSessionSeconds: number;
}

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

const createError = (message: string, statusCode: number, code?: string): AppError => {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
};

export const startFocusSession = async (userId: string, taskId?: string) => {
  // 1. Prevent duplicate active sessions
  const activeSession = await prisma.focusSession.findFirst({
    where: {
      userId,
      status: { in: [FocusSessionStatus.RUNNING, FocusSessionStatus.PAUSED] },
    },
  });

  if (activeSession) {
    throw createError(
      'An active focus session is already running or paused',
      409,
      'ACTIVE_SESSION_EXISTS'
    );
  }

  // 2. Verify task ownership if taskId provided
  if (taskId) {
    const task = await prisma.studyTask.findFirst({
      where: {
        id: taskId,
        studyPlan: { userId },
      },
    });

    if (!task) {
      throw createError('Task not found or access denied', 404);
    }
  }

  // 3. Create RUNNING focus session
  return await prisma.focusSession.create({
    data: {
      userId,
      taskId: taskId || null,
      startedAt: new Date(),
      status: FocusSessionStatus.RUNNING,
      durationSeconds: 0,
      totalPausedSeconds: 0,
    },
    include: {
      task: true,
    },
  });
};

export const getActiveFocusSession = async (userId: string) => {
  return await prisma.focusSession.findFirst({
    where: {
      userId,
      status: { in: [FocusSessionStatus.RUNNING, FocusSessionStatus.PAUSED] },
    },
    include: {
      task: true,
    },
  });
};

export const pauseFocusSession = async (userId: string, sessionId: string) => {
  const session = await prisma.focusSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw createError('Focus session not found', 404);
  }

  if (session.userId !== userId) {
    throw createError('Access denied: You do not own this focus session', 403);
  }

  if (session.status !== FocusSessionStatus.RUNNING) {
    throw createError(`Cannot pause session in ${session.status} status`, 409);
  }

  return await prisma.focusSession.update({
    where: { id: sessionId },
    data: {
      status: FocusSessionStatus.PAUSED,
      pausedAt: new Date(),
    },
    include: {
      task: true,
    },
  });
};

export const resumeFocusSession = async (userId: string, sessionId: string) => {
  const session = await prisma.focusSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw createError('Focus session not found', 404);
  }

  if (session.userId !== userId) {
    throw createError('Access denied: You do not own this focus session', 403);
  }

  if (session.status !== FocusSessionStatus.PAUSED) {
    throw createError(`Cannot resume session in ${session.status} status`, 409);
  }

  const now = new Date();
  const pauseDurationSec = session.pausedAt
    ? Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000)
    : 0;

  return await prisma.focusSession.update({
    where: { id: sessionId },
    data: {
      status: FocusSessionStatus.RUNNING,
      pausedAt: null,
      totalPausedSeconds: session.totalPausedSeconds + pauseDurationSec,
    },
    include: {
      task: true,
    },
  });
};

export const completeFocusSession = async (userId: string, sessionId: string) => {
  const session = await prisma.focusSession.findUnique({
    where: { id: sessionId },
    include: { task: true },
  });

  if (!session) {
    throw createError('Focus session not found', 404);
  }

  if (session.userId !== userId) {
    throw createError('Access denied: You do not own this focus session', 403);
  }

  if (
    session.status !== FocusSessionStatus.RUNNING &&
    session.status !== FocusSessionStatus.PAUSED
  ) {
    throw createError(`Cannot complete session in ${session.status} status`, 409);
  }

  const now = new Date();
  let totalPaused = session.totalPausedSeconds;
  if (session.status === FocusSessionStatus.PAUSED && session.pausedAt) {
    totalPaused += Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000);
  }

  const rawElapsedSec = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);
  const finalDurationSec = Math.max(0, rawElapsedSec - totalPaused);

  const completedSession = await prisma.focusSession.update({
    where: { id: sessionId },
    data: {
      status: FocusSessionStatus.COMPLETED,
      endedAt: now,
      pausedAt: null,
      totalPausedSeconds: totalPaused,
      durationSeconds: finalDurationSec,
    },
    include: {
      task: true,
    },
  });

  // Task integration: increment task actualDuration if associated
  if (session.taskId) {
    const addedMinutes = Math.round(finalDurationSec / 60);
    if (addedMinutes > 0) {
      const updatedTask = await prisma.studyTask.update({
        where: { id: session.taskId },
        data: {
          actualDuration: { increment: addedMinutes },
        },
      });
      if (updatedTask && updatedTask.goalId) {
        await recalculateGoalProgress(updatedTask.goalId);
      }
    }
  }

  // Downstream integration updates (Streaks & Achievements)
  try {
    await recalculateUserStreak(userId);
    await evaluateUserAchievements(userId);

    const minutes = Math.round(finalDurationSec / 60);
    await createNotification({
      userId,
      type: 'STUDY_REMINDER',
      title: 'Focus Session Completed',
      message: `Great job! You completed a ${minutes} minute focus session.`,
      link: '/app/focus',
      eventKey: `focus_completed_${completedSession.id}`,
    });
  } catch (err) {
    console.error('Error triggering downstream integrations after focus session completion:', err);
  }

  return completedSession;
};

export const cancelFocusSession = async (userId: string, sessionId: string) => {
  const session = await prisma.focusSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw createError('Focus session not found', 404);
  }

  if (session.userId !== userId) {
    throw createError('Access denied: You do not own this focus session', 403);
  }

  if (
    session.status !== FocusSessionStatus.RUNNING &&
    session.status !== FocusSessionStatus.PAUSED
  ) {
    throw createError(`Cannot cancel session in ${session.status} status`, 409);
  }

  return await prisma.focusSession.update({
    where: { id: sessionId },
    data: {
      status: FocusSessionStatus.CANCELLED,
      endedAt: new Date(),
      pausedAt: null,
    },
    include: {
      task: true,
    },
  });
};

export const listFocusSessions = async (userId: string, query: ListFocusSessionsQuery) => {
  const { page, limit, status, taskId, startDate, endDate } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.FocusSessionWhereInput = {
    userId,
    ...(status ? { status } : {}),
    ...(taskId ? { taskId } : {}),
  };

  if (startDate || endDate) {
    where.startedAt = {};
    if (startDate) where.startedAt.gte = new Date(startDate);
    if (endDate) where.startedAt.lte = new Date(endDate);
  }

  const [sessions, total] = await Promise.all([
    prisma.focusSession.findMany({
      where,
      include: {
        task: true,
      },
      orderBy: {
        startedAt: 'desc',
      },
      skip,
      take: limit,
    }),
    prisma.focusSession.count({ where }),
  ]);

  return {
    sessions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
};

export const getFocusSessionById = async (userId: string, sessionId: string) => {
  const session = await prisma.focusSession.findUnique({
    where: { id: sessionId },
    include: {
      task: true,
    },
  });

  if (!session) {
    throw createError('Focus session not found', 404);
  }

  if (session.userId !== userId) {
    throw createError('Access denied: You do not own this focus session', 403);
  }

  return session;
};

export const getFocusStats = async (userId: string): Promise<FocusStats> => {
  const now = new Date();
  
  // Today cutoff
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // This week cutoff (7 days ago)
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const completedSessions = await prisma.focusSession.findMany({
    where: {
      userId,
      status: FocusSessionStatus.COMPLETED,
    },
    select: {
      durationSeconds: true,
      startedAt: true,
    },
  });

  let totalFocusSeconds = 0;
  let todayFocusSeconds = 0;
  let thisWeekFocusSeconds = 0;
  const completedSessionsCount = completedSessions.length;

  completedSessions.forEach((s) => {
    totalFocusSeconds += s.durationSeconds;
    if (s.startedAt >= todayStart) {
      todayFocusSeconds += s.durationSeconds;
    }
    if (s.startedAt >= weekStart) {
      thisWeekFocusSeconds += s.durationSeconds;
    }
  });

  const avgSessionSeconds =
    completedSessionsCount > 0 ? Math.round(totalFocusSeconds / completedSessionsCount) : 0;

  return {
    totalFocusSeconds,
    todayFocusSeconds,
    thisWeekFocusSeconds,
    completedSessionsCount,
    avgSessionSeconds,
  };
};
