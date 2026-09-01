import React from 'react';
import type { AnalyticsSummary } from '../../../services/api.js';
import '../Analytics.css';

interface MoodOverviewProps {
  moodData: AnalyticsSummary['moodAnalytics'];
}

const MOOD_EMOJIS: Record<string, string> = {
  GREAT: '🔥',
  GOOD: '😊',
  OKAY: '😐',
  DIFFICULT: '😓',
  ROUGH: '🔴',
};

export const MoodOverview: React.FC<MoodOverviewProps> = ({ moodData }) => {
  const { counts, avgMinutesByMood } = moodData;
  const totalReflections = Object.values(counts).reduce((a, b) => a + b, 0);

  if (totalReflections === 0) {
    return (
      <div className="analytics-empty-card">
        <p>No daily reflections recorded in this period yet.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
        Based on your recorded daily reflections, these are the average study times associated with each mood.
      </p>

      <div className="mood-bars-container">
        {Object.entries(counts).map(([mood, count]) => {
          if (count === 0) return null;
          const emoji = MOOD_EMOJIS[mood] || '📝';
          const avgMins = avgMinutesByMood[mood] || 0;

          return (
            <div key={mood} className="mood-row">
              <div className="mood-title">
                <span>{emoji}</span>
                <span>{mood}</span>
              </div>
              <div className="mood-stats">
                {count} {count === 1 ? 'day' : 'days'} • Avg {avgMins} min study
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
