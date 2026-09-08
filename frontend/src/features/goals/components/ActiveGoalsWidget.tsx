import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { goalApi } from '../../../services/api.js';
import type { StudyGoal } from '../../../services/api.js';
import '../Goals.css';

export const ActiveGoalsWidget: React.FC = () => {
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    goalApi
      .list({ status: 'ACTIVE' })
      .then((res) => {
        if (isMounted && res.success) {
          setGoals(res.goals.slice(0, 3)); // show top 3 active goals
        }
      })
      .catch((err) => {
        console.error('Failed to load active goals widget:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="dashboard-goals-widget">
        <div className="widget-header">
          <h3>🎯 Active Study Goals</h3>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading goals...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-goals-widget">
      <div className="widget-header">
        <h3>🎯 Active Study Goals</h3>
        <Link to="/app/goals" style={{ fontSize: '13px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
          View All ({goals.length})
        </Link>
      </div>

      {goals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
          No active study goals set. <Link to="/app/goals" style={{ color: 'var(--primary)' }}>Create one</Link>!
        </div>
      ) : (
        goals.map((goal) => {
          let valueText = `${goal.currentValue} ${goal.targetValue ? `/ ${goal.targetValue}` : ''}`;
          if (goal.progressType === 'FOCUS_TIME') {
            const currentHours = (goal.currentValue / 60).toFixed(1);
            const targetHours = goal.targetValue ? Math.round(goal.targetValue / 60) : 0;
            valueText = `${currentHours} / ${targetHours} hrs`;
          } else if (goal.progressType === 'TASKS') {
            valueText = `${goal.currentValue} / ${goal.targetValue || 0} tasks`;
          }

          return (
            <div key={goal.id} className="widget-goal-item">
              <div className="widget-goal-header">
                <Link to={`/app/goals/${goal.id}`} style={{ color: 'var(--text-h)', textDecoration: 'none' }}>
                  {goal.title}
                </Link>
                <span>{goal.progressPercentage}%</span>
              </div>

              <div className="progress-bar-bg" style={{ height: '6px', margin: '4px 0' }}>
                <div
                  className={`progress-bar-fill ${goal.progressPercentage >= 100 ? 'completed' : ''}`}
                  style={{ width: `${goal.progressPercentage}%` }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>{valueText}</span>
                {goal.targetDate && <span>Due {goal.targetDate}</span>}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
