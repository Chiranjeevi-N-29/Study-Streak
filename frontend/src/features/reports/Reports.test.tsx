import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ReportsPage } from './ReportsPage.js';
import * as api from '../../services/api.js';

vi.mock('../../services/api.js', async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    reportsApi: {
      get: vi.fn(),
      downloadExport: vi.fn(),
      getExportUrl: vi.fn().mockReturnValue('http://localhost/export'),
    },
  };
});

const MOCK_REPORT: api.ReportData = {
  range: '30d',
  dateRange: { startDate: '2026-08-09', endDate: '2026-09-08', numDays: 30, label: 'Last 30 Days' },
  overview: {
    totalStudyMinutes: 480,
    avgDailyMinutes: 16,
    avgActiveDayMinutes: 96,
    totalTasksCompleted: 12,
    totalTasksPlanned: 15,
    taskCompletionRate: 80,
    successfulDays: 5,
    restDays: 1,
    missedDays: 24,
    dayCompletionRate: 83.3,
    totalFocusSessions: 6,
    totalFocusMinutes: 180,
    avgFocusSessionMinutes: 30,
  },
  dailyTimeSeries: [],
  weeklyBreakdown: [],
  categoryStats: [
    {
      category: 'Math',
      studyMinutes: 240,
      taskCount: 8,
      completedCount: 6,
      completionRate: 75,
      estimatedMinutes: 200,
      actualVsEstimatedRatio: 1.2,
    },
  ],
  priorityStats: [
    { priority: 'HIGH', totalTasks: 5, completedTasks: 4, completionRate: 80, totalEstimatedMinutes: 120, totalActualMinutes: 140 },
    { priority: 'MEDIUM', totalTasks: 7, completedTasks: 6, completionRate: 85.7, totalEstimatedMinutes: 140, totalActualMinutes: 150 },
    { priority: 'LOW', totalTasks: 3, completedTasks: 2, completionRate: 66.7, totalEstimatedMinutes: 60, totalActualMinutes: 50 },
  ],
  goalReport: [],
  streakReport: {
    currentStreak: 3,
    longestStreak: 7,
    successfulStudyDays: 5,
    consistencyScore: 17,
    longestGap: 5,
    streakBreaks: 2,
    mostProductiveDayOfWeek: 'Mon',
    leastProductiveDayOfWeek: 'Sun',
    dayOfWeekBreakdown: [],
  },
  focusSessionReport: {
    totalSessions: 7,
    completedSessions: 6,
    cancelledSessions: 1,
    totalFocusMinutes: 180,
    avgSessionMinutes: 30,
    longestSessionMinutes: 45,
    taskLinkedSessions: 4,
    standaloneSessionsSessions: 2,
    sessionsByDay: [],
  },
  plannedVsActual: [],
  insights: [
    { type: 'positive', title: 'Great Job!', body: 'You are on track.', metric: '80%' },
  ],
  moodAnalytics: { counts: {}, avgMinutesByMood: {} },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ReportsPage />
    </MemoryRouter>
  );
}

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.reportsApi.get).mockResolvedValue({ success: true, report: MOCK_REPORT });
  });

  it('renders loading state initially', () => {
    vi.mocked(api.reportsApi.get).mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/generating your report/i)).toBeInTheDocument();
  });

  it('renders page heading after data loads', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /advanced reports/i })).toBeInTheDocument();
    });
  });

  it('renders overview section heading when data loads', async () => {
    renderPage();
    await waitFor(() => {
      // The overview section card heading is definitely rendered
      expect(screen.getByText('📊 Overview')).toBeInTheDocument();
      // The streak report card heading
      expect(screen.getByText('🔥 Streak & Habits')).toBeInTheDocument();
    });
  });

  it('renders task performance with category name', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/math/i).length).toBeGreaterThan(0);
    });
  });

  it('renders insights panel', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Great Job!')).toBeInTheDocument();
      expect(screen.getByText('You are on track.')).toBeInTheDocument();
    });
  });

  it('renders export section with format toggle', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/export your data/i)).toBeInTheDocument();
      expect(screen.getByText(/export format/i)).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();
      expect(screen.getByText('CSV')).toBeInTheDocument();
    });
  });

  it('shows error state on API failure', async () => {
    vi.mocked(api.reportsApi.get).mockRejectedValue(new Error('Network error'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/report unavailable/i)).toBeInTheDocument();
    });
  });

  it('shows range tabs', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: '7 Days' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '30 Days' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'All Time' })).toBeInTheDocument();
    });
  });
});
