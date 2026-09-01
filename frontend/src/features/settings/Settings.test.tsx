import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from './SettingsPage.js';
import * as api from '../../services/api.js';

// Mock API client
vi.mock('../../services/api.js', () => {
  return {
    notificationApi: {
      getPreferences: vi.fn(),
      updatePreferences: vi.fn(),
    },
  };
});

const mockPreferences: api.NotificationPreference = {
  id: 'pref-1',
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
    vi.mocked(api.notificationApi.getPreferences).mockResolvedValue({
      success: true,
      preferences: mockPreferences,
    });
  });

  it('should render settings form with loaded preferences', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Account & Notification Settings/i })).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('18:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Asia/Kolkata')).toBeInTheDocument();
  });

  it('should update preferences and show success toast on save', async () => {
    vi.mocked(api.notificationApi.updatePreferences).mockResolvedValue({
      success: true,
      preferences: {
        ...mockPreferences,
        dailyReminderTime: '20:00',
      },
    });

    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('18:00')).toBeInTheDocument();
    });

    const timeInput = screen.getByDisplayValue('18:00');
    fireEvent.change(timeInput, { target: { value: '20:00' } });

    const saveBtn = screen.getByRole('button', { name: /Save Preferences/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText('Notification preferences saved successfully!')).toBeInTheDocument();
    });
  });
});
