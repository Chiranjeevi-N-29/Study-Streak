import { Request, Response, NextFunction } from 'express';
import * as plannerService from './planner.service.js';
import {
  scheduleTaskSchema,
  rescheduleTaskSchema,
  plannerWeekQuerySchema,
  plannerDayQuerySchema,
} from './planner.schema.js';

export const handleGetWeeklyPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const query = plannerWeekQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: query.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    const weeklyPlan = await plannerService.getWeeklyPlan(req.user.id, query.data.startDate);
    res.status(200).json({
      success: true,
      data: weeklyPlan,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetDailyPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const query = plannerDayQuerySchema.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: query.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    const dailyPlan = await plannerService.getDailyPlan(req.user.id, query.data.date);
    res.status(200).json({
      success: true,
      data: dailyPlan,
    });
  } catch (error) {
    next(error);
  }
};

export const handleScheduleTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const taskId = req.params.id || req.body.taskId;
    const parseResult = scheduleTaskSchema.safeParse({
      taskId,
      date: req.body.date,
      estimatedDuration: req.body.estimatedDuration,
    });

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    const updatedTask = await plannerService.scheduleTask(
      req.user.id,
      parseResult.data.taskId,
      parseResult.data.date,
      parseResult.data.estimatedDuration
    );

    res.status(200).json({
      success: true,
      message: 'Task scheduled successfully',
      task: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};

export const handleRescheduleTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const taskId = req.params.id;
    const parseResult = rescheduleTaskSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    const updatedTask = await plannerService.rescheduleTask(
      req.user.id,
      taskId,
      parseResult.data.targetDate,
      parseResult.data.estimatedDuration
    );

    res.status(200).json({
      success: true,
      message: 'Task rescheduled successfully',
      task: updatedTask,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetOverdueTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const overdueData = await plannerService.getOverdueTasks(req.user.id);
    res.status(200).json({
      success: true,
      data: overdueData,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetRecommendation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const taskId = req.query.taskId as string || req.params.id;
    if (!taskId) {
      res.status(400).json({ success: false, message: 'Task ID is required' });
      return;
    }

    const recommendation = await plannerService.getRecommendation(req.user.id, taskId);
    res.status(200).json({
      success: true,
      data: recommendation,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetPlannerAnalytics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const analytics = await plannerService.getPlannerAnalytics(req.user.id);
    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};
