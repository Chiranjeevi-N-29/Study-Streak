import React from 'react';
import type { ReportStreakData } from '../../../services/api.js';

interface Props {
  streakReport: ReportStreakData;
}

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const StreakPerformancePanel: React.FC<Props> = ({ streakReport }) => {
  const maxAvg = Math.max(...streakReport.dayOfWeekBreakdown.map((d) => d.avgMinutes), 1);

  // Sort by canonical day order
  const sortedDow = [...streakReport.dayOfWeekBreakdown].sort(
    (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day)
  );

  const consistencyColor =
    streakReport.consistencyScore >= 75 ? 'var(--color-success)' :
    streakReport.consistencyScore >= 40 ? 'var(--color-warning)' : 'var(--color-error)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Streak KPI row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Current Streak', value: `${streakReport.currentStreak}d`, color: '#ef4444' },
          { label: 'Longest Streak', value: `${streakReport.longestStreak}d`, color: '#f59e0b' },
          {
            label: 'Consistency',
            value: `${streakReport.consistencyScore}%`,
            color: consistencyColor,
          },
          { label: 'Streak Breaks', value: `${streakReport.streakBreaks}`, color: 'var(--text-muted)' },
          {
            label: 'Longest Gap',
            value: streakReport.longestGap > 0 ? `${streakReport.longestGap}d` : '—',
            color: streakReport.longestGap >= 7 ? 'var(--color-error)' : 'var(--text-muted)',
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              flex: '1 1 100px',
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

      {/* Productive days */}
      <div style={{ display: 'flex', gap: 16 }}>
        {streakReport.mostProductiveDayOfWeek && (
          <div
            style={{
              flex: 1,
              background: 'var(--color-success-bg)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
              Most Productive Day
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-success)' }}>
              {streakReport.mostProductiveDayOfWeek}
            </div>
          </div>
        )}
        {streakReport.leastProductiveDayOfWeek && (
          <div
            style={{
              flex: 1,
              background: 'var(--color-warning-bg)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
            }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
              Least Productive Day
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-warning)' }}>
              {streakReport.leastProductiveDayOfWeek}
            </div>
          </div>
        )}
      </div>

      {/* Day of week bar chart */}
      <div>
        <div className="export-section-title" style={{ marginBottom: 12 }}>
          Average Study Minutes by Day of Week
        </div>
        {sortedDow.map((d) => (
          <div key={d.day} className="report-bar-row">
            <div className="report-bar-label">{d.day}</div>
            <div className="report-bar-track">
              <div
                className="report-bar-fill"
                style={{
                  width: `${Math.round((d.avgMinutes / maxAvg) * 100)}%`,
                  background:
                    d.day === streakReport.mostProductiveDayOfWeek
                      ? 'var(--color-success)'
                      : 'var(--primary)',
                }}
              />
            </div>
            <div className="report-bar-value">{d.avgMinutes}m</div>
          </div>
        ))}
      </div>

      {/* DOW table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="dow-table">
          <thead>
            <tr>
              <th>Day</th>
              <th>Avg Minutes</th>
              <th>Successful Days</th>
              <th>Total Days</th>
            </tr>
          </thead>
          <tbody>
            {sortedDow.map((d) => (
              <tr key={d.day}>
                <td
                  className={
                    d.day === streakReport.mostProductiveDayOfWeek ? 'dow-highlight' : ''
                  }
                >
                  {d.day}
                  {d.day === streakReport.mostProductiveDayOfWeek && ' 🏆'}
                </td>
                <td>{d.avgMinutes}m</td>
                <td>{d.successCount}</td>
                <td>{d.totalDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
