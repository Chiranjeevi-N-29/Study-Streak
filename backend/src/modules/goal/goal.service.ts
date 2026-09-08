import { prisma } from '../../config/db.js';
import { GoalProgressType, GoalStatus } from '@prisma/client';
import {
  CreateGoalInput,
  CreateMilestoneInput,
  UpdateGoalInput,
  UpdateMilestoneInput,
} from './goal.schema.js';
import { evaluateUserAchievements } from '../achievement/achievement.service.js';

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

export const calculateProgressPercentage = (currentValue: number, targetValue?: number | null): number => {
  if (!targetValue || targetValue <= 0) return 0;
  const pct = Math.round((currentValue / targetValue) * 100);
  return Math.min(100, Math.max(0, pct));
};

export const formatGoalResponse = (goal: any) => {
  const progressPercentage = calculateProgressPercentage(goal.currentValue, goal.targetValue);
  return {
    ...goal,
    progressPercentage,
  };
};

export const recalculateGoalProgress = async (goalId: string) => {
  const goal = await prisma.studyGoal.findUnique({
    where: { id: goalId },
    include: {
      tasks: true,
      milestones: true,
    },
  });

  if (!goal) return null;

  let newCurrentValue = goal.currentValue;

  if (goal.progressType === GoalProgressType.FOCUS_TIME) {
    // Sum of actualDuration (in minutes) across all tasks associated with this goal
    newCurrentValue = goal.tasks.reduce((sum, task) => sum + (task.actualDuration || 0), 0);
  } else if (goal.progressType === GoalProgressType.TASKS) {
    // Count of completed tasks associated with this goal
    newCurrentValue = goal.tasks.filter((t) => t.status === 'COMPLETED').length;
  } else if (goal.progressType === GoalProgressType.MILESTONES) {
    // Count of completed milestones for this goal
    newCurrentValue = goal.milestones.filter((m) => m.completed).length;
  }
  // MANUAL progress is managed directly by user

  const updatedGoal = await prisma.studyGoal.update({
    where: { id: goalId },
    data: { currentValue: newCurrentValue },
    include: {
      tasks: true,
      milestones: { orderBy: { order: 'asc' } },
    },
  });

  return formatGoalResponse(updatedGoal);
};

export const createGoal = async (userId: string, input: CreateGoalInput) => {
  const { title, description, category, targetDate, progressType, targetValue, milestones } = input;

  const createdGoal = await prisma.studyGoal.create({
    data: {
      userId,
      title,
      description: description || null,
      category: category || null,
      targetDate: targetDate || null,
      progressType,
      targetValue: targetValue || null,
      currentValue: 0,
      milestones: milestones && milestones.length > 0
        ? {
            create: milestones.map((m, idx) => ({
              title: m.title,
              description: m.description || null,
              order: idx,
            })),
          }
        : undefined,
    },
    include: {
      tasks: true,
      milestones: { orderBy: { order: 'asc' } },
    },
  });

  // Calculate initial progress
  const updated = await recalculateGoalProgress(createdGoal.id);
  return updated || formatGoalResponse(createdGoal);
};

export const getGoals = async (
  userId: string,
  filter?: { status?: GoalStatus; category?: string; targetDate?: string }
) => {
  const where: any = { userId };

  if (filter?.status) {
    where.status = filter.status;
  }
  if (filter?.category) {
    where.category = { equals: filter.category, mode: 'insensitive' };
  }
  if (filter?.targetDate) {
    where.targetDate = filter.targetDate;
  }

  const goals = await prisma.studyGoal.findMany({
    where,
    include: {
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          estimatedDuration: true,
          actualDuration: true,
        },
      },
      milestones: { orderBy: { order: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return goals.map(formatGoalResponse);
};

export const getGoalById = async (userId: string, goalId: string) => {
  const goal = await prisma.studyGoal.findUnique({
    where: { id: goalId },
    include: {
      tasks: {
        orderBy: { createdAt: 'desc' },
        include: {
          studyPlan: {
            select: { date: true },
          },
        },
      },
      milestones: { orderBy: { order: 'asc' } },
    },
  });

  if (!goal) {
    throw createError('Study goal not found', 404);
  }

  if (goal.userId !== userId) {
    throw createError('Access denied: You do not own this study goal', 403);
  }

  return formatGoalResponse(goal);
};

export const updateGoal = async (userId: string, goalId: string, input: UpdateGoalInput) => {
  const goal = await prisma.studyGoal.findUnique({
    where: { id: goalId },
  });

  if (!goal) {
    throw createError('Study goal not found', 404);
  }
  if (goal.userId !== userId) {
    throw createError('Access denied: You do not own this study goal', 403);
  }

  const updatedGoal = await prisma.studyGoal.update({
    where: { id: goalId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.targetDate !== undefined ? { targetDate: input.targetDate } : {}),
      ...(input.progressType !== undefined ? { progressType: input.progressType } : {}),
      ...(input.targetValue !== undefined ? { targetValue: input.targetValue } : {}),
    },
    include: {
      tasks: true,
      milestones: { orderBy: { order: 'asc' } },
    },
  });

  const recalculated = await recalculateGoalProgress(goalId);
  return recalculated || formatGoalResponse(updatedGoal);
};

export const updateManualProgress = async (userId: string, goalId: string, currentValue: number) => {
  const goal = await prisma.studyGoal.findUnique({
    where: { id: goalId },
  });

  if (!goal) {
    throw createError('Study goal not found', 404);
  }
  if (goal.userId !== userId) {
    throw createError('Access denied: You do not own this study goal', 403);
  }

  if (goal.progressType !== GoalProgressType.MANUAL) {
    throw createError('Progress can only be updated manually for MANUAL progress goals', 400);
  }

  const updatedGoal = await prisma.studyGoal.update({
    where: { id: goalId },
    data: { currentValue },
    include: {
      tasks: true,
      milestones: { orderBy: { order: 'asc' } },
    },
  });

  return formatGoalResponse(updatedGoal);
};

export const completeGoal = async (userId: string, goalId: string) => {
  const goal = await prisma.studyGoal.findUnique({
    where: { id: goalId },
  });

  if (!goal) {
    throw createError('Study goal not found', 404);
  }
  if (goal.userId !== userId) {
    throw createError('Access denied: You do not own this study goal', 403);
  }

  const completedGoal = await prisma.studyGoal.update({
    where: { id: goalId },
    data: {
      status: GoalStatus.COMPLETED,
      completedAt: new Date(),
    },
    include: {
      tasks: true,
      milestones: { orderBy: { order: 'asc' } },
    },
  });

  // Evaluate achievements for goal completion
  try {
    await evaluateUserAchievements(userId);
  } catch (err) {
    console.error('Error evaluating achievements after goal completion:', err);
  }

  return formatGoalResponse(completedGoal);
};

export const archiveGoal = async (userId: string, goalId: string) => {
  const goal = await prisma.studyGoal.findUnique({
    where: { id: goalId },
  });

  if (!goal) {
    throw createError('Study goal not found', 404);
  }
  if (goal.userId !== userId) {
    throw createError('Access denied: You do not own this study goal', 403);
  }

  const archivedGoal = await prisma.studyGoal.update({
    where: { id: goalId },
    data: { status: GoalStatus.ARCHIVED },
    include: {
      tasks: true,
      milestones: { orderBy: { order: 'asc' } },
    },
  });

  return formatGoalResponse(archivedGoal);
};

export const unarchiveGoal = async (userId: string, goalId: string) => {
  const goal = await prisma.studyGoal.findUnique({
    where: { id: goalId },
  });

  if (!goal) {
    throw createError('Study goal not found', 404);
  }
  if (goal.userId !== userId) {
    throw createError('Access denied: You do not own this study goal', 403);
  }

  const unarchivedGoal = await prisma.studyGoal.update({
    where: { id: goalId },
    data: { status: GoalStatus.ACTIVE },
    include: {
      tasks: true,
      milestones: { orderBy: { order: 'asc' } },
    },
  });

  return formatGoalResponse(unarchivedGoal);
};

export const deleteGoal = async (userId: string, goalId: string) => {
  const goal = await prisma.studyGoal.findUnique({
    where: { id: goalId },
  });

  if (!goal) {
    throw createError('Study goal not found', 404);
  }
  if (goal.userId !== userId) {
    throw createError('Access denied: You do not own this study goal', 403);
  }

  await prisma.studyGoal.delete({
    where: { id: goalId },
  });

  return { success: true };
};

export const addMilestone = async (userId: string, goalId: string, input: CreateMilestoneInput) => {
  const goal = await prisma.studyGoal.findUnique({
    where: { id: goalId },
    include: { milestones: true },
  });

  if (!goal) {
    throw createError('Study goal not found', 404);
  }
  if (goal.userId !== userId) {
    throw createError('Access denied: You do not own this study goal', 403);
  }

  const order = goal.milestones.length;

  const milestone = await prisma.goalMilestone.create({
    data: {
      goalId,
      title: input.title,
      description: input.description || null,
      order,
    },
  });

  if (goal.progressType === GoalProgressType.MILESTONES) {
    await recalculateGoalProgress(goalId);
  }

  return milestone;
};

export const updateMilestone = async (
  userId: string,
  goalId: string,
  milestoneId: string,
  input: UpdateMilestoneInput
) => {
  const goal = await prisma.studyGoal.findUnique({
    where: { id: goalId },
  });

  if (!goal) {
    throw createError('Study goal not found', 404);
  }
  if (goal.userId !== userId) {
    throw createError('Access denied: You do not own this study goal', 403);
  }

  const milestone = await prisma.goalMilestone.findUnique({
    where: { id: milestoneId },
  });

  if (!milestone || milestone.goalId !== goalId) {
    throw createError('Milestone not found for this goal', 404);
  }

  const updatedMilestone = await prisma.goalMilestone.update({
    where: { id: milestoneId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.completed !== undefined
        ? {
            completed: input.completed,
            completedAt: input.completed ? new Date() : null,
          }
        : {}),
    },
  });

  if (goal.progressType === GoalProgressType.MILESTONES) {
    await recalculateGoalProgress(goalId);
  }

  return updatedMilestone;
};

export const deleteMilestone = async (userId: string, goalId: string, milestoneId: string) => {
  const goal = await prisma.studyGoal.findUnique({
    where: { id: goalId },
  });

  if (!goal) {
    throw createError('Study goal not found', 404);
  }
  if (goal.userId !== userId) {
    throw createError('Access denied: You do not own this study goal', 403);
  }

  const milestone = await prisma.goalMilestone.findUnique({
    where: { id: milestoneId },
  });

  if (!milestone || milestone.goalId !== goalId) {
    throw createError('Milestone not found for this goal', 404);
  }

  await prisma.goalMilestone.delete({
    where: { id: milestoneId },
  });

  if (goal.progressType === GoalProgressType.MILESTONES) {
    await recalculateGoalProgress(goalId);
  }

  return { success: true };
};
