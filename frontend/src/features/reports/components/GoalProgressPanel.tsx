import React from 'react';
import type { ReportGoalItem } from '../../../services/api.js';

interface Props {
  goalReport: ReportGoalItem[];
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

export const GoalProgressPanel: React.FC<Props> = ({ goalReport }) => {
  if (goalReport.length === 0) {
    return (
      <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
        No goals found. Create your first study goal to track progress here.
      </p>
    );
  }

  const active = goalReport.filter((g) => g.status === 'ACTIVE');
  const completed = goalReport.filter((g) => g.status === 'COMPLETED');
  const archived = goalReport.filter((g) => g.status === 'ARCHIVED');

  const renderGoal = (goal: ReportGoalItem) => {
    const isOverdue = goal.isOverdue;
    const badgeCls = isOverdue ? 'overdue' : goal.status.toLowerCase();

    let deadlineLabel = '';
    if (goal.daysUntilDeadline !== null) {
      if (isOverdue) deadlineLabel = `${Math.abs(goal.daysUntilDeadline)}d overdue`;
      else if (goal.daysUntilDeadline === 0) deadlineLabel = 'Due today';
      else deadlineLabel = `${goal.daysUntilDeadline}d left`;
    }

    return (
      <div key={goal.id} className={`goal-report-item ${isOverdue ? 'overdue' : ''}`}>
        <div className="goal-report-item-header">
          <div>
            <div className="goal-report-item-title">{goal.title}</div>
            <div className="goal-report-item-meta">
              {goal.category && <span>{goal.category} · </span>}
              {goal.progressType}
              {goal.milestoneTotal > 0 && (
                <span> · {goal.milestoneCompleted}/{goal.milestoneTotal} milestones</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span className={`status-badge ${badgeCls}`}>
              {isOverdue ? 'Overdue' : STATUS_LABEL[goal.status] ?? goal.status}
            </span>
            {deadlineLabel && (
              <span
                style={{
                  fontSize: 11,
                  color: isOverdue ? 'var(--color-error)' : 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                {deadlineLabel}
              </span>
            )}
          </div>
        </div>

        <div className="goal-progress-bar-track">
          <div
            className="goal-progress-bar-fill"
            style={{
              width: `${goal.progressPercentage}%`,
              background: goal.status === 'COMPLETED'
                ? 'var(--color-success)'
                : isOverdue
                ? 'var(--color-error)'
                : 'var(--primary)',
            }}
          />
        </div>
        <div className="goal-progress-label">
          <span>
            {goal.targetValue !== null
              ? `${goal.currentValue} / ${goal.targetValue} ${goal.progressType === 'FOCUS_TIME' ? 'min' : ''}`
              : goal.progressType === 'MILESTONES'
              ? `${goal.milestoneCompleted} / ${goal.milestoneTotal} milestones`
              : ''}
          </span>
          <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>
            {goal.progressPercentage}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="goal-report-list">
      {/* Summary row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        {[
          { label: 'Active', count: active.length, color: 'var(--primary)' },
          { label: 'Completed', count: completed.length, color: 'var(--color-success)' },
          { label: 'Archived', count: archived.length, color: 'var(--text-muted)' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              padding: '8px 14px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flex: '1 1 100px',
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 700, color: item.color }}>{item.count}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Active goals first */}
      {active.length > 0 && (
        <>
          <div className="export-section-title" style={{ marginBottom: 4 }}>Active Goals</div>
          {active.map(renderGoal)}
        </>
      )}
      {completed.length > 0 && (
        <>
          <div className="export-section-title" style={{ marginTop: 8, marginBottom: 4 }}>Completed Goals</div>
          {completed.slice(0, 3).map(renderGoal)}
          {completed.length > 3 && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              +{completed.length - 3} more completed goals
            </p>
          )}
        </>
      )}
    </div>
  );
};
