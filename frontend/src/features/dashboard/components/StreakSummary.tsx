import React from 'react';
import type { StreakInfo } from '../../../services/api.js';
import '../Dashboard.css';
import '../../../components/UIPrimitives.css';

interface StreakSummaryProps {
  streak: StreakInfo | null;
}

export const StreakSummary: React.FC<StreakSummaryProps> = ({ streak }) => {
  const current = streak?.currentStreak ?? 0;
  const longest = streak?.longestStreak ?? 0;
  const successful = streak?.successfulStudyDays ?? 0;

  return (
    <div className="card-primitive">
      <h2 style={{ fontSize: '18px', marginTop: 0, marginBottom: '16px', color: 'var(--text-h)', fontWeight: 600 }}>
        Consistency Streak
      </h2>
      
      <div className="streak-grid">
        <div className="streak-card card-primitive" style={{ background: 'var(--code-bg)', border: 'none' }}>
          <span className="streak-card-icon">🔥</span>
          <p className="streak-card-value">{current}</p>
          <p className="streak-card-label">{current === 1 ? 'day' : 'days'}</p>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Current</p>
        </div>

        <div className="streak-card card-primitive" style={{ background: 'var(--code-bg)', border: 'none' }}>
          <span className="streak-card-icon">🏆</span>
          <p className="streak-card-value">{longest}</p>
          <p className="streak-card-label">{longest === 1 ? 'day' : 'days'}</p>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Longest</p>
        </div>

        <div className="streak-card card-primitive" style={{ background: 'var(--code-bg)', border: 'none' }}>
          <span className="streak-card-icon">📚</span>
          <p className="streak-card-value">{successful}</p>
          <p className="streak-card-label">{successful === 1 ? 'day' : 'days'}</p>
          <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>Success</p>
        </div>
      </div>

      {current === 0 && (
        <p style={{ margin: '16px 0 0', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
          Start your first study day today to launch your streak!
        </p>
      )}
    </div>
  );
};
