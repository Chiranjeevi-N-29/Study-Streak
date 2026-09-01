import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext.js';
import { ThemeProvider } from '../../context/ThemeContext.js';
import { AnalyticsPage } from './AnalyticsPage.js';
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
    analyticsApi: {
      get: vi.fn(),
    },
  };
});

const mockAnalyticsData: api.AnalyticsSummary = {
  range: '30d',
  kpis: {
    currentStreak: 5,
    longestStreak: 12,
    successfulDays: 18,
    restDays: 3,
    missedDays: 4,
    totalStudyMinutes: 1440,
    completedTasksCount: 35,
    plannedTasksCount: 40,
    completionRate: 87.5,
    avgStudyMinutesPerDay: 48,
    avgStudyMinutesPerSuccessfulDay: 80,
  },
  dailyTimeSeries: [
    {
      date: '2026-09-01',
      dayOfWeek: 'Tue',
      studyMinutes: 90,
      targetMinutes: 60,
      status: 'COMPLETED',
      tasksCompleted: 2,
      totalTasks: 2,
    },
  ],
  weeklyBreakdown: [
    {
      weekLabel: 'Sep 1 - Sep 7',
      studyMinutes: 450,
      tasksCompleted: 10,
      plannedTasks: 12,
      completionRate: 83.3,
    },
  ],
  categoryBreakdown: [
    {
      category: 'Java',
      studyMinutes: 600,
      taskCount: 15,
      completedCount: 14,
    },
    {
      category: 'Dsa',
      studyMinutes: 840,
      taskCount: 20,
      completedCount: 18,
    },
  ],
  priorityPerformance: [
    { priority: 'HIGH', totalTasks: 20, completedTasks: 18, completionRate: 90 },
    { priority: 'MEDIUM', totalTasks: 15, completedTasks: 12, completionRate: 80 },
    { priority: 'LOW', totalTasks: 5, completedTasks: 5, completionRate: 100 },
  ],
  studyHabits: {
    mostProductiveDayOfWeek: 'Tuesday',
    topCategory: 'Dsa',
    avgDailyMinutes: 48,
  },
  moodAnalytics: {
    counts: { GREAT: 4, GOOD: 10, OKAY: 2, DIFFICULT: 1, ROUGH: 0 },
    avgMinutesByMood: { GREAT: 90, GOOD: 75, OKAY: 45, DIFFICULT: 30, ROUGH: 0 },
  },
};

const renderAnalytics = () => {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter>
          <AnalyticsPage />
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

describe('Analytics Dashboard Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.analyticsApi.get).mockResolvedValue({
      success: true,
      analytics: mockAnalyticsData,
    });
  });

  it('should render page heading, range tabs, and core KPI cards', async () => {
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Study Analytics & Progress/i })).toBeInTheDocument();
    });

    // Check Range Tabs
    expect(screen.getByRole('tab', { name: '7 Days' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '30 Days' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '90 Days' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'All Time' })).toBeInTheDocument();

    // Check KPI Values
    expect(screen.getByText('5 days')).toBeInTheDocument();
    expect(screen.getByText('24h 0m')).toBeInTheDocument();
    expect(screen.getByText('35 / 40')).toBeInTheDocument();
    expect(screen.getByText('87.5%')).toBeInTheDocument();
  });

  it('should switch range when range tabs are clicked and fetch updated data', async () => {
    renderAnalytics();

    await waitFor(() => {
      expect(api.analyticsApi.get).toHaveBeenCalledWith('30d');
    });

    const tab7d = screen.getByRole('tab', { name: '7 Days' });
    fireEvent.click(tab7d);

    await waitFor(() => {
      expect(api.analyticsApi.get).toHaveBeenCalledWith('7d');
    });
  });

  it('should render SVG charts, categories, priority, and habits breakdown', async () => {
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByRole('img', { name: /Daily study time bar chart/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('img', { name: /Completion rate trend chart/i })).toBeInTheDocument();

    // Categories
    expect(screen.getByText('Java')).toBeInTheDocument();
    expect(screen.getAllByText('Dsa')[0]).toBeInTheDocument();

    // Priorities
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();

    // Habits
    expect(screen.getByText('Tuesday')).toBeInTheDocument();
  });

  it('should render empty state when user has zero study minutes and planned tasks', async () => {
    vi.mocked(api.analyticsApi.get).mockResolvedValue({
      success: true,
      analytics: {
        ...mockAnalyticsData,
        kpis: {
          ...mockAnalyticsData.kpis,
          totalStudyMinutes: 0,
          plannedTasksCount: 0,
        },
      },
    });

    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('No study data yet for this period')).toBeInTheDocument();
    });

    expect(screen.getByText(/Start completing study plans/i)).toBeInTheDocument();
  });

  it('should render error recovery card if analytics fetch fails', async () => {
    vi.mocked(api.analyticsApi.get).mockRejectedValue(new Error('Network error'));

    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Connection Issue')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /Try Again/i });
    expect(retryBtn).toBeInTheDocument();

    // Reset mock for retry
    vi.mocked(api.analyticsApi.get).mockResolvedValue({
      success: true,
      analytics: mockAnalyticsData,
    });

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.queryByText('Connection Issue')).not.toBeInTheDocument();
    });
  });
});
