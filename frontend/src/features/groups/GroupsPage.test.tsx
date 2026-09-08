import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext.js';
import { ThemeProvider } from '../../context/ThemeContext.js';
import { GroupsPage } from './GroupsPage.js';
import * as api from '../../services/api.js';

vi.mock('../../services/api', () => {
  return {
    authApi: {
      me: vi.fn().mockResolvedValue({
        success: true,
        user: { id: 'u-1', name: 'Test User', email: 'test@example.com', timezone: 'UTC' },
      }),
    },
    groupsApi: {
      getUserGroups: vi.fn(),
      create: vi.fn(),
      join: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      archive: vi.fn(),
      regenerateInviteCode: vi.fn(),
      leave: vi.fn(),
      transferOwnership: vi.fn(),
      getMembers: vi.fn(),
      updateMemberRole: vi.fn(),
      removeMember: vi.fn(),
      createGoal: vi.fn(),
      getProgress: vi.fn(),
    },
  };
});

describe('GroupsPage Component', () => {
  const sampleGroup: api.StudyGroupListItem = {
    id: 'group-1',
    name: 'Algorithms Squad',
    description: 'LeetCode and DSA practice',
    status: 'ACTIVE',
    maxMembers: 5,
    memberCount: 3,
    userRole: 'OWNER',
    inviteCode: 'CODE12345',
    activeGoals: [
      {
        id: 'goal-1',
        title: 'Solve 100 LeetCode Problems',
        description: null,
        targetMinutes: 1200,
        currentMinutes: 600,
        progressPct: 50,
        status: 'ACTIVE',
      },
    ],
    streak: { currentStreak: 4, longestStreak: 7 },
    createdAt: '2026-09-01T00:00:00Z',
    joinedAt: '2026-09-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.groupsApi.getUserGroups).mockResolvedValue({
      success: true,
      groups: [sampleGroup],
    });
  });

  const renderComponent = () => {
    return render(
      <ThemeProvider>
        <AuthProvider>
          <MemoryRouter>
            <GroupsPage />
          </MemoryRouter>
        </AuthProvider>
      </ThemeProvider>
    );
  };

  it('renders groups page header and group card', async () => {
    renderComponent();

    expect(screen.getByRole('heading', { name: /Study Groups/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Group/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Algorithms Squad')).toBeInTheDocument();
      expect(screen.getByText('LeetCode and DSA practice')).toBeInTheDocument();
      expect(screen.getByText(/3 \/ 5 members/i)).toBeInTheDocument();
    });
  });

  it('opens create group modal on click', async () => {
    renderComponent();

    const createBtn = screen.getByText(/Create Group/i);
    fireEvent.click(createBtn);

    expect(screen.getByText(/Create Private Study Group/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Group Name \*/i)).toBeInTheDocument();
  });

  it('opens join group modal on click', async () => {
    renderComponent();

    const joinBtn = screen.getByText(/Join with Code/i);
    fireEvent.click(joinBtn);

    expect(screen.getByText(/Join Study Group/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Invite Code \*/i)).toBeInTheDocument();
  });
});
