import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { goalApi } from '../../services/api.js';
import type { GoalStatus, StudyGoal } from '../../services/api.js';
import { CreateGoalModal } from './components/CreateGoalModal.js';
import './Goals.css';

export const GoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [activeTab, setActiveTab] = useState<GoalStatus>('ACTIVE');
  const [searchCategory, setSearchCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchGoals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await goalApi.list({ status: activeTab });
      if (res.success) {
        setGoals(res.goals);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load study goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [activeTab]);

  const handleGoalCreated = (newGoal: StudyGoal) => {
    if (activeTab === 'ACTIVE') {
      setGoals((prev) => [newGoal, ...prev]);
    }
  };

  const handleComplete = async (goalId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await goalApi.complete(goalId);
      if (res.success) {
        fetchGoals();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to complete goal');
    }
  };

  const handleArchive = async (goalId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await goalApi.archive(goalId);
      if (res.success) {
        fetchGoals();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to archive goal');
    }
  };

  const handleUnarchive = async (goalId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await goalApi.unarchive(goalId);
      if (res.success) {
        fetchGoals();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to restore goal');
    }
  };

  const handleDelete = async (goalId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this study goal?')) return;
    try {
      const res = await goalApi.delete(goalId);
      if (res.success) {
        setGoals((prev) => prev.filter((g) => g.id !== goalId));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete goal');
    }
  };

  const filteredGoals = goals.filter((g) => {
    if (!searchCategory) return true;
    const cat = g.category || '';
    const title = g.title || '';
    return (
      cat.toLowerCase().includes(searchCategory.toLowerCase()) ||
      title.toLowerCase().includes(searchCategory.toLowerCase())
    );
  });

  const getDeadlineBadge = (targetDate?: string | null) => {
    if (!targetDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="deadline-badge overdue">
          ⚠️ Overdue by {Math.abs(diffDays)} day{Math.abs(diffDays) === 1 ? '' : 's'}
        </span>
      );
    } else if (diffDays === 0) {
      return <span className="deadline-badge upcoming">⏳ Due Today</span>;
    } else if (diffDays <= 7) {
      return (
        <span className="deadline-badge upcoming">
          ⏳ Due in {diffDays} day{diffDays === 1 ? '' : 's'}
        </span>
      );
    } else {
      return (
        <span className="deadline-badge normal">
          📅 Due in {diffDays} day{diffDays === 1 ? '' : 's'}
        </span>
      );
    }
  };

  const formatProgressText = (goal: StudyGoal) => {
    if (goal.progressType === 'FOCUS_TIME') {
      const currentHrs = (goal.currentValue / 60).toFixed(1);
      const targetHrs = goal.targetValue ? Math.round(goal.targetValue / 60) : 0;
      return `${currentHrs} / ${targetHrs} hours`;
    }
    if (goal.progressType === 'TASKS') {
      return `${goal.currentValue} / ${goal.targetValue || 0} tasks`;
    }
    if (goal.progressType === 'MILESTONES') {
      const total = goal.milestones ? goal.milestones.length : goal.targetValue || 0;
      return `${goal.currentValue} / ${total} milestones`;
    }
    return `${goal.currentValue} / ${goal.targetValue || 0}`;
  };

  return (
    <div className="goals-container">
      <div className="goals-header">
        <div>
          <h1>🎯 Study Goals & Long-Term Progress</h1>
          <p>Define ambitious study targets and track your journey over time.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + Create Goal
        </button>
      </div>

      <div className="goals-controls-bar">
        <div className="goals-tabs">
          <button
            className={`tab-btn ${activeTab === 'ACTIVE' ? 'active' : ''}`}
            onClick={() => setActiveTab('ACTIVE')}
          >
            Active Goals
          </button>
          <button
            className={`tab-btn ${activeTab === 'COMPLETED' ? 'active' : ''}`}
            onClick={() => setActiveTab('COMPLETED')}
          >
            Completed
          </button>
          <button
            className={`tab-btn ${activeTab === 'ARCHIVED' ? 'active' : ''}`}
            onClick={() => setActiveTab('ARCHIVED')}
          >
            Archived
          </button>
        </div>

        <input
          type="text"
          className="goals-search-input"
          placeholder="Filter by title or category..."
          value={searchCategory}
          onChange={(e) => setSearchCategory(e.target.value)}
        />
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Loading goals...
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="empty-goals-state">
          <h3>No {activeTab.toLowerCase()} goals found</h3>
          <p style={{ marginBottom: '16px' }}>
            {activeTab === 'ACTIVE'
              ? 'Start building momentum by creating your first long-term study goal!'
              : `You have no ${activeTab.toLowerCase()} study goals.`}
          </p>
          {activeTab === 'ACTIVE' && (
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              + Create Study Goal
            </button>
          )}
        </div>
      ) : (
        <div className="goals-grid">
          {filteredGoals.map((goal) => (
            <div key={goal.id} className="goal-card">
              <div className="goal-card-top">
                <div className="goal-card-header">
                  <Link to={`/app/goals/${goal.id}`} className="goal-title-link">
                    {goal.title}
                  </Link>
                  {goal.category && <span className="category-tag">{goal.category}</span>}
                </div>

                {goal.description && <p className="goal-description">{goal.description}</p>}

                <div className="goal-progress-section">
                  <div className="goal-progress-meta">
                    <span>{formatProgressText(goal)}</span>
                    <span className="percentage">{goal.progressPercentage}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div
                      className={`progress-bar-fill ${goal.progressPercentage >= 100 ? 'completed' : ''}`}
                      style={{ width: `${goal.progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="goal-card-footer">
                <div>{getDeadlineBadge(goal.targetDate)}</div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {goal.status === 'ACTIVE' && (
                    <>
                      <button
                        className="btn-secondary"
                        onClick={(e) => handleComplete(goal.id, e)}
                        title="Mark Complete"
                      >
                        ✓ Complete
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={(e) => handleArchive(goal.id, e)}
                        title="Archive"
                      >
                        📦 Archive
                      </button>
                    </>
                  )}
                  {goal.status === 'ARCHIVED' && (
                    <button
                      className="btn-secondary"
                      onClick={(e) => handleUnarchive(goal.id, e)}
                      title="Restore"
                    >
                      ↩ Restore
                    </button>
                  )}
                  <button
                    className="btn-danger"
                    onClick={(e) => handleDelete(goal.id, e)}
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateGoalModal
          onClose={() => setShowCreateModal(false)}
          onGoalCreated={handleGoalCreated}
        />
      )}
    </div>
  );
};
