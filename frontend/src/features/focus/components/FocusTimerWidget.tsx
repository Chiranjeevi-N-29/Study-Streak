import React, { useEffect, useState, useRef } from 'react';
import { focusSessionApi, studyPlanApi } from '../../../services/api.js';
import type { FocusSession, StudyTask } from '../../../services/api.js';
import '../../../components/UIPrimitives.css';
import './FocusTimerWidget.css';

interface FocusTimerWidgetProps {
  onSessionCompleted?: () => void;
  tasks?: StudyTask[];
  compact?: boolean;
}

export const FocusTimerWidget: React.FC<FocusTimerWidgetProps> = ({
  onSessionCompleted,
  tasks: propsTasks,
  compact = false,
}) => {
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [availableTasks, setAvailableTasks] = useState<StudyTask[]>(propsTasks || []);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch active session & today's tasks if not provided as props
  const fetchActiveState = async () => {
    try {
      setError(null);
      const [activeRes, planRes] = await Promise.all([
        focusSessionApi.getActive(),
        propsTasks ? Promise.resolve(null) : studyPlanApi.getToday().catch(() => null),
      ]);

      if (activeRes.success) {
        setActiveSession(activeRes.activeSession);
      }

      if (planRes && planRes.studyPlan && planRes.studyPlan.tasks) {
        setAvailableTasks(planRes.studyPlan.tasks);
      } else if (propsTasks) {
        setAvailableTasks(propsTasks);
      }
    } catch (err) {
      console.error('FocusTimerWidget sync error:', err);
      setError('Could not sync focus timer with server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveState();
  }, []);

  // Update elapsed seconds ticker based on server timestamp & status
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!activeSession) {
      setElapsedSeconds(0);
      return;
    }

    const computeElapsed = () => {
      const started = new Date(activeSession.startedAt).getTime();
      const totalPaused = activeSession.totalPausedSeconds || 0;

      if (activeSession.status === 'RUNNING') {
        const now = Date.now();
        const raw = Math.floor((now - started) / 1000);
        return Math.max(0, raw - totalPaused);
      } else if (activeSession.status === 'PAUSED' && activeSession.pausedAt) {
        const pausedAtTime = new Date(activeSession.pausedAt).getTime();
        const raw = Math.floor((pausedAtTime - started) / 1000);
        return Math.max(0, raw - totalPaused);
      }
      return activeSession.durationSeconds || 0;
    };

    setElapsedSeconds(computeElapsed());

    if (activeSession.status === 'RUNNING') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(computeElapsed());
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [activeSession]);

  const handleStart = async () => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await focusSessionApi.start(selectedTaskId || undefined);
      if (res.success) {
        setActiveSession(res.session);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start focus session.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    if (!activeSession) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await focusSessionApi.pause(activeSession.id);
      if (res.success) {
        setActiveSession(res.session);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause session.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    if (!activeSession) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await focusSessionApi.resume(activeSession.id);
      if (res.success) {
        setActiveSession(res.session);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume session.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!activeSession) return;
    setActionLoading(true);
    setError(null);
    try {
      const res = await focusSessionApi.complete(activeSession.id);
      if (res.success) {
        setActiveSession(null);
        if (onSessionCompleted) {
          onSessionCompleted();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete focus session.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!activeSession) return;
    if (!window.confirm('Are you sure you want to cancel this focus session? Cancelled time will not be recorded.')) {
      return;
    }
    setActionLoading(true);
    setError(null);
    try {
      const res = await focusSessionApi.cancel(activeSession.id);
      if (res.success) {
        setActiveSession(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel session.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTimeDisplay = (totalSec: number): string => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hours > 0) {
      return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  if (loading) {
    return (
      <div className="card-primitive focus-widget-card" style={{ padding: compact ? '16px' : '24px' }}>
        <div className="spinner-primitive" style={{ width: '24px', height: '24px', margin: '0 auto 8px' }} />
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
          Syncing focus timer...
        </p>
      </div>
    );
  }

  return (
    <div className={`card-primitive focus-widget-card ${compact ? 'compact' : ''}`}>
      <div className="focus-widget-header">
        <h3 className="focus-widget-title">
          <span className="focus-widget-icon">⏱️</span> Focus Session
        </h3>
        {activeSession && (
          <span className={`focus-status-badge status-${activeSession.status.toLowerCase()}`}>
            {activeSession.status === 'RUNNING' ? '● Live Focus' : '❚❚ Paused'}
          </span>
        )}
      </div>

      {error && (
        <div className="focus-widget-error" role="alert">
          {error}
        </div>
      )}

      {/* Active Session Display */}
      {activeSession ? (
        <div className="focus-active-container">
          {/* Active Task Info */}
          <div className="active-task-label">
            {activeSession.task ? (
              <>
                <span className="task-category-tag">{activeSession.task.category}</span>
                <span className="task-name">{activeSession.task.title}</span>
              </>
            ) : (
              <span className="standalone-session-tag">General Focus (No Task)</span>
            )}
          </div>

          {/* Large Countdown/Elapsed Digits */}
          <div className={`timer-digits ${activeSession.status === 'PAUSED' ? 'paused-pulse' : ''}`}>
            {formatTimeDisplay(elapsedSeconds)}
          </div>

          {/* Controls */}
          <div className="focus-actions-row">
            {activeSession.status === 'RUNNING' ? (
              <button
                className="btn btn-secondary btn-focus-control"
                onClick={handlePause}
                disabled={actionLoading}
                aria-label="Pause focus session"
              >
                ❚❚ Pause
              </button>
            ) : (
              <button
                className="btn btn-primary btn-focus-control"
                onClick={handleResume}
                disabled={actionLoading}
                aria-label="Resume focus session"
              >
                ▶ Resume
              </button>
            )}

            <button
              className="btn btn-primary btn-focus-finish"
              onClick={handleComplete}
              disabled={actionLoading}
              aria-label="Finish focus session"
            >
              ✓ Complete Session
            </button>

            <button
              className="btn btn-secondary btn-focus-cancel"
              onClick={handleCancel}
              disabled={actionLoading}
              aria-label="Cancel focus session"
              title="Cancel session without saving study duration"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        /* Start New Session Container */
        <div className="focus-idle-container">
          <p className="focus-idle-subtitle">
            Track actual study time and boost your learning consistency.
          </p>

          <div className="task-selector-group">
            <label htmlFor="focus-task-select" className="focus-input-label">
              Select Study Task (Optional):
            </label>
            <select
              id="focus-task-select"
              className="focus-task-select"
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              disabled={actionLoading}
            >
              <option value="">-- General Focus Session --</option>
              {availableTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.category}) — {t.estimatedDuration}m est.
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-primary btn-start-focus"
            onClick={handleStart}
            disabled={actionLoading}
          >
            {actionLoading ? 'Starting Session...' : '🚀 Start Focus Session'}
          </button>
        </div>
      )}
    </div>
  );
};
