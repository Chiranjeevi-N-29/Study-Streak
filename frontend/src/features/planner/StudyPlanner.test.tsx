import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
        user: { id: 'user-1', name: 'Test User', email: 'test@example.com', timezone: 'UTC' }
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
    vi.mocked(api.studyPlanApi.getToday).mockReturnValue(new Promise(() => {})); // Never resolves to keep loading state

    renderWithAuth(<StudyPlanner />);
    
    expect(screen.getByText(/loading study plans/i)).toBeInTheDocument();
  });

  it('should render empty state if no plan exists for today', async () => {
    vi.mocked(api.studyPlanApi.getToday).mockResolvedValue({
      success: true,
      studyPlan: null,
    });

    renderWithAuth(<StudyPlanner />);

    await waitFor(() => {
      expect(screen.queryByText(/loading study plans/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/no study plan for today/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Today's Plan/i })).toBeInTheDocument();
  });

  it('should render today\'s plan details and tasks list', async () => {
    const testTask: api.StudyTask = {
      id: 'task-1',
      studyPlanId: 'plan-1',
      title: 'Learn React Hooks',
      description: 'Test react hooks',
      category: 'React',
      priority: 'HIGH',
      estimatedDuration: 45,
      actualDuration: 0,
      order: 0,
      status: 'TODO',
      createdAt: '',
      updatedAt: '',
    };

    const testPlan: api.StudyPlan = {
      id: 'plan-1',
      userId: 'user-1',
      date: '2026-08-31',
      title: 'Vite React Masterplan',
      description: 'Master frontend engineering',
      minimumStudyTarget: 90,
      status: 'IN_PROGRESS',
      tasks: [testTask],
      createdAt: '',
      updatedAt: '',
    };

    vi.mocked(api.studyPlanApi.getToday).mockResolvedValue({
      success: true,
      studyPlan: testPlan,
    });

    renderWithAuth(<StudyPlanner />);

    await waitFor(() => {
      expect(screen.getByText('Vite React Masterplan')).toBeInTheDocument();
    });

    expect(screen.getByText('Master frontend engineering')).toBeInTheDocument();
    expect(screen.getByText('90 minutes')).toBeInTheDocument();
    expect(screen.getByText('Learn React Hooks')).toBeInTheDocument();
  });

  it('should display the plan creation form when create button is clicked', async () => {
    vi.mocked(api.studyPlanApi.getToday).mockResolvedValue({
      success: true,
      studyPlan: null,
    });

    renderWithAuth(<StudyPlanner />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Create Today's Plan/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Create Today's Plan/i }));

    expect(screen.getByLabelText(/Plan Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Minimum Study Target/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Create Plan$/i })).toBeInTheDocument();
  });
});
