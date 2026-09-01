import React, { useCallback, useEffect, useState } from 'react';
import type { AchievementItem } from '../../services/api.js';
import { achievementApi } from '../../services/api.js';
import './Achievements.css';
import '../../components/UIPrimitives.css';

type StatusFilter = 'ALL' | 'UNLOCKED' | 'LOCKED';
type CategoryFilter = 'ALL' | 'STREAK' | 'TASKS' | 'STUDY_TIME' | 'REFLECTION' | 'CONSISTENCY';

export const AchievementsPage: React.FC = () => {
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');

  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await achievementApi.getAll();
      if (res.success) {
        setAchievements(res.achievements);
      }
    } catch (err) {
      console.error('Achievements fetch error:', err);
      setError("We couldn't load your achievements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAchievements();
  }, [fetchAchievements]);

  // Format unlocked date (e.g. Sep 1, 2026)
  const formatUnlockDate = (isoStr: string | null) => {
    if (!isoStr) return null;
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  // Filtered achievements
  const filteredAchievements = achievements.filter((ach) => {
    if (statusFilter === 'UNLOCKED' && !ach.unlocked) return false;
    if (statusFilter === 'LOCKED' && ach.unlocked) return false;
    if (categoryFilter !== 'ALL' && ach.category !== categoryFilter) return false;
    return true;
  });

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
  const overallPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  if (error) {
    return (
      <div className="achievements-page-container">
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
            <button className="btn btn-primary" onClick={fetchAchievements} style={{ width: '100%' }}>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="achievements-page-container">
      {/* Header */}
      <div className="achievements-header-section">
        <div className="achievements-title-group">
          <h1>Achievements & Milestones</h1>
          <p>Earn badges by maintaining study streaks, completing tasks, and building consistency.</p>
        </div>
      </div>

      {/* Unlock Progress Summary */}
      {!loading && totalCount > 0 && (
        <div className="unlock-summary-card">
          <div className="unlock-summary-text">
            <h3>
              🏆 Unlocked {unlockedCount} of {totalCount} Achievements
            </h3>
            <p>Keep studying to unlock the remaining milestones!</p>
          </div>

          <div className="unlock-progress-outer">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--text-h)',
              }}
            >
              <span>Total Progress</span>
              <span>{overallPct}%</span>
            </div>
            <div className="achievement-progress-bg">
              <div
                className="achievement-progress-fill"
                style={{ width: `${overallPct}%` }}
                aria-label={`Overall achievements progress: ${overallPct}%`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Filters Row */}
      <div className="achievements-filter-row">
        {/* Status Filter Tabs */}
        <div className="status-filter-group" role="tablist" aria-label="Filter achievements by status">
          {(['ALL', 'UNLOCKED', 'LOCKED'] as StatusFilter[]).map((st) => (
            <button
              key={st}
              className={`filter-tab-btn ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
              role="tab"
              aria-selected={statusFilter === st}
            >
              {st === 'ALL' ? 'All' : st === 'UNLOCKED' ? 'Unlocked' : 'Locked'}
            </button>
          ))}
        </div>

        {/* Category Filter Pills */}
        <div className="category-filter-group" role="group" aria-label="Filter achievements by category">
          <button
            className={`cat-pill-btn ${categoryFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('ALL')}
          >
            All Categories
          </button>
          <button
            className={`cat-pill-btn ${categoryFilter === 'STREAK' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('STREAK')}
          >
            🔥 Streak
          </button>
          <button
            className={`cat-pill-btn ${categoryFilter === 'TASKS' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('TASKS')}
          >
            📚 Tasks
          </button>
          <button
            className={`cat-pill-btn ${categoryFilter === 'STUDY_TIME' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('STUDY_TIME')}
          >
            ⏱ Study Time
          </button>
          <button
            className={`cat-pill-btn ${categoryFilter === 'REFLECTION' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('REFLECTION')}
          >
            📝 Reflection
          </button>
          <button
            className={`cat-pill-btn ${categoryFilter === 'CONSISTENCY' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('CONSISTENCY')}
          >
            🌱 Consistency
          </button>
        </div>
      </div>

      {/* Achievements Cards Grid */}
      {loading ? (
        <div className="card-primitive" style={{ padding: '60px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Loading your achievements...</p>
        </div>
      ) : filteredAchievements.length === 0 ? (
        <div className="analytics-empty-card">
          <span>🏆</span>
          <h3>No achievements match your filter</h3>
          <p>Try selecting a different status or category filter.</p>
        </div>
      ) : (
        <div className="achievements-grid">
          {filteredAchievements.map((ach) => {
            const pct = Math.min(
              100,
              Math.round((ach.progress / ach.threshold) * 100)
            );
            const dateStr = formatUnlockDate(ach.unlockedAt);

            return (
              <div
                key={ach.code}
                className={`achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}`}
              >
                <span className="achievement-category-tag">{ach.category}</span>

                <div className="achievement-card-header">
                  <div className="achievement-icon">{ach.icon}</div>
                  <div className="achievement-title-group">
                    <h4>{ach.title}</h4>
                    <p className="achievement-desc">{ach.description}</p>
                  </div>
                </div>

                <div className="achievement-progress-box">
                  <div className="achievement-progress-header">
                    <span>Progress</span>
                    <span>
                      {ach.progress} / {ach.threshold}
                    </span>
                  </div>
                  <div className="achievement-progress-bg">
                    <div
                      className="achievement-progress-fill"
                      style={{ width: `${pct}%` }}
                      aria-label={`${ach.title} progress: ${ach.progress} of ${ach.threshold}`}
                    />
                  </div>
                </div>

                <div
                  className={`unlock-badge ${ach.unlocked ? 'unlocked' : 'locked'}`}
                >
                  {ach.unlocked ? (
                    <>
                      <span>✓</span>
                      <span>Unlocked {dateStr ? `on ${dateStr}` : ''}</span>
                    </>
                  ) : (
                    <>
                      <span>🔒</span>
                      <span>Locked</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
