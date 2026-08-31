import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import { studyPlanApi, streakApi, studyTaskApi } from '../../services/api.js';
import type { StudyPlan, StreakInfo, Status } from '../../services/api.js';

import { DashboardHeader } from './components/DashboardHeader.js';
import { StreakSummary } from './components/StreakSummary.js';
import { TodayPlanCard } from './components/TodayPlanCard.js';
import { DailyProgress } from './components/DailyProgress.js';

import './Dashboard.css';
import '../../components/UIPrimitives.css';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      // Run API requests concurrently
      const [planRes, streakRes] = await Promise.all([
        studyPlanApi.getToday(),
        streakApi.get()
      ]);
      
      setPlan(planRes.studyPlan);
      setStreak({
        currentStreak: streakRes.currentStreak,
        longestStreak: streakRes.longestStreak,
        successfulStudyDays: streakRes.successfulStudyDays,
        lastActiveDate: streakRes.lastActiveDate,
      });
    } catch (err) {
      console.error('DashboardPage concurrent fetch error:', err);
      setError('We couldn\'t load today\'s study dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, []);

  const handleToggleTaskStatus = async (taskId: string, currentStatus: Status) => {
    const cycleMap: Record<Status, Status> = {
      'TODO': 'IN_PROGRESS',
      'IN_PROGRESS': 'COMPLETED',
      'COMPLETED': 'TODO',
      'PARTIALLY_COMPLETED': 'TODO',
      'NOT_COMPLETED': 'TODO',
      'REST_DAY': 'TODO',
      'MISSED': 'TODO',
    };

    const nextStatus = cycleMap[currentStatus] || 'TODO';
    
    setUpdatingTaskId(taskId);
    try {
      await studyTaskApi.update(taskId, { status: nextStatus });
      // Refresh dashboard data concurrently to ensure UI is in sync
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to cycle task status:', err);
      // We can set a temporary error alert or trigger a full reload
      setError(err instanceof Error ? err.message : 'Failed to update task status');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleRetry = () => {
    setLoading(true);
    fetchDashboardData();
  };

  const handleCreatePlanNav = () => {
    navigate('/app/planner');
  };

  const handleAddTaskNav = () => {
    navigate('/app/planner');
  };

  const handleEditPlanNav = () => {
    navigate('/app/planner');
  };

  if (loading) {
    return (
      <div className="loading-state" style={{ height: '70vh' }}>
        <div className="spinner-primitive"></div>
        <p>Loading your study dashboard...</p>
      </div>
    );
  }

  if (error && !plan && !streak) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', height: '70vh' }}>
        <div className="card-primitive" style={{ maxWidth: '400px', padding: '32px' }}>
          <span style={{ fontSize: '48px' }}>⚠️</span>
          <h2 style={{ fontSize: '20px', margin: '16px 0 8px', color: 'var(--text-h)' }}>Connection Issue</h2>
          <p style={{ margin: '0 0 24px', color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5 }}>
            {error}
          </p>
          <button className="btn btn-primary" onClick={handleRetry} style={{ width: '100%' }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-grid">
      {/* Primary Column */}
      <div className="dashboard-main">
        {/* Dynamic header greeting */}
        <DashboardHeader name={user?.name} />
        
        {/* Today's plan details card */}
        <TodayPlanCard
          plan={plan}
          onCreatePlan={handleCreatePlanNav}
          onAddTask={handleAddTaskNav}
          onEditPlan={handleEditPlanNav}
          onToggleStatus={handleToggleTaskStatus}
          updatingTaskId={updatingTaskId}
        />
      </div>

      {/* Sidebar Column */}
      <div className="dashboard-sidebar">
        {/* Streak summary panel */}
        <StreakSummary streak={streak} />

        {/* Visual progress bar cards */}
        {plan && <DailyProgress plan={plan} />}

        {/* Recent Activity placeholder card */}
        <div className="card-primitive" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', marginTop: 0, marginBottom: '8px', color: 'var(--text-h)', fontWeight: 600 }}>
            Recent Activity
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Recent activity logs and completions history will be introduced in a future milestone.
          </p>
        </div>
      </div>
    </div>
  );
};
