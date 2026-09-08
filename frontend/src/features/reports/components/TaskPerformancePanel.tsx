import React from 'react';
import type { ReportCategoryStat, ReportPriorityStat } from '../../../services/api.js';

interface Props {
  categoryStats: ReportCategoryStat[];
  priorityStats: ReportPriorityStat[];
}

function fmtTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

const CATEGORY_COLORS = [
  '#6366f1', '#3b82f6', '#22c55e', '#f59e0b', '#ec4899',
  '#14b8a6', '#a855f7', '#ef4444', '#64748b', '#0ea5e9',
];

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#22c55e',
};

export const TaskPerformancePanel: React.FC<Props> = ({ categoryStats, priorityStats }) => {
  const maxCategoryMinutes = Math.max(...categoryStats.map((c) => c.studyMinutes), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Category Breakdown */}
      <div>
        <div className="export-section-title" style={{ marginBottom: 12 }}>
          Study Time by Category
        </div>
        {categoryStats.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
            No category data in this period.
          </p>
        ) : (
          categoryStats.map((cat, idx) => (
            <div key={cat.category} className="report-bar-row">
              <div
                className="report-bar-label"
                title={cat.category}
              >
                {cat.category}
              </div>
              <div className="report-bar-track">
                <div
                  className="report-bar-fill"
                  style={{
                    width: `${Math.round((cat.studyMinutes / maxCategoryMinutes) * 100)}%`,
                    background: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                  }}
                />
              </div>
              <div className="report-bar-value">{fmtTime(cat.studyMinutes)}</div>
            </div>
          ))
        )}
      </div>

      {/* Category Stats Table */}
      {categoryStats.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="dow-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Tasks</th>
                <th>Completed</th>
                <th>Rate</th>
                <th>Est. vs Actual</th>
              </tr>
            </thead>
            <tbody>
              {categoryStats.map((cat) => (
                <tr key={cat.category}>
                  <td style={{ fontWeight: 600 }}>{cat.category}</td>
                  <td>{cat.taskCount}</td>
                  <td>{cat.completedCount}</td>
                  <td>
                    <span
                      style={{
                        color: cat.completionRate >= 75 ? 'var(--color-success)' :
                               cat.completionRate >= 50 ? 'var(--color-warning)' : 'var(--color-error)',
                        fontWeight: 600,
                      }}
                    >
                      {cat.completionRate}%
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {cat.estimatedMinutes > 0
                      ? `${Math.round(cat.actualVsEstimatedRatio * 100)}% of est.`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Priority Breakdown */}
      <div>
        <div className="export-section-title" style={{ marginBottom: 12 }}>
          Priority Performance
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {priorityStats.map((p) => (
            <div
              key={p.priority}
              style={{
                flex: '1 1 140px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 700,
                  marginBottom: 10,
                  background: `${PRIORITY_COLORS[p.priority]}20`,
                  color: PRIORITY_COLORS[p.priority],
                }}
              >
                {p.priority}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-h)' }}>
                {p.completionRate}%
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {p.completedTasks} / {p.totalTasks} tasks
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {fmtTime(p.totalActualMinutes)} studied
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
