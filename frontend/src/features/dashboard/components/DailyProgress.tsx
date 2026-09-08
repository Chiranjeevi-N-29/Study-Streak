import React from 'react';
import type { StudyPlan } from '../../../services/api.js';
import '../Dashboard.css';
import '../../../components/UIPrimitives.css';

interface DailyProgressProps {
  plan: StudyPlan | null;
  dailyStudyGoalMinutes?: number;
}

export const DailyProgress: React.FC<DailyProgressProps> = ({ plan, dailyStudyGoalMinutes }) => {
  const tasks = plan?.tasks ?? [];
  const totalTasks = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  
  // Sum actual duration from all tasks
  const actualMinutes = tasks.reduce((sum, t) => sum + t.actualDuration, 0);
  const targetMinutes = dailyStudyGoalMinutes ?? plan?.minimumStudyTarget ?? 60;

  const taskPercentage = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;
  const studyTimePercentage = targetMinutes > 0 ? Math.min(100, Math.round((actualMinutes / targetMinutes) * 100)) : 0;

  return (
    <div className="card-primitive progress-section">
      <h2 style={{ fontSize: '18px', marginTop: 0, marginBottom: '8px', color: 'var(--text-h)', fontWeight: 600 }}>
        Today's Progress
      </h2>

      {/* Task Completion Progress */}
      <div className="progress-widget">
        <div className="progress-widget-header">
          <span className="progress-widget-label">Task Completion</span>
          <span className="progress-widget-value">{taskPercentage}%</span>
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${taskPercentage}%` }} />
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
          {completedTasksCount} of {totalTasks} tasks completed
        </p>
      </div>

      {/* Daily Study Goal Progress */}
      <div className="progress-widget">
        <div className="progress-widget-header">
          <span className="progress-widget-label">Daily Study Goal</span>
          <span className="progress-widget-value">{studyTimePercentage}%</span>
        </div>
        <div className="progress-bar-track">
          <div className="progress-bar-fill" style={{ width: `${studyTimePercentage}%` }} />
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
          {actualMinutes} / {targetMinutes} min logged ({studyTimePercentage}% complete)
        </p>
      </div>
    </div>
  );
};

