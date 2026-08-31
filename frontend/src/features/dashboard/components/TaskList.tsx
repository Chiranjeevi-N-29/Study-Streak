import React from 'react';
import { TaskItem } from './TaskItem.js';
import type { StudyTask, Status } from '../../../services/api.js';
import '../Dashboard.css';
import '../../../components/UIPrimitives.css';

interface TaskListProps {
  tasks: StudyTask[];
  onToggleStatus: (taskId: string, currentStatus: Status) => Promise<void>;
  updatingTaskId: string | null;
  onAddTask: () => void;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, onToggleStatus, updatingTaskId, onAddTask }) => {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '20px', margin: 0, color: 'var(--text-h)', fontWeight: 600 }}>
          Today's Tasks
        </h2>
        {tasks.length > 0 && (
          <button className="btn btn-secondary" onClick={onAddTask} style={{ padding: '6px 12px', fontSize: '13px' }}>
            ➕ Add Task
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state" style={{ padding: '32px' }}>
          <span>📋</span>
          <p style={{ margin: '8px 0 16px', fontSize: '15px' }}>Your plan has no tasks yet.</p>
          <button className="btn btn-primary" onClick={onAddTask}>
            Add Your First Task
          </button>
        </div>
      ) : (
        <div className="task-list-container">
          {tasks
            .sort((a, b) => a.order - b.order)
            .map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleStatus={onToggleStatus}
                updatingTaskId={updatingTaskId}
              />
            ))}
        </div>
      )}
    </div>
  );
};
