import React from 'react';
import type { ReportOverview as ReportOverviewType } from '../../../services/api.js';

interface Props {
  overview: ReportOverviewType;
}

function fmtTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

interface KpiItem {
  icon: string;
  label: string;
  value: string;
  sub?: string;
  colorBg: string;
  colorText: string;
}

export const ReportOverview: React.FC<Props> = ({ overview }) => {
  const kpis: KpiItem[] = [
    {
      icon: '⏱',
      label: 'Total Study Time',
      value: fmtTime(overview.totalStudyMinutes),
      sub: `Avg ${overview.avgDailyMinutes}m/day`,
      colorBg: 'rgba(59, 130, 246, 0.12)',
      colorText: '#3b82f6',
    },
    {
      icon: '✅',
      label: 'Tasks Completed',
      value: `${overview.totalTasksCompleted}`,
      sub: `of ${overview.totalTasksPlanned} planned`,
      colorBg: 'rgba(34, 197, 94, 0.12)',
      colorText: '#22c55e',
    },
    {
      icon: '📈',
      label: 'Task Completion',
      value: `${overview.taskCompletionRate}%`,
      sub: 'Of planned tasks done',
      colorBg: 'rgba(99, 102, 241, 0.12)',
      colorText: '#6366f1',
    },
    {
      icon: '🎯',
      label: 'Day Success Rate',
      value: `${overview.dayCompletionRate}%`,
      sub: `${overview.successfulDays} successful days`,
      colorBg: 'rgba(245, 158, 11, 0.12)',
      colorText: '#f59e0b',
    },
    {
      icon: '🔥',
      label: 'Missed Days',
      value: `${overview.missedDays}`,
      sub: `${overview.restDays} rest days`,
      colorBg: 'rgba(239, 68, 68, 0.12)',
      colorText: '#ef4444',
    },
    {
      icon: '🧠',
      label: 'Focus Sessions',
      value: `${overview.totalFocusSessions}`,
      sub: `${fmtTime(overview.totalFocusMinutes)} total focus`,
      colorBg: 'rgba(168, 85, 247, 0.12)',
      colorText: '#a855f7',
    },
    {
      icon: '⚡',
      label: 'Avg Focus Session',
      value: `${overview.avgFocusSessionMinutes}m`,
      sub: 'Per completed session',
      colorBg: 'rgba(236, 72, 153, 0.12)',
      colorText: '#ec4899',
    },
    {
      icon: '📅',
      label: 'Avg Active Day',
      value: fmtTime(overview.avgActiveDayMinutes),
      sub: 'On successful days',
      colorBg: 'rgba(20, 184, 166, 0.12)',
      colorText: '#14b8a6',
    },
  ];

  return (
    <div className="overview-kpi-grid">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="overview-kpi-item">
          <div
            className="kpi-icon-box"
            style={{ background: kpi.colorBg, color: kpi.colorText }}
          >
            {kpi.icon}
          </div>
          <div className="kpi-text">
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value">{kpi.value}</div>
            {kpi.sub && <div className="kpi-sub">{kpi.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
};
