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
