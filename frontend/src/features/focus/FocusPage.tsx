import React, { useEffect, useState } from 'react';
import { focusSessionApi } from '../../services/api.js';
import type { FocusSession, FocusStats, FocusSessionStatus } from '../../services/api.js';
import { FocusTimerWidget } from './components/FocusTimerWidget.js';
import '../../components/UIPrimitives.css';
import './FocusPage.css';

export const FocusPage: React.FC = () => {
  const [stats, setStats] = useState<FocusStats | null>(null);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<FocusSession | null>(null);

  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<FocusSessionStatus | ''>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const [statsRes, listRes] = await Promise.all([
        focusSessionApi.getStats(),
        focusSessionApi.list({
          page,
          limit: 10,
          status: statusFilter || undefined,
        }),
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (listRes.success) {
        setSessions(listRes.sessions);
        setTotalPages(listRes.totalPages);
        setTotalCount(listRes.total);
      }
    } catch (err) {
      console.error('FocusPage fetch error:', err);
      setError('Failed to load focus session stats and history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, statusFilter]);

  const handleSessionCompleted = () => {
    setPage(1);
    loadData();
  };

  const formatDuration = (totalSec: number): string => {
    if (totalSec <= 0) return '0m';
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.round((totalSec % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDate = (isoStr: string): string => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  if (loading && !stats) {
    return (
      <div className="loading-state" style={{ height: '70vh' }}>
        <div className="spinner-primitive"></div>
        <p>Loading focus session analytics & timer...</p>
      </div>
    );
  }

  return (
    <div className="focus-page-container">
      <div className="focus-page-header">
        <div>
          <h1 className="focus-page-title">⏱️ Focus Sessions</h1>
          <p className="focus-page-subtitle">
            Track actual study time with persistent backend timers, eliminate drift, and boost productivity.
          </p>
        </div>
      </div>

      {error && (
        <div className="card-primitive" style={{ padding: '16px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* KPI Stats Cards */}
      {stats && (
        <div className="focus-kpi-grid">
          <div className="card-primitive focus-kpi-card">
            <span className="kpi-icon">🔥</span>
            <div className="kpi-body">
              <span className="kpi-label">Today's Focus Time</span>
              <span className="kpi-value">{formatDuration(stats.todayFocusSeconds)}</span>
            </div>
          </div>

          <div className="card-primitive focus-kpi-card">
            <span className="kpi-icon">📅</span>
            <div className="kpi-body">
              <span className="kpi-label">This Week</span>
              <span className="kpi-value">{formatDuration(stats.thisWeekFocusSeconds)}</span>
            </div>
          </div>

          <div className="card-primitive focus-kpi-card">
            <span className="kpi-icon">🏆</span>
            <div className="kpi-body">
              <span className="kpi-label">Total Focus Recorded</span>
              <span className="kpi-value">{formatDuration(stats.totalFocusSeconds)}</span>
            </div>
          </div>

          <div className="card-primitive focus-kpi-card">
            <span className="kpi-icon">📊</span>
            <div className="kpi-body">
              <span className="kpi-label">Completed Sessions</span>
              <span className="kpi-value">{stats.completedSessionsCount}</span>
            </div>
          </div>

          <div className="card-primitive focus-kpi-card">
            <span className="kpi-icon">⏳</span>
            <div className="kpi-body">
              <span className="kpi-label">Average Session</span>
              <span className="kpi-value">{formatDuration(stats.avgSessionSeconds)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Primary Focus Timer Widget */}
      <div className="focus-widget-section">
        <FocusTimerWidget onSessionCompleted={handleSessionCompleted} />
      </div>

      {/* Focus History Table */}
      <div className="card-primitive focus-history-card">
        <div className="focus-history-header">
          <h2 className="section-title">📜 Focus Session History</h2>
          
          <div className="history-filters">
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as FocusSessionStatus | '');
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="empty-history-state">
            <span style={{ fontSize: '36px' }}>⏱️</span>
            <p style={{ margin: '8px 0 0', color: 'var(--text-muted)' }}>
              No focus sessions recorded yet. Start a focus session above to begin tracking!
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="focus-table">
              <thead>
                <tr>
                  <th>Started Date & Time</th>
                  <th>Task & Category</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} onClick={() => setSelectedSession(s)} style={{ cursor: 'pointer' }}>
                    <td>{formatDate(s.startedAt)}</td>
                    <td>
                      {s.task ? (
                        <div>
                          <span className="task-cat-badge">{s.task.category}</span>
                          <span style={{ fontWeight: 500, color: 'var(--text-h)', marginLeft: '6px' }}>
                            {s.task.title}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>General Focus</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatDuration(s.durationSeconds)}</td>
                    <td>
                      <span className={`table-status-badge status-${s.status.toLowerCase()}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="pagination-bar">
            <button
              className="btn btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Previous
            </button>
            <span className="pagination-info">
              Page {page} of {totalPages} ({totalCount} sessions)
            </span>
            <button
              className="btn btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="modal-backdrop" onClick={() => setSelectedSession(null)}>
          <div className="card-primitive modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, color: 'var(--text-h)' }}>Focus Session Details</h3>
              <button className="modal-close-btn" onClick={() => setSelectedSession(null)}>✕</button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '16px 0' }}>
              <div>
                <strong>Session ID:</strong> <code style={{ fontSize: '12px' }}>{selectedSession.id}</code>
              </div>
              <div>
                <strong>Task:</strong> {selectedSession.task ? `${selectedSession.task.title} (${selectedSession.task.category})` : 'General Focus (No Task)'}
              </div>
              <div>
                <strong>Started At:</strong> {new Date(selectedSession.startedAt).toLocaleString()}
              </div>
              <div>
                <strong>Ended At:</strong> {selectedSession.endedAt ? new Date(selectedSession.endedAt).toLocaleString() : 'N/A'}
              </div>
              <div>
                <strong>Active Duration:</strong> {formatDuration(selectedSession.durationSeconds)} ({selectedSession.durationSeconds}s)
              </div>
              <div>
                <strong>Total Paused:</strong> {selectedSession.totalPausedSeconds} seconds
              </div>
              <div>
                <strong>Status:</strong> <span className={`table-status-badge status-${selectedSession.status.toLowerCase()}`}>{selectedSession.status}</span>
              </div>
            </div>

            <button className="btn btn-primary" onClick={() => setSelectedSession(null)} style={{ width: '100%' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
