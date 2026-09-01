import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { StudyPlan, Status } from '../../../services/api.js';
import { studyPlanApi, studyTaskApi } from '../../../services/api.js';
import '../Calendar.css';
import '../../../components/UIPrimitives.css';

interface DayDetailModalProps {
  dateStr: string;
  plan: StudyPlan | null;
  onClose: () => void;
  onPlanUpdated: () => void;
}

export const DayDetailModal: React.FC<DayDetailModalProps> = ({
  dateStr,
  plan,
  onClose,
  onPlanUpdated,
}) => {
  const navigate = useNavigate();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Format date string for display (e.g., September 1, 2026)
  const formatDateDisplay = (isoDate: string) => {
    try {
      const [y, m, d] = isoDate.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return isoDate;
    }
  };

  // Toggle task status
  const handleToggleTask = async (taskId: string, currentStatus: Status) => {
    try {
      setUpdating(true);
      setError(null);
      const nextStatus: Status = currentStatus === 'COMPLETED' ? 'TODO' : 'COMPLETED';
      await studyTaskApi.update(taskId, { status: nextStatus });
      onPlanUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task status');
    } finally {
      setUpdating(false);
    }
  };

  // Mark/Unmark Rest Day
  const handleToggleRestDay = async () => {
    if (!plan) return;
    try {
      setUpdating(true);
      setError(null);
      const nextStatus: Status = plan.status === 'REST_DAY' ? 'TODO' : 'REST_DAY';
      await studyPlanApi.update(plan.id, { status: nextStatus });
      onPlanUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan status');
    } finally {
      setUpdating(false);
    }
  };

  // Create plan for empty date
  const handleCreatePlanForDay = async () => {
    try {
      setUpdating(true);
      setError(null);
      await studyPlanApi.create({
        date: dateStr,
        title: `Study Plan for ${dateStr}`,
        minimumStudyTarget: 60,
        status: 'TODO',
      });
      onPlanUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plan for date');
    } finally {
      setUpdating(false);
    }
  };

  const tasks = plan?.tasks ?? [];
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const totalActualMinutes = tasks.reduce((sum, t) => sum + (t.actualDuration || 0), 0);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" id="modal-date-title">
            📅 {formatDateDisplay(dateStr)}
          </h2>
          <button
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close detail modal"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="alert alert-error" style={{ margin: 0 }}>
              <span>⚠️</span>
              <div>{error}</div>
            </div>
          )}

          {!plan ? (
            <div style={{ textAlign: 'center', padding: '24px 12px' }}>
              <span style={{ fontSize: '48px' }}>📝</span>
              <h3 style={{ margin: '16px 0 8px', color: 'var(--text-h)', fontSize: '18px' }}>
                No Study Plan for This Day
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>
                You didn't record a study plan for {dateStr}. You can create one now or mark it as a rest day.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleCreatePlanForDay}
                  disabled={updating}
                >
                  {updating ? 'Creating...' : '➕ Create Plan'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate('/app/planner')}
                >
                  Open Study Planner
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Status Header Bar */}
              <div
                className="card-primitive"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--code-bg)',
                }}
              >
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: 'var(--text-h)' }}>
                    {plan.title || `Study Plan (${plan.date})`}
                  </h3>
                  {plan.description && (
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                      {plan.description}
                    </p>
                  )}
                </div>
                <span
                  className={`status-chip ${
                    plan.status === 'COMPLETED'
                      ? 'status-success'
                      : plan.status === 'REST_DAY'
                      ? 'status-rest'
                      : plan.status === 'MISSED'
                      ? 'status-missed'
                      : 'status-pending'
                  }`}
                  style={{ fontSize: '13px', padding: '6px 12px' }}
                >
                  {plan.status === 'REST_DAY' ? '🌿 REST DAY' : plan.status}
                </span>
              </div>

              {/* Special Rest Day Banner */}
              {plan.status === 'REST_DAY' && (
                <div
                  style={{
                    padding: '16px 20px',
                    borderRadius: 'var(--radius)',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <span style={{ fontSize: '32px' }}>🌿</span>
                  <div>
                    <h4 style={{ margin: '0 0 4px', color: '#2563eb', fontSize: '15px' }}>
                      Rest Day Protected
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                      You planned a rest day. Your consistency streak is protected!
                    </p>
                  </div>
                </div>
              )}

              {/* Special Missed Day Banner */}
              {plan.status === 'MISSED' && (
                <div
                  style={{
                    padding: '16px 20px',
                    borderRadius: 'var(--radius)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                  }}
                >
                  <span style={{ fontSize: '32px' }}>🔴</span>
                  <div>
                    <h4 style={{ margin: '0 0 4px', color: '#dc2626', fontSize: '15px' }}>
                      Missed Day
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                      No successful study commitment was recorded for this day. Keep moving forward!
                    </p>
                  </div>
                </div>
              )}

              {/* Metrics Details Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                }}
              >
                <div className="card-primitive" style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    TARGET
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-h)' }}>
                    {plan.minimumStudyTarget} min
                  </div>
                </div>

                <div className="card-primitive" style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    ACTUAL LOGGED
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-h)' }}>
                    {totalActualMinutes} min
                  </div>
                </div>

                <div className="card-primitive" style={{ padding: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    TASKS COMPLETED
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-h)' }}>
                    {completedTasks} / {tasks.length}
                  </div>
                </div>
              </div>

              {/* Tasks Section */}
              <div>
                <h4 style={{ margin: '0 0 12px', fontSize: '15px', color: 'var(--text-h)' }}>
                  Tasks ({tasks.length})
                </h4>

                {tasks.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No tasks recorded for this plan.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="card-primitive"
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background:
                            task.status === 'COMPLETED'
                              ? 'rgba(34, 197, 94, 0.05)'
                              : 'var(--surface)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleToggleTask(task.id, task.status)}
                            disabled={updating}
                            style={{
                              padding: '4px 8px',
                              fontSize: '14px',
                              lineHeight: 1,
                            }}
                            title="Toggle completion status"
                          >
                            {task.status === 'COMPLETED' ? '☑' : '☐'}
                          </button>
                          <div>
                            <div
                              style={{
                                fontSize: '14px',
                                fontWeight: 600,
                                color: 'var(--text-h)',
                                textDecoration:
                                  task.status === 'COMPLETED' ? 'line-through' : 'none',
                              }}
                            >
                              {task.title}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Category: {task.category} • Priority: {task.priority}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            fontWeight: 500,
                          }}
                        >
                          {task.actualDuration || 0} / {task.estimatedDuration} min
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          {plan && (
            <button
              className="btn btn-secondary"
              onClick={handleToggleRestDay}
              disabled={updating}
            >
              {plan.status === 'REST_DAY' ? '📖 Unmark Rest Day' : '🌿 Mark as Rest Day'}
            </button>
          )}
          <button
            className="btn btn-primary"
            onClick={() => navigate('/app/planner')}
          >
            Edit in Planner
          </button>
        </div>
      </div>
    </div>
  );
};
