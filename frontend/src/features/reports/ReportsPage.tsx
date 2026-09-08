import React, { useCallback, useEffect, useState } from 'react';
import type { ReportData, ReportRange } from '../../services/api.js';
import { reportsApi } from '../../services/api.js';
import { ReportOverview } from './components/ReportOverview.js';
import { StudyTimeTrendChart } from './components/StudyTimeTrendChart.js';
import { TaskPerformancePanel } from './components/TaskPerformancePanel.js';
import { GoalProgressPanel } from './components/GoalProgressPanel.js';
import { StreakPerformancePanel } from './components/StreakPerformancePanel.js';
import { FocusSessionPerformancePanel } from './components/FocusSessionPerformancePanel.js';
import { InsightsPanel } from './components/InsightsPanel.js';
import { ExportPanel } from './components/ExportPanel.js';
import './Reports.css';
import '../../components/UIPrimitives.css';

type TabRange = '7d' | '30d' | '90d' | 'all' | 'custom';

const RANGE_LABELS: Record<TabRange, string> = {
  '7d': '7 Days',
  '30d': '30 Days',
  '90d': '90 Days',
  all: 'All Time',
  custom: 'Custom',
};

const SECTIONS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'trends', label: '📈 Study Trends' },
  { id: 'tasks', label: '✅ Task Performance' },
  { id: 'goals', label: '🎯 Goal Progress' },
  { id: 'streak', label: '🔥 Streak & Habits' },
  { id: 'focus', label: '⏱ Focus Sessions' },
  { id: 'insights', label: '💡 Insights' },
  { id: 'export', label: '📤 Export Data' },
] as const;

export const ReportsPage: React.FC = () => {
  const [range, setRange] = useState<TabRange>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('overview');

  const fetchReport = useCallback(async () => {
    if (range === 'custom' && (!customStart || !customEnd)) return;

    setLoading(true);
    setError(null);
    try {
      const res = await reportsApi.get({
        range: range as ReportRange,
        startDate: range === 'custom' ? customStart : undefined,
        endDate: range === 'custom' ? customEnd : undefined,
      });
      if (res.success) {
        setData(res.report);
      }
    } catch (err) {
      console.error('Reports fetch error:', err);
      setError('Failed to load report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [range, customStart, customEnd]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const hasData =
    data &&
    (data.overview.totalStudyMinutes > 0 || data.overview.totalTasksPlanned > 0);

  if (error) {
    return (
      <div className="reports-page">
        <div className="reports-empty">
          <div className="empty-icon">⚠️</div>
          <h3>Report Unavailable</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchReport} style={{ marginTop: 16 }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-page">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="reports-header">
        <div className="reports-title-group">
          <h1>Advanced Reports & Insights</h1>
          <p>
            {data?.dateRange.label
              ? `Showing data for: ${data.dateRange.label} (${data.dateRange.startDate} → ${data.dateRange.endDate})`
              : 'Detailed analysis of your study patterns, goals, and habits.'}
          </p>
        </div>

        <div className="reports-controls">
          {/* Range Tabs */}
          <div className="range-tabs" role="tablist" aria-label="Report time range">
            {(Object.keys(RANGE_LABELS) as TabRange[]).map((r) => (
              <button
                key={r}
                role="tab"
                aria-selected={range === r}
                className={`range-tab ${range === r ? 'active' : ''}`}
                onClick={() => setRange(r)}
              >
                {RANGE_LABELS[r]}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          {range === 'custom' && (
            <div className="custom-date-inputs">
              <input
                id="report-start-date"
                type="date"
                value={customStart}
                max={customEnd || undefined}
                onChange={(e) => setCustomStart(e.target.value)}
                aria-label="Start date"
              />
              <span>→</span>
              <input
                id="report-end-date"
                type="date"
                value={customEnd}
                min={customStart || undefined}
                onChange={(e) => setCustomEnd(e.target.value)}
                aria-label="End date"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Section Navigation ─────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          borderBottom: '1px solid var(--border)',
          paddingBottom: 12,
        }}
      >
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setActiveSection(s.id);
              document.getElementById(`report-section-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            style={{
              padding: '6px 14px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: activeSection === s.id ? 'var(--accent-bg)' : 'var(--surface)',
              color: activeSection === s.id ? 'var(--primary)' : 'var(--text-muted)',
              fontWeight: activeSection === s.id ? 600 : 400,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.2s',
              borderColor: activeSection === s.id ? 'var(--primary)' : undefined,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Loading ────────────────────────────────────────────────────── */}
      {loading && (
        <div className="reports-loading">
          <div className="spinner" />
          <span>Generating your report…</span>
        </div>
      )}

      {/* ── Empty State ────────────────────────────────────────────────── */}
      {!loading && !hasData && (
        <div className="reports-empty">
          <div className="empty-icon">📊</div>
          <h3>No study data for this period</h3>
          <p>
            Complete study plans and log focus sessions to see a detailed report here.
          </p>
        </div>
      )}

      {/* ── Report Sections ────────────────────────────────────────────── */}
      {!loading && data && hasData && (
        <>
          {/* Overview */}
          <div id="report-section-overview" className="report-card">
            <div className="report-card-header">
              <div>
                <h2>📊 Overview</h2>
                <div className="report-card-subtitle">Key performance metrics for the selected period</div>
              </div>
            </div>
            <div className="report-card-body">
              <ReportOverview overview={data.overview} />
            </div>
          </div>

          {/* Study Trends */}
          <div id="report-section-trends" className="report-card">
            <div className="report-card-header">
              <div>
                <h2>📈 Study Time Trends</h2>
                <div className="report-card-subtitle">Daily / weekly study time with planned vs actual comparison</div>
              </div>
            </div>
            <div className="report-card-body">
              <StudyTimeTrendChart
                dailyTimeSeries={data.dailyTimeSeries}
                weeklyBreakdown={data.weeklyBreakdown}
                plannedVsActual={data.plannedVsActual}
              />
            </div>
          </div>

          {/* Task Performance & Goal Progress side by side */}
          <div className="report-two-col">
            <div id="report-section-tasks" className="report-card">
              <div className="report-card-header">
                <div>
                  <h2>✅ Task Performance</h2>
                  <div className="report-card-subtitle">Category breakdown and priority completion rates</div>
                </div>
              </div>
              <div className="report-card-body">
                <TaskPerformancePanel
                  categoryStats={data.categoryStats}
                  priorityStats={data.priorityStats}
                />
              </div>
            </div>

            <div id="report-section-goals" className="report-card">
              <div className="report-card-header">
                <div>
                  <h2>🎯 Goal Progress</h2>
                  <div className="report-card-subtitle">Active, completed, and overdue study goals</div>
                </div>
              </div>
              <div className="report-card-body">
                <GoalProgressPanel goalReport={data.goalReport} />
              </div>
            </div>
          </div>

          {/* Streak & Focus side by side */}
          <div className="report-two-col">
            <div id="report-section-streak" className="report-card">
              <div className="report-card-header">
                <div>
                  <h2>🔥 Streak & Habits</h2>
                  <div className="report-card-subtitle">Consistency score and day-of-week patterns</div>
                </div>
              </div>
              <div className="report-card-body">
                <StreakPerformancePanel streakReport={data.streakReport} />
              </div>
            </div>

            <div id="report-section-focus" className="report-card">
              <div className="report-card-header">
                <div>
                  <h2>⏱ Focus Sessions</h2>
                  <div className="report-card-subtitle">Pomodoro & timer performance over time</div>
                </div>
              </div>
              <div className="report-card-body">
                <FocusSessionPerformancePanel focusSessionReport={data.focusSessionReport} />
              </div>
            </div>
          </div>

          {/* Insights */}
          <div id="report-section-insights" className="report-card">
            <div className="report-card-header">
              <div>
                <h2>💡 Study Insights</h2>
                <div className="report-card-subtitle">
                  Deterministic, explainable observations about your study patterns
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  background: 'var(--accent-bg)',
                  color: 'var(--primary)',
                  padding: '3px 10px',
                  borderRadius: 9999,
                  fontWeight: 600,
                }}
              >
                {data.insights.length} insights
              </span>
            </div>
            <div className="report-card-body">
              <InsightsPanel insights={data.insights} />
            </div>
          </div>

          {/* Export */}
          <div id="report-section-export" className="report-card">
            <div className="report-card-header">
              <div>
                <h2>📤 Export Your Data</h2>
                <div className="report-card-subtitle">
                  Download your study data as JSON or CSV — yours to keep
                </div>
              </div>
            </div>
            <div className="report-card-body">
              <ExportPanel
                activeRange={range as ReportRange}
                customStart={customStart || undefined}
                customEnd={customEnd || undefined}
              />
            </div>
          </div>
        </>
      )}

      {/* ── Export always visible (even without data) ──────────────── */}
      {!loading && data && !hasData && (
        <div id="report-section-export" className="report-card">
          <div className="report-card-header">
            <div>
              <h2>📤 Export Your Data</h2>
              <div className="report-card-subtitle">Download all your data as JSON or CSV</div>
            </div>
          </div>
          <div className="report-card-body">
            <ExportPanel
              activeRange={range as ReportRange}
              customStart={customStart || undefined}
              customEnd={customEnd || undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
};
