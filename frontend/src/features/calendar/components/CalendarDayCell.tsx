import React from 'react';
import type { StudyPlan } from '../../../services/api.js';
import '../Calendar.css';

interface CalendarDayCellProps {
  dateStr: string;
  dayNumber: number;
  isToday: boolean;
  isFuture: boolean;
  isEmpty: boolean; // Empty padding cell for previous/next month alignment
  plan: StudyPlan | null;
  onClick: () => void;
}

export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  dateStr,
  dayNumber,
  isToday,
  isFuture,
  isEmpty,
  plan,
  onClick,
}) => {
  if (isEmpty) {
    return <div className="calendar-day-cell empty-day" aria-hidden="true" />;
  }

  // Determine status and badge details
  let statusClass = 'status-future';
  let icon = '•';
  let label = 'No Plan';
  let progressStr = '';

  if (plan) {
    const totalTasks = plan.tasks?.length ?? 0;
    const completedTasks = plan.tasks?.filter((t) => t.status === 'COMPLETED').length ?? 0;

    if (plan.status === 'COMPLETED') {
      statusClass = 'status-success';
      icon = '✓';
      label = 'COMPLETED';
      progressStr = totalTasks > 0 ? `${completedTasks}/${totalTasks}` : 'Done';
    } else if (plan.status === 'REST_DAY') {
      statusClass = 'status-rest';
      icon = '🌿';
      label = 'REST';
    } else if (plan.status === 'MISSED') {
      statusClass = 'status-missed';
      icon = '❌';
      label = 'MISSED';
    } else if (plan.status === 'PARTIALLY_COMPLETED' || plan.status === 'IN_PROGRESS' || plan.status === 'TODO') {
      statusClass = 'status-pending';
      icon = '⏳';
      label = totalTasks > 0 ? `${completedTasks}/${totalTasks}` : 'PENDING';
    }
  } else if (!isFuture && !isToday) {
    // Past day with no plan recorded
    statusClass = 'status-missed';
    icon = '❌';
    label = 'MISSED';
  } else if (isFuture) {
    statusClass = 'status-future';
    icon = '📅';
    label = 'Upcoming';
  } else if (isToday) {
    statusClass = 'status-pending';
    icon = '⏳';
    label = 'Plan Today';
  }

  // Format accessible aria-label
  const ariaLabel = `${dateStr} — ${label} ${progressStr ? `— ${progressStr} tasks` : ''}`;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`calendar-day-cell ${isToday ? 'today-cell' : ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={ariaLabel}
    >
      <div className="calendar-day-header">
        <span className="day-number">{dayNumber}</span>
        {isToday && <span className="today-badge">Today</span>}
      </div>

      <div className="day-status-content">
        <span className={`status-chip ${statusClass}`}>
          <span>{icon}</span>
          <span>{label}</span>
        </span>
        {progressStr && <span className="day-progress-text">{progressStr} tasks</span>}
      </div>
    </div>
  );
};
