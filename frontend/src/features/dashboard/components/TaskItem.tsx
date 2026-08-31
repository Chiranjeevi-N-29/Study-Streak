import React from 'react';
import type { StudyTask, Status } from '../../../services/api.js';
import '../Dashboard.css';

interface TaskItemProps {
  task: StudyTask;
  onToggleStatus: (taskId: string, currentStatus: Status) => Promise<void>;
  updatingTaskId: string | null;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onToggleStatus, updatingTaskId }) => {
  const isUpdating = updatingTaskId === task.id;

  const getStatusSymbol = () => {
    switch (task.status) {
      case 'COMPLETED':
        return '☑';
      case 'IN_PROGRESS':
        return '◐';
      default:
        return '☐';
    }
  };

  const getStatusClassName = () => {
    switch (task.status) {
      case 'COMPLETED':
        return 'task-checkbox-completed';
      case 'IN_PROGRESS':
        return 'task-checkbox-in-progress';
      default:
        return '';
    }
  };

  const getPriorityClassName = () => {
    switch (task.priority) {
      case 'HIGH':
        return 'task-row-priority-high';
      case 'MEDIUM':
        return 'task-row-priority-medium';
      default:
        return 'task-row-priority-low';
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isUpdating) return;
    onToggleStatus(task.id, task.status);
  };

  return (
    <div className="task-row-item">
      <div className="task-row-left">
        {/* Toggle Status Checkbox */}
        <button
          onClick={handleClick}
          disabled={isUpdating}
          className={`task-checkbox-btn ${getStatusClassName()}`}
          aria-label={`Cycle status for task: ${task.title}. Current status: ${task.status}`}
        >
          {isUpdating ? '⏳' : getStatusSymbol()}
        </button>

        <div className="task-row-info">
          <span className="task-row-title">{task.title}</span>
          <div className="task-row-meta">
            <span className="task-row-category">{task.category}</span>
            <span>•</span>
            <span className={getPriorityClassName()}>{task.priority}</span>
            <span>•</span>
            <span className={`status-badge status-${task.status.toLowerCase()}`}>
              {task.status}
            </span>
          </div>
        </div>
      </div>

      <div className="task-row-right">
        <span className="task-row-duration">
          {task.actualDuration} / {task.estimatedDuration} min
        </span>
      </div>
    </div>
  );
};
