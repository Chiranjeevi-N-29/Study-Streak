import React from 'react';
import type { AnalyticsSummary } from '../../../services/api.js';
import '../Analytics.css';

interface CategoryBreakdownProps {
  categories: AnalyticsSummary['categoryBreakdown'];
}

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ categories }) => {
  if (!categories || categories.length === 0) {
    return (
      <div className="analytics-empty-card">
        <p>No category breakdown recorded yet.</p>
      </div>
    );
  }

  const maxCategoryMinutes = Math.max(...categories.map((c) => c.studyMinutes), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {categories.map((cat) => {
        const pct = Math.round((cat.studyMinutes / maxCategoryMinutes) * 100);
        const hours = Math.floor(cat.studyMinutes / 60);
        const mins = cat.studyMinutes % 60;
        const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        return (
          <div key={cat.category} className="category-progress-item">
            <div className="category-info-row">
              <span>{cat.category}</span>
              <span>
                {timeStr} ({cat.completedCount}/{cat.taskCount} tasks)
              </span>
            </div>
            <div className="category-bar-bg">
              <div
                className="category-bar-fill"
                style={{ width: `${pct}%` }}
                aria-label={`${cat.category}: ${timeStr}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
