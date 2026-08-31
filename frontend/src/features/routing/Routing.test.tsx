import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext.js';
import { ThemeProvider } from '../../context/ThemeContext.js';
import { ProtectedRoute } from '../../components/ProtectedRoute.js';
import { GuestRoute } from '../../components/GuestRoute.js';
import { AppShell } from '../../components/AppShell.js';
import { DashboardPage } from '../dashboard/DashboardPage.js';
import * as api from '../../services/api.js';

// Mock the API client
vi.mock('../../services/api.js', () => {
  return {
    authApi: {
      me: vi.fn(),
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    },
    studyPlanApi: {
      getToday: vi.fn().mockResolvedValue({ success: true, studyPlan: null }),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    studyTaskApi: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    streakApi: {
      get: vi.fn().mockResolvedValue({
        success: true,
        currentStreak: 0,
        longestStreak: 0,
        successfulStudyDays: 0,
        lastActiveDate: null,
      }),
    },
  };
});

const renderTestComponent = (
  initialEntries: string[],
  routes: React.ReactNode,
  userMock: api.User | null = null,
  loadingMock: boolean = false
) => {
  // Setup standard authApi.me mock behavior
  if (loadingMock) {
    vi.mocked(api.authApi.me).mockReturnValue(new Promise(() => {}));
  } else if (userMock) {
    vi.mocked(api.authApi.me).mockResolvedValue({
      success: true,
      user: userMock,
    });
  } else {
    vi.mocked(api.authApi.me).mockRejectedValue(new Error('No session'));
  }

  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>{routes}</Routes>
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

describe('Frontend Routing & AppShell Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ProtectedRoute should redirect unauthenticated user to /login', async () => {
    renderTestComponent(
      ['/app'],
      <>
        <Route path="/login" element={<div>Login Page Target</div>} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <div>Protected Target</div>
            </ProtectedRoute>
          }
        />
      </>
    );

    // Wait for the session load to finish and redirect
    await waitFor(() => {
      expect(screen.getByText('Login Page Target')).toBeInTheDocument();
    });
    expect(screen.queryByText('Protected Target')).not.toBeInTheDocument();
  });

  it('GuestRoute should redirect authenticated user to /app', async () => {
    const user: api.User = {
      id: 'u-1',
      name: 'Tester',
      email: 'test@example.com',
      timezone: 'UTC',
      createdAt: '',
    };

    renderTestComponent(
      ['/login'],
      <>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <div>Guest Target (Login Form)</div>
            </GuestRoute>
          }
        />
        <Route path="/app" element={<div>Dashboard App Area</div>} />
      </>,
      user
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard App Area')).toBeInTheDocument();
    });
    expect(screen.queryByText('Guest Target (Login Form)')).not.toBeInTheDocument();
  });

  it('AppShell should render navigation links and user profile info', async () => {
    const user: api.User = {
      id: 'u-1',
      name: 'Alice',
      email: 'alice@example.com',
      timezone: 'Asia/Kolkata',
      createdAt: '',
    };

    renderTestComponent(
      ['/app'],
      <Route element={<AppShell />}>
        <Route path="/app" element={<div>Dashboard Page Content</div>} />
      </Route>,
      user
    );

    await waitFor(() => {
      expect(screen.getByText('Dashboard Page Content')).toBeInTheDocument();
    });

    // Check App Logo/Brand
    expect(screen.getByText('StudyStreak')).toBeInTheDocument();

    // Check Navigation Links in sidebar
    expect(screen.getByText('🏠 Dashboard')).toBeInTheDocument();
    expect(screen.getByText('📚 Study Planner')).toBeInTheDocument();
    expect(screen.getByText('⚙️ Settings')).toBeInTheDocument();

    // Check Header Profile Trigger displays name
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('DashboardPage should fetch and display streak information', async () => {
    const user: api.User = {
      id: 'u-1',
      name: 'Alice',
      email: 'alice@example.com',
      timezone: 'Asia/Kolkata',
      createdAt: '',
    };

    const streakData: api.StreakInfo = {
      currentStreak: 5,
      longestStreak: 12,
      successfulStudyDays: 19,
      lastActiveDate: '2026-08-30',
    };

    vi.mocked(api.streakApi.get).mockResolvedValue({
      ...streakData,
      success: true,
    });

    renderTestComponent(
      ['/app'],
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />,
      user
    );

    // Welcome message should render
    await waitFor(() => {
      expect(screen.getByText(/Good.*, Alice/i)).toBeInTheDocument();
    });

    // Check API fetch calls
    expect(api.streakApi.get).toHaveBeenCalledTimes(1);

    // Verify streak card numbers are loaded
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('19')).toBeInTheDocument();
  });
});
