const API_BASE = 'http://localhost:5000/api';

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
