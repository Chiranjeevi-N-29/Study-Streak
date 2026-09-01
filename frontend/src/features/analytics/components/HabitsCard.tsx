import React from 'react';
import type { AnalyticsSummary } from '../../../services/api.js';
import '../Analytics.css';

interface HabitsCardProps {
  habits: AnalyticsSummary['studyHabits'];
}

export const HabitsCard: React.FC<HabitsCardProps> = ({ habits }) => {
  const { mostProductiveDayOfWeek, topCategory, avgDailyMinutes } = habits;

  return (
    <div className="habits-grid">
      <div className="habit-card">
        <span className="habit-icon">📅</span>
        <div>
          <div className="kpi-label">Peak Study Day</div>
          <div className="kpi-value">
            {mostProductiveDayOfWeek ? mostProductiveDayOfWeek : 'N/A'}
          </div>
          <div className="kpi-subtext">
            {mostProductiveDayOfWeek
              ? `You studied the most on ${mostProductiveDayOfWeek}s`
              : 'Keep logging plans to see peak days'}
          </div>
        </div>
      </div>

      <div className="habit-card">
        <span className="habit-icon">⏱</span>
        <div>
          <div className="kpi-label">Daily Average</div>
          <div className="kpi-value">{avgDailyMinutes} min</div>
          <div className="kpi-subtext">Average study duration per day</div>
        </div>
      </div>

      <div className="habit-card">
        <span className="habit-icon">📚</span>
        <div>
          <div className="kpi-label">Top Category</div>
          <div className="kpi-value">{topCategory ? topCategory : 'N/A'}</div>
          <div className="kpi-subtext">
            {topCategory
              ? `Most focused study subject`
              : 'Categorize tasks to see top subject'}
          </div>
        </div>
      </div>
    </div>
  );
};
