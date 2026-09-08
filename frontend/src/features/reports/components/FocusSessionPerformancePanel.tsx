import React from 'react';
import type { ReportFocusSessionData } from '../../../services/api.js';

interface Props {
  focusSessionReport: ReportFocusSessionData;
}

function fmtTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

export const FocusSessionPerformancePanel: React.FC<Props> = ({ focusSessionReport }) => {
  const sessionsByDay = focusSessionReport.sessionsByDay.slice(-30); // last 30 days max
  const maxMinutes = Math.max(...sessionsByDay.map((s) => s.totalMinutes), 1);

  const completionRate =
    focusSessionReport.totalSessions > 0
      ? Math.round((focusSessionReport.completedSessions / focusSessionReport.totalSessions) * 100)
      : 0;

  const taskLinkedPct =
    focusSessionReport.completedSessions > 0
      ? Math.round((focusSessionReport.taskLinkedSessions / focusSessionReport.completedSessions) * 100)
      : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Sessions', value: focusSessionReport.totalSessions, color: '#6366f1' },
          { label: 'Completed', value: focusSessionReport.completedSessions, color: '#22c55e' },
          { label: 'Cancelled', value: focusSessionReport.cancelledSessions, color: '#ef4444' },
          { label: 'Completion Rate', value: `${completionRate}%`, color: '#3b82f6' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              flex: '1 1 120px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Duration metrics */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Focus Time', value: fmtTime(focusSessionReport.totalFocusMinutes) },
          { label: 'Avg Session Length', value: `${focusSessionReport.avgSessionMinutes}m` },
          { label: 'Longest Session', value: `${focusSessionReport.longestSessionMinutes}m` },
          { label: 'Task-Linked', value: `${taskLinkedPct}%` },
          {
            label: 'Standalone',
            value: `${focusSessionReport.standaloneSessionsSessions}`,
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              flex: '1 1 110px',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-h)' }}>{item.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Sessions by day mini bar chart */}
      {sessionsByDay.length > 0 && (
        <div>
          <div className="export-section-title" style={{ marginBottom: 8 }}>
            Focus Sessions by Day
          </div>
          <div className="mini-bar-chart">
            {sessionsByDay.map((s) => {
              const heightPct = Math.max(4, Math.round((s.totalMinutes / maxMinutes) * 100));
              const shortDate = s.date.slice(5); // MM-DD
              return (
                <div key={s.date} className="mini-bar-col" title={`${s.date}: ${s.totalMinutes}m (${s.sessionCount} sessions)`}>
                  <div className="mini-bar" style={{ height: `${heightPct}%` }} />
                  <div className="mini-bar-date">{shortDate}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {focusSessionReport.completedSessions === 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
          No completed focus sessions in this period. Start a focus session to track your deep work time.
        </p>
      )}
    </div>
  );
};
