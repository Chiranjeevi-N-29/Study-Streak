import { prisma } from '../../config/db.js';

export interface AnalyticsSummary {
  range: '7d' | '30d' | '90d' | 'all';
  kpis: {
    currentStreak: number;
    longestStreak: number;
    successfulDays: number;
    restDays: number;
    missedDays: number;
    totalStudyMinutes: number;
    completedTasksCount: number;
    plannedTasksCount: number;
    completionRate: number; // percentage 0-100
    avgStudyMinutesPerDay: number;
    avgStudyMinutesPerSuccessfulDay: number;
  };
  dailyTimeSeries: Array<{
    date: string; // YYYY-MM-DD
    dayOfWeek: string; // Mon, Tue, etc.
    studyMinutes: number;
    targetMinutes: number;
    status: string;
    tasksCompleted: number;
    totalTasks: number;
  }>;
  weeklyBreakdown: Array<{
    weekLabel: string;
    studyMinutes: number;
    tasksCompleted: number;
    plannedTasks: number;
    completionRate: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    studyMinutes: number;
    taskCount: number;
    completedCount: number;
  }>;
  priorityPerformance: Array<{
    priority: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  }>;
  studyHabits: {
    mostProductiveDayOfWeek: string | null;
    topCategory: string | null;
    avgDailyMinutes: number;
  };
  moodAnalytics: {
    counts: Record<string, number>;
    avgMinutesByMood: Record<string, number>;
  };
}

export const getUserAnalytics = async (
  userId: string,
  range: '7d' | '30d' | '90d' | 'all' = '30d'
): Promise<AnalyticsSummary> => {
  // 1. Determine date cutoff string YYYY-MM-DD
  const today = new Date();
  const todayStr = formatDateIso(today);

  let numDays = 30;
  if (range === '7d') numDays = 7;
  else if (range === '90d') numDays = 90;
  else if (range === 'all') numDays = 365; // cap default query range for 'all' to last year or all records

  const cutoffDateObj = new Date(today);
  cutoffDateObj.setDate(today.getDate() - (numDays - 1));
  const cutoffStr = formatDateIso(cutoffDateObj);

  // 2. Fetch User Streak
  const streak = await prisma.streak.findUnique({
    where: { userId },
  });

  // 3. Fetch Study Plans & Tasks
  const plans = await prisma.studyPlan.findMany({
    where: {
      userId,
      ...(range !== 'all' ? { date: { gte: cutoffStr } } : {}),
    },
    include: {
      tasks: true,
    },
    orderBy: {
      date: 'asc',
    },
  });

  // 4. Fetch Daily Reflections
  const reflections = await prisma.dailyReflection.findMany({
    where: {
      userId,
      ...(range !== 'all' ? { date: { gte: cutoffStr } } : {}),
    },
  });

  // 5. Aggregate Core KPIs & Consistency Counts
  const planMap = new Map<string, (typeof plans)[0]>();
  plans.forEach((p) => planMap.set(p.date, p));

  let successfulDays = 0;
  let restDays = 0;
  let missedDays = 0;
  let totalStudyMinutes = 0;
  let plannedTasksCount = 0;
  let completedTasksCount = 0;

  // Category aggregation map
  const categoryMap = new Map<
    string,
    { category: string; studyMinutes: number; taskCount: number; completedCount: number }
  >();

  // Priority performance map
  const priorityMap = new Map<
    string,
    { priority: string; totalTasks: number; completedTasks: number }
  >([
    ['HIGH', { priority: 'HIGH', totalTasks: 0, completedTasks: 0 }],
    ['MEDIUM', { priority: 'MEDIUM', totalTasks: 0, completedTasks: 0 }],
    ['LOW', { priority: 'LOW', totalTasks: 0, completedTasks: 0 }],
  ]);

  // Day of week study minutes map (Mon..Sun)
  const dayOfWeekMinutesMap: Record<string, { totalMinutes: number; dayCount: number }> = {
    Mon: { totalMinutes: 0, dayCount: 0 },
    Tue: { totalMinutes: 0, dayCount: 0 },
    Wed: { totalMinutes: 0, dayCount: 0 },
    Thu: { totalMinutes: 0, dayCount: 0 },
    Fri: { totalMinutes: 0, dayCount: 0 },
    Sat: { totalMinutes: 0, dayCount: 0 },
    Sun: { totalMinutes: 0, dayCount: 0 },
  };

  // Build full daily time series for the range
  const dailyTimeSeries: AnalyticsSummary['dailyTimeSeries'] = [];
  const daysToGenerate = range === 'all' ? Math.max(numDays, plans.length) : numDays;

  for (let i = daysToGenerate - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = formatDateIso(d);
    const dayOfWeek = getDayOfWeekShort(d);

    const plan = planMap.get(dateStr);
    let dayStudyMinutes = 0;
    let dayCompletedTasks = 0;
    let dayTotalTasks = 0;
    let dayStatus = 'NO_PLAN';

    if (plan) {
      dayStatus = plan.status;
      if (plan.status === 'COMPLETED') successfulDays++;
      else if (plan.status === 'REST_DAY') restDays++;
      else if (plan.status === 'MISSED') missedDays++;

      dayTotalTasks = plan.tasks.length;
      plannedTasksCount += dayTotalTasks;

      plan.tasks.forEach((task) => {
        const actual = task.actualDuration || 0;
        dayStudyMinutes += actual;
        totalStudyMinutes += actual;

        if (task.status === 'COMPLETED') {
          dayCompletedTasks++;
          completedTasksCount++;
        }

        // Aggregate Category (Normalized Title Case)
        const rawCat = (task.category || 'General').trim();
        const normCat = rawCat.charAt(0).toUpperCase() + rawCat.slice(1).toLowerCase();
        const existingCat = categoryMap.get(normCat) || {
          category: normCat,
          studyMinutes: 0,
          taskCount: 0,
          completedCount: 0,
        };
        existingCat.studyMinutes += actual;
        existingCat.taskCount += 1;
        if (task.status === 'COMPLETED') existingCat.completedCount += 1;
        categoryMap.set(normCat, existingCat);

        // Aggregate Priority
        const prioKey = task.priority || 'MEDIUM';
        const existingPrio = priorityMap.get(prioKey);
        if (existingPrio) {
          existingPrio.totalTasks += 1;
          if (task.status === 'COMPLETED') existingPrio.completedTasks += 1;
        }
      });
    } else if (dateStr < todayStr) {
      dayStatus = 'MISSED';
      missedDays++;
    }

    if (dayOfWeekMinutesMap[dayOfWeek]) {
      dayOfWeekMinutesMap[dayOfWeek].totalMinutes += dayStudyMinutes;
      dayOfWeekMinutesMap[dayOfWeek].dayCount += 1;
    }

    dailyTimeSeries.push({
      date: dateStr,
      dayOfWeek,
      studyMinutes: dayStudyMinutes,
      targetMinutes: plan?.minimumStudyTarget ?? 30,
      status: dayStatus,
      tasksCompleted: dayCompletedTasks,
      totalTasks: dayTotalTasks,
    });
  }

  // Calculate completion rate
  const completionRate =
    plannedTasksCount > 0
      ? Math.round((completedTasksCount / plannedTasksCount) * 1000) / 10
      : 0;

  const avgStudyMinutesPerDay =
    daysToGenerate > 0 ? Math.round(totalStudyMinutes / daysToGenerate) : 0;

  const avgStudyMinutesPerSuccessfulDay =
    successfulDays > 0 ? Math.round(totalStudyMinutes / successfulDays) : 0;

  // 6. Weekly Breakdown
  const weeklyBreakdown: AnalyticsSummary['weeklyBreakdown'] = [];
  const chunkSize = 7;
  for (let i = 0; i < dailyTimeSeries.length; i += chunkSize) {
    const chunk = dailyTimeSeries.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;

    const startDate = chunk[0].date;
    const endDate = chunk[chunk.length - 1].date;
    const weekLabel = `${formatShortMonthDay(startDate)} - ${formatShortMonthDay(endDate)}`;

    const weekMinutes = chunk.reduce((sum, c) => sum + c.studyMinutes, 0);
    const weekCompleted = chunk.reduce((sum, c) => sum + c.tasksCompleted, 0);
    const weekPlanned = chunk.reduce((sum, c) => sum + c.totalTasks, 0);
    const weekRate =
      weekPlanned > 0 ? Math.round((weekCompleted / weekPlanned) * 1000) / 10 : 0;

    weeklyBreakdown.push({
      weekLabel,
      studyMinutes: weekMinutes,
      tasksCompleted: weekCompleted,
      plannedTasks: weekPlanned,
      completionRate: weekRate,
    });
  }

  // 7. Category Breakdown Sorted
  const categoryBreakdown = Array.from(categoryMap.values()).sort(
    (a, b) => b.studyMinutes - a.studyMinutes
  );

  // 8. Priority Performance Array
  const priorityPerformance = Array.from(priorityMap.values()).map((p) => ({
    priority: p.priority,
    totalTasks: p.totalTasks,
    completedTasks: p.completedTasks,
    completionRate:
      p.totalTasks > 0
        ? Math.round((p.completedTasks / p.totalTasks) * 1000) / 10
        : 0,
  }));

  // 9. Study Habits Insights
  let mostProductiveDayOfWeek: string | null = null;
  let maxAvgMinutes = -1;
  Object.entries(dayOfWeekMinutesMap).forEach(([day, data]) => {
    const avg = data.dayCount > 0 ? data.totalMinutes / data.dayCount : 0;
    if (avg > maxAvgMinutes && data.totalMinutes > 0) {
      maxAvgMinutes = avg;
      mostProductiveDayOfWeek = day;
    }
  });

  const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0].category : null;

  // 10. Mood Analytics & Correlation
  const moodCounts: Record<string, number> = {
    GREAT: 0,
    GOOD: 0,
    OKAY: 0,
    DIFFICULT: 0,
    ROUGH: 0,
  };
  const moodStudyMinutesMap: Record<string, number[]> = {
    GREAT: [],
    GOOD: [],
    OKAY: [],
    DIFFICULT: [],
    ROUGH: [],
  };

  const dailyMinutesMap = new Map<string, number>();
  dailyTimeSeries.forEach((ts) => dailyMinutesMap.set(ts.date, ts.studyMinutes));

  reflections.forEach((r) => {
    // Note: If model has mood, count mood; otherwise default or parse
    const moodVal = (r as unknown as { mood?: string }).mood || 'GOOD';
    if (moodCounts[moodVal] !== undefined) {
      moodCounts[moodVal] += 1;
      const minutesOnDay = dailyMinutesMap.get(r.date) || 0;
      moodStudyMinutesMap[moodVal].push(minutesOnDay);
    }
  });

  const avgMinutesByMood: Record<string, number> = {};
  Object.keys(moodStudyMinutesMap).forEach((m) => {
    const arr = moodStudyMinutesMap[m];
    avgMinutesByMood[m] =
      arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  });

  return {
    range,
    kpis: {
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      successfulDays,
      restDays,
      missedDays,
      totalStudyMinutes,
      completedTasksCount,
      plannedTasksCount,
      completionRate,
      avgStudyMinutesPerDay,
      avgStudyMinutesPerSuccessfulDay,
    },
    dailyTimeSeries,
    weeklyBreakdown,
    categoryBreakdown,
    priorityPerformance,
    studyHabits: {
      mostProductiveDayOfWeek,
      topCategory,
      avgDailyMinutes: avgStudyMinutesPerDay,
    },
    moodAnalytics: {
      counts: moodCounts,
      avgMinutesByMood,
    },
  };
};

// Helper utilities for ISO dates YYYY-MM-DD
function formatDateIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDayOfWeekShort(d: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getDay()];
}

function formatShortMonthDay(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}
