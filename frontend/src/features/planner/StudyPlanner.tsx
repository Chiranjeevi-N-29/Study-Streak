import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.js';
import { studyPlanApi, studyTaskApi, streakApi } from '../../services/api.js';
import type { StudyPlan, StudyTask, Priority, Status, StreakInfo } from '../../services/api.js';
import './StudyPlanner.css';

export const StudyPlanner: React.FC = () => {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [streakLoading, setStreakLoading] = useState<boolean>(true);
  
  // Plan creation form state
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [planTitle, setPlanTitle] = useState<string>('');
  const [planDesc, setPlanDesc] = useState<string>('');
  const [planTarget, setPlanTarget] = useState<number>(120);

  // Edit Plan state
  const [isEditingPlan, setIsEditingPlan] = useState<boolean>(false);
  
  // Task form state (handles both create and edit)
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [showTaskForm, setShowTaskForm] = useState<boolean>(false);
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskDesc, setTaskDesc] = useState<string>('');
  const [taskCategory, setTaskCategory] = useState<string>('');
  const [taskPriority, setTaskPriority] = useState<Priority>('MEDIUM');
  const [taskEstDuration, setTaskEstDuration] = useState<number>(30);
  const [taskActDuration, setTaskActDuration] = useState<number>(0);
  const [taskStatus, setTaskStatus] = useState<Status>('TODO');

  const triggerStreakRefresh = async () => {
    try {
      const res = await streakApi.get();
      setStreak({
        currentStreak: res.currentStreak,
        longestStreak: res.longestStreak,
        successfulStudyDays: res.successfulStudyDays,
        lastActiveDate: res.lastActiveDate,
      });
    } catch (err) {
      console.error('Failed to refresh streak data:', err);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchTodayPlan = async () => {
      try {
        const res = await studyPlanApi.getToday();
        if (active) {
          setPlan(res.studyPlan);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load study plan');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const fetchStreakData = async () => {
      try {
        const res = await streakApi.get();
        if (active) {
          setStreak({
            currentStreak: res.currentStreak,
            longestStreak: res.longestStreak,
            successfulStudyDays: res.successfulStudyDays,
            lastActiveDate: res.lastActiveDate,
          });
        }
      } catch (err) {
        console.error('Failed to load streak data:', err);
      } finally {
        if (active) {
          setStreakLoading(false);
        }
      }
    };

    fetchTodayPlan();
    fetchStreakData();

    return () => {
      active = false;
    };
  }, []);


  // Plan actions
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      // Format today's date in user's timezone YYYY-MM-DD
      const localToday = new Date().toLocaleDateString('en-CA'); // en-CA defaults to YYYY-MM-DD format
      const res = await studyPlanApi.create({
        date: localToday,
        title: planTitle,
        description: planDesc,
        minimumStudyTarget: planTarget,
        status: 'TODO',
      });
      setPlan(res.studyPlan);
      setShowCreateForm(false);
      // Reset plan inputs
      setPlanTitle('');
      setPlanDesc('');
      setPlanTarget(120);
      triggerStreakRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create study plan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePlanMeta = async () => {
    if (!plan) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await studyPlanApi.update(plan.id, {
        title: planTitle,
        description: planDesc,
        minimumStudyTarget: planTarget,
      });
      setPlan({
        ...plan,
        title: res.studyPlan.title,
        description: res.studyPlan.description,
        minimumStudyTarget: res.studyPlan.minimumStudyTarget,
      });
      setIsEditingPlan(false);
      triggerStreakRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update study plan settings');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePlanStatus = async (status: Status) => {
    if (!plan) return;
    try {
      const res = await studyPlanApi.update(plan.id, { status });
      setPlan({
        ...plan,
        status: res.studyPlan.status,
      });
      triggerStreakRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update plan status');
    }
  };

  const handleDeletePlan = async () => {
    if (!plan) return;
    if (!window.confirm('Are you sure you want to delete today\'s study plan? This will delete all tasks inside it.')) return;
    
    setSubmitting(true);
    try {
      await studyPlanApi.delete(plan.id);
      setPlan(null);
      triggerStreakRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete study plan');
    } finally {
      setSubmitting(false);
    }
  };

  // Task actions
  const openAddTask = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDesc('');
    setTaskCategory('');
    setTaskPriority('MEDIUM');
    setTaskEstDuration(30);
    setTaskActDuration(0);
    setTaskStatus('TODO');
    setShowTaskForm(true);
  };

  const openEditTask = (task: StudyTask) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description || '');
    setTaskCategory(task.category);
    setTaskPriority(task.priority);
    setTaskEstDuration(task.estimatedDuration);
    setTaskActDuration(task.actualDuration);
    setTaskStatus(task.status);
    setShowTaskForm(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    setSubmitting(true);
    setError(null);
    try {
      if (editingTask) {
        // Edit Task
        const res = await studyTaskApi.update(editingTask.id, {
          title: taskTitle,
          description: taskDesc,
          category: taskCategory,
          priority: taskPriority,
          estimatedDuration: taskEstDuration,
          actualDuration: taskActDuration,
          status: taskStatus,
        });
        
        // Update local plan state tasks
        const updatedTasks = (plan.tasks || []).map((t) =>
          t.id === editingTask.id ? res.studyTask : t
        );
        setPlan({ ...plan, tasks: updatedTasks });
      } else {
        // Create Task
        const res = await studyTaskApi.create(plan.id, {
          title: taskTitle,
          description: taskDesc,
          category: taskCategory,
          priority: taskPriority,
          estimatedDuration: taskEstDuration,
        });

        const updatedTasks = [...(plan.tasks || []), res.studyTask];
        setPlan({ ...plan, tasks: updatedTasks });
      }
      setShowTaskForm(false);
      triggerStreakRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleTaskCheckbox = async (task: StudyTask) => {
    if (!plan) return;
    const targetStatus: Status = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    try {
      const res = await studyTaskApi.update(task.id, { status: targetStatus });
      const updatedTasks = (plan.tasks || []).map((t) =>
        t.id === task.id ? res.studyTask : t
      );
      setPlan({ ...plan, tasks: updatedTasks });
      triggerStreakRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task status');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!plan) return;
    if (!window.confirm('Delete this task?')) return;
    
    try {
      await studyTaskApi.delete(taskId);
      const updatedTasks = (plan.tasks || []).filter((t) => t.id !== taskId);
      setPlan({ ...plan, tasks: updatedTasks });
      triggerStreakRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  const handleShiftTaskOrder = async (index: number, direction: 'up' | 'down') => {
    if (!plan || !plan.tasks) return;
    const newTasks = [...plan.tasks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap tasks
    const temp = newTasks[index];
    newTasks[index] = newTasks[targetIndex];
    newTasks[targetIndex] = temp;
    
    try {
      const orderedIds = newTasks.map((t) => t.id);
      await studyTaskApi.reorder(plan.id, orderedIds);
      setPlan({
        ...plan,
        tasks: newTasks.map((t, idx) => ({ ...t, order: idx })),
      });
      triggerStreakRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder tasks');
    }
  };

  const startEditPlan = () => {
    if (!plan) return;
    setPlanTitle(plan.title || '');
    setPlanDesc(plan.description || '');
    setPlanTarget(plan.minimumStudyTarget);
    setIsEditingPlan(true);
  };

  if (loading) {
    return (
      <div className="planner-container" style={{ textAlign: 'center', paddingTop: '100px' }}>
        <div className="loader" style={{ width: '40px', height: '40px', borderTopColor: 'var(--accent)' }}></div>
        <p style={{ marginTop: '20px', color: 'var(--text)' }}>Loading study plans...</p>
      </div>
    );
  }

  return (
    <div className="planner-container">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px', margin: '0 0 6px', fontWeight: '700', color: 'var(--text-h)' }}>Study Planner</h2>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '15px' }}>
          Manage today's plan and tasks to stay on track. Timezone: <code>{user?.timezone}</code>
        </p>
      </div>

      {/* Streak Stats Section */}
      <div className="streak-container">
        <div className="streak-stat-card">
          <span className="streak-icon">🔥</span>
          <div className="streak-info">
            <h3>{streakLoading ? '...' : `${streak?.currentStreak ?? 0} days`}</h3>
            <p>Current Streak</p>
          </div>
        </div>
        <div className="streak-stat-card">
          <span className="streak-icon">🏆</span>
          <div className="streak-info">
            <h3>{streakLoading ? '...' : `${streak?.longestStreak ?? 0} days`}</h3>
            <p>Longest Streak</p>
          </div>
        </div>
        <div className="streak-stat-card">
          <span className="streak-icon">📅</span>
          <div className="streak-info">
            <h3>{streakLoading ? '...' : `${streak?.successfulStudyDays ?? 0} days`}</h3>
            <p>Successful Study Days</p>
          </div>
        </div>
      </div>

      {/* Global error alerts */}
      {error && <div className="alert-error">{error}</div>}

      {/* Primary Study Plan Area */}
      {!plan ? (
        // No Study Plan for today
        <div className="empty-state">
          <span className="empty-state-icon">📅</span>
          <h3>No study plan for today</h3>
          <p>Consistency starts with planning. Define your goals, tasks, and minimum target for today to keep your streak alive.</p>
          
          {!showCreateForm ? (
            <button className="btn-primary" onClick={() => {
              setPlanTitle('My Study Plan');
              setPlanDesc('');
              setPlanTarget(60);
              setShowCreateForm(true);
            }}>Create Today's Plan</button>
          ) : (
            <form onSubmit={handleCreatePlan} style={{ width: '100%', maxWidth: '500px', textAlign: 'left', marginTop: '20px' }}>
              <div className="form-group">
                <label htmlFor="plan-title">Plan Title</label>
                <input
                  id="plan-title"
                  type="text"
                  className="form-input"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  placeholder="e.g. Java backend learning"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="plan-desc">Description</label>
                <textarea
                  id="plan-desc"
                  className="form-textarea"
                  value={planDesc}
                  onChange={(e) => setPlanDesc(e.target.value)}
                  placeholder="What is your focus today?"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label htmlFor="plan-target">Minimum Study Target (minutes)</label>
                <input
                  id="plan-target"
                  type="number"
                  className="form-input"
                  value={planTarget}
                  onChange={(e) => setPlanTarget(parseInt(e.target.value) || 0)}
                  min="0"
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? <span className="loader"></span> : 'Create Plan'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      ) : (
        // Study Plan exists
        <div>
          <div className="plan-card">
            {isEditingPlan ? (
              // Editable details
              <form onSubmit={(e) => { e.preventDefault(); handleUpdatePlanMeta(); }}>
                <div className="form-group">
                  <label htmlFor="edit-plan-title">Plan Title</label>
                  <input
                    id="edit-plan-title"
                    type="text"
                    className="form-input"
                    value={planTitle}
                    onChange={(e) => setPlanTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-plan-desc">Description</label>
                  <textarea
                    id="edit-plan-desc"
                    className="form-textarea"
                    value={planDesc}
                    onChange={(e) => setPlanDesc(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-plan-target">Minimum Study Target (minutes)</label>
                  <input
                    id="edit-plan-target"
                    type="number"
                    className="form-input"
                    value={planTarget}
                    onChange={(e) => setPlanTarget(parseInt(e.target.value) || 0)}
                    min="0"
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button type="submit" className="btn-primary" disabled={submitting}>Save</button>
                  <button type="button" className="btn-secondary" onClick={() => setIsEditingPlan(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              // Display details
              <div>
                <div className="plan-header-editable">
                  <div className="plan-title-area">
                    <h2 className="plan-title-display">{plan.title || 'Today\'s Study Plan'}</h2>
                    {plan.description && <p className="plan-desc-display">{plan.description}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="action-icon-btn" onClick={startEditPlan} title="Edit Plan Settings">✏️</button>
                    <button className="action-icon-btn delete" onClick={handleDeletePlan} title="Delete Plan">🗑️</button>
                  </div>
                </div>
                
                <div className="plan-meta-grid">
                  <div className="meta-item">
                    <span className="meta-label">Date</span>
                    <span className="meta-value">{new Date(plan.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Plan Status</span>
                    <div style={{ marginTop: '4px' }}>
                      <select
                        className="status-select"
                        value={plan.status}
                        onChange={(e) => handleUpdatePlanStatus(e.target.value as Status)}
                      >
                        <option value="TODO">📝 TODO</option>
                        <option value="IN_PROGRESS">⚡ IN PROGRESS</option>
                        <option value="COMPLETED">✅ COMPLETED</option>
                        <option value="PARTIALLY_COMPLETED">🟡 PARTIALLY COMPLETED</option>
                        <option value="NOT_COMPLETED">❌ NOT COMPLETED</option>
                        <option value="REST_DAY">🌴 REST DAY</option>
                        <option value="MISSED">🔴 MISSED</option>
                      </select>
                    </div>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Minimum Target</span>
                    <span className="meta-value">{plan.minimumStudyTarget} minutes</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tasks Section */}
          <section className="tasks-section">
            <div className="section-title-row">
              <h2 style={{ margin: '0' }}>📋 Study Tasks</h2>
              {!showTaskForm && (
                <button className="btn-primary" onClick={openAddTask}>+ Add Task</button>
              )}
            </div>

            {/* Task Add / Edit Form */}
            {showTaskForm && (
              <div className="plan-card" style={{ background: 'var(--code-bg)', borderStyle: 'dashed' }}>
                <h3 style={{ marginTop: '0', marginBottom: '16px' }}>{editingTask ? '📝 Edit Task' : '➕ Add New Task'}</h3>
                <form onSubmit={handleSaveTask}>
                  <div className="form-group">
                    <label htmlFor="task-title">Task Title</label>
                    <input
                      id="task-title"
                      type="text"
                      className="form-input"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      placeholder="e.g. Solve 5 problems on Arrays"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="task-desc">Task Description</label>
                    <textarea
                      id="task-desc"
                      className="form-textarea"
                      value={taskDesc}
                      onChange={(e) => setTaskDesc(e.target.value)}
                      placeholder="Details of what to complete"
                      rows={2}
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="task-category">Category</label>
                      <input
                        id="task-category"
                        type="text"
                        className="form-input"
                        value={taskCategory}
                        onChange={(e) => setTaskCategory(e.target.value)}
                        placeholder="e.g. DSA, React, Writing"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="task-priority">Priority</label>
                      <select
                        id="task-priority"
                        className="priority-select"
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as Priority)}
                      >
                        <option value="LOW">🔵 Low</option>
                        <option value="MEDIUM">🟡 Medium</option>
                        <option value="HIGH">🔴 High</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="task-est">Estimated Duration (minutes)</label>
                      <input
                        id="task-est"
                        type="number"
                        className="form-input"
                        value={taskEstDuration}
                        onChange={(e) => setTaskEstDuration(parseInt(e.target.value) || 0)}
                        min="0"
                        required
                      />
                    </div>
                    {editingTask && (
                      <div className="form-group">
                        <label htmlFor="task-act">Actual Duration (minutes)</label>
                        <input
                          id="task-act"
                          type="number"
                          className="form-input"
                          value={taskActDuration}
                          onChange={(e) => setTaskActDuration(parseInt(e.target.value) || 0)}
                          min="0"
                          required
                        />
                      </div>
                    )}
                  </div>

                  {editingTask && (
                    <div className="form-group">
                      <label htmlFor="task-status">Task Status</label>
                      <select
                        id="task-status"
                        className="status-select"
                        value={taskStatus}
                        onChange={(e) => setTaskStatus(e.target.value as Status)}
                      >
                        <option value="TODO">📝 Todo</option>
                        <option value="IN_PROGRESS">⚡ In Progress</option>
                        <option value="COMPLETED">✅ Completed</option>
                        <option value="PARTIALLY_COMPLETED">🟡 Partially Completed</option>
                        <option value="NOT_COMPLETED">❌ Not Completed</option>
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <button type="submit" className="btn-primary" disabled={submitting}>Save Task</button>
                    <button type="button" className="btn-secondary" onClick={() => setShowTaskForm(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Task list display */}
            {!plan.tasks || plan.tasks.length === 0 ? (
              <div className="empty-state" style={{ padding: '30px', borderStyle: 'solid' }}>
                <p style={{ margin: '0' }}>You have not added any tasks to today's plan yet.</p>
              </div>
            ) : (
              <div className="task-list">
                {plan.tasks.map((task, index) => (
                  <div key={task.id} className="task-card">
                    <div className="task-content">
                      <div className="task-checkbox-container">
                        <input
                          type="checkbox"
                          className="task-checkbox"
                          checked={task.status === 'COMPLETED'}
                          onChange={() => handleToggleTaskCheckbox(task)}
                          title="Toggle Completion"
                        />
                      </div>
                      <div className="task-details">
                        <h4 className={`task-title ${task.status === 'COMPLETED' ? 'completed' : ''}`}>{task.title}</h4>
                        {task.description && <p className="task-desc">{task.description}</p>}
                        <div className="task-meta">
                          <span className="badge category">{task.category}</span>
                          <span className={`badge priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
                          <span className="badge duration">
                            ⏱️ {task.estimatedDuration} min
                            {task.actualDuration > 0 && ` (Spent: ${task.actualDuration} min)`}
                          </span>
                          {task.status !== 'TODO' && task.status !== 'COMPLETED' && (
                            <span className="badge" style={{ background: 'var(--border)', color: 'var(--text-h)', fontWeight: '600' }}>
                              {task.status.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="task-actions">
                      {/* Reordering buttons */}
                      <div className="reorder-btns">
                        <button
                          className="action-icon-btn"
                          disabled={index === 0}
                          onClick={() => handleShiftTaskOrder(index, 'up')}
                          title="Move Task Up"
                          style={{ padding: '2px 6px', fontSize: '11px', opacity: index === 0 ? 0.3 : 1 }}
                        >
                          ▲
                        </button>
                        <button
                          className="action-icon-btn"
                          disabled={index === (plan.tasks?.length || 0) - 1}
                          onClick={() => handleShiftTaskOrder(index, 'down')}
                          title="Move Task Down"
                          style={{ padding: '2px 6px', fontSize: '11px', opacity: index === (plan.tasks?.length || 0) - 1 ? 0.3 : 1 }}
                        >
                          ▼
                        </button>
                      </div>
                      
                      <button className="action-icon-btn" onClick={() => openEditTask(task)} title="Edit Task">✏️</button>
                      <button className="action-icon-btn delete" onClick={() => handleDeleteTask(task.id)} title="Delete Task">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
export default StudyPlanner;
