import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { GoalsPage } from './GoalsPage';
import * as api from '../../services/api';

vi.mock('../../services/api', () => {
  return {
    authApi: {
      me: vi.fn().mockResolvedValue({
        success: true,
        user: { id: 'u-1', name: 'Test User', email: 'test@example.com', timezone: 'UTC' },
      }),
    },
    goalApi: {
      list: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateManualProgress: vi.fn(),
      complete: vi.fn(),
      archive: vi.fn(),
      unarchive: vi.fn(),
      delete: vi.fn(),
      addMilestone: vi.fn(),
      updateMilestone: vi.fn(),
      deleteMilestone: vi.fn(),
    },
  };
});

describe('GoalsPage Component', () => {
  const sampleGoal: api.StudyGoal = {
    id: 'goal-1',
    userId: 'u-1',
    title: 'Learn React & Redux',
    description: 'Master modern React ecosystem',
    category: 'Frontend',
    targetDate: '2026-12-31',
    status: 'ACTIVE',
    progressType: 'FOCUS_TIME',
    targetValue: 3000, // 50 hours
    currentValue: 1500, // 25 hours
    progressPercentage: 50,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.goalApi.list).mockResolvedValue({
      success: true,
      goals: [sampleGoal],
    });
  });

  const renderComponent = () => {
    return render(
      <ThemeProvider>
        <AuthProvider>
          <MemoryRouter>
            <GoalsPage />
          </MemoryRouter>
        </AuthProvider>
      </ThemeProvider>
    );
  };

  it('renders goals page header and active goals', async () => {
    renderComponent();

    expect(screen.getByText(/Study Goals & Long-Term Progress/i)).toBeInTheDocument();
    expect(screen.getByText(/\+ Create Goal/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Learn React & Redux')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('Frontend')).toBeInTheDocument();
    });
  });

  it('filters goals when typing into search input', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Learn React & Redux')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Filter by title or category/i);
    fireEvent.change(searchInput, { target: { value: 'Backend' } });

    expect(screen.queryByText('Learn React & Redux')).not.toBeInTheDocument();
  });

  it('opens create goal modal on button click', async () => {
    renderComponent();

    const createBtn = screen.getByText(/\+ Create Goal/i);
    fireEvent.click(createBtn);

    expect(screen.getByText(/🎯 Create Study Goal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Goal Title \*/i)).toBeInTheDocument();
  });
});
