import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationCenter } from '../../components/NotificationCenter.js';
import * as api from '../../services/api.js';

// Mock API client
vi.mock('../../services/api.js', () => {
  return {
    notificationApi: {
      getAll: vi.fn(),
      getUnreadCount: vi.fn(),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    },
  };
});

const mockNotifications: api.NotificationItem[] = [
  {
    id: 'notif-1',
    userId: 'u-1',
    type: 'STUDY_REMINDER',
    title: '📚 Study Reminder',
    message: 'Your study plan is waiting for you.',
    read: false,
    link: '/app/planner',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif-2',
    userId: 'u-1',
    type: 'ACHIEVEMENT_UNLOCKED',
    title: '🎉 Achievement Unlocked!',
    message: 'You unlocked 7-Day Streak!',
    read: true,
    link: '/app/achievements',
    createdAt: new Date().toISOString(),
  },
];

describe('NotificationCenter Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.notificationApi.getUnreadCount).mockResolvedValue({
      success: true,
      count: 1,
    });
    vi.mocked(api.notificationApi.getAll).mockResolvedValue({
      success: true,
      notifications: mockNotifications,
    });
  });

  it('should render notification bell button and unread count badge', async () => {
    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('should toggle dropdown open when bell icon is clicked and fetch notifications', async () => {
    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>
    );

    const bellBtn = screen.getByRole('button', { name: /Open notifications center/i });
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });

    expect(screen.getByText('📚 Study Reminder')).toBeInTheDocument();
    expect(screen.getByText('🎉 Achievement Unlocked!')).toBeInTheDocument();
  });

  it('should mark all notifications as read when Mark All As Read is clicked', async () => {
    vi.mocked(api.notificationApi.markAllAsRead).mockResolvedValue({
      success: true,
      message: 'All notifications marked as read',
    });

    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>
    );

    const bellBtn = screen.getByRole('button', { name: /Open notifications center/i });
    fireEvent.click(bellBtn);

    await waitFor(() => {
      expect(screen.getByText('Mark all as read')).toBeInTheDocument();
    });

    const markAllBtn = screen.getByText('Mark all as read');
    fireEvent.click(markAllBtn);

    await waitFor(() => {
      expect(api.notificationApi.markAllAsRead).toHaveBeenCalledTimes(1);
    });
  });
});
