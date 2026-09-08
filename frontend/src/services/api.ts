const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : 'http://localhost:5000/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include', // Crucial for HTTP-only cookies transmission
  });

  if (!response.ok) {
    let message = 'An error occurred';
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      // JSON parsing failed, keep default message
    }
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  timezone: string;
  createdAt: string;
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export type Status =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'PARTIALLY_COMPLETED'
  | 'NOT_COMPLETED'
  | 'REST_DAY'
  | 'MISSED';

export interface StudyTask {
  id: string;
  studyPlanId: string;
  goalId?: string | null;
  title: string;
  description?: string;
  category: string;
  priority: Priority;
  estimatedDuration: number;
  actualDuration: number;
  order: number;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type GoalProgressType = 'TASKS' | 'FOCUS_TIME' | 'MILESTONES' | 'MANUAL';

export interface GoalMilestone {
  id: string;
  goalId: string;
  title: string;
  description?: string | null;
  order: number;
  completed: boolean;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudyGoal {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  category?: string | null;
  targetDate?: string | null;
  status: GoalStatus;
  progressType: GoalProgressType;
  targetValue?: number | null;
  currentValue: number;
  progressPercentage: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  tasks?: StudyTask[];
  milestones?: GoalMilestone[];
}

export interface StudyPlan {
  id: string;
  userId: string;
  date: string;
  title?: string;
  description?: string;
  minimumStudyTarget: number;
  status: Status;
  tasks?: StudyTask[];
  createdAt: string;
  updatedAt: string;
}

export const authApi = {
  register: (name: string, email: string, password: string, timezone?: string) => {
    return request<{ success: boolean; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, timezone }),
    });
  },
  login: (email: string, password: string) => {
    return request<{ success: boolean; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  logout: () => {
    return request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    });
  },
  me: () => {
    return request<{ success: boolean; user: User }>('/auth/me', {
      method: 'GET',
    });
  },
};

export const studyPlanApi = {
  create: (data: { date: string; title?: string; description?: string; minimumStudyTarget?: number; status?: Status }) => {
    return request<{ success: boolean; studyPlan: StudyPlan }>('/study-plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getToday: () => {
    return request<{ success: boolean; studyPlan: StudyPlan | null }>('/study-plans/today', {
      method: 'GET',
    });
  },
  getRange: (startDate: string, endDate: string) => {
    return request<{ success: boolean; studyPlans: StudyPlan[] }>(`/study-plans?startDate=${startDate}&endDate=${endDate}`, {
      method: 'GET',
    });
  },
  getById: (id: string) => {
    return request<{ success: boolean; studyPlan: StudyPlan }>(`/study-plans/${id}`, {
      method: 'GET',
    });
  },
  update: (id: string, data: { title?: string; description?: string; minimumStudyTarget?: number; status?: Status }) => {
    return request<{ success: boolean; studyPlan: StudyPlan }>(`/study-plans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: (id: string) => {
    return request<{ success: boolean; message: string }>(`/study-plans/${id}`, {
      method: 'DELETE',
    });
  },
};

export const studyTaskApi = {
  create: (planId: string, data: { title: string; description?: string; category: string; priority: Priority; estimatedDuration: number; goalId?: string | null }) => {
    return request<{ success: boolean; studyTask: StudyTask }>(`/study-plans/${planId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: (id: string, data: { title?: string; description?: string; category?: string; priority?: Priority; estimatedDuration?: number; actualDuration?: number; status?: Status; goalId?: string | null }) => {
    return request<{ success: boolean; studyTask: StudyTask }>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  delete: (id: string) => {
    return request<{ success: boolean; message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  },
  reorder: (planId: string, orderedTaskIds: string[]) => {
    return request<{ success: boolean; message: string }>(`/study-plans/${planId}/tasks/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ orderedTaskIds }),
    });
  },
};

export const goalApi = {
  list: (filter?: { status?: GoalStatus; category?: string; targetDate?: string }) => {
    const query = new URLSearchParams();
    if (filter?.status) query.append('status', filter.status);
    if (filter?.category) query.append('category', filter.category);
    if (filter?.targetDate) query.append('targetDate', filter.targetDate);
    const queryString = query.toString();
    const url = queryString ? `/goals?${queryString}` : '/goals';
    return request<{ success: boolean; goals: StudyGoal[] }>(url, {
      method: 'GET',
    });
  },
  getById: (id: string) => {
    return request<{ success: boolean; goal: StudyGoal }>(`/goals/${id}`, {
      method: 'GET',
    });
  },
  create: (data: {
    title: string;
    description?: string | null;
    category?: string | null;
    targetDate?: string | null;
    progressType: GoalProgressType;
    targetValue?: number | null;
    milestones?: Array<{ title: string; description?: string | null }>;
  }) => {
    return request<{ success: boolean; message: string; goal: StudyGoal }>('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: (
    id: string,
    data: {
      title?: string;
      description?: string | null;
      category?: string | null;
      targetDate?: string | null;
      progressType?: GoalProgressType;
      targetValue?: number | null;
    }
  ) => {
    return request<{ success: boolean; message: string; goal: StudyGoal }>(`/goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  updateManualProgress: (id: string, currentValue: number) => {
    return request<{ success: boolean; message: string; goal: StudyGoal }>(`/goals/${id}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ currentValue }),
    });
  },
  complete: (id: string) => {
    return request<{ success: boolean; message: string; goal: StudyGoal }>(`/goals/${id}/complete`, {
      method: 'POST',
    });
  },
  archive: (id: string) => {
    return request<{ success: boolean; message: string; goal: StudyGoal }>(`/goals/${id}/archive`, {
      method: 'POST',
    });
  },
  unarchive: (id: string) => {
    return request<{ success: boolean; message: string; goal: StudyGoal }>(`/goals/${id}/unarchive`, {
      method: 'POST',
    });
  },
  delete: (id: string) => {
    return request<{ success: boolean; message: string }>(`/goals/${id}`, {
      method: 'DELETE',
    });
  },
  addMilestone: (goalId: string, data: { title: string; description?: string | null }) => {
    return request<{ success: boolean; message: string; milestone: GoalMilestone }>(`/goals/${goalId}/milestones`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateMilestone: (
    goalId: string,
    milestoneId: string,
    data: { title?: string; description?: string | null; completed?: boolean }
  ) => {
    return request<{ success: boolean; message: string; milestone: GoalMilestone }>(
      `/goals/${goalId}/milestones/${milestoneId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  },
  deleteMilestone: (goalId: string, milestoneId: string) => {
    return request<{ success: boolean; message: string }>(`/goals/${goalId}/milestones/${milestoneId}`, {
      method: 'DELETE',
    });
  },
};

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  successfulStudyDays: number;
  lastActiveDate: string | null;
}

export const streakApi = {
  get: () => {
    return request<StreakInfo & { success: boolean }>('/streak', {
      method: 'GET',
    });
  },
};

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
    completionRate: number;
    avgStudyMinutesPerDay: number;
    avgStudyMinutesPerSuccessfulDay: number;
  };
  dailyTimeSeries: Array<{
    date: string;
    dayOfWeek: string;
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

export const analyticsApi = {
  get: (range: string = '30d') => {
    return request<{ success: boolean; analytics: AnalyticsSummary }>(`/analytics?range=${range}`, {
      method: 'GET',
    });
  },
};

export interface AchievementItem {
  id?: string;
  code: string;
  title: string;
  description: string;
  category: string;
  conditionType: string;
  threshold: number;
  icon: string;
  progress: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export const achievementApi = {
  getAll: () => {
    return request<{ success: boolean; achievements: AchievementItem[] }>('/achievements', {
      method: 'GET',
    });
  },
  getUnlocked: () => {
    return request<{ success: boolean; achievements: AchievementItem[] }>('/achievements/unlocked', {
      method: 'GET',
    });
  },
};

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  id?: string;
  userId?: string;
  studyRemindersEnabled: boolean;
  reflectionRemindersEnabled: boolean;
  achievementNotificationsEnabled: boolean;
  streakNotificationsEnabled: boolean;
  dailyReminderTime: string;
  timezone: string;
}

export const notificationApi = {
  getAll: () => {
    return request<{ success: boolean; notifications: NotificationItem[] }>('/notifications', {
      method: 'GET',
    });
  },
  getUnreadCount: () => {
    return request<{ success: boolean; count: number }>('/notifications/unread-count', {
      method: 'GET',
    });
  },
  markAsRead: (id: string) => {
    return request<{ success: boolean; notification: NotificationItem }>(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  },
  markAllAsRead: () => {
    return request<{ success: boolean; message: string }>('/notifications/read-all', {
      method: 'PUT',
    });
  },
  getPreferences: () => {
    return request<{ success: boolean; preferences: NotificationPreference }>('/notifications/preferences', {
      method: 'GET',
    });
  },
  updatePreferences: (data: Partial<NotificationPreference>) => {
    return request<{ success: boolean; preferences: NotificationPreference }>('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

export type FocusSessionStatus = 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export interface FocusSession {
  id: string;
  userId: string;
  taskId?: string | null;
  task?: StudyTask | null;
  startedAt: string;
  endedAt?: string | null;
  durationSeconds: number;
  pausedAt?: string | null;
  totalPausedSeconds: number;
  status: FocusSessionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FocusStats {
  totalFocusSeconds: number;
  todayFocusSeconds: number;
  thisWeekFocusSeconds: number;
  completedSessionsCount: number;
  avgSessionSeconds: number;
}

export const focusSessionApi = {
  start: (taskId?: string) => {
    return request<{ success: boolean; message: string; session: FocusSession }>('/focus-sessions', {
      method: 'POST',
      body: JSON.stringify({ taskId }),
    });
  },
  getActive: () => {
    return request<{ success: boolean; activeSession: FocusSession | null }>('/focus-sessions/active', {
      method: 'GET',
    });
  },
  pause: (id: string) => {
    return request<{ success: boolean; message: string; session: FocusSession }>(`/focus-sessions/${id}/pause`, {
      method: 'POST',
    });
  },
  resume: (id: string) => {
    return request<{ success: boolean; message: string; session: FocusSession }>(`/focus-sessions/${id}/resume`, {
      method: 'POST',
    });
  },
  complete: (id: string, groupGoalId?: string) => {
    return request<{ success: boolean; message: string; session: FocusSession }>(`/focus-sessions/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ groupGoalId }),
    });
  },
  cancel: (id: string) => {
    return request<{ success: boolean; message: string; session: FocusSession }>(`/focus-sessions/${id}/cancel`, {
      method: 'POST',
    });
  },
  getStats: () => {
    return request<{ success: boolean; stats: FocusStats }>('/focus-sessions/stats', {
      method: 'GET',
    });
  },
  list: (params?: { page?: number; limit?: number; status?: FocusSessionStatus; taskId?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.status) query.append('status', params.status);
    if (params?.taskId) query.append('taskId', params.taskId);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);

    const queryString = query.toString();
    const url = queryString ? `/focus-sessions?${queryString}` : '/focus-sessions';
    return request<{
      success: boolean;
      sessions: FocusSession[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(url, {
      method: 'GET',
    });
  },
  getById: (id: string) => {
    return request<{ success: boolean; session: FocusSession }>(`/focus-sessions/${id}`, {
      method: 'GET',
    });
  },
};

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  timezone: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserPreferences {
  id?: string;
  userId?: string;
  dailyStudyGoalMinutes: number;
  preferredStudyDays: string[];
  preferredStudyStartTime: string;
  preferredStudyEndTime: string;
  defaultFocusDurationMinutes: number;
  defaultBreakDurationMinutes: number;
  longBreakDurationMinutes: number;
  autoStartBreak: boolean;
  weekStartsOn: 'Monday' | 'Sunday';
  createdAt?: string;
  updatedAt?: string;
}

export const profileApi = {
  get: () => {
    return request<{ success: boolean; profile: UserProfile }>('/profile', {
      method: 'GET',
    });
  },
  update: (data: { displayName?: string; timezone?: string; avatarUrl?: string | null }) => {
    return request<{ success: boolean; message: string; profile: UserProfile }>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

export const preferencesApi = {
  get: () => {
    return request<{ success: boolean; preferences: UserPreferences }>('/preferences', {
      method: 'GET',
    });
  },
  update: (data: Partial<UserPreferences>) => {
    return request<{ success: boolean; message: string; preferences: UserPreferences }>('/preferences', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

export type WorkloadStatus = 'Light' | 'Moderate' | 'Heavy' | 'Overloaded';

export interface PlannerDayTask {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  priority: Priority;
  status: Status;
  estimatedDuration: number;
  actualDuration: number;
  order: number;
  goalId?: string | null;
  goalTitle?: string | null;
  goalTargetDate?: string | null;
}

export interface PlannerDaySummary {
  date: string;
  dayName: string;
  isToday?: boolean;
  planId?: string | null;
  title?: string | null;
  status?: Status;
  plannedMinutes: number;
  actualFocusMinutes: number;
  remainingCapacityMinutes: number;
  dailyGoalMinutes: number;
  workloadStatus: WorkloadStatus;
  isOverloaded: boolean;
  taskCount: number;
  completedTaskCount: number;
  tasks: PlannerDayTask[];
}

export interface PlannerWeeklyResponse {
  success: boolean;
  data: {
    startDate: string;
    endDate: string;
    localToday: string;
    dailyGoalMinutes: number;
    weeklySummary: {
      totalPlannedMinutes: number;
      totalActualFocusMinutes: number;
      totalTasks: number;
      totalCompletedTasks: number;
      completionRate: number;
    };
    days: PlannerDaySummary[];
  };
}

export interface OverdueTask {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  priority: Priority;
  status: Status;
  estimatedDuration: number;
  actualDuration: number;
  plannedDate: string;
  goalId?: string | null;
  goalTitle?: string | null;
  goalTargetDate?: string | null;
}

export interface OverdueResponse {
  success: boolean;
  data: {
    localToday: string;
    count: number;
    tasks: OverdueTask[];
  };
}

export interface CandidateRecommendation {
  date: string;
  dayName: string;
  remainingCapacity: number;
  reason: string;
  matchesPreferredDay: boolean;
  withinGoalTargetDate: boolean;
}

export interface RecommendationResponse {
  success: boolean;
  data: {
    taskId: string;
    taskTitle: string;
    taskPriority: Priority;
    estimatedDuration: number;
    goalId?: string | null;
    goalTitle?: string | null;
    goalTargetDate?: string | null;
    recommendedDate: string;
    recommendedDayName: string;
    reason: string;
    remainingCapacityMinutes: number;
    dailyGoalMinutes: number;
    candidates: CandidateRecommendation[];
  };
}

export const plannerApi = {
  getWeek: (startDate?: string) => {
    const query = startDate ? `?startDate=${startDate}` : '';
    return request<PlannerWeeklyResponse>(`/planner/week${query}`, { method: 'GET' });
  },
  getDay: (date?: string) => {
    const query = date ? `?date=${date}` : '';
    return request<{ success: boolean; data: PlannerDaySummary }>(`/planner/day${query}`, { method: 'GET' });
  },
  getOverdue: () => {
    return request<OverdueResponse>('/planner/overdue', { method: 'GET' });
  },
  getRecommendation: (taskId: string) => {
    return request<RecommendationResponse>(`/planner/recommendations?taskId=${taskId}`, { method: 'GET' });
  },
  scheduleTask: (taskId: string, date: string, estimatedDuration?: number) => {
    return request<{ success: boolean; message: string; task: StudyTask }>(`/planner/tasks/${taskId}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ taskId, date, estimatedDuration }),
    });
  },
  rescheduleTask: (taskId: string, targetDate: string, estimatedDuration?: number) => {
    return request<{ success: boolean; message: string; task: StudyTask }>(`/planner/tasks/${taskId}/reschedule`, {
      method: 'POST',
      body: JSON.stringify({ targetDate, estimatedDuration }),
    });
  },
  getAnalytics: () => {
    return request<{ success: boolean; data: Record<string, unknown> }>('/planner/analytics', { method: 'GET' });
  },
};

// ─── Study Groups ─────────────────────────────────────────────────────────────

export type GroupMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type StudyGroupStatus = 'ACTIVE' | 'ARCHIVED';
export type GroupGoalStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

export interface GroupMemberSummary {
  id: string;
  name: string;
  role: GroupMemberRole;
  joinedAt?: string;
  hasActivityToday: boolean;
}

export interface GroupGoalSummary {
  id: string;
  title: string;
  description?: string | null;
  targetMinutes: number;
  currentMinutes: number;
  progressPct: number;
  status: GroupGoalStatus;
  createdAt?: string;
  completedAt?: string | null;
}

export interface GroupStreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate?: string | null;
}

export interface StudyGroupListItem {
  id: string;
  name: string;
  description?: string | null;
  status: StudyGroupStatus;
  maxMembers: number;
  memberCount: number;
  userRole: GroupMemberRole;
  inviteCode: string;
  activeGoals: GroupGoalSummary[];
  streak: GroupStreakInfo;
  createdAt: string;
  joinedAt: string;
}

export interface StudyGroupDetail {
  id: string;
  name: string;
  description?: string | null;
  inviteCode: string;
  maxMembers: number;
  status: StudyGroupStatus;
  ownerId: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  members: GroupMemberSummary[];
  goals: GroupGoalSummary[];
  streak: GroupStreakInfo;
}

export interface GroupLeaderboardItem {
  name: string;
  weeklyMinutes: number;
}

export interface GroupProgressData {
  memberCount: number;
  activeTodayCount: number;
  members: GroupMemberSummary[];
  goals: GroupGoalSummary[];
  streak: GroupStreakInfo;
  leaderboard: GroupLeaderboardItem[];
}

export const groupsApi = {
  create: (data: { name: string; description?: string; maxMembers?: number }) => {
    return request<{ success: boolean; group: StudyGroupDetail; memberCount: number }>('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getUserGroups: () => {
    return request<{ success: boolean; groups: StudyGroupListItem[] }>('/groups', {
      method: 'GET',
    });
  },
  getById: (id: string) => {
    return request<{ success: boolean; group: StudyGroupDetail }>(`/groups/${id}`, {
      method: 'GET',
    });
  },
  update: (id: string, data: { name?: string; description?: string | null; maxMembers?: number }) => {
    return request<{ success: boolean; group: StudyGroupDetail }>(`/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  archive: (id: string) => {
    return request<{ success: boolean; group: StudyGroupDetail }>(`/groups/${id}`, {
      method: 'DELETE',
    });
  },
  regenerateInviteCode: (id: string) => {
    return request<{ success: boolean; inviteCode: string }>(`/groups/${id}/regenerate-invite`, {
      method: 'POST',
    });
  },
  join: (inviteCode: string) => {
    return request<{ success: boolean; group: StudyGroupListItem; membership: any }>('/groups/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    });
  },
  leave: (id: string) => {
    return request<{ success: boolean }>(`/groups/${id}/leave`, {
      method: 'POST',
    });
  },
  transferOwnership: (id: string, newOwnerId: string) => {
    return request<{ success: boolean }>(`/groups/${id}/transfer-ownership`, {
      method: 'POST',
      body: JSON.stringify({ newOwnerId }),
    });
  },
  getMembers: (id: string) => {
    return request<{ success: boolean; members: GroupMemberSummary[] }>(`/groups/${id}/members`, {
      method: 'GET',
    });
  },
  updateMemberRole: (id: string, userId: string, role: 'ADMIN' | 'MEMBER') => {
    return request<{ success: boolean; member: any }>(`/groups/${id}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },
  removeMember: (id: string, userId: string) => {
    return request<{ success: boolean }>(`/groups/${id}/members/${userId}`, {
      method: 'DELETE',
    });
  },
  createGoal: (id: string, data: { title: string; description?: string; targetMinutes: number }) => {
    return request<{ success: boolean; goal: GroupGoalSummary }>(`/groups/${id}/goals`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  getProgress: (id: string) => {
    return request<{ success: boolean; progress: GroupProgressData }>(`/groups/${id}/progress`, {
      method: 'GET',
    });
  },
};


// ─── Reports ──────────────────────────────────────────────────────────────────

export type ReportRange = '7d' | '30d' | '90d' | 'all' | 'custom';
export type ExportFormat = 'json' | 'csv';
export type ExportDataset = 'tasks' | 'focus_sessions' | 'study_history' | 'goals' | 'all';

export interface ReportDateRange {
  startDate: string;
  endDate: string;
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
  dayCompletionRate: number;
  totalFocusSessions: number;
  totalFocusMinutes: number;
  avgFocusSessionMinutes: number;
}

export interface ReportDailyPoint {
  date: string;
  dayOfWeek: string;
  studyMinutes: number;
  targetMinutes: number;
  focusMinutes: number;
  tasksCompleted: number;
  totalTasks: number;
  status: string;
}

export interface ReportWeeklyPoint {
  weekLabel: string;
  startDate: string;
  studyMinutes: number;
  focusMinutes: number;
  tasksCompleted: number;
  plannedTasks: number;
  completionRate: number;
  successfulDays: number;
}

export interface ReportCategoryStat {
  category: string;
  studyMinutes: number;
  taskCount: number;
  completedCount: number;
  completionRate: number;
  estimatedMinutes: number;
  actualVsEstimatedRatio: number;
}

export interface ReportPriorityStat {
  priority: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  totalEstimatedMinutes: number;
  totalActualMinutes: number;
}

export interface ReportGoalItem {
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

export interface ReportStreakData {
  currentStreak: number;
  longestStreak: number;
  successfulStudyDays: number;
  consistencyScore: number;
  longestGap: number;
  streakBreaks: number;
  mostProductiveDayOfWeek: string | null;
  leastProductiveDayOfWeek: string | null;
  dayOfWeekBreakdown: Array<{
    day: string;
    avgMinutes: number;
    successCount: number;
    totalDays: number;
  }>;
}

export interface ReportFocusSessionData {
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

export interface ReportInsight {
  type: 'positive' | 'warning' | 'neutral' | 'info';
  title: string;
  body: string;
  metric?: string | number;
}

export interface PlannedVsActualPoint {
  weekLabel: string;
  plannedMinutes: number;
  actualMinutes: number;
  variance: number;
  variancePct: number;
}

export interface ReportData {
  range: string;
  dateRange: ReportDateRange;
  overview: ReportOverview;
  dailyTimeSeries: ReportDailyPoint[];
  weeklyBreakdown: ReportWeeklyPoint[];
  categoryStats: ReportCategoryStat[];
  priorityStats: ReportPriorityStat[];
  goalReport: ReportGoalItem[];
  streakReport: ReportStreakData;
  focusSessionReport: ReportFocusSessionData;
  plannedVsActual: PlannedVsActualPoint[];
  insights: ReportInsight[];
  moodAnalytics: {
    counts: Record<string, number>;
    avgMinutesByMood: Record<string, number>;
  };
}

export const reportsApi = {
  get: (params: {
    range?: ReportRange;
    startDate?: string;
    endDate?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.range) query.append('range', params.range);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    const qs = query.toString();
    return request<{ success: boolean; report: ReportData }>(`/reports${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },

  // Returns a blob URL suitable for triggering a file download
  getExportUrl: (params: {
    format: ExportFormat;
    dataset: ExportDataset;
    range?: ReportRange;
    startDate?: string;
    endDate?: string;
  }): string => {
    const query = new URLSearchParams();
    query.append('format', params.format);
    query.append('dataset', params.dataset);
    if (params.range) query.append('range', params.range);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    return `${API_BASE}/reports/export?${query.toString()}`;
  },

  // Trigger an authenticated download by fetching as blob
  downloadExport: async (params: {
    format: ExportFormat;
    dataset: ExportDataset;
    range?: ReportRange;
    startDate?: string;
    endDate?: string;
  }): Promise<void> => {
    const query = new URLSearchParams();
    query.append('format', params.format);
    query.append('dataset', params.dataset);
    if (params.range) query.append('range', params.range);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);

    const url = `${API_BASE}/reports/export?${query.toString()}`;
    const response = await fetch(url, { method: 'GET', credentials: 'include' });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || 'Export failed');
    }

    const disposition = response.headers.get('Content-Disposition') || '';
    const filenameMatch = disposition.match(/filename="([^"]+)"/);
    const filename = filenameMatch ? filenameMatch[1] : `studystreak-export.${params.format}`;

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  },
};
