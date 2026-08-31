import { prisma } from '../../config/db.js';
import { CreateStudyTaskInput, UpdateStudyTaskInput } from './study-task.schema.js';
import { recalculateUserStreak } from '../streak/streak.service.js';

export const createStudyTask = async (userId: string, planId: string, input: CreateStudyTaskInput) => {
  const plan = await prisma.studyPlan.findUnique({
    where: { id: planId },
    include: { tasks: true },
  });

  if (!plan) {
    const error = new Error('Study plan not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  if (plan.userId !== userId) {
    const error = new Error('Access denied: You do not own this study plan') as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }

  // Find max order in plan
  const maxOrderTask = await prisma.studyTask.findFirst({
    where: { studyPlanId: planId },
    orderBy: { order: 'desc' },
  });
  const order = maxOrderTask ? maxOrderTask.order + 1 : 0;

  const createdTask = await prisma.studyTask.create({
    data: {
      studyPlanId: planId,
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
      estimatedDuration: input.estimatedDuration,
      order,
    },
  });

  await recalculateUserStreak(userId);
  return createdTask;
};

export const updateStudyTask = async (userId: string, taskId: string, input: UpdateStudyTaskInput) => {
  const task = await prisma.studyTask.findUnique({
    where: { id: taskId },
    include: { studyPlan: true },
  });

  if (!task) {
    const error = new Error('Study task not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  if (task.studyPlan.userId !== userId) {
    const error = new Error('Access denied: You do not own the study plan associated with this task') as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }

  const updatedTask = await prisma.studyTask.update({
    where: { id: taskId },
    data: {
      title: input.title !== undefined ? input.title : undefined,
      description: input.description !== undefined ? input.description : undefined,
      category: input.category !== undefined ? input.category : undefined,
      priority: input.priority !== undefined ? input.priority : undefined,
      estimatedDuration: input.estimatedDuration !== undefined ? input.estimatedDuration : undefined,
      actualDuration: input.actualDuration !== undefined ? input.actualDuration : undefined,
      status: input.status !== undefined ? input.status : undefined,
    },
  });

  await recalculateUserStreak(userId);
  return updatedTask;
};

export const deleteStudyTask = async (userId: string, taskId: string) => {
  const task = await prisma.studyTask.findUnique({
    where: { id: taskId },
    include: { studyPlan: true },
  });

  if (!task) {
    const error = new Error('Study task not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  if (task.studyPlan.userId !== userId) {
    const error = new Error('Access denied: You do not own the study plan associated with this task') as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }

  await prisma.studyTask.delete({
    where: { id: taskId },
  });

  await recalculateUserStreak(userId);
  return { success: true };
};

export const reorderStudyTasks = async (userId: string, planId: string, orderedTaskIds: string[]) => {
  const plan = await prisma.studyPlan.findUnique({
    where: { id: planId },
    include: { tasks: true },
  });

  if (!plan) {
    const error = new Error('Study plan not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  if (plan.userId !== userId) {
    const error = new Error('Access denied: You do not own this study plan') as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }

  const existingTaskIds = plan.tasks.map((t) => t.id);
  const allBelong =
    orderedTaskIds.length === existingTaskIds.length &&
    orderedTaskIds.every((id) => existingTaskIds.includes(id)) &&
    existingTaskIds.every((id) => orderedTaskIds.includes(id));

  if (!allBelong) {
    const error = new Error('Invalid task list for reordering') as Error & { statusCode?: number };
    error.statusCode = 400;
    throw error;
  }

  // Update in a transaction
  await prisma.$transaction(
    orderedTaskIds.map((id, index) =>
      prisma.studyTask.update({
        where: { id },
        data: { order: index },
      })
    )
  );

  await recalculateUserStreak(userId);
  return { success: true };
};
