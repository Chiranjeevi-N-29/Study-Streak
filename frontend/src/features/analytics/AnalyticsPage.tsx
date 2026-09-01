import React, { useCallback, useEffect, useState } from 'react';
import type { AnalyticsSummary } from '../../services/api.js';
import { analyticsApi } from '../../services/api.js';
import { DailyTimeChart } from './components/DailyTimeChart.js';
import { CompletionTrendChart } from './components/CompletionTrendChart.js';
import { CategoryBreakdown } from './components/CategoryBreakdown.js';
import { MoodOverview } from './components/MoodOverview.js';
import { HabitsCard } from './components/HabitsCard.js';
import './Analytics.css';
import '../../components/UIPrimitives.css';

type RangeOption = '7d' | '30d' | '90d' | 'all';

export const AnalyticsPage: React.FC = () => {
  const [range, setRange] = useState<RangeOption>('30d');
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsApi.get(range);
      if (res.success) {
        setData(res.analytics);
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError("We couldn't load your study analytics.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Format study minutes into Xh Ym
  const formatTimeMinutes = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
  };

  if (error) {
    return (
      <div className="analytics-page-container">
        <div
          style={{
            height: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="card-primitive" style={{ maxWidth: '400px', padding: '32px', textAlign: 'center' }}>
            <span style={{ fontSize: '48px' }}>⚠️</span>
            <h2 style={{ fontSize: '20px', margin: '16px 0 8px', color: 'var(--text-h)' }}>
              Connection Issue
            </h2>
            <p style={{ margin: '0 0 24px', color: 'var(--text-muted)', fontSize: '14px' }}>
              {error}
            </p>
            <button className="btn btn-primary" onClick={fetchAnalytics} style={{ width: '100%' }}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hasData = data && (data.kpis.totalStudyMinutes > 0 || data.kpis.plannedTasksCount > 0);

  return (
    <div className="analytics-page-container">
      {/* Header & Range Selector */}
      <div className="analytics-header-section">
        <div className="analytics-title-group">
          <h1>Study Analytics & Progress</h1>
          <p>Track your consistency, focus categories, and task completion trends over time.</p>
        </div>

        <div className="range-selector-group" role="tablist" aria-label="Select analytics time range">
          {(['7d', '30d', '90d', 'all'] as RangeOption[]).map((r) => {
            const labelMap: Record<RangeOption, string> = {
              '7d': '7 Days',
              '30d': '30 Days',
              '90d': '90 Days',
              all: 'All Time',
            };
            return (
              <button
                key={r}
                className={`range-tab-btn ${range === r ? 'active' : ''}`}
                onClick={() => setRange(r)}
                role="tab"
                aria-selected={range === r}
              >
                {labelMap[r]}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="card-primitive" style={{ padding: '60px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Gathering progress insights...</p>
        </div>
      ) : !data || !hasData ? (
        <div className="analytics-empty-card">
          <span>📊</span>
          <h3>No study data yet for this period</h3>
          <p>
            Start completing study plans and logging task durations to unlock your personalized study analytics!
          </p>
        </div>
      ) : (
        <>
          {/* Core KPI Cards Row */}
          <div className="kpi-metrics-grid">
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                🔥
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Current Streak</div>
                <div className="kpi-value">{data.kpis.currentStreak} days</div>
                <div className="kpi-subtext">Best: {data.kpis.longestStreak} days</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                ⏱
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Total Study Time</div>
                <div className="kpi-value">{formatTimeMinutes(data.kpis.totalStudyMinutes)}</div>
                <div className="kpi-subtext">Avg: {data.kpis.avgStudyMinutesPerDay} min/day</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                ✅
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Tasks Completed</div>
                <div className="kpi-value">
                  {data.kpis.completedTasksCount} / {data.kpis.plannedTasksCount}
                </div>
                <div className="kpi-subtext">Planned commitments</div>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                📈
              </div>
              <div className="kpi-content">
                <div className="kpi-label">Completion Rate</div>
                <div className="kpi-value">{data.kpis.completionRate}%</div>
                <div className="kpi-subtext">Overall target achievement</div>
              </div>
            </div>
          </div>

          {/* Daily Study Time Chart */}
          <div className="analytics-chart-card">
            <div className="chart-header">
              <div>
                <h3>Daily Study Time</h3>
                <div className="chart-subtitle">Daily actual minutes logged</div>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Avg per active day: <strong>{data.kpis.avgStudyMinutesPerSuccessfulDay}m</strong>
              </div>
            </div>
            <DailyTimeChart data={data.dailyTimeSeries} />
          </div>

          {/* Completion Trend & Priority Breakdown */}
          <div className="analytics-grid-two-col">
            <div className="analytics-chart-card">
              <div className="chart-header">
                <h3>Completion Rate Trend</h3>
                <div className="chart-subtitle">Weekly average task completion %</div>
              </div>
              <CompletionTrendChart data={data.weeklyBreakdown} />
            </div>

            <div className="analytics-chart-card">
              <div className="chart-header">
                <h3>Priority Performance</h3>
                <div className="chart-subtitle">Completion rate by task priority</div>
              </div>
              <div className="priority-cards-grid" style={{ marginTop: '20px' }}>
                {data.priorityPerformance.map((prio) => (
                  <div key={prio.priority} className="priority-stat-card">
                    <span
                      className={`priority-badge ${
                        prio.priority === 'HIGH'
                          ? 'priority-high'
                          : prio.priority === 'MEDIUM'
                          ? 'priority-medium'
                          : 'priority-low'
                      }`}
                    >
                      {prio.priority}
                    </span>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-h)' }}>
                      {prio.completionRate}%
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {prio.completedTasks}/{prio.totalTasks} tasks
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Category Distribution & Reflection Mood */}
          <div className="analytics-grid-two-col">
            <div className="analytics-chart-card">
              <div className="chart-header">
                <h3>Study by Category</h3>
                <div className="chart-subtitle">Subject focus breakdown</div>
              </div>
              <CategoryBreakdown categories={data.categoryBreakdown} />
            </div>

            <div className="analytics-chart-card">
              <div className="chart-header">
                <h3>Reflection Mood Correlation</h3>
                <div className="chart-subtitle">Mood breakdown & avg study minutes</div>
              </div>
              <MoodOverview moodData={data.moodAnalytics} />
            </div>
          </div>

          {/* Habits Insights */}
          <div className="analytics-chart-card">
            <div className="chart-header">
              <h3>Study Habits & Patterns</h3>
              <div className="chart-subtitle">Descriptive performance observations</div>
            </div>
            <HabitsCard habits={data.studyHabits} />
          </div>

          {/* Weekly Summary Table */}
          {data.weeklyBreakdown.length > 0 && (
            <div className="analytics-chart-card">
              <div className="chart-header">
                <h3>Weekly Summary Breakdown</h3>
                <div className="chart-subtitle">Aggregated metrics by week</div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '13px',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <th style={{ padding: '12px 8px' }}>Week</th>
                      <th style={{ padding: '12px 8px' }}>Study Time</th>
                      <th style={{ padding: '12px 8px' }}>Tasks Completed</th>
                      <th style={{ padding: '12px 8px' }}>Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.weeklyBreakdown.map((row) => (
                      <tr
                        key={row.weekLabel}
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <td style={{ padding: '12px 8px', fontWeight: 600, color: 'var(--text-h)' }}>
                          {row.weekLabel}
                        </td>
                        <td style={{ padding: '12px 8px' }}>{formatTimeMinutes(row.studyMinutes)}</td>
                        <td style={{ padding: '12px 8px' }}>
                          {row.tasksCompleted} / {row.plannedTasks}
                        </td>
                        <td style={{ padding: '12px 8px', fontWeight: 600 }}>{row.completionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
