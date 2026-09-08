import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext.js';
import { StudyPlanner } from './StudyPlanner.js';
import * as api from '../../services/api.js';

// Mock the API client
vi.mock('../../services/api.js', () => {
  const original = vi.importActual('../../services/api.js');
  return {
    ...original,
    authApi: {
      me: vi.fn().mockResolvedValue({
        success: true,
        user: { id: 'user-1', name: 'Test User', email: 'test@example.com', timezone: 'UTC' },
      }),
    },
    studyPlanApi: {
      getToday: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    studyTaskApi: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      reorder: vi.fn(),
    },
    plannerApi: {
      getWeek: vi.fn().mockResolvedValue({
        success: true,
        data: {
          startDate: '2026-09-07',
          endDate: '2026-09-13',
          localToday: '2026-09-08',
          dailyGoalMinutes: 60,
          weeklySummary: {
            totalPlannedMinutes: 120,
            totalActualFocusMinutes: 60,
            totalTasks: 2,
            totalCompletedTasks: 1,
            completionRate: 50,
          },
          days: [
            {
              date: '2026-09-07',
              dayName: 'Monday',
              isToday: false,
              plannedMinutes: 60,
              actualFocusMinutes: 60,
              remainingCapacityMinutes: 0,
              dailyGoalMinutes: 60,
              workloadStatus: 'Moderate',
              isOverloaded: false,
              taskCount: 1,
              completedTaskCount: 1,
              tasks: [],
            },
            {
              date: '2026-09-08',
              dayName: 'Tuesday',
              isToday: true,
              plannedMinutes: 60,
              actualFocusMinutes: 0,
              remainingCapacityMinutes: 0,
              dailyGoalMinutes: 60,
              workloadStatus: 'Moderate',
              isOverloaded: false,
              taskCount: 1,
              completedTaskCount: 0,
              tasks: [],
            },
          ],
        },
      }),
      getOverdue: vi.fn().mockResolvedValue({
        success: true,
        data: {
          localToday: '2026-09-08',
          count: 0,
          tasks: [],
        },
      }),
      getRecommendation: vi.fn(),
      scheduleTask: vi.fn(),
    },
    streakApi: {
      get: vi.fn().mockResolvedValue({
        success: true,
        currentStreak: 1,
        longestStreak: 5,
        successfulStudyDays: 3,
        lastActiveDate: '2026-09-07',
      }),
    },
    goalApi: {
      list: vi.fn().mockResolvedValue({
        success: true,
        goals: [],
      }),
    },
  };
});

const renderWithAuth = (ui: React.ReactElement) => {
  return render(
    <AuthProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </AuthProvider>
  );
};

describe('StudyPlanner Frontend Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', async () => {
    vi.mocked(api.plannerApi.getWeek).mockReturnValue(new Promise(() => {}));

    renderWithAuth(<StudyPlanner />);
    expect(screen.getByText(/loading study planner/i)).toBeInTheDocument();
  });

  it('should render weekly grid and streak stats', async () => {
    vi.mocked(api.plannerApi.getWeek).mockResolvedValue({
      success: true,
      data: {
        startDate: '2026-09-07',
        endDate: '2026-09-13',
        localToday: '2026-09-08',
        dailyGoalMinutes: 60,
        weeklySummary: {
          totalPlannedMinutes: 120,
          totalActualFocusMinutes: 60,
          totalTasks: 2,
          totalCompletedTasks: 1,
          completionRate: 50,
        },
        days: [
          {
            date: '2026-09-07',
            dayName: 'Monday',
            isToday: false,
            plannedMinutes: 60,
            actualFocusMinutes: 60,
            remainingCapacityMinutes: 0,
            dailyGoalMinutes: 60,
            workloadStatus: 'Moderate',
            isOverloaded: false,
            taskCount: 1,
            completedTaskCount: 1,
            tasks: [],
          },
          {
            date: '2026-09-08',
            dayName: 'Tuesday',
            isToday: true,
            plannedMinutes: 60,
            actualFocusMinutes: 0,
            remainingCapacityMinutes: 0,
            dailyGoalMinutes: 60,
            workloadStatus: 'Moderate',
            isOverloaded: false,
            taskCount: 1,
            completedTaskCount: 0,
            tasks: [],
          },
        ],
      },
    });

    renderWithAuth(<StudyPlanner />);

    await waitFor(() => {
      expect(screen.queryByText(/loading study planner/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Weekly Schedule/i)).toBeInTheDocument();
    expect(screen.getByText(/Current Streak/i)).toBeInTheDocument();
  });

  it('should render overdue tasks banner if overdue tasks exist', async () => {
    vi.mocked(api.plannerApi.getOverdue).mockResolvedValue({
      success: true,
      data: {
        localToday: '2026-09-08',
        count: 1,
        tasks: [
          {
            id: 'overdue-1',
            title: 'Unfinished DSA Task',
            category: 'CS',
            priority: 'HIGH',
            status: 'TODO',
            estimatedDuration: 60,
            actualDuration: 0,
            plannedDate: '2026-09-01',
          },
        ],
      },
    });

    renderWithAuth(<StudyPlanner />);

    await waitFor(() => {
      expect(screen.getByText(/Need Attention \(Overdue\)/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Unfinished DSA Task')).toBeInTheDocument();
  });
});
