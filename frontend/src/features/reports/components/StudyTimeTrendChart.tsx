import React from 'react';
import type { ReportDailyPoint, ReportWeeklyPoint, PlannedVsActualPoint } from '../../../services/api.js';

interface Props {
  dailyTimeSeries: ReportDailyPoint[];
  weeklyBreakdown: ReportWeeklyPoint[];
  plannedVsActual: PlannedVsActualPoint[];
}

function fmtTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#22c55e',
  MISSED: '#ef4444',
  REST_DAY: '#6366f1',
  NO_PLAN: '#64748b',
  TODO: '#f59e0b',
  IN_PROGRESS: '#3b82f6',
};

export const StudyTimeTrendChart: React.FC<Props> = ({
  dailyTimeSeries,
  weeklyBreakdown,
  plannedVsActual,
}) => {
  // Show weekly bars if more than 14 days
  const useWeekly = dailyTimeSeries.length > 21;
  const data = useWeekly ? weeklyBreakdown : dailyTimeSeries;
  const maxMinutes = Math.max(
    ...data.map((d) => ('studyMinutes' in d ? d.studyMinutes : 0)),
    1
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Bar chart */}
      <div>
        <div className="export-section-title" style={{ marginBottom: 8 }}>
          {useWeekly ? 'Weekly Study Time' : 'Daily Study Time'}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: useWeekly ? 6 : 3,
            height: 120,
            padding: '4px 0 8px',
          }}
        >
          {data.map((d, i) => {
            const minutes = 'studyMinutes' in d ? d.studyMinutes : 0;
            const heightPct = Math.max(2, Math.round((minutes / maxMinutes) * 100));
            const label = 'weekLabel' in d ? d.weekLabel.split('–')[0].trim() : (d as ReportDailyPoint).dayOfWeek;
            const barColor =
              'status' in d
                ? STATUS_COLORS[(d as ReportDailyPoint).status] || '#6366f1'
                : '#6366f1';

            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  height: '100%',
                  justifyContent: 'flex-end',
                  cursor: 'default',
                }}
                title={`${('date' in d ? (d as ReportDailyPoint).date : ('weekLabel' in d ? (d as ReportWeeklyPoint).weekLabel : ''))}: ${fmtTime(minutes)}`}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${heightPct}%`,
                    background: barColor,
                    borderRadius: '3px 3px 0 0',
                    opacity: 0.85,
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = '1')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = '0.85')}
                />
                {data.length <= 21 && (
                  <span
                    style={{
                      fontSize: 9,
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      maxWidth: '100%',
                    }}
                  >
                    {label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
          {Object.entries(STATUS_COLORS).slice(0, 4).map(([status, color]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Planned vs Actual table */}
      {plannedVsActual.length > 0 && (
        <div>
          <div className="export-section-title" style={{ marginBottom: 8 }}>
            Planned vs Actual Study Time (per week)
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="dow-table">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Planned</th>
                  <th>Actual</th>
                  <th>Variance</th>
                </tr>
              </thead>
              <tbody>
                {plannedVsActual.map((row) => (
                  <tr key={row.weekLabel}>
                    <td style={{ fontWeight: 600, color: 'var(--text-h)' }}>{row.weekLabel}</td>
                    <td>{fmtTime(row.plannedMinutes)}</td>
                    <td>{fmtTime(row.actualMinutes)}</td>
                    <td>
                      <span
                        style={{
                          color: row.variance >= 0 ? 'var(--color-success)' : 'var(--color-error)',
                          fontWeight: 600,
                        }}
                      >
                        {row.variance >= 0 ? '+' : ''}
                        {row.variancePct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Weekly summary table */}
      {weeklyBreakdown.length > 0 && (
        <div>
          <div className="export-section-title" style={{ marginBottom: 8 }}>
            Weekly Summary
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="dow-table">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Study Time</th>
                  <th>Focus Time</th>
                  <th>Tasks</th>
                  <th>Completion</th>
                  <th>✓ Days</th>
                </tr>
              </thead>
              <tbody>
                {weeklyBreakdown.map((row) => (
                  <tr key={row.weekLabel}>
                    <td style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: 12 }}>
                      {row.weekLabel}
                    </td>
                    <td>{fmtTime(row.studyMinutes)}</td>
                    <td>{fmtTime(row.focusMinutes)}</td>
                    <td>{row.tasksCompleted}/{row.plannedTasks}</td>
                    <td>
                      <span
                        style={{
                          color:
                            row.completionRate >= 75 ? 'var(--color-success)' :
                            row.completionRate >= 50 ? 'var(--color-warning)' : 'var(--color-error)',
                          fontWeight: 600,
                        }}
                      >
                        {row.completionRate}%
                      </span>
                    </td>
                    <td>{row.successfulDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
