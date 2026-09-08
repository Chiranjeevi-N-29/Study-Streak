import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext.js';
import { ThemeProvider } from '../../context/ThemeContext.js';
import { FocusPage } from './FocusPage.js';
import * as api from '../../services/api.js';

// Mock API client
vi.mock('../../services/api.js', () => {
  return {
    authApi: {
      me: vi.fn().mockResolvedValue({
        success: true,
        user: { id: 'u-1', name: 'Alice', email: 'alice@example.com', timezone: 'UTC' },
      }),
    },
    studyPlanApi: {
      getToday: vi.fn().mockResolvedValue({
        success: true,
        studyPlan: {
          id: 'plan-1',
          tasks: [
            {
              id: 'task-1',
              title: 'Learn React Hooks',
              category: 'Frontend',
              estimatedDuration: 30,
              actualDuration: 0,
            },
          ],
        },
      }),
    },
    focusSessionApi: {
      getStats: vi.fn(),
      list: vi.fn(),
      getActive: vi.fn(),
      start: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      complete: vi.fn(),
      cancel: vi.fn(),
    },
    preferencesApi: {
      get: vi.fn().mockResolvedValue({
        success: true,
        preferences: {
          defaultFocusDurationMinutes: 25,
          defaultBreakDurationMinutes: 5,
          longBreakDurationMinutes: 15,
          autoStartBreak: false,
        },
      }),
      update: vi.fn(),
    },
  };
});


const mockStats: api.FocusStats = {
  totalFocusSeconds: 3600,
  todayFocusSeconds: 1800,
  thisWeekFocusSeconds: 3600,
  completedSessionsCount: 2,
  avgSessionSeconds: 1800,
};

const mockSessionHistory: api.FocusSession[] = [
  {
    id: 's-1',
    userId: 'u-1',
    taskId: 'task-1',
    task: {
      id: 'task-1',
      studyPlanId: 'p-1',
      title: 'Learn React Hooks',
      category: 'Frontend',
      priority: 'HIGH',
      estimatedDuration: 30,
      actualDuration: 30,
      order: 0,
      status: 'COMPLETED',
      createdAt: '2026-09-08T10:00:00Z',
      updatedAt: '2026-09-08T10:30:00Z',
    },
    startedAt: '2026-09-08T10:00:00Z',
    endedAt: '2026-09-08T10:30:00Z',
    durationSeconds: 1800,
    totalPausedSeconds: 0,
    status: 'COMPLETED',
    createdAt: '2026-09-08T10:00:00Z',
    updatedAt: '2026-09-08T10:30:00Z',
  },
];

const renderFocusPage = () => {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter>
          <FocusPage />
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

describe('FocusPage Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.focusSessionApi.getStats).mockResolvedValue({
      success: true,
      stats: mockStats,
    });
    vi.mocked(api.focusSessionApi.list).mockResolvedValue({
      success: true,
      sessions: mockSessionHistory,
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
    vi.mocked(api.focusSessionApi.getActive).mockResolvedValue({
      success: true,
      activeSession: null,
    });
  });

  it('should render page heading, stats cards, and timer widget', async () => {
    renderFocusPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Focus Sessions/i })).toBeInTheDocument();
      expect(screen.getByText("Today's Focus Time")).toBeInTheDocument();
      expect(screen.getAllByText('30m').length).toBeGreaterThan(0);
      expect(screen.getByText('🚀 Start Focus Session')).toBeInTheDocument();
      expect(screen.getByText('Learn React Hooks')).toBeInTheDocument();
    });
  });

  it('should start focus session on clicking Start Focus Session', async () => {
    vi.mocked(api.focusSessionApi.start).mockResolvedValue({
      success: true,
      message: 'Focus session started',
      session: {
        id: 's-new',
        userId: 'u-1',
        startedAt: new Date().toISOString(),
        durationSeconds: 0,
        totalPausedSeconds: 0,
        status: 'RUNNING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    renderFocusPage();

    await waitFor(() => {
      expect(screen.getByText('🚀 Start Focus Session')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('🚀 Start Focus Session'));

    await waitFor(() => {
      expect(api.focusSessionApi.start).toHaveBeenCalledTimes(1);
    });
  });

  it('should display active timer if server returns an active RUNNING session', async () => {
    vi.mocked(api.focusSessionApi.getActive).mockResolvedValue({
      success: true,
      activeSession: {
        id: 's-active',
        userId: 'u-1',
        startedAt: new Date(Date.now() - 60000).toISOString(),
        durationSeconds: 60,
        totalPausedSeconds: 0,
        status: 'RUNNING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    renderFocusPage();

    await waitFor(() => {
      expect(screen.getByText('● Live Focus')).toBeInTheDocument();
      expect(screen.getByText('❚❚ Pause')).toBeInTheDocument();
      expect(screen.getByText('✓ Complete Session')).toBeInTheDocument();
    });
  });
});
