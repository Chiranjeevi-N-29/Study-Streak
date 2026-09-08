import { prisma } from '../../config/db.js';
import { recalculateUserStreak } from '../streak/streak.service.js';
import { recalculateGoalProgress } from '../goal/goal.service.js';

export const getLocalDateInTimezone = (timezone: string = 'UTC'): string => {
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

export const addDaysToDate = (dateStr: string, days: number): string => {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
};

export const getDayName = (dateStr: string): string => {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[d.getUTCDay()];
};

export const getWeekStartDate = (dateStr: string, weekStartsOn: string = 'Monday'): string => {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  const dayIndex = d.getUTCDay(); // 0 is Sunday, 1 is Monday...
  const targetStart = weekStartsOn === 'Sunday' ? 0 : 1;
  let diff = dayIndex - targetStart;
  if (diff < 0) diff += 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().split('T')[0];
};

export type WorkloadStatus = 'Light' | 'Moderate' | 'Heavy' | 'Overloaded';

export const calculateWorkloadStatus = (plannedMinutes: number, goalMinutes: number): WorkloadStatus => {
  if (plannedMinutes === 0 || plannedMinutes < 0.5 * goalMinutes) {
    return 'Light';
  } else if (plannedMinutes <= goalMinutes) {
    return 'Moderate';
  } else if (plannedMinutes <= 1.5 * goalMinutes) {
    return 'Heavy';
  } else {
    return 'Overloaded';
  }
};

export const getUserPreferencesWithDefaults = async (userId: string) => {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId },
  });
  return {
    dailyStudyGoalMinutes: prefs?.dailyStudyGoalMinutes ?? 60,
    preferredStudyDays: prefs?.preferredStudyDays ?? [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ],
    weekStartsOn: prefs?.weekStartsOn ?? 'Monday',
  };
};

export const getWeeklyPlan = async (userId: string, startDateInput?: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const timezone = user?.timezone || 'UTC';
  const prefs = await getUserPreferencesWithDefaults(userId);
  const localToday = getLocalDateInTimezone(timezone);

  const startDate = startDateInput || getWeekStartDate(localToday, prefs.weekStartsOn);
  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    weekDates.push(addDaysToDate(startDate, i));
  }
  const endDate = weekDates[6];

  const plans = await prisma.studyPlan.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      tasks: {
        orderBy: { order: 'asc' },
        include: {
          goal: {
            select: {
              id: true,
              title: true,
              targetDate: true,
              status: true,
            },
          },
        },
      },
    },
  });

  const planMap = new Map<string, typeof plans[0]>();
  plans.forEach((p) => planMap.set(p.date, p));

  // Also fetch completed focus sessions in this date range
  const focusSessions = await prisma.focusSession.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      startedAt: {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lte: new Date(`${endDate}T23:59:59.999Z`),
      },
    },
  });

  const focusMinutesMap = new Map<string, number>();
  focusSessions.forEach((s) => {
    const dateStr = s.startedAt.toISOString().split('T')[0];
    const mins = Math.round((s.durationSeconds || 0) / 60);
    focusMinutesMap.set(dateStr, (focusMinutesMap.get(dateStr) || 0) + mins);
  });

  let totalPlannedMinutes = 0;
  let totalActualFocusMinutes = 0;
  let totalTasks = 0;
  let totalCompletedTasks = 0;

  const days = weekDates.map((date) => {
    const plan = planMap.get(date);
    const tasks = plan?.tasks || [];
    const plannedMinutes = tasks.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0);
    const completedTasksCount = tasks.filter((t) => t.status === 'COMPLETED').length;
    const actualFocusMinutes = focusMinutesMap.get(date) || 0;
    const workloadStatus = calculateWorkloadStatus(plannedMinutes, prefs.dailyStudyGoalMinutes);
    const isOverloaded = plannedMinutes > prefs.dailyStudyGoalMinutes;
    const isToday = date === localToday;

    totalPlannedMinutes += plannedMinutes;
    totalActualFocusMinutes += actualFocusMinutes;
    totalTasks += tasks.length;
    totalCompletedTasks += completedTasksCount;

    return {
      date,
      dayName: getDayName(date),
      isToday,
      planId: plan?.id || null,
      title: plan?.title || null,
      status: plan?.status || 'TODO',
      plannedMinutes,
      actualFocusMinutes,
      remainingCapacityMinutes: Math.max(0, prefs.dailyStudyGoalMinutes - plannedMinutes),
      dailyGoalMinutes: prefs.dailyStudyGoalMinutes,
      workloadStatus,
      isOverloaded,
      taskCount: tasks.length,
      completedTaskCount: completedTasksCount,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        priority: t.priority,
        status: t.status,
        estimatedDuration: t.estimatedDuration,
        actualDuration: t.actualDuration,
        order: t.order,
        goalId: t.goalId,
        goalTitle: t.goal?.title || null,
        goalTargetDate: t.goal?.targetDate || null,
      })),
    };
  });

  return {
    startDate,
    endDate,
    localToday,
    dailyGoalMinutes: prefs.dailyStudyGoalMinutes,
    weeklySummary: {
      totalPlannedMinutes,
      totalActualFocusMinutes,
      totalTasks,
      totalCompletedTasks,
      completionRate: totalTasks > 0 ? Math.round((totalCompletedTasks / totalTasks) * 100) : 0,
    },
    days,
  };
};

export const getDailyPlan = async (userId: string, dateInput?: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const timezone = user?.timezone || 'UTC';
  const date = dateInput || getLocalDateInTimezone(timezone);
  const prefs = await getUserPreferencesWithDefaults(userId);

  const plan = await prisma.studyPlan.findUnique({
    where: {
      userId_date: {
        userId,
        date,
      },
    },
    include: {
      tasks: {
        orderBy: { order: 'asc' },
        include: {
          goal: {
            select: {
              id: true,
              title: true,
              targetDate: true,
            },
          },
        },
      },
    },
  });

  const focusSessions = await prisma.focusSession.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      startedAt: {
        gte: new Date(`${date}T00:00:00.000Z`),
        lte: new Date(`${date}T23:59:59.999Z`),
      },
    },
  });

  const actualFocusMinutes = focusSessions.reduce(
    (sum, s) => sum + Math.round((s.durationSeconds || 0) / 60),
    0
  );

  const tasks = plan?.tasks || [];
  const plannedMinutes = tasks.reduce((sum, t) => sum + (t.estimatedDuration || 0), 0);
  const completedTasksCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const workloadStatus = calculateWorkloadStatus(plannedMinutes, prefs.dailyStudyGoalMinutes);

  return {
    date,
    dayName: getDayName(date),
    planId: plan?.id || null,
    title: plan?.title || null,
    description: plan?.description || null,
    status: plan?.status || 'TODO',
    plannedMinutes,
    actualFocusMinutes,
    dailyGoalMinutes: prefs.dailyStudyGoalMinutes,
    remainingCapacityMinutes: Math.max(0, prefs.dailyStudyGoalMinutes - plannedMinutes),
    workloadStatus,
    isOverloaded: plannedMinutes > prefs.dailyStudyGoalMinutes,
    taskCount: tasks.length,
    completedTaskCount: completedTasksCount,
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      priority: t.priority,
      status: t.status,
      estimatedDuration: t.estimatedDuration,
      actualDuration: t.actualDuration,
      order: t.order,
      goalId: t.goalId,
      goalTitle: t.goal?.title || null,
      goalTargetDate: t.goal?.targetDate || null,
    })),
  };
};

export const scheduleTask = async (
  userId: string,
  taskId: string,
  targetDate: string,
  estimatedDuration?: number
) => {
  const task = await prisma.studyTask.findUnique({
    where: { id: taskId },
    include: { studyPlan: true },
  });

  if (!task) {
    const error = new Error('Task not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  if (task.studyPlan.userId !== userId) {
    const error = new Error('Access denied: You do not own this task') as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }

  // Find or create target StudyPlan
  let targetPlan = await prisma.studyPlan.findUnique({
    where: {
      userId_date: {
        userId,
        date: targetDate,
      },
    },
    include: { tasks: true },
  });

  if (!targetPlan) {
    targetPlan = await prisma.studyPlan.create({
      data: {
        userId,
        date: targetDate,
        title: `Plan for ${targetDate}`,
      },
      include: { tasks: true },
    });
  }

  const maxOrder = targetPlan.tasks.length > 0
    ? Math.max(...targetPlan.tasks.map((t) => t.order))
    : -1;

  const updatedTask = await prisma.studyTask.update({
    where: { id: taskId },
    data: {
      studyPlanId: targetPlan.id,
      estimatedDuration: estimatedDuration !== undefined ? estimatedDuration : task.estimatedDuration,
      order: maxOrder + 1,
    },
    include: {
      studyPlan: true,
      goal: {
        select: {
          id: true,
          title: true,
          targetDate: true,
        },
      },
    },
  });

  if (task.goalId) {
    await recalculateGoalProgress(task.goalId);
  }

  await recalculateUserStreak(userId);

  return updatedTask;
};

export const rescheduleTask = async (
  userId: string,
  taskId: string,
  targetDate: string,
  estimatedDuration?: number
) => {
  return scheduleTask(userId, taskId, targetDate, estimatedDuration);
};

export const getOverdueTasks = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const timezone = user?.timezone || 'UTC';
  const localToday = getLocalDateInTimezone(timezone);

  const overdueTasks = await prisma.studyTask.findMany({
    where: {
      studyPlan: {
        userId,
        date: {
          lt: localToday,
        },
      },
      status: {
        notIn: ['COMPLETED', 'REST_DAY'],
      },
    },
    include: {
      studyPlan: {
        select: {
          id: true,
          date: true,
        },
      },
      goal: {
        select: {
          id: true,
          title: true,
          targetDate: true,
        },
      },
    },
    orderBy: {
      studyPlan: {
        date: 'asc',
      },
    },
  });

  return {
    localToday,
    count: overdueTasks.length,
    tasks: overdueTasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      priority: t.priority,
      status: t.status,
      estimatedDuration: t.estimatedDuration,
      actualDuration: t.actualDuration,
      plannedDate: t.studyPlan.date,
      goalId: t.goalId,
      goalTitle: t.goal?.title || null,
      goalTargetDate: t.goal?.targetDate || null,
    })),
  };
};

export const getRecommendation = async (userId: string, taskId: string) => {
  const task = await prisma.studyTask.findUnique({
    where: { id: taskId },
    include: {
      studyPlan: true,
      goal: {
        select: {
          id: true,
          title: true,
          targetDate: true,
        },
      },
    },
  });

  if (!task) {
    const error = new Error('Task not found') as Error & { statusCode?: number };
    error.statusCode = 404;
    throw error;
  }

  if (task.studyPlan.userId !== userId) {
    const error = new Error('Access denied: You do not own this task') as Error & { statusCode?: number };
    error.statusCode = 403;
    throw error;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const timezone = user?.timezone || 'UTC';
  const prefs = await getUserPreferencesWithDefaults(userId);
  const localToday = getLocalDateInTimezone(timezone);

  // Evaluate candidate dates (next 14 days starting from localToday)
  const candidateDates: string[] = [];
  for (let i = 0; i < 14; i++) {
    candidateDates.push(addDaysToDate(localToday, i));
  }

  // Get existing plans for candidate range
  const existingPlans = await prisma.studyPlan.findMany({
    where: {
      userId,
      date: {
        in: candidateDates,
      },
    },
    include: {
      tasks: true,
    },
  });

  const planMap = new Map<string, typeof existingPlans[0]>();
  existingPlans.forEach((p) => planMap.set(p.date, p));

  const goalTargetDate = task.goal?.targetDate || null;

  type ScoredCandidate = {
    date: string;
    dayName: string;
    score: number;
    plannedMinutes: number;
    remainingCapacity: number;
    matchesPreferredDay: boolean;
    withinGoalTargetDate: boolean;
    reason: string;
  };

  const scoredCandidates: ScoredCandidate[] = candidateDates.map((date, idx) => {
    const dayName = getDayName(date);
    const plan = planMap.get(date);
    const existingTasks = plan?.tasks || [];
    const plannedMinutes = existingTasks.reduce((sum, t) => sum + (t.id === task.id ? 0 : t.estimatedDuration || 0), 0);
    const remainingCapacity = prefs.dailyStudyGoalMinutes - plannedMinutes;
    const matchesPreferredDay = prefs.preferredStudyDays.includes(dayName);
    const withinGoalTargetDate = !goalTargetDate || date <= goalTargetDate;

    let score = 100;

    // Prefer days with enough capacity
    if (remainingCapacity >= (task.estimatedDuration || 30)) {
      score += 40;
    } else if (remainingCapacity > 0) {
      score += 10;
    } else {
      score -= 50; // Overloaded
    }

    // Prefer preferred study days
    if (matchesPreferredDay) {
      score += 30;
    } else {
      score -= 20;
    }

    // Goal target date constraint
    if (!withinGoalTargetDate) {
      score -= 200; // Violates goal deadline
    }

    // Proximity score (sooner is slightly better if high priority)
    if (task.priority === 'HIGH') {
      score += Math.max(0, 20 - idx * 2);
    } else if (task.priority === 'MEDIUM') {
      score += Math.max(0, 10 - idx);
    } else {
      score += Math.max(0, 5 - Math.floor(idx / 2));
    }

    let reason = '';
    if (!withinGoalTargetDate) {
      reason = `After goal deadline (${goalTargetDate})`;
    } else if (matchesPreferredDay && remainingCapacity >= task.estimatedDuration) {
      reason = `Preferred study day (${dayName}) with ${remainingCapacity}m available capacity`;
    } else if (remainingCapacity >= task.estimatedDuration) {
      reason = `Has ${remainingCapacity}m available capacity`;
    } else {
      reason = `Day is at or near capacity (${plannedMinutes}m / ${prefs.dailyStudyGoalMinutes}m)`;
    }

    return {
      date,
      dayName,
      score,
      plannedMinutes,
      remainingCapacity,
      matchesPreferredDay,
      withinGoalTargetDate,
      reason,
    };
  });

  // Sort by score descending, then date ascending
  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.date.localeCompare(b.date);
  });

  const bestCandidate = scoredCandidates[0];

  return {
    taskId: task.id,
    taskTitle: task.title,
    taskPriority: task.priority,
    estimatedDuration: task.estimatedDuration,
    goalId: task.goalId,
    goalTitle: task.goal?.title || null,
    goalTargetDate,
    recommendedDate: bestCandidate.date,
    recommendedDayName: bestCandidate.dayName,
    reason: bestCandidate.reason,
    remainingCapacityMinutes: Math.max(0, bestCandidate.remainingCapacity),
    dailyGoalMinutes: prefs.dailyStudyGoalMinutes,
    candidates: scoredCandidates.slice(0, 5).map((c) => ({
      date: c.date,
      dayName: c.dayName,
      remainingCapacity: Math.max(0, c.remainingCapacity),
      reason: c.reason,
      matchesPreferredDay: c.matchesPreferredDay,
      withinGoalTargetDate: c.withinGoalTargetDate,
    })),
  };
};

export const getPlannerAnalytics = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  });
  const timezone = user?.timezone || 'UTC';
  const localToday = getLocalDateInTimezone(timezone);

  const past30DaysStart = addDaysToDate(localToday, -30);

  const plans = await prisma.studyPlan.findMany({
    where: {
      userId,
      date: {
        gte: past30DaysStart,
        lte: localToday,
      },
    },
    include: {
      tasks: true,
    },
  });

  const focusSessions = await prisma.focusSession.findMany({
    where: {
      userId,
      status: 'COMPLETED',
      startedAt: {
        gte: new Date(`${past30DaysStart}T00:00:00.000Z`),
        lte: new Date(`${localToday}T23:59:59.999Z`),
      },
    },
  });

  let totalPlannedMinutes = 0;
  let totalTasksCount = 0;
  let completedTasksCount = 0;

  plans.forEach((p) => {
    p.tasks.forEach((t) => {
      totalTasksCount++;
      totalPlannedMinutes += t.estimatedDuration || 0;
      if (t.status === 'COMPLETED') {
        completedTasksCount++;
      }
    });
  });

  const totalActualFocusMinutes = focusSessions.reduce(
    (sum, s) => sum + Math.round((s.durationSeconds || 0) / 60),
    0
  );

  const planningAccuracy = totalPlannedMinutes > 0
    ? Math.min(100, Math.round((totalActualFocusMinutes / totalPlannedMinutes) * 100))
    : 0;

  const overdueRes = await getOverdueTasks(userId);

  return {
    period: 'past_30_days',
    totalPlannedMinutes,
    totalActualFocusMinutes,
    planningAccuracyPercent: planningAccuracy,
    totalTasksCount,
    completedTasksCount,
    completionRatePercent: totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0,
    overdueTasksCount: overdueRes.count,
  };
};
