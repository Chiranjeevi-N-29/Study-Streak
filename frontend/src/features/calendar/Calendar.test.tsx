import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext.js';
import { ThemeProvider } from '../../context/ThemeContext.js';
import { CalendarPage } from './CalendarPage.js';
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
      getRange: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    studyTaskApi: {
      update: vi.fn(),
    },
    streakApi: {
      get: vi.fn().mockResolvedValue({
        success: true,
        currentStreak: 5,
        longestStreak: 10,
        successfulStudyDays: 15,
        lastActiveDate: '2026-08-31',
      }),
    },
  };
});

const renderCalendar = () => {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter>
          <CalendarPage />
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

describe('Study Calendar & History Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.studyPlanApi.getRange).mockResolvedValue({
      success: true,
      studyPlans: [],
    });
  });

  describe('Month Navigation and Headers', () => {
    it('should render current month header and weekday columns', async () => {
      renderCalendar();

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });

      // Verify weekday headers
      expect(screen.getByText('Mon')).toBeInTheDocument();
      expect(screen.getByText('Tue')).toBeInTheDocument();
      expect(screen.getByText('Wed')).toBeInTheDocument();
      expect(screen.getByText('Thu')).toBeInTheDocument();
      expect(screen.getByText('Fri')).toBeInTheDocument();
      expect(screen.getByText('Sat')).toBeInTheDocument();
      expect(screen.getByText('Sun')).toBeInTheDocument();

      // Check month navigation buttons
      expect(screen.getByRole('button', { name: /Previous Month/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Next Month/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Go to Today/i })).toBeInTheDocument();
    });

    it('should navigate to previous month when Previous Month button is clicked', async () => {
      renderCalendar();

      await waitFor(() => {
        expect(api.studyPlanApi.getRange).toHaveBeenCalledTimes(1);
      });

      const prevBtn = screen.getByRole('button', { name: /Previous Month/i });
      fireEvent.click(prevBtn);

      await waitFor(() => {
        expect(api.studyPlanApi.getRange).toHaveBeenCalledTimes(2);
      });
    });

    it('should navigate to next month when Next Month button is clicked', async () => {
      renderCalendar();

      await waitFor(() => {
        expect(api.studyPlanApi.getRange).toHaveBeenCalledTimes(1);
      });

      const nextBtn = screen.getByRole('button', { name: /Next Month/i });
      fireEvent.click(nextBtn);

      await waitFor(() => {
        expect(api.studyPlanApi.getRange).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Day Cell Status Badges & Month Summary', () => {
    it('should render monthly metrics summary and status chips correctly', async () => {
      const mockPlans: api.StudyPlan[] = [
        {
          id: 'p-1',
          userId: 'u-1',
          date: '2026-09-01',
          title: 'Algorithms Practice',
          minimumStudyTarget: 60,
          status: 'COMPLETED',
          tasks: [
            {
              id: 't-1',
              studyPlanId: 'p-1',
              title: 'Solve LeetCode',
              category: 'Algorithms',
              priority: 'HIGH',
              estimatedDuration: 60,
              actualDuration: 75,
              order: 0,
              status: 'COMPLETED',
              createdAt: '',
              updatedAt: '',
            },
          ],
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'p-2',
          userId: 'u-1',
          date: '2026-09-02',
          minimumStudyTarget: 0,
          status: 'REST_DAY',
          tasks: [],
          createdAt: '',
          updatedAt: '',
        },
      ];

      vi.mocked(api.studyPlanApi.getRange).mockResolvedValue({
        success: true,
        studyPlans: mockPlans,
      });

      renderCalendar();

      await waitFor(() => {
        expect(screen.getByText('Successful Days')).toBeInTheDocument();
      });

      expect(screen.getByText('Rest Days')).toBeInTheDocument();
      expect(screen.getByText('Missed Days')).toBeInTheDocument();
      expect(screen.getByText('Total Study Time')).toBeInTheDocument();
    });
  });

  describe('Day Detail Modal & Historical Editing', () => {
    it('should open DayDetailModal on clicking a day cell and display plan details', async () => {
      const mockPlan: api.StudyPlan = {
        id: 'p-1',
        userId: 'u-1',
        date: '2026-09-05',
        title: 'System Design Architecture',
        description: 'Read Designing Data-Intensive Applications',
        minimumStudyTarget: 90,
        status: 'COMPLETED',
        tasks: [
          {
            id: 't-10',
            studyPlanId: 'p-1',
            title: 'Read Chapter 3',
            category: 'Reading',
            priority: 'HIGH',
            estimatedDuration: 60,
            actualDuration: 60,
            order: 0,
            status: 'COMPLETED',
            createdAt: '',
            updatedAt: '',
          },
        ],
        createdAt: '',
        updatedAt: '',
      };

      vi.mocked(api.studyPlanApi.getRange).mockResolvedValue({
        success: true,
        studyPlans: [mockPlan],
      });

      renderCalendar();

      await waitFor(() => {
        expect(api.studyPlanApi.getRange).toHaveBeenCalled();
      });

      // Find cell for day 5 and click
      const day5Cell = screen.getByText('5');
      fireEvent.click(day5Cell);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      expect(screen.getByText('System Design Architecture')).toBeInTheDocument();
      expect(screen.getByText('Read Designing Data-Intensive Applications')).toBeInTheDocument();
      expect(screen.getByText('Read Chapter 3')).toBeInTheDocument();

      // Close modal
      const closeBtn = screen.getByRole('button', { name: /Close detail modal/i });
      fireEvent.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should allow toggling Rest Day status in DayDetailModal', async () => {
      const mockPlan: api.StudyPlan = {
        id: 'p-1',
        userId: 'u-1',
        date: '2026-09-10',
        title: 'Light Practice',
        minimumStudyTarget: 30,
        status: 'TODO',
        tasks: [],
        createdAt: '',
        updatedAt: '',
      };

      vi.mocked(api.studyPlanApi.getRange).mockResolvedValue({
        success: true,
        studyPlans: [mockPlan],
      });
      vi.mocked(api.studyPlanApi.update).mockResolvedValue({
        success: true,
        studyPlan: { ...mockPlan, status: 'REST_DAY' },
      });

      renderCalendar();

      await waitFor(() => {
        expect(api.studyPlanApi.getRange).toHaveBeenCalled();
      });

      const day10Cell = screen.getByText('10');
      fireEvent.click(day10Cell);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const restBtn = screen.getByRole('button', { name: /Mark as Rest Day/i });
      fireEvent.click(restBtn);

      await waitFor(() => {
        expect(api.studyPlanApi.update).toHaveBeenCalledWith('p-1', { status: 'REST_DAY' });
      });
    });
  });

  describe('Error Recovery State', () => {
    it('should display connection issue card if fetching fails', async () => {
      vi.mocked(api.studyPlanApi.getRange).mockRejectedValue(new Error('Network Error'));

      renderCalendar();

      await waitFor(() => {
        expect(screen.getByText('Connection Issue')).toBeInTheDocument();
      });

      expect(screen.getByText("We couldn't load your study history.")).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /Try Again/i });
      expect(retryBtn).toBeInTheDocument();

      // Reset mock for retry
      vi.mocked(api.studyPlanApi.getRange).mockResolvedValue({
        success: true,
        studyPlans: [],
      });

      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.queryByText('Connection Issue')).not.toBeInTheDocument();
      });
    });
  });
});
