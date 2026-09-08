import { Request, Response, NextFunction } from 'express';
import {
  createGoalSchema,
  updateGoalSchema,
  updateManualProgressSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
} from './goal.schema.js';
import * as goalService from './goal.service.js';
import { GoalStatus } from '@prisma/client';

export const createGoal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const validatedData = createGoalSchema.parse(req.body);

    const goal = await goalService.createGoal(userId, validatedData);

    res.status(201).json({
      success: true,
      message: 'Study goal created successfully',
      goal,
    });
  } catch (error) {
    next(error);
  }
};

export const getGoals = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { status, category, targetDate } = req.query;

    const filter: { status?: GoalStatus; category?: string; targetDate?: string } = {};

    if (status && typeof status === 'string' && Object.values(GoalStatus).includes(status as GoalStatus)) {
      filter.status = status as GoalStatus;
    }
    if (category && typeof category === 'string') {
      filter.category = category;
    }
    if (targetDate && typeof targetDate === 'string') {
      filter.targetDate = targetDate;
    }

    const goals = await goalService.getGoals(userId, filter);

    res.status(200).json({
      success: true,
      goals,
    });
  } catch (error) {
    next(error);
  }
};

export const getGoalById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;

    const goal = await goalService.getGoalById(userId, goalId);

    res.status(200).json({
      success: true,
      goal,
    });
  } catch (error) {
    next(error);
  }
};

export const updateGoal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;
    const validatedData = updateGoalSchema.parse(req.body);

    const goal = await goalService.updateGoal(userId, goalId, validatedData);

    res.status(200).json({
      success: true,
      message: 'Study goal updated successfully',
      goal,
    });
  } catch (error) {
    next(error);
  }
};

export const updateManualProgress = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;
    const { currentValue } = updateManualProgressSchema.parse(req.body);

    const goal = await goalService.updateManualProgress(userId, goalId, currentValue);

    res.status(200).json({
      success: true,
      message: 'Goal progress updated successfully',
      goal,
    });
  } catch (error) {
    next(error);
  }
};

export const completeGoal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;

    const goal = await goalService.completeGoal(userId, goalId);

    res.status(200).json({
      success: true,
      message: 'Study goal completed successfully',
      goal,
    });
  } catch (error) {
    next(error);
  }
};

export const archiveGoal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;

    const goal = await goalService.archiveGoal(userId, goalId);

    res.status(200).json({
      success: true,
      message: 'Study goal archived',
      goal,
    });
  } catch (error) {
    next(error);
  }
};

export const unarchiveGoal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;

    const goal = await goalService.unarchiveGoal(userId, goalId);

    res.status(200).json({
      success: true,
      message: 'Study goal restored to active',
      goal,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteGoal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;

    await goalService.deleteGoal(userId, goalId);

    res.status(200).json({
      success: true,
      message: 'Study goal deleted',
    });
  } catch (error) {
    next(error);
  }
};

export const addMilestone = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;
    const validatedData = createMilestoneSchema.parse(req.body);

    const milestone = await goalService.addMilestone(userId, goalId, validatedData);

    res.status(201).json({
      success: true,
      message: 'Milestone added successfully',
      milestone,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMilestone = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;
    const milestoneId = req.params.milestoneId;
    const validatedData = updateMilestoneSchema.parse(req.body);

    const milestone = await goalService.updateMilestone(userId, goalId, milestoneId, validatedData);

    res.status(200).json({
      success: true,
      message: 'Milestone updated successfully',
      milestone,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMilestone = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const goalId = req.params.id;
    const milestoneId = req.params.milestoneId;

    await goalService.deleteMilestone(userId, goalId, milestoneId);

    res.status(200).json({
      success: true,
      message: 'Milestone deleted',
    });
  } catch (error) {
    next(error);
  }
};
