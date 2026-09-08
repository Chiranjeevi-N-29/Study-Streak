import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { plannerApi } from '../../services/api.js';
import type { PlannerWeeklyResponse } from '../../services/api.js';
import './PlannerWeeklyWidget.css';

export const PlannerWeeklyWidget: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<PlannerWeeklyResponse['data'] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchWeeklySummary = async () => {
      try {
        const res = await plannerApi.getWeek();
        if (active && res.success) {
          setData(res.data);
        }
      } catch (err) {
        if (active) {
          setError('Failed to load weekly planner summary');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchWeeklySummary();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="planner-widget-card loading">
        <p>Loading weekly plan...</p>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { weeklySummary, days } = data;

  return (
    <div className="planner-widget-card">
      <div className="planner-widget-header">
        <div>
          <h3>Weekly Study Planner</h3>
          <p className="planner-widget-subtitle">
            Planned: <strong>{weeklySummary.totalPlannedMinutes}m</strong> | Completed Focus: <strong>{weeklySummary.totalActualFocusMinutes}m</strong>
          </p>
        </div>
        <button
          className="planner-widget-btn"
          onClick={() => navigate('/planner')}
        >
          Open Planner
        </button>
      </div>

      <div className="planner-widget-days">
        {days.map((day) => {
          const maxMin = Math.max(day.dailyGoalMinutes, day.plannedMinutes, 1);
          const plannedPct = Math.min(100, Math.round((day.plannedMinutes / maxMin) * 100));
          const focusPct = Math.min(100, Math.round((day.actualFocusMinutes / maxMin) * 100));

          return (
            <div
              key={day.date}
              className={`planner-widget-day-col ${day.isToday ? 'is-today' : ''}`}
              title={`${day.dayName} ${day.date}: ${day.plannedMinutes}m planned, ${day.actualFocusMinutes}m focused`}
            >
              <div className="planner-widget-bars">
                <div
                  className="planner-widget-bar-planned"
                  style={{ height: `${plannedPct}%` }}
                />
                <div
                  className="planner-widget-bar-actual"
                  style={{ height: `${focusPct}%` }}
                />
              </div>
              <span className="planner-widget-day-label">{day.dayName.slice(0, 3)}</span>
              <span className={`planner-widget-badge badge-${day.workloadStatus.toLowerCase()}`}>
                {day.workloadStatus}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
