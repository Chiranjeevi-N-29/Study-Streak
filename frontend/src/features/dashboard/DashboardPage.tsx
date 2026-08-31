import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.js';
import { streakApi } from '../../services/api.js';
import type { StreakInfo } from '../../services/api.js';
import '../../components/UIPrimitives.css';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchStreak = async () => {
      try {
        const data = await streakApi.get();
        if (active) {
          setStreak(data);
        }
      } catch {
        if (active) {
          setError('Could not fetch streak data. Please try again.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchStreak();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner-primitive"></div>
        <p>Loading your dashboard details...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'left', padding: '12px 0' }}>
      {/* Welcome Header Banner */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', margin: '0 0 8px', fontWeight: '700', color: 'var(--text-h)' }}>
          Welcome back, {user?.name}!
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '16px' }}>
          Here is your study consistency summary for today. Let's keep building that streak!
        </p>
      </div>

      {/* Streak Dashboard Metrics */}
      {error ? (
        <div className="alert-primitive alert-error" style={{ marginBottom: '24px' }}>
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
          gap: '20px',
          marginBottom: '32px'
        }}>
          <div className="card-primitive" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', textAlign: 'center' }}>
            <span style={{ fontSize: '48px', marginBottom: '8px' }}>🔥</span>
            <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Streak</h3>
            <p style={{ margin: 0, fontSize: '36px', fontWeight: '700', color: 'var(--text-h)' }}>
              {streak?.currentStreak ?? 0} {streak?.currentStreak === 1 ? 'day' : 'days'}
            </p>
          </div>

          <div className="card-primitive" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', textAlign: 'center' }}>
            <span style={{ fontSize: '48px', marginBottom: '8px' }}>🏆</span>
            <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Longest Streak</h3>
            <p style={{ margin: 0, fontSize: '36px', fontWeight: '700', color: 'var(--text-h)' }}>
              {streak?.longestStreak ?? 0} {streak?.longestStreak === 1 ? 'day' : 'days'}
            </p>
          </div>

          <div className="card-primitive" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', textAlign: 'center' }}>
            <span style={{ fontSize: '48px', marginBottom: '8px' }}>📚</span>
            <h3 style={{ margin: '0 0 4px', fontSize: '15px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Successful Days</h3>
            <p style={{ margin: 0, fontSize: '36px', fontWeight: '700', color: 'var(--text-h)' }}>
              {streak?.successfulStudyDays ?? 0} {streak?.successfulStudyDays === 1 ? 'day' : 'days'}
            </p>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="card-primitive" style={{ padding: '24px', background: 'var(--accent-bg)', borderColor: 'var(--accent-border)' }}>
        <h2 style={{ fontSize: '20px', marginTop: 0, marginBottom: '12px', color: 'var(--primary)' }}>
          💡 Consistency Tip
        </h2>
        <p style={{ margin: 0, lineHeight: 1.6, fontSize: '15px', color: 'var(--text)' }}>
          To maintain your streak, make sure to either complete all the planned tasks for today, or complete study tasks that sum up to your plan's **minimum study target**. If you need a break, you can mark today as a **Rest Day** in the planner to bridge your streak without losing progress!
        </p>
      </div>
    </div>
  );
};
