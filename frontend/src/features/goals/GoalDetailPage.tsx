import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { goalApi } from '../../services/api.js';
import type { GoalMilestone, StudyGoal } from '../../services/api.js';
import './Goals.css';

export const GoalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [goal, setGoal] = useState<StudyGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Goal Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editTargetValue, setEditTargetValue] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');

  // Milestone Form State
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  // Manual Progress Input
  const [manualProgressInput, setManualProgressInput] = useState('');

  const fetchGoal = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await goalApi.getById(id);
      if (res.success) {
        setGoal(res.goal);
        setEditTitle(res.goal.title);
        setEditDescription(res.goal.description || '');
        setEditCategory(res.goal.category || '');
        setEditTargetDate(res.goal.targetDate || '');
        setManualProgressInput(res.goal.currentValue.toString());

        if (res.goal.targetValue) {
          const displayTarget =
            res.goal.progressType === 'FOCUS_TIME'
              ? Math.round(res.goal.targetValue / 60).toString()
              : res.goal.targetValue.toString();
          setEditTargetValue(displayTarget);
        } else {
          setEditTargetValue('');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load goal details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoal();
  }, [id]);

  const handleSaveGoalEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !goal) return;

    try {
      let parsedTarget: number | undefined;
      if (editTargetValue) {
        const p = parseInt(editTargetValue, 10);
        if (!isNaN(p) && p > 0) {
          parsedTarget = goal.progressType === 'FOCUS_TIME' ? p * 60 : p;
        }
      }

      const res = await goalApi.update(id, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        category: editCategory.trim() || null,
        targetDate: editTargetDate || null,
        targetValue: parsedTarget || null,
      });

      if (res.success) {
        setGoal(res.goal);
        setIsEditing(false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update goal');
    }
  };

  const handleUpdateManualProgress = async () => {
    if (!id) return;
    const val = parseInt(manualProgressInput, 10);
    if (isNaN(val) || val < 0) {
      alert('Please enter a valid non-negative number');
      return;
    }
    try {
      const res = await goalApi.updateManualProgress(id, val);
      if (res.success) {
        setGoal(res.goal);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update progress');
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newMilestoneTitle.trim()) return;

    try {
      const res = await goalApi.addMilestone(id, { title: newMilestoneTitle.trim() });
      if (res.success) {
        setNewMilestoneTitle('');
        fetchGoal(); // refresh goal and recalculated progress
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add milestone');
    }
  };

  const handleToggleMilestone = async (milestone: GoalMilestone) => {
    if (!id) return;
    try {
      const res = await goalApi.updateMilestone(id, milestone.id, {
        completed: !milestone.completed,
      });
      if (res.success) {
        fetchGoal();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update milestone');
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!id) return;
    try {
      const res = await goalApi.deleteMilestone(id, milestoneId);
      if (res.success) {
        fetchGoal();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete milestone');
    }
  };

  const handleCompleteGoal = async () => {
    if (!id) return;
    try {
      const res = await goalApi.complete(id);
      if (res.success) {
        setGoal(res.goal);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to complete goal');
    }
  };

  const handleArchiveGoal = async () => {
    if (!id) return;
    try {
      const res = await goalApi.archive(id);
      if (res.success) {
        setGoal(res.goal);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to archive goal');
    }
  };

  const handleDeleteGoal = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this study goal?')) return;
    try {
      const res = await goalApi.delete(id);
      if (res.success) {
        navigate('/app/goals');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete goal');
    }
  };

  if (loading) {
    return (
      <div className="goal-detail-container">
        <p style={{ color: 'var(--text-muted)' }}>Loading goal details...</p>
      </div>
    );
  }

  if (error || !goal) {
    return (
      <div className="goal-detail-container">
        <Link to="/app/goals" className="back-link">
          ← Back to Goals
        </Link>
        <div className="error-banner">{error || 'Goal not found'}</div>
      </div>
    );
  }

  const formatProgressText = () => {
    if (goal.progressType === 'FOCUS_TIME') {
      const currentHrs = (goal.currentValue / 60).toFixed(1);
      const targetHrs = goal.targetValue ? Math.round(goal.targetValue / 60) : 0;
      return `${currentHrs} / ${targetHrs} hours completed`;
    }
    if (goal.progressType === 'TASKS') {
      return `${goal.currentValue} / ${goal.targetValue || 0} tasks completed`;
    }
    if (goal.progressType === 'MILESTONES') {
      const total = goal.milestones ? goal.milestones.length : goal.targetValue || 0;
      return `${goal.currentValue} / ${total} milestones completed`;
    }
    return `${goal.currentValue} / ${goal.targetValue || 0} completed`;
  };

  return (
    <div className="goal-detail-container">
      <Link to="/app/goals" className="back-link">
        ← Back to Study Goals
      </Link>

      <div className="goal-detail-card">
        {!isEditing ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h1 style={{ margin: 0, fontSize: '26px' }}>{goal.title}</h1>
                  <span className={`status-badge ${goal.status.toLowerCase()}`}>
                    {goal.status}
                  </span>
                  {goal.category && <span className="category-tag">{goal.category}</span>}
                </div>
                {goal.description && (
                  <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '15px' }}>
                    {goal.description}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-secondary" onClick={() => setIsEditing(true)}>
                  ✏ Edit Goal
                </button>
                {goal.status === 'ACTIVE' && (
                  <>
                    <button className="btn-secondary" onClick={handleCompleteGoal}>
                      ✓ Complete
                    </button>
                    <button className="btn-secondary" onClick={handleArchiveGoal}>
                      📦 Archive
                    </button>
                  </>
                )}
                <button className="btn-danger" onClick={handleDeleteGoal}>
                  🗑 Delete
                </button>
              </div>
            </div>

            <div className="goal-progress-section" style={{ marginTop: '24px' }}>
              <div className="goal-progress-meta" style={{ fontSize: '14px' }}>
                <span>{formatProgressText()}</span>
                <span className="percentage" style={{ fontSize: '16px' }}>
                  {goal.progressPercentage}%
                </span>
              </div>
              <div className="progress-bar-bg" style={{ height: '12px', marginTop: '6px' }}>
                <div
                  className={`progress-bar-fill ${goal.progressPercentage >= 100 ? 'completed' : ''}`}
                  style={{ width: `${goal.progressPercentage}%` }}
                />
              </div>
            </div>

            {goal.targetDate && (
              <div style={{ marginTop: '16px', fontSize: '14px', color: 'var(--text-muted)' }}>
                📅 Target Deadline: <strong>{goal.targetDate}</strong>
              </div>
            )}

            {goal.progressType === 'MANUAL' && (
              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label style={{ fontSize: '14px', fontWeight: 600 }}>Update Manual Progress:</label>
                <input
                  type="number"
                  className="form-control"
                  style={{ width: '100px' }}
                  value={manualProgressInput}
                  onChange={(e) => setManualProgressInput(e.target.value)}
                />
                <button className="btn-primary" onClick={handleUpdateManualProgress}>
                  Save Counter
                </button>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleSaveGoalEdit}>
            <h3>Edit Study Goal</h3>
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                className="form-control"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                className="form-control"
                rows={3}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input
                type="text"
                className="form-control"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Target Value {goal.progressType === 'FOCUS_TIME' ? '(Hours)' : ''}</label>
              <input
                type="number"
                className="form-control"
                value={editTargetValue}
                onChange={(e) => setEditTargetValue(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Target Date</label>
              <input
                type="date"
                className="form-control"
                value={editTargetDate}
                onChange={(e) => setEditTargetDate(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Milestones Checklist */}
      <div className="milestones-card">
        <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>🎯 Goal Milestones</h3>

        {goal.milestones && goal.milestones.length > 0 ? (
          goal.milestones.map((m) => (
            <div key={m.id} className="milestone-item">
              <div className="milestone-left">
                <input
                  type="checkbox"
                  className="milestone-checkbox"
                  checked={m.completed}
                  onChange={() => handleToggleMilestone(m)}
                />
                <span className={`milestone-title ${m.completed ? 'completed' : ''}`}>
                  {m.title}
                </span>
              </div>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '2px 8px', fontSize: '12px' }}
                onClick={() => handleDeleteMilestone(m.id)}
              >
                ✕
              </button>
            </div>
          ))
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
            No milestones added to this goal yet.
          </p>
        )}

        <form onSubmit={handleAddMilestone} style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Add new milestone..."
            value={newMilestoneTitle}
            onChange={(e) => setNewMilestoneTitle(e.target.value)}
          />
          <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
            + Add
          </button>
        </form>
      </div>

      {/* Associated Tasks */}
      <div className="tasks-card">
        <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>📚 Associated Study Tasks</h3>

        {goal.tasks && goal.tasks.length > 0 ? (
          goal.tasks.map((task: any) => (
            <div
              key={task.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div>
                <span style={{ fontWeight: 500, color: 'var(--text-h)', fontSize: '15px' }}>
                  {task.title}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '12px' }}>
                  Plan: {task.studyPlan?.date || 'Unscheduled'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  ⏱ {task.actualDuration || 0} / {task.estimatedDuration} mins
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    background:
                      task.status === 'COMPLETED' ? 'var(--color-success-bg)' : 'var(--accent-bg)',
                    color: task.status === 'COMPLETED' ? 'var(--color-success)' : 'var(--accent)',
                  }}
                >
                  {task.status}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            No study tasks currently linked to this goal. You can link tasks when creating or editing tasks in the Study Planner.
          </p>
        )}
      </div>
    </div>
  );
};
