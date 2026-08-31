import { prisma } from '../../config/db.js';
import { CreateStudyPlanInput, UpdateStudyPlanInput } from './study-plan.schema.js';

export const getLocalDateInTimezone = (timezone: string): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    return `${year}-${month}-${day}`;
  } catch (err) {
    return new Date().toISOString().split('T')[0];
  }
};

export const createStudyPlan = async (userId: string, input: CreateStudyPlanInput) => {
  const existingPlan = await prisma.studyPlan.findUnique({
    where: {
      userId_date: {
        userId,
        date: input.date,
      },
    },
  });

  if (existingPlan) {
    const error = new Error('A study plan already exists for this date') as Error & { statusCode?: number };
    error.statusCode = 409;
    throw error;
  }

  return prisma.studyPlan.create({
    data: {
      userId,
      date: input.date,
      title: input.title,
      description: input.description,
      minimumStudyTarget: input.minimumStudyTarget,
      status: input.status,
    },
  });
};

export const getTodayStudyPlan = async (userId: string, timezone: string) => {
  const localToday = getLocalDateInTimezone(timezone);

  return prisma.studyPlan.findUnique({
    where: {
      userId_date: {
        userId,
        date: localToday,
      },
    },
    include: {
      tasks: {
        orderBy: {
          order: 'asc',
        },
      },
    },
  });
};

export const getStudyPlansByRange = async (userId: string, startDate: string, endDate: string) => {
  return prisma.studyPlan.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      tasks: {
        orderBy: {
          order: 'asc',
        },
      },
    },
    orderBy: {
      date: 'asc',
    },
  });
};

export const getStudyPlanById = async (userId: string, id: string) => {
  const plan = await prisma.studyPlan.findUnique({
    where: { id },
    include: {
      tasks: {
        orderBy: {
          order: 'asc',
        },
      },
    },
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

  return plan;
};

export const updateStudyPlan = async (userId: string, id: string, input: UpdateStudyPlanInput) => {
  const plan = await prisma.studyPlan.findUnique({
    where: { id },
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

  return prisma.studyPlan.update({
    where: { id },
    data: {
      title: input.title !== undefined ? input.title : undefined,
      description: input.description !== undefined ? input.description : undefined,
      minimumStudyTarget: input.minimumStudyTarget !== undefined ? input.minimumStudyTarget : undefined,
      status: input.status !== undefined ? input.status : undefined,
    },
  });
};

export const deleteStudyPlan = async (userId: string, id: string) => {
  const plan = await prisma.studyPlan.findUnique({
    where: { id },
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

  await prisma.studyPlan.delete({
    where: { id },
  });

  return { success: true };
};
