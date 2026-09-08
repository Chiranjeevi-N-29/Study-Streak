import { prisma } from '../../config/db.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  numDays: number;
  label: string;
}

export interface ReportOverview {
  totalStudyMinutes: number;
  avgDailyMinutes: number;
  avgActiveDayMinutes: number;
  totalTasksCompleted: number;
  totalTasksPlanned: number;
  taskCompletionRate: number;
  successfulDays: number;
  restDays: number;
  missedDays: number;
  dayCompletionRate: number; // % of planned days that were successful
  totalFocusSessions: number;
  totalFocusMinutes: number;
  avgFocusSessionMinutes: number;
}

export interface DailyDataPoint {
  date: string;
  dayOfWeek: string;
  studyMinutes: number;
  targetMinutes: number;
  focusMinutes: number;
  tasksCompleted: number;
  totalTasks: number;
  status: string;
}

export interface WeeklyDataPoint {
  weekLabel: string;
  startDate: string;
  studyMinutes: number;
  focusMinutes: number;
  tasksCompleted: number;
  plannedTasks: number;
  completionRate: number;
  successfulDays: number;
}

export interface CategoryStat {
  category: string;
  studyMinutes: number;
  taskCount: number;
  completedCount: number;
  completionRate: number;
  estimatedMinutes: number;
  actualVsEstimatedRatio: number; // actual / estimated
}

export interface PriorityStat {
  priority: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  totalEstimatedMinutes: number;
  totalActualMinutes: number;
}

export interface GoalReportItem {
  id: string;
  title: string;
  category: string | null;
  status: string;
  progressType: string;
  targetValue: number | null;
  currentValue: number;
  progressPercentage: number;
  targetDate: string | null;
  completedAt: string | null;
  daysUntilDeadline: number | null;
  isOverdue: boolean;
  milestoneTotal: number;
  milestoneCompleted: number;
}

export interface StreakReport {
  currentStreak: number;
  longestStreak: number;
  successfulStudyDays: number;
  consistencyScore: number; // % of days in range that were successful
  longestGap: number; // longest gap in days without studying
  streakBreaks: number; // how many times streak was broken in range
  mostProductiveDayOfWeek: string | null;
  leastProductiveDayOfWeek: string | null;
  dayOfWeekBreakdown: Array<{
    day: string;
    avgMinutes: number;
    successCount: number;
    totalDays: number;
  }>;
}

export interface FocusSessionReport {
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  totalFocusMinutes: number;
  avgSessionMinutes: number;
  longestSessionMinutes: number;
  taskLinkedSessions: number;
  standaloneSessionsSessions: number;
  sessionsByDay: Array<{ date: string; sessionCount: number; totalMinutes: number }>;
}

export interface StudyInsight {
  type: 'positive' | 'warning' | 'neutral' | 'info';
  title: string;
  body: string;
  metric?: string | number;
}

export interface PlannedVsActualPoint {
  weekLabel: string;
  plannedMinutes: number;
  actualMinutes: number;
  variance: number; // actual - planned
  variancePct: number; // (actual - planned) / planned * 100
}

export interface ReportData {
  range: string;
  dateRange: DateRange;
  overview: ReportOverview;
  dailyTimeSeries: DailyDataPoint[];
  weeklyBreakdown: WeeklyDataPoint[];
  categoryStats: CategoryStat[];
  priorityStats: PriorityStat[];
  goalReport: GoalReportItem[];
  streakReport: StreakReport;
  focusSessionReport: FocusSessionReport;
  plannedVsActual: PlannedVsActualPoint[];
  insights: StudyInsight[];
  moodAnalytics: {
    counts: Record<string, number>;
    avgMinutesByMood: Record<string, number>;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateIso(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDayOfWeekShort(d: Date): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
}

function formatShortMonthDay(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a);
  const db = new Date(b);
  return Math.round(Math.abs((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24)));
}

export function resolveDateRange(
  range: string,
  startDate?: string,
  endDate?: string
): DateRange {
  const today = new Date();
  const todayStr = formatDateIso(today);

  if (range === 'custom' && startDate && endDate) {
    const days = daysBetween(startDate, endDate) + 1;
    return {
      startDate,
      endDate,
      numDays: days,
      label: `${formatShortMonthDay(startDate)} – ${formatShortMonthDay(endDate)}`,
    };
  }

  let numDays = 30;
  let label = 'Last 30 Days';
  if (range === '7d') { numDays = 7; label = 'Last 7 Days'; }
  else if (range === '90d') { numDays = 90; label = 'Last 90 Days'; }
  else if (range === 'all') { numDays = 365; label = 'All Time'; }

  const cutoff = new Date(today);
  cutoff.setDate(today.getDate() - (numDays - 1));
  return {
    startDate: formatDateIso(cutoff),
    endDate: todayStr,
    numDays,
    label,
  };
}

// ─── Main service function ────────────────────────────────────────────────────

export const getUserReport = async (
  userId: string,
  range: string,
  startDate?: string,
  endDate?: string
): Promise<ReportData> => {
  const today = new Date();
  const todayStr = formatDateIso(today);
  const dateRange = resolveDateRange(range, startDate, endDate);
  const { startDate: cutoffStr, endDate: endStr, numDays } = dateRange;

  // ── 1. Fetch all study plans in range ──────────────────────────────────────
  const plans = await prisma.studyPlan.findMany({
    where: {
      userId,
      date: { gte: cutoffStr, lte: endStr },
    },
    include: { tasks: true },
    orderBy: { date: 'asc' },
  });

  // ── 2. Fetch reflections ───────────────────────────────────────────────────
  const reflections = await prisma.dailyReflection.findMany({
    where: {
      userId,
      date: { gte: cutoffStr, lte: endStr },
    },
  });

  // ── 3. Fetch completed focus sessions ─────────────────────────────────────
  const focusSessions = await prisma.focusSession.findMany({
    where: {
      userId,
      startedAt: { gte: new Date(cutoffStr), lte: new Date(`${endStr}T23:59:59Z`) },
    },
    include: { task: { select: { id: true, title: true, category: true } } },
    orderBy: { startedAt: 'asc' },
  });

  // ── 4. Fetch streak ────────────────────────────────────────────────────────
  const streak = await prisma.streak.findUnique({ where: { userId } });

  // ── 5. Fetch goals ─────────────────────────────────────────────────────────
  const goals = await prisma.studyGoal.findMany({
    where: { userId },
    include: { milestones: { select: { completed: true } } },
    orderBy: { createdAt: 'desc' },
  });

  // ── 6. Build plan map & focus session maps ─────────────────────────────────
  const planMap = new Map<string, (typeof plans)[0]>();
  plans.forEach((p) => planMap.set(p.date, p));

  // Map date -> total focus minutes (all sessions including task-linked)
  const focusMinutesByDate = new Map<string, number>();
  const sessionsByDate = new Map<string, { count: number; minutes: number }>();

  for (const s of focusSessions) {
    const dateStr = formatDateIso(s.startedAt);
    const mins = Math.round(s.durationSeconds / 60);
    focusMinutesByDate.set(dateStr, (focusMinutesByDate.get(dateStr) || 0) + mins);
    const cur = sessionsByDate.get(dateStr) || { count: 0, minutes: 0 };
    sessionsByDate.set(dateStr, { count: cur.count + 1, minutes: cur.minutes + mins });
  }

  // Standalone sessions (taskId == null) - avoid double counting w/ task.actualDuration
  const standaloneMinutesByDate = new Map<string, number>();
  for (const s of focusSessions) {
    if (!s.taskId && s.status === 'COMPLETED') {
      const dateStr = formatDateIso(s.startedAt);
      const mins = Math.round(s.durationSeconds / 60);
      standaloneMinutesByDate.set(dateStr, (standaloneMinutesByDate.get(dateStr) || 0) + mins);
    }
  }

  // ── 7. Build daily time series ─────────────────────────────────────────────
  const dailyTimeSeries: DailyDataPoint[] = [];
  const dayOfWeekMap: Record<string, { totalMinutes: number; successCount: number; dayCount: number }> = {
    Mon: { totalMinutes: 0, successCount: 0, dayCount: 0 },
    Tue: { totalMinutes: 0, successCount: 0, dayCount: 0 },
    Wed: { totalMinutes: 0, successCount: 0, dayCount: 0 },
    Thu: { totalMinutes: 0, successCount: 0, dayCount: 0 },
    Fri: { totalMinutes: 0, successCount: 0, dayCount: 0 },
    Sat: { totalMinutes: 0, successCount: 0, dayCount: 0 },
    Sun: { totalMinutes: 0, successCount: 0, dayCount: 0 },
  };

  let successfulDays = 0;
  let restDays = 0;
  let missedDays = 0;
  let totalStudyMinutes = 0;
  let totalTasksCompleted = 0;
  let totalTasksPlanned = 0;

  // Category & priority aggregations
  const categoryMap = new Map<string, { studyMinutes: number; taskCount: number; completedCount: number; estimatedMinutes: number }>();
  const priorityMap = new Map<string, { totalTasks: number; completedTasks: number; estimatedMinutes: number; actualMinutes: number }>([
    ['HIGH', { totalTasks: 0, completedTasks: 0, estimatedMinutes: 0, actualMinutes: 0 }],
    ['MEDIUM', { totalTasks: 0, completedTasks: 0, estimatedMinutes: 0, actualMinutes: 0 }],
    ['LOW', { totalTasks: 0, completedTasks: 0, estimatedMinutes: 0, actualMinutes: 0 }],
  ]);

  // Streak analysis
  let streakBreaks = 0;
  let lastSuccessDate: string | null = null;
  let longestGap = 0;
  let currentGap = 0;

  for (let i = 0; i < numDays; i++) {
    const d = new Date(cutoffStr);
    d.setDate(d.getDate() + i);
    const dateStr = formatDateIso(d);
    if (dateStr > todayStr) break; // Don't generate future days
    const dayOfWeek = getDayOfWeekShort(d);

    const plan = planMap.get(dateStr);
    let dayStudyMinutes = 0;
    let dayCompletedTasks = 0;
    let dayTotalTasks = 0;
    let dayStatus = 'NO_PLAN';

    if (plan) {
      dayStatus = plan.status;
      if (plan.status === 'COMPLETED') { successfulDays++; }
      else if (plan.status === 'REST_DAY') { restDays++; }
      else if (plan.status === 'MISSED') { missedDays++; }

      dayTotalTasks = plan.tasks.length;
      totalTasksPlanned += dayTotalTasks;

      for (const task of plan.tasks) {
        const actual = task.actualDuration || 0;
        dayStudyMinutes += actual;
        totalStudyMinutes += actual;

        if (task.status === 'COMPLETED') {
          dayCompletedTasks++;
          totalTasksCompleted++;
        }

        // Category
        const rawCat = (task.category || 'General').trim();
        const normCat = rawCat.charAt(0).toUpperCase() + rawCat.slice(1).toLowerCase();
        const existCat = categoryMap.get(normCat) || { studyMinutes: 0, taskCount: 0, completedCount: 0, estimatedMinutes: 0 };
        existCat.studyMinutes += actual;
        existCat.taskCount += 1;
        existCat.estimatedMinutes += task.estimatedDuration || 0;
        if (task.status === 'COMPLETED') existCat.completedCount += 1;
        categoryMap.set(normCat, existCat);

        // Priority
        const prioKey = task.priority || 'MEDIUM';
        const existPrio = priorityMap.get(prioKey);
        if (existPrio) {
          existPrio.totalTasks += 1;
          existPrio.estimatedMinutes += task.estimatedDuration || 0;
          existPrio.actualMinutes += actual;
          if (task.status === 'COMPLETED') existPrio.completedTasks += 1;
        }
      }
    } else if (dateStr < todayStr) {
      dayStatus = 'MISSED';
      missedDays++;
    }

    // Add standalone focus minutes on top
    const standalone = standaloneMinutesByDate.get(dateStr) || 0;
    if (standalone > 0) {
      dayStudyMinutes += standalone;
      totalStudyMinutes += standalone;
    }

    // Streak gap analysis
    if (dayStatus === 'COMPLETED') {
      if (lastSuccessDate !== null) {
        const gap = daysBetween(lastSuccessDate, dateStr) - 1;
        if (gap > 0) {
          streakBreaks++;
          longestGap = Math.max(longestGap, gap);
        }
      }
      lastSuccessDate = dateStr;
      currentGap = 0;
    } else if (dayStatus === 'MISSED') {
      currentGap++;
      longestGap = Math.max(longestGap, currentGap);
    }

    // Day of week aggregation
    if (dayOfWeekMap[dayOfWeek]) {
      dayOfWeekMap[dayOfWeek].totalMinutes += dayStudyMinutes;
      dayOfWeekMap[dayOfWeek].dayCount += 1;
      if (dayStatus === 'COMPLETED') dayOfWeekMap[dayOfWeek].successCount += 1;
    }

    dailyTimeSeries.push({
      date: dateStr,
      dayOfWeek,
      studyMinutes: dayStudyMinutes,
      targetMinutes: plan?.minimumStudyTarget ?? 30,
      focusMinutes: focusMinutesByDate.get(dateStr) || 0,
      tasksCompleted: dayCompletedTasks,
      totalTasks: dayTotalTasks,
      status: dayStatus,
    });
  }

  // ── 8. Weekly breakdown ────────────────────────────────────────────────────
  const weeklyBreakdown: WeeklyDataPoint[] = [];
  const chunkSize = 7;
  for (let i = 0; i < dailyTimeSeries.length; i += chunkSize) {
    const chunk = dailyTimeSeries.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;
    const startD = chunk[0].date;
    const endD = chunk[chunk.length - 1].date;
    const weekLabel = `${formatShortMonthDay(startD)} – ${formatShortMonthDay(endD)}`;
    const wMinutes = chunk.reduce((s, c) => s + c.studyMinutes, 0);
    const wFocus = chunk.reduce((s, c) => s + c.focusMinutes, 0);
    const wCompleted = chunk.reduce((s, c) => s + c.tasksCompleted, 0);
    const wPlanned = chunk.reduce((s, c) => s + c.totalTasks, 0);
    const wSuccessful = chunk.filter((c) => c.status === 'COMPLETED').length;
    const wRate = wPlanned > 0 ? Math.round((wCompleted / wPlanned) * 1000) / 10 : 0;

    weeklyBreakdown.push({
      weekLabel,
      startDate: startD,
      studyMinutes: wMinutes,
      focusMinutes: wFocus,
      tasksCompleted: wCompleted,
      plannedTasks: wPlanned,
      completionRate: wRate,
      successfulDays: wSuccessful,
    });
  }

  // ── 9. Category & Priority stats ──────────────────────────────────────────
  const categoryStats: CategoryStat[] = Array.from(categoryMap.entries())
    .map(([category, d]) => ({
      category,
      studyMinutes: d.studyMinutes,
      taskCount: d.taskCount,
      completedCount: d.completedCount,
      completionRate: d.taskCount > 0 ? Math.round((d.completedCount / d.taskCount) * 1000) / 10 : 0,
      estimatedMinutes: d.estimatedMinutes,
      actualVsEstimatedRatio: d.estimatedMinutes > 0
        ? Math.round((d.studyMinutes / d.estimatedMinutes) * 100) / 100
        : 0,
    }))
    .sort((a, b) => b.studyMinutes - a.studyMinutes);

  const priorityStats: PriorityStat[] = Array.from(priorityMap.entries()).map(([priority, d]) => ({
    priority,
    totalTasks: d.totalTasks,
    completedTasks: d.completedTasks,
    completionRate: d.totalTasks > 0 ? Math.round((d.completedTasks / d.totalTasks) * 1000) / 10 : 0,
    totalEstimatedMinutes: d.estimatedMinutes,
    totalActualMinutes: d.actualMinutes,
  }));

  // ── 10. Overview KPIs ──────────────────────────────────────────────────────
  const actualDays = dailyTimeSeries.length;
  const avgDailyMinutes = actualDays > 0 ? Math.round(totalStudyMinutes / actualDays) : 0;
  const avgActiveDayMinutes = successfulDays > 0 ? Math.round(totalStudyMinutes / successfulDays) : 0;
  const taskCompletionRate =
    totalTasksPlanned > 0 ? Math.round((totalTasksCompleted / totalTasksPlanned) * 1000) / 10 : 0;
  const plannedStudyDays = successfulDays + missedDays;
  const dayCompletionRate =
    plannedStudyDays > 0 ? Math.round((successfulDays / plannedStudyDays) * 1000) / 10 : 0;

  // Focus session summary
  const completedSessions = focusSessions.filter((s) => s.status === 'COMPLETED');
  const cancelledSessions = focusSessions.filter((s) => s.status === 'CANCELLED');
  const totalFocusSeconds = completedSessions.reduce((s, fs) => s + fs.durationSeconds, 0);
  const totalFocusMinutes = Math.round(totalFocusSeconds / 60);
  const avgFocusSessionMinutes =
    completedSessions.length > 0 ? Math.round(totalFocusMinutes / completedSessions.length) : 0;
  const longestSessionMinutes = completedSessions.length > 0
    ? Math.round(Math.max(...completedSessions.map((s) => s.durationSeconds)) / 60)
    : 0;

  const overview: ReportOverview = {
    totalStudyMinutes,
    avgDailyMinutes,
    avgActiveDayMinutes,
    totalTasksCompleted,
    totalTasksPlanned,
    taskCompletionRate,
    successfulDays,
    restDays,
    missedDays,
    dayCompletionRate,
    totalFocusSessions: completedSessions.length,
    totalFocusMinutes,
    avgFocusSessionMinutes,
  };

  // ── 11. Focus Session Report ───────────────────────────────────────────────
  const taskLinkedSessions = completedSessions.filter((s) => s.taskId !== null).length;
  const sessionsByDay = Array.from(sessionsByDate.entries())
    .map(([date, data]) => ({ date, sessionCount: data.count, totalMinutes: data.minutes }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const focusSessionReport: FocusSessionReport = {
    totalSessions: focusSessions.length,
    completedSessions: completedSessions.length,
    cancelledSessions: cancelledSessions.length,
    totalFocusMinutes,
    avgSessionMinutes: avgFocusSessionMinutes,
    longestSessionMinutes,
    taskLinkedSessions,
    standaloneSessionsSessions: completedSessions.length - taskLinkedSessions,
    sessionsByDay,
  };

  // ── 12. Goal Report ────────────────────────────────────────────────────────
  const goalReport: GoalReportItem[] = goals.map((g) => {
    const milestoneTotal = g.milestones.length;
    const milestoneCompleted = g.milestones.filter((m) => m.completed).length;

    let progressPercentage = 0;
    if (g.progressType === 'MILESTONES' && milestoneTotal > 0) {
      progressPercentage = Math.round((milestoneCompleted / milestoneTotal) * 100);
    } else if (g.targetValue && g.targetValue > 0) {
      progressPercentage = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
    }

    let daysUntilDeadline: number | null = null;
    let isOverdue = false;
    if (g.targetDate) {
      const targetD = new Date(g.targetDate);
      const todayD = new Date(todayStr);
      const diff = Math.round((targetD.getTime() - todayD.getTime()) / (1000 * 60 * 60 * 24));
      daysUntilDeadline = diff;
      isOverdue = diff < 0 && g.status === 'ACTIVE';
    }

    return {
      id: g.id,
      title: g.title,
      category: g.category,
      status: g.status,
      progressType: g.progressType,
      targetValue: g.targetValue,
      currentValue: g.currentValue,
      progressPercentage,
      targetDate: g.targetDate,
      completedAt: g.completedAt ? g.completedAt.toISOString() : null,
      daysUntilDeadline,
      isOverdue,
      milestoneTotal,
      milestoneCompleted,
    };
  });

  // ── 13. Streak Report ─────────────────────────────────────────────────────
  const consistencyScore = actualDays > 0 ? Math.round((successfulDays / actualDays) * 100) : 0;

  // Compute most/least productive day of week
  const dowEntries = Object.entries(dayOfWeekMap);
  let mostProductiveDOW: string | null = null;
  let leastProductiveDOW: string | null = null;
  let maxAvg = -1;
  let minAvg = Infinity;
  const dayOfWeekBreakdown = dowEntries.map(([day, data]) => {
    const avgMinutes = data.dayCount > 0 ? Math.round(data.totalMinutes / data.dayCount) : 0;
    if (avgMinutes > maxAvg && data.totalMinutes > 0) { maxAvg = avgMinutes; mostProductiveDOW = day; }
    if (data.dayCount > 0 && avgMinutes < minAvg) { minAvg = avgMinutes; leastProductiveDOW = day; }
    return { day, avgMinutes, successCount: data.successCount, totalDays: data.dayCount };
  });

  const streakReport: StreakReport = {
    currentStreak: streak?.currentStreak ?? 0,
    longestStreak: streak?.longestStreak ?? 0,
    successfulStudyDays: streak ? (streak as { successfulStudyDays?: number }).successfulStudyDays ?? successfulDays : successfulDays,
    consistencyScore,
    longestGap,
    streakBreaks,
    mostProductiveDayOfWeek: mostProductiveDOW,
    leastProductiveDayOfWeek: leastProductiveDOW,
    dayOfWeekBreakdown,
  };

  // ── 14. Planned vs Actual (per week) ──────────────────────────────────────
  const plannedVsActual: PlannedVsActualPoint[] = weeklyBreakdown.map((week) => {
    const chunk = dailyTimeSeries.filter((d) =>
      d.date >= week.startDate &&
      d.date <= (weeklyBreakdown[weeklyBreakdown.indexOf(week) + 1]?.startDate
        ? (() => {
            const end = new Date(week.startDate);
            end.setDate(end.getDate() + 6);
            return formatDateIso(end);
          })()
        : week.startDate)
    );
    const totalPlanned = chunk.reduce((s, d) => s + d.targetMinutes, 0);
    const variance = week.studyMinutes - totalPlanned;
    const variancePct = totalPlanned > 0 ? Math.round((variance / totalPlanned) * 100) : 0;
    return {
      weekLabel: week.weekLabel,
      plannedMinutes: totalPlanned,
      actualMinutes: week.studyMinutes,
      variance,
      variancePct,
    };
  });

  // ── 15. Mood Analytics ────────────────────────────────────────────────────
  const moodCounts: Record<string, number> = { GREAT: 0, GOOD: 0, OKAY: 0, DIFFICULT: 0, ROUGH: 0 };
  const moodMinutesMap: Record<string, number[]> = { GREAT: [], GOOD: [], OKAY: [], DIFFICULT: [], ROUGH: [] };
  const dailyMinutesLookup = new Map<string, number>();
  dailyTimeSeries.forEach((ts) => dailyMinutesLookup.set(ts.date, ts.studyMinutes));

  reflections.forEach((r) => {
    const moodVal = (r as unknown as { mood?: string }).mood || 'GOOD';
    if (moodCounts[moodVal] !== undefined) {
      moodCounts[moodVal] += 1;
      moodMinutesMap[moodVal].push(dailyMinutesLookup.get(r.date) || 0);
    }
  });

  const avgMinutesByMood: Record<string, number> = {};
  Object.keys(moodMinutesMap).forEach((m) => {
    const arr = moodMinutesMap[m];
    avgMinutesByMood[m] = arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  });

  // ── 16. Insights (deterministic) ──────────────────────────────────────────
  const insights = generateInsights({
    overview,
    streakReport,
    categoryStats,
    priorityStats,
    goalReport,
    dailyTimeSeries,
    numDays,
    focusSessionReport,
  });

  return {
    range,
    dateRange,
    overview,
    dailyTimeSeries,
    weeklyBreakdown,
    categoryStats,
    priorityStats,
    goalReport,
    streakReport,
    focusSessionReport,
    plannedVsActual,
    insights,
    moodAnalytics: { counts: moodCounts, avgMinutesByMood },
  };
};

// ─── Insights Engine ──────────────────────────────────────────────────────────

function generateInsights(params: {
  overview: ReportOverview;
  streakReport: StreakReport;
  categoryStats: CategoryStat[];
  priorityStats: PriorityStat[];
  goalReport: GoalReportItem[];
  dailyTimeSeries: DailyDataPoint[];
  numDays: number;
  focusSessionReport: FocusSessionReport;
}): StudyInsight[] {
  const insights: StudyInsight[] = [];
  const { overview, streakReport, categoryStats, priorityStats, goalReport, focusSessionReport } = params;

  // Consistency rating
  if (streakReport.consistencyScore >= 80) {
    insights.push({
      type: 'positive',
      title: 'Outstanding Consistency',
      body: `You studied on ${streakReport.consistencyScore}% of all days in this period — that's exceptional dedication!`,
      metric: `${streakReport.consistencyScore}% consistency`,
    });
  } else if (streakReport.consistencyScore >= 50) {
    insights.push({
      type: 'neutral',
      title: 'Moderate Consistency',
      body: `You studied on ${streakReport.consistencyScore}% of days. Aiming for 5 consecutive days can help build a stronger habit.`,
      metric: `${streakReport.consistencyScore}% consistency`,
    });
  } else if (streakReport.consistencyScore > 0) {
    insights.push({
      type: 'warning',
      title: 'Low Study Consistency',
      body: `Only ${streakReport.consistencyScore}% of days had active study time. Try scheduling shorter, daily study blocks to rebuild momentum.`,
      metric: `${streakReport.consistencyScore}% consistency`,
    });
  }

  // Streak status
  if (streakReport.currentStreak >= 7) {
    insights.push({
      type: 'positive',
      title: `${streakReport.currentStreak}-Day Streak! 🔥`,
      body: 'You\'re on a roll! Keep the momentum going by studying again today.',
      metric: `${streakReport.currentStreak} days`,
    });
  } else if (streakReport.currentStreak === 0 && streakReport.longestStreak > 0) {
    insights.push({
      type: 'warning',
      title: 'Streak Lost',
      body: `Your best streak was ${streakReport.longestStreak} days. Start fresh today to begin a new streak!`,
      metric: `Best: ${streakReport.longestStreak} days`,
    });
  }

  // Task completion rate
  if (overview.taskCompletionRate >= 85) {
    insights.push({
      type: 'positive',
      title: 'Excellent Task Completion',
      body: `You completed ${overview.taskCompletionRate}% of your planned tasks — you're highly reliable with your commitments.`,
      metric: `${overview.taskCompletionRate}%`,
    });
  } else if (overview.taskCompletionRate < 50 && overview.totalTasksPlanned > 5) {
    insights.push({
      type: 'warning',
      title: 'Task Completion Needs Attention',
      body: `Only ${overview.taskCompletionRate}% of tasks were completed. Consider reducing your daily task count to a more manageable amount.`,
      metric: `${overview.taskCompletionRate}%`,
    });
  }

  // Productive day of week
  if (streakReport.mostProductiveDayOfWeek) {
    insights.push({
      type: 'info',
      title: `Peak Day: ${streakReport.mostProductiveDayOfWeek}s`,

      body: `Your highest average study minutes tend to occur on ${streakReport.mostProductiveDayOfWeek}s. Consider scheduling your hardest tasks then.`,
      metric: streakReport.mostProductiveDayOfWeek,
    });
  }

  // Top category
  if (categoryStats.length > 0) {
    const top = categoryStats[0];
    const hrs = Math.floor(top.studyMinutes / 60);
    const mins = top.studyMinutes % 60;
    const label = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
    insights.push({
      type: 'info',
      title: `Top Focus Area: ${top.category}`,
      body: `${top.category} received the most attention with ${label} of study time across ${top.taskCount} tasks.`,
      metric: label,
    });
  }

  // High priority task completion
  const highPrio = priorityStats.find((p) => p.priority === 'HIGH');
  if (highPrio && highPrio.totalTasks > 0) {
    if (highPrio.completionRate < 60) {
      insights.push({
        type: 'warning',
        title: 'High-Priority Tasks Lagging',
        body: `Only ${highPrio.completionRate}% of HIGH priority tasks were completed. These deserve priority scheduling.`,
        metric: `${highPrio.completionRate}% completed`,
      });
    } else if (highPrio.completionRate >= 90) {
      insights.push({
        type: 'positive',
        title: 'High-Priority Mastery',
        body: `${highPrio.completionRate}% of your HIGH priority tasks were completed — excellent prioritization!`,
        metric: `${highPrio.completionRate}% completed`,
      });
    }
  }

  // Focus session efficiency
  if (focusSessionReport.completedSessions > 0) {
    if (focusSessionReport.avgSessionMinutes >= 45) {
      insights.push({
        type: 'positive',
        title: 'Deep Focus Sessions',
        body: `Your average focus session is ${focusSessionReport.avgSessionMinutes} minutes — well within the deep work zone.`,
        metric: `${focusSessionReport.avgSessionMinutes} min avg`,
      });
    } else if (focusSessionReport.avgSessionMinutes < 15 && focusSessionReport.completedSessions >= 3) {
      insights.push({
        type: 'warning',
        title: 'Short Focus Sessions',
        body: `Your average focus session is only ${focusSessionReport.avgSessionMinutes} minutes. Try extending to at least 25 minutes for deeper concentration.`,
        metric: `${focusSessionReport.avgSessionMinutes} min avg`,
      });
    }
  }

  // Overdue goals
  const overdueGoals = goalReport.filter((g) => g.isOverdue);
  if (overdueGoals.length > 0) {
    insights.push({
      type: 'warning',
      title: `${overdueGoals.length} Overdue Goal${overdueGoals.length > 1 ? 's' : ''}`,
      body: `${overdueGoals.map((g) => g.title).join(', ')} ${overdueGoals.length === 1 ? 'has' : 'have'} passed their deadline. Consider rescheduling or archiving them.`,
      metric: `${overdueGoals.length} overdue`,
    });
  }

  // Active goals near deadline
  const soonGoals = goalReport.filter(
    (g) => g.status === 'ACTIVE' && g.daysUntilDeadline !== null && g.daysUntilDeadline >= 0 && g.daysUntilDeadline <= 7
  );
  if (soonGoals.length > 0) {
    insights.push({
      type: 'warning',
      title: 'Goals Due This Week',
      body: `${soonGoals.map((g) => g.title).join(', ')} ${soonGoals.length === 1 ? 'is' : 'are'} due within 7 days. Focus your study time accordingly.`,
      metric: `${soonGoals.length} due soon`,
    });
  }

  // Streak gap
  if (streakReport.longestGap >= 7) {
    insights.push({
      type: 'warning',
      title: 'Long Study Gap Detected',
      body: `Your longest break from studying was ${streakReport.longestGap} days. Reducing gaps with even 10-minute review sessions can maintain momentum.`,
      metric: `${streakReport.longestGap} day gap`,
    });
  }

  // Actual vs estimated time analysis
  const overrunCategories = categoryStats.filter(
    (c) => c.actualVsEstimatedRatio > 1.5 && c.studyMinutes > 30
  );
  if (overrunCategories.length > 0) {
    const cat = overrunCategories[0];
    insights.push({
      type: 'info',
      title: `Underestimated: ${cat.category}`,
      body: `Your ${cat.category} tasks took ${Math.round(cat.actualVsEstimatedRatio * 100)}% of their estimated time on average. Try adjusting your estimates for better planning.`,
      metric: `${Math.round(cat.actualVsEstimatedRatio * 100)}% of estimate`,
    });
  }

  // Great data: if no issues, celebrate
  if (insights.filter((i) => i.type === 'warning').length === 0 && overview.totalStudyMinutes > 0) {
    insights.push({
      type: 'positive',
      title: 'Everything Looks Great!',
      body: 'No major issues detected in this period. Keep up the consistent, high-quality study habits.',
    });
  }

  return insights.slice(0, 10); // Cap at 10 insights
}
