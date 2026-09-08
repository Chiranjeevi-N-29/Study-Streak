import { Request, Response, NextFunction } from 'express';
import {
  startFocusSessionSchema,
  completeFocusSessionSchema,
  listFocusSessionsSchema,
} from './focus-session.schema.js';
import * as focusSessionService from './focus-session.service.js';

export const startSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const validatedData = startFocusSessionSchema.parse(req.body);

    const session = await focusSessionService.startFocusSession(userId, validatedData.taskId);

    res.status(201).json({
      success: true,
      message: 'Focus session started successfully',
      session,
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const activeSession = await focusSessionService.getActiveFocusSession(userId);

    res.status(200).json({
      success: true,
      activeSession,
    });
  } catch (error) {
    next(error);
  }
};

export const pauseSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;

    const session = await focusSessionService.pauseFocusSession(userId, sessionId);

    res.status(200).json({
      success: true,
      message: 'Focus session paused',
      session,
    });
  } catch (error) {
    next(error);
  }
};

export const resumeSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;

    const session = await focusSessionService.resumeFocusSession(userId, sessionId);

    res.status(200).json({
      success: true,
      message: 'Focus session resumed',
      session,
    });
  } catch (error) {
    next(error);
  }
};

export const completeSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;
    const input = completeFocusSessionSchema.parse(req.body ?? {});

    const session = await focusSessionService.completeFocusSession(
      userId,
      sessionId,
      input.groupGoalId ?? undefined
    );

    res.status(200).json({
      success: true,
      message: 'Focus session completed successfully',
      session,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;

    const session = await focusSessionService.cancelFocusSession(userId, sessionId);

    res.status(200).json({
      success: true,
      message: 'Focus session cancelled',
      session,
    });
  } catch (error) {
    next(error);
  }
};

export const listSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const validatedQuery = listFocusSessionsSchema.parse(req.query);

    const result = await focusSessionService.listFocusSessions(userId, validatedQuery);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getSessionById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;

    const session = await focusSessionService.getFocusSessionById(userId, sessionId);

    res.status(200).json({
      success: true,
      session,
    });
  } catch (error) {
    next(error);
  }
};

export const getStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const stats = await focusSessionService.getFocusStats(userId);

    res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
};
