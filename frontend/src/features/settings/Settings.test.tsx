import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from './SettingsPage.js';
import * as api from '../../services/api.js';

// Mock AuthContext hook
vi.mock('../auth/AuthContext.js', () => {
  return {
    useAuth: () => ({
      user: {
        id: 'u-1',
        name: 'Alice Learner',
        email: 'alice@example.com',
        timezone: 'Asia/Kolkata',
      },
      refreshUser: vi.fn().mockResolvedValue(undefined),
    }),
  };
});

// Mock API client
vi.mock('../../services/api.js', () => {
  return {
    profileApi: {
      get: vi.fn(),
      update: vi.fn(),
    },
    preferencesApi: {
      get: vi.fn(),
      update: vi.fn(),
    },
    notificationApi: {
      getPreferences: vi.fn(),
      updatePreferences: vi.fn(),
    },
  };
});

const mockProfile: api.UserProfile = {
  id: 'u-1',
  email: 'alice@example.com',
  displayName: 'Alice Learner',
  timezone: 'Asia/Kolkata',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const mockUserPreferences: api.UserPreferences = {
  id: 'pref-1',
  userId: 'u-1',
  dailyStudyGoalMinutes: 120,
  preferredStudyDays: ['Monday', 'Wednesday', 'Friday'],
  preferredStudyStartTime: '09:00',
  preferredStudyEndTime: '18:00',
  defaultFocusDurationMinutes: 50,
  defaultBreakDurationMinutes: 10,
  longBreakDurationMinutes: 20,
  autoStartBreak: false,
  weekStartsOn: 'Monday',
};

const mockNotificationPreferences: api.NotificationPreference = {
  id: 'notif-pref-1',
  userId: 'u-1',
  studyRemindersEnabled: true,
  reflectionRemindersEnabled: true,
  achievementNotificationsEnabled: true,
  streakNotificationsEnabled: true,
  dailyReminderTime: '18:00',
  timezone: 'Asia/Kolkata',
};

describe('SettingsPage Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(api.profileApi.get).mockResolvedValue({
      success: true,
      profile: mockProfile,
    });
    vi.mocked(api.profileApi.update).mockResolvedValue({
      success: true,
      message: 'Profile updated',
      profile: mockProfile,
    });

    vi.mocked(api.preferencesApi.get).mockResolvedValue({
      success: true,
      preferences: mockUserPreferences,
    });
    vi.mocked(api.preferencesApi.update).mockResolvedValue({
      success: true,
      message: 'Preferences updated',
      preferences: mockUserPreferences,
    });

    vi.mocked(api.notificationApi.getPreferences).mockResolvedValue({
      success: true,
      preferences: mockNotificationPreferences,
    });
    vi.mocked(api.notificationApi.updatePreferences).mockResolvedValue({
      success: true,
      preferences: mockNotificationPreferences,
    });
  });

  it('should render profile and study preferences with loaded settings', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Profile & Study Preferences/i })).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('Alice Learner')).toBeInTheDocument();
    expect(screen.getByDisplayValue('120')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
  });

  it('should save updated profile and preferences on form submission', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    // Wait until save button is rendered (guarantees loading: false)
    const nameInput = await screen.findByDisplayValue('Alice Learner');
    fireEvent.change(nameInput, { target: { value: 'Alice Updated' } });
    await waitFor(() => expect(nameInput).toHaveValue('Alice Updated'));

    const saveBtn = screen.getByRole('button', { name: /Save All Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Profile and preferences saved successfully!')).toBeInTheDocument();
    });
  });
});


