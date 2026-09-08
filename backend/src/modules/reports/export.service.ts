import { prisma } from '../../config/db.js';
import { resolveDateRange } from './reports.service.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function arrayToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const escapeCell = (v: unknown): string => {
    const str = v === null || v === undefined ? '' : String(v);
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };
  const headerRow = headers.map(escapeCell).join(',');
  const dataRows = rows.map((row) => headers.map((h) => escapeCell(row[h])).join(','));
  return [headerRow, ...dataRows].join('\r\n');
}

// ─── Dataset fetchers ─────────────────────────────────────────────────────────

async function exportTasks(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  const plans = await prisma.studyPlan.findMany({
    where: { userId, date: { gte: startDate, lte: endDate } },
    include: { tasks: true },
    orderBy: { date: 'asc' },
  });

  const rows: Record<string, unknown>[] = [];
  for (const plan of plans) {
    for (const task of plan.tasks) {
      rows.push({
        plan_date: plan.date,
        plan_status: plan.status,
        task_id: task.id,
        title: task.title,
        description: task.description ?? '',
        category: task.category,
        priority: task.priority,
        status: task.status,
        estimated_duration_minutes: task.estimatedDuration,
        actual_duration_minutes: task.actualDuration,
        goal_id: task.goalId ?? '',
        created_at: task.createdAt.toISOString(),
        updated_at: task.updatedAt.toISOString(),
      });
    }
  }

  const headers = [
    'plan_date', 'plan_status', 'task_id', 'title', 'description', 'category',
    'priority', 'status', 'estimated_duration_minutes', 'actual_duration_minutes',
    'goal_id', 'created_at', 'updated_at',
  ];

  return { headers, rows };
}

async function exportFocusSessions(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  const sessions = await prisma.focusSession.findMany({
    where: {
      userId,
      startedAt: { gte: new Date(startDate), lte: new Date(`${endDate}T23:59:59Z`) },
    },
    include: {
      task: { select: { title: true, category: true } },
    },
    orderBy: { startedAt: 'asc' },
  });

  const rows = sessions.map((s) => ({
    session_id: s.id,
    date: formatDateIso(s.startedAt),
    started_at: s.startedAt.toISOString(),
    ended_at: s.endedAt?.toISOString() ?? '',
    duration_minutes: Math.round(s.durationSeconds / 60),
    duration_seconds: s.durationSeconds,
    total_paused_seconds: s.totalPausedSeconds,
    status: s.status,
    task_id: s.taskId ?? '',
    task_title: s.task?.title ?? '',
    task_category: s.task?.category ?? '',
    created_at: s.createdAt.toISOString(),
  }));

  const headers = [
    'session_id', 'date', 'started_at', 'ended_at',
    'duration_minutes', 'duration_seconds', 'total_paused_seconds',
    'status', 'task_id', 'task_title', 'task_category', 'created_at',
  ];

  return { headers, rows };
}

async function exportStudyHistory(
  userId: string,
  startDate: string,
  endDate: string
): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  const plans = await prisma.studyPlan.findMany({
    where: { userId, date: { gte: startDate, lte: endDate } },
    include: { tasks: true },
    orderBy: { date: 'asc' },
  });

  const reflectionMap = new Map<string, string>();
  const reflections = await prisma.dailyReflection.findMany({
    where: { userId, date: { gte: startDate, lte: endDate } },
    select: { date: true, learned: true },
  });
  reflections.forEach((r) => reflectionMap.set(r.date, r.learned));

  const rows = plans.map((p) => {
    const totalActual = p.tasks.reduce((s, t) => s + (t.actualDuration || 0), 0);
    const completedCount = p.tasks.filter((t) => t.status === 'COMPLETED').length;
    return {
      date: p.date,
      title: p.title ?? '',
      plan_status: p.status,
      minimum_study_target_minutes: p.minimumStudyTarget,
      total_actual_minutes: totalActual,
      tasks_planned: p.tasks.length,
      tasks_completed: completedCount,
      completion_rate:
        p.tasks.length > 0 ? Math.round((completedCount / p.tasks.length) * 100) : 0,
      reflection_summary: reflectionMap.get(p.date) ?? '',
    };
  });

  const headers = [
    'date', 'title', 'plan_status', 'minimum_study_target_minutes',
    'total_actual_minutes', 'tasks_planned', 'tasks_completed',
    'completion_rate', 'reflection_summary',
  ];

  return { headers, rows };
}

async function exportGoals(
  userId: string
): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  const goals = await prisma.studyGoal.findMany({
    where: { userId },
    include: { milestones: { select: { title: true, completed: true, completedAt: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const rows = goals.map((g) => {
    const milestoneTotal = g.milestones.length;
    const milestoneCompleted = g.milestones.filter((m) => m.completed).length;
    let progressPct = 0;
    if (g.progressType === 'MILESTONES' && milestoneTotal > 0) {
      progressPct = Math.round((milestoneCompleted / milestoneTotal) * 100);
    } else if (g.targetValue && g.targetValue > 0) {
      progressPct = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
    }

    return {
      goal_id: g.id,
      title: g.title,
      description: g.description ?? '',
      category: g.category ?? '',
      status: g.status,
      progress_type: g.progressType,
      target_value: g.targetValue ?? '',
      current_value: g.currentValue,
      progress_percentage: progressPct,
      target_date: g.targetDate ?? '',
      completed_at: g.completedAt?.toISOString() ?? '',
      milestones_total: milestoneTotal,
      milestones_completed: milestoneCompleted,
      created_at: g.createdAt.toISOString(),
    };
  });

  const headers = [
    'goal_id', 'title', 'description', 'category', 'status', 'progress_type',
    'target_value', 'current_value', 'progress_percentage', 'target_date',
    'completed_at', 'milestones_total', 'milestones_completed', 'created_at',
  ];

  return { headers, rows };
}

// ─── Main export function ─────────────────────────────────────────────────────

export interface ExportResult {
  filename: string;
  contentType: string;
  content: string;
}

export const buildExport = async (
  userId: string,
  format: 'json' | 'csv',
  dataset: 'tasks' | 'focus_sessions' | 'study_history' | 'goals' | 'all',
  range: string,
  startDate?: string,
  endDate?: string
): Promise<ExportResult> => {
  const dateRange = resolveDateRange(range, startDate, endDate);
  const { startDate: cutoff, endDate: end } = dateRange;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safeDataset = dataset.replace('_', '-');

  if (format === 'csv') {
    // CSV only supports single dataset at a time
    if (dataset === 'all') {
      throw new Error('CSV export requires a specific dataset. Use format=json for "all" datasets.');
    }

    let result: { headers: string[]; rows: Record<string, unknown>[] };
    if (dataset === 'tasks') result = await exportTasks(userId, cutoff, end);
    else if (dataset === 'focus_sessions') result = await exportFocusSessions(userId, cutoff, end);
    else if (dataset === 'study_history') result = await exportStudyHistory(userId, cutoff, end);
    else result = await exportGoals(userId);

    return {
      filename: `studystreak-${safeDataset}-${timestamp}.csv`,
      contentType: 'text/csv',
      content: arrayToCsv(result.headers, result.rows),
    };
  }

  // JSON format — can be single or all
  type ExportPayload = {
    exportedAt: string;
    userId: string;
    dateRange: typeof dateRange;
    tasks?: Record<string, unknown>[];
    focus_sessions?: Record<string, unknown>[];
    study_history?: Record<string, unknown>[];
    goals?: Record<string, unknown>[];
  };

  const payload: ExportPayload = {
    exportedAt: new Date().toISOString(),
    userId,
    dateRange,
  };

  if (dataset === 'tasks' || dataset === 'all') {
    const d = await exportTasks(userId, cutoff, end);
    payload.tasks = d.rows;
  }
  if (dataset === 'focus_sessions' || dataset === 'all') {
    const d = await exportFocusSessions(userId, cutoff, end);
    payload.focus_sessions = d.rows;
  }
  if (dataset === 'study_history' || dataset === 'all') {
    const d = await exportStudyHistory(userId, cutoff, end);
    payload.study_history = d.rows;
  }
  if (dataset === 'goals' || dataset === 'all') {
    const d = await exportGoals(userId);
    payload.goals = d.rows;
  }

  return {
    filename: `studystreak-${safeDataset}-${timestamp}.json`,
    contentType: 'application/json',
    content: JSON.stringify(payload, null, 2),
  };
};
