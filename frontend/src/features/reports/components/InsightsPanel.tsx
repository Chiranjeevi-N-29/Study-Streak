import React from 'react';
import type { ReportInsight } from '../../../services/api.js';

interface Props {
  insights: ReportInsight[];
}

const INSIGHT_ICONS: Record<string, string> = {
  positive: '✅',
  warning: '⚠️',
  neutral: '💡',
  info: '📊',
};

export const InsightsPanel: React.FC<Props> = ({ insights }) => {
  if (insights.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
        Study some more to unlock personalized insights!
      </div>
    );
  }

  return (
    <div className="insights-grid">
      {insights.map((insight, idx) => (
        <div key={idx} className={`insight-card ${insight.type}`}>
          <div className="insight-icon">{INSIGHT_ICONS[insight.type] || '💡'}</div>
          <div className="insight-title">{insight.title}</div>
          <div className="insight-body">{insight.body}</div>
          {insight.metric !== undefined && (
            <div className="insight-metric">{insight.metric}</div>
          )}
        </div>
      ))}
    </div>
  );
};
