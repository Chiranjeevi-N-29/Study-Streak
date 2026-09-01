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
  create: (planId: string, data: { title: string; description?: string; category: string; priority: Priority; estimatedDuration: number }) => {
    return request<{ success: boolean; studyTask: StudyTask }>(`/study-plans/${planId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update: (id: string, data: { title?: string; description?: string; category?: string; priority?: Priority; estimatedDuration?: number; actualDuration?: number; status?: Status }) => {
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
