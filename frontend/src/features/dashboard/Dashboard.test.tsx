import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext.js';
import { ThemeProvider } from '../../context/ThemeContext.js';
import { DashboardPage } from './DashboardPage.js';
import * as api from '../../services/api.js';

// Mock the API client
vi.mock('../../services/api.js', () => {
  return {
    authApi: {
      me: vi.fn().mockResolvedValue({
        success: true,
        user: { id: 'u-1', name: 'Alice', email: 'alice@example.com', timezone: 'UTC' },
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
    },
    streakApi: {
      get: vi.fn().mockResolvedValue({
        success: true,
        currentStreak: 4,
        longestStreak: 10,
        successfulStudyDays: 15,
        lastActiveDate: '2026-08-30',
      }),
    },
  };
});

const renderDashboard = () => {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

describe('Dashboard Page Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.streakApi.get).mockResolvedValue({
      success: true,
      currentStreak: 4,
      longestStreak: 10,
      successfulStudyDays: 15,
      lastActiveDate: '2026-08-30',
    });
  });

  describe('Adaptive Time-of-Day Greetings', () => {
    it('should display Good morning before 12:00', async () => {
      vi.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
      vi.mocked(api.studyPlanApi.getToday).mockResolvedValue({ success: true, studyPlan: null });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Good morning, Alice/i)).toBeInTheDocument();
      });
    });

    it('should display Good afternoon between 12:00 and 17:00', async () => {
      vi.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
      vi.mocked(api.studyPlanApi.getToday).mockResolvedValue({ success: true, studyPlan: null });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Good afternoon, Alice/i)).toBeInTheDocument();
      });
    });

    it('should display Good evening from 17:00 onwards', async () => {
      vi.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
      vi.mocked(api.studyPlanApi.getToday).mockResolvedValue({ success: true, studyPlan: null });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/Good evening, Alice/i)).toBeInTheDocument();
      });
    });
  });

  describe('Plan and Task Layouts', () => {
    it('should render empty plan card if no plan exists', async () => {
      vi.mocked(api.studyPlanApi.getToday).mockResolvedValue({ success: true, studyPlan: null });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText(/No study plan for today/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /Create Today's Plan/i })).toBeInTheDocument();
    });

    it('should render Today Plan details and progress bars if plan exists', async () => {
      const testTask: api.StudyTask = {
        id: 't-1',
        studyPlanId: 'p-1',
        title: 'Practice DSA Algorithms',
        category: 'Algorithms',
        priority: 'HIGH',
        estimatedDuration: 40,
        actualDuration: 20,
        order: 0,
        status: 'IN_PROGRESS',
        createdAt: '',
        updatedAt: '',
      };

      const testPlan: api.StudyPlan = {
        id: 'p-1',
        userId: 'u-1',
        date: '2026-08-31',
        title: 'Cracking the Code Interview',
        description: 'Practice basic stack and queue algorithms',
        minimumStudyTarget: 60,
        status: 'IN_PROGRESS',
        tasks: [testTask],
        createdAt: '',
        updatedAt: '',
      };

      vi.mocked(api.studyPlanApi.getToday).mockResolvedValue({ success: true, studyPlan: testPlan });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Cracking the Code Interview')).toBeInTheDocument();
      });

      expect(screen.getByText('Practice basic stack and queue algorithms')).toBeInTheDocument();
      expect(screen.getByText('Practice DSA Algorithms')).toBeInTheDocument();
      expect(screen.getByText('60 min')).toBeInTheDocument();
      
      // Check progress details
      expect(screen.getByText('Task Completion')).toBeInTheDocument();
      expect(screen.getByText('0 of 1 tasks completed')).toBeInTheDocument(); // 0%
      expect(screen.getByText('20 / 60 minutes logged')).toBeInTheDocument(); // 33%
    });

    it('should render calm rest day page if plan status is REST_DAY', async () => {
      const restPlan: api.StudyPlan = {
        id: 'p-2',
        userId: 'u-1',
        date: '2026-08-31',
        minimumStudyTarget: 0,
        status: 'REST_DAY',
        tasks: [],
        createdAt: '',
        updatedAt: '',
      };

      vi.mocked(api.studyPlanApi.getToday).mockResolvedValue({ success: true, studyPlan: restPlan });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Rest Day')).toBeInTheDocument();
      });

      expect(screen.getByText('You planned a rest day today.')).toBeInTheDocument();
      expect(screen.getByText('Your streak is protected. Enjoy your break!')).toBeInTheDocument();
    });

    it('should render missed day layout if plan status is MISSED', async () => {
      const missedPlan: api.StudyPlan = {
        id: 'p-3',
        userId: 'u-1',
        date: '2026-08-31',
        minimumStudyTarget: 60,
        status: 'MISSED',
        tasks: [],
        createdAt: '',
        updatedAt: '',
      };

      vi.mocked(api.studyPlanApi.getToday).mockResolvedValue({ success: true, studyPlan: missedPlan });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('MISSED')).toBeInTheDocument();
      });

      expect(screen.getByText("Today's status is missed.")).toBeInTheDocument();
      expect(screen.getByText('Tomorrow is a new opportunity.')).toBeInTheDocument();
    });
  });

  describe('Task Interaction Status Cycle', () => {
    it('should invoke API and refresh on checking task', async () => {
      const testTask: api.StudyTask = {
        id: 't-1',
        studyPlanId: 'p-1',
        title: 'Cycle Status Testing',
        category: 'Development',
        priority: 'MEDIUM',
        estimatedDuration: 30,
        actualDuration: 0,
        order: 0,
        status: 'TODO',
        createdAt: '',
        updatedAt: '',
      };

      const testPlan: api.StudyPlan = {
        id: 'p-1',
        userId: 'u-1',
        date: '2026-08-31',
        title: 'Status Cycle Plan',
        minimumStudyTarget: 60,
        status: 'TODO',
        tasks: [testTask],
        createdAt: '',
        updatedAt: '',
      };

      vi.mocked(api.studyPlanApi.getToday).mockResolvedValue({ success: true, studyPlan: testPlan });
      vi.mocked(api.studyTaskApi.update).mockResolvedValue({ success: true, studyTask: { ...testTask, status: 'IN_PROGRESS' } });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Cycle Status Testing')).toBeInTheDocument();
      });

      const cycleBtn = screen.getByRole('button', { name: /Cycle status for task/i });
      expect(cycleBtn).toHaveTextContent('☐');

      // Click to transition TODO -> IN_PROGRESS
      fireEvent.click(cycleBtn);

      await waitFor(() => {
        expect(api.studyTaskApi.update).toHaveBeenCalledWith('t-1', { status: 'IN_PROGRESS' });
      });

      // API getToday called again to reload
      expect(api.studyPlanApi.getToday).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error recovery reload', () => {
    it('should display error card and trigger retry action', async () => {
      vi.mocked(api.studyPlanApi.getToday).mockRejectedValue(new Error('Fetch Error'));

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Connection Issue')).toBeInTheDocument();
      });

      expect(screen.getByText("We couldn't load today's study dashboard data.")).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /Try Again/i });
      expect(retryBtn).toBeInTheDocument();

      // Setup resolve for retry
      vi.mocked(api.studyPlanApi.getToday).mockResolvedValue({ success: true, studyPlan: null });
      
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText(/No study plan for today/i)).toBeInTheDocument();
      });
    });
  });
});
