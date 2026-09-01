import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext.js';
import { ThemeProvider } from '../../context/ThemeContext.js';
import { AchievementsPage } from './AchievementsPage.js';
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
    achievementApi: {
      getAll: vi.fn(),
      getUnlocked: vi.fn(),
    },
  };
});

const mockAchievements: api.AchievementItem[] = [
  {
    id: 'ach-1',
    code: 'STREAK_3',
    title: '3-Day Streak',
    description: 'Maintain a 3-day study streak.',
    category: 'STREAK',
    conditionType: 'STREAK',
    threshold: 3,
    icon: '🔥',
    progress: 3,
    unlocked: true,
    unlockedAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'ach-2',
    code: 'TASKS_10',
    title: 'First 10 Tasks',
    description: 'Complete 10 study tasks.',
    category: 'TASKS',
    conditionType: 'TASKS_COMPLETED',
    threshold: 10,
    icon: '📚',
    progress: 4,
    unlocked: false,
    unlockedAt: null,
  },
];

const renderAchievements = () => {
  return render(
    <ThemeProvider>
      <AuthProvider>
        <MemoryRouter>
          <AchievementsPage />
        </MemoryRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

describe('Achievements Page Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.achievementApi.getAll).mockResolvedValue({
      success: true,
      achievements: mockAchievements,
    });
  });

  it('should render page header, summary progress card, and achievement grid cards', async () => {
    renderAchievements();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Achievements & Milestones/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Unlocked 1 of 2 Achievements/i)).toBeInTheDocument();
    expect(screen.getByText('3-Day Streak')).toBeInTheDocument();
    expect(screen.getByText('First 10 Tasks')).toBeInTheDocument();

    // Progress text
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    expect(screen.getByText('4 / 10')).toBeInTheDocument();

    // Unlocked and Locked badges
    expect(screen.getByText(/Unlocked on 1 Sept 2026/i)).toBeInTheDocument();
    expect(screen.getAllByText('Locked').length).toBeGreaterThan(0);
  });

  it('should filter achievements by status (Unlocked / Locked)', async () => {
    renderAchievements();

    await waitFor(() => {
      expect(screen.getByText('3-Day Streak')).toBeInTheDocument();
    });

    // Filter Unlocked
    const unlockedTab = screen.getByRole('tab', { name: 'Unlocked' });
    fireEvent.click(unlockedTab);

    expect(screen.getByText('3-Day Streak')).toBeInTheDocument();
    expect(screen.queryByText('First 10 Tasks')).not.toBeInTheDocument();

    // Filter Locked
    const lockedTab = screen.getByRole('tab', { name: 'Locked' });
    fireEvent.click(lockedTab);

    expect(screen.queryByText('3-Day Streak')).not.toBeInTheDocument();
    expect(screen.getByText('First 10 Tasks')).toBeInTheDocument();
  });

  it('should filter achievements by category pills', async () => {
    renderAchievements();

    await waitFor(() => {
      expect(screen.getByText('3-Day Streak')).toBeInTheDocument();
    });

    // Filter Tasks category
    const tasksPill = screen.getByRole('button', { name: /📚 Tasks/i });
    fireEvent.click(tasksPill);

    expect(screen.queryByText('3-Day Streak')).not.toBeInTheDocument();
    expect(screen.getByText('First 10 Tasks')).toBeInTheDocument();
  });

  it('should render connection issue card if API call rejects', async () => {
    vi.mocked(api.achievementApi.getAll).mockRejectedValue(new Error('Network error'));

    renderAchievements();

    await waitFor(() => {
      expect(screen.getByText('Connection Issue')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /Try Again/i });
    expect(retryBtn).toBeInTheDocument();

    vi.mocked(api.achievementApi.getAll).mockResolvedValue({
      success: true,
      achievements: mockAchievements,
    });

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.queryByText('Connection Issue')).not.toBeInTheDocument();
    });
  });
});
