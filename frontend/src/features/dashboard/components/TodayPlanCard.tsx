import React from 'react';
import { TaskList } from './TaskList.js';
import type { StudyPlan, Status } from '../../../services/api.js';
import '../Dashboard.css';
import '../../../components/UIPrimitives.css';

interface TodayPlanCardProps {
  plan: StudyPlan | null;
  onCreatePlan: () => void;
  onAddTask: () => void;
  onEditPlan: () => void;
  onToggleStatus: (taskId: string, currentStatus: Status) => Promise<void>;
  updatingTaskId: string | null;
}

export const TodayPlanCard: React.FC<TodayPlanCardProps> = ({
  plan,
  onCreatePlan,
  onAddTask,
  onEditPlan,
  onToggleStatus,
  updatingTaskId,
}) => {
  if (!plan) {
    return (
      <div className="card-primitive empty-state" style={{ padding: '40px 24px', background: 'var(--surface)' }}>
        <span style={{ fontSize: '48px' }}>📅</span>
        <h3 style={{ margin: '16px 0 8px', fontSize: '18px', color: 'var(--text-h)', fontWeight: 600 }}>No study plan for today</h3>
        <p style={{ margin: '0 0 20px', color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5, maxWidth: '400px' }}>
          Consistency starts with planning. Decide what you want to accomplish today to keep your streak alive.
        </p>
        <button className="btn btn-primary" onClick={onCreatePlan}>
          Create Today's Plan
        </button>
      </div>
    );
  }

  // Handle Special Status: REST_DAY
  if (plan.status === 'REST_DAY') {
    return (
      <div className="card-primitive calm-state-card" style={{ borderColor: 'var(--accent-border)', background: 'var(--accent-bg)' }}>
        <span style={{ fontSize: '48px' }}>🌿</span>
        <h2 style={{ fontSize: '22px', margin: '0', color: 'var(--accent)', fontWeight: 700 }}>Rest Day</h2>
        <p style={{ margin: '8px 0 0', fontSize: '15px', color: 'var(--text-h)', fontWeight: 500 }}>
          You planned a rest day today.
        </p>
        <p style={{ margin: '4px 0 16px', fontSize: '14px', color: 'var(--text-muted)' }}>
          Your streak is protected. Enjoy your break!
        </p>
        <button className="btn btn-secondary" onClick={onEditPlan}>
          Edit Plan / Resume Study
        </button>
      </div>
    );
  }

  // Handle Special Status: MISSED
  if (plan.status === 'MISSED') {
    return (
      <div className="card-primitive calm-state-card" style={{ borderColor: 'var(--color-error)' }}>
        <span style={{ fontSize: '48px' }}>⏳</span>
        <h2 style={{ fontSize: '22px', margin: '0', color: 'var(--color-error)', fontWeight: 700 }}>MISSED</h2>
        <p style={{ margin: '8px 0 0', fontSize: '15px', color: 'var(--text-h)', fontWeight: 500 }}>
          Today's status is missed.
        </p>
        <p style={{ margin: '4px 0 16px', fontSize: '14px', color: 'var(--text-muted)' }}>
          Tomorrow is a new opportunity.
        </p>
        <button className="btn btn-secondary" onClick={onEditPlan}>
          Edit Plan Settings
        </button>
      </div>
    );
  }

  const tasks = plan.tasks ?? [];
  const actualMinutes = tasks.reduce((sum, t) => sum + t.actualDuration, 0);

  return (
    <div className="card-primitive plan-detail-card">
      <div className="plan-detail-header">
        <div>
          <span className={`status-badge status-${plan.status.toLowerCase()}`} style={{ marginBottom: '8px' }}>
            {plan.status}
          </span>
          <h2 className="plan-detail-title">{plan.title || 'Today\'s Study Plan'}</h2>
          {plan.description && <p className="plan-detail-desc">{plan.description}</p>}
        </div>
        
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Minimum Target</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-h)' }}>
            {plan.minimumStudyTarget} min
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Progress</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-h)' }}>
            {actualMinutes} / {plan.minimumStudyTarget} min
          </div>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />

      {/* Task List */}
      <TaskList
        tasks={tasks}
        onToggleStatus={onToggleStatus}
        updatingTaskId={updatingTaskId}
        onAddTask={onAddTask}
      />

      {/* Footer Plan Actions */}
      <div className="plan-actions-container">
        <button className="btn btn-secondary" onClick={onEditPlan}>
          ⚙️ Edit Plan Settings
        </button>
      </div>
    </div>
  );
};
