import React, { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext.js';
import { studyPlanApi, studyTaskApi, streakApi, goalApi, plannerApi } from '../../services/api.js';
import type {
  StudyPlan,
  StudyTask,
  Priority,
  Status,
  StreakInfo,
  StudyGoal,
  PlannerWeeklyResponse,
  OverdueTask,
  RecommendationResponse,
} from '../../services/api.js';
import './StudyPlanner.css';

export const StudyPlanner: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [activeGoals, setActiveGoals] = useState<StudyGoal[]>([]);
  const [streakLoading, setStreakLoading] = useState<boolean>(true);

  // Weekly Planner State
  const [weeklyData, setWeeklyData] = useState<PlannerWeeklyResponse['data'] | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currentWeekStart, setCurrentWeekStart] = useState<string | undefined>(undefined);

  // Overdue Tasks State
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [showOverdueBanner, setShowOverdueBanner] = useState<boolean>(true);

  // Smart Recommendation Modal State
  const [recommendation, setRecommendation] = useState<RecommendationResponse['data'] | null>(null);
  const [recommendationTask, setRecommendationTask] = useState<StudyTask | null>(null);
  const [loadingRec, setLoadingRec] = useState<boolean>(false);

  // Schedule Modal State
  const [scheduleTaskItem, setScheduleTaskItem] = useState<{ id: string; title: string; currentEst: number } | null>(null);
  const [scheduleTargetDate, setScheduleTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [scheduleEstDuration, setScheduleEstDuration] = useState<number>(30);

  // Filtering State
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterGoal, setFilterGoal] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Plan creation form state
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [planTitle, setPlanTitle] = useState<string>('');
  const [planDesc, setPlanDesc] = useState<string>('');
  const [planTarget, setPlanTarget] = useState<number>(120);

  // Edit Plan state
  const [isEditingPlan, setIsEditingPlan] = useState<boolean>(false);

  // Task form state
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [showTaskForm, setShowTaskForm] = useState<boolean>(false);
  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskDesc, setTaskDesc] = useState<string>('');
  const [taskCategory, setTaskCategory] = useState<string>('');
  const [taskPriority, setTaskPriority] = useState<Priority>('MEDIUM');
  const [taskEstDuration, setTaskEstDuration] = useState<number>(30);
  const [taskActDuration, setTaskActDuration] = useState<number>(0);
  const [taskStatus, setTaskStatus] = useState<Status>('TODO');
  const [taskGoalId, setTaskGoalId] = useState<string>('');

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

  const fetchPlannerData = async (weekStart?: string) => {
    try {
      setError(null);
      const [weekRes, overdueRes, todayPlanRes] = await Promise.all([
        plannerApi.getWeek(weekStart),
        plannerApi.getOverdue().catch(() => ({ success: false, data: { count: 0, tasks: [], localToday: '' } })),
        studyPlanApi.getToday(),
      ]);

      if (weekRes.success) {
        setWeeklyData(weekRes.data);
        if (!weekStart) {
          setCurrentWeekStart(weekRes.data.startDate);
          setSelectedDate(weekRes.data.localToday);
        }
      }

      if (overdueRes.success && overdueRes.data) {
        setOverdueTasks(overdueRes.data.tasks);
      }

      setPlan(todayPlanRes.studyPlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load planner data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const initData = async () => {
      await fetchPlannerData();
      try {
        const [streakRes, goalRes] = await Promise.all([
          streakApi.get(),
          goalApi.list({ status: 'ACTIVE' }),
        ]);

        if (active) {
          setStreak({
            currentStreak: streakRes.currentStreak,
            longestStreak: streakRes.longestStreak,
            successfulStudyDays: streakRes.successfulStudyDays,
            lastActiveDate: streakRes.lastActiveDate,
          });
          if (goalRes.success) {
            setActiveGoals(goalRes.goals);
          }
        }
      } catch (err) {
        console.error('Planner initialization error:', err);
      } finally {
        if (active) {
          setStreakLoading(false);
        }
      }
    };

    initData();

    return () => {
      active = false;
    };
  }, []);

  // Navigation functions
  const handlePrevWeek = () => {
    if (!weeklyData) return;
    const prevDate = new Date(`${weeklyData.startDate}T00:00:00.000Z`);
    prevDate.setUTCDate(prevDate.getUTCDate() - 7);
    const newStart = prevDate.toISOString().split('T')[0];
    setCurrentWeekStart(newStart);
    fetchPlannerData(newStart);
  };

  const handleNextWeek = () => {
    if (!weeklyData) return;
    const nextDate = new Date(`${weeklyData.startDate}T00:00:00.000Z`);
    nextDate.setUTCDate(nextDate.getUTCDate() + 7);
    const newStart = nextDate.toISOString().split('T')[0];
    setCurrentWeekStart(newStart);
    fetchPlannerData(newStart);
  };

  const handleCurrentWeek = () => {
    setCurrentWeekStart(undefined);
    fetchPlannerData();
  };

  // Smart Recommendation trigger
  const handleOpenSmartRecommendation = async (task: StudyTask) => {
    setRecommendationTask(task);
    setLoadingRec(true);
    try {
      const res = await plannerApi.getRecommendation(task.id);
      if (res.success) {
        setRecommendation(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate schedule recommendation');
    } finally {
      setLoadingRec(false);
    }
  };

  const handleApplyRecommendation = async () => {
    if (!recommendationTask || !recommendation) return;
    setSubmitting(true);
    try {
      await plannerApi.scheduleTask(
        recommendationTask.id,
        recommendation.recommendedDate,
        recommendation.estimatedDuration
      );
      setRecommendation(null);
      setRecommendationTask(null);
      await fetchPlannerData(currentWeekStart);
      triggerStreakRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply recommended schedule');
    } finally {
      setSubmitting(false);
    }
  };

  // Schedule / Reschedule handler
  const handleOpenScheduleModal = (task: { id: string; title: string; currentEst: number; currentDate?: string }) => {
    setScheduleTaskItem({ id: task.id, title: task.title, currentEst: task.currentEst });
    setScheduleTargetDate(task.currentDate || new Date().toISOString().split('T')[0]);
    setScheduleEstDuration(task.currentEst || 30);
  };

  const handleConfirmSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleTaskItem) return;
    setSubmitting(true);
    try {
      await plannerApi.scheduleTask(scheduleTaskItem.id, scheduleTargetDate, scheduleEstDuration);
      setScheduleTaskItem(null);
      await fetchPlannerData(currentWeekStart);
      triggerStreakRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeepOverdueForToday = async (task: OverdueTask) => {
    if (!weeklyData) return;
    setSubmitting(true);
    try {
      await plannerApi.scheduleTask(task.id, weeklyData.localToday, task.estimatedDuration);
      await fetchPlannerData(currentWeekStart);
      triggerStreakRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move overdue task to today');
    } finally {
      setSubmitting(false);
    }
  };

  // Plan actions
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await studyPlanApi.create({
        date: selectedDate,
        title: planTitle || `Plan for ${selectedDate}`,
        description: planDesc,
        minimumStudyTarget: planTarget,
        status: 'TODO',
      });
      setPlan(res.studyPlan);
      setShowCreateForm(false);
      setPlanTitle('');
      setPlanDesc('');
      setPlanTarget(120);
      await fetchPlannerData(currentWeekStart);
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

  const handleDeletePlan = async () => {
    if (!plan) return;
    if (!window.confirm('Are you sure you want to delete this study plan? This will delete all tasks inside it.')) return;

    setSubmitting(true);
    try {
      await studyPlanApi.delete(plan.id);
      setPlan(null);
      await fetchPlannerData(currentWeekStart);
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
    setTaskGoalId('');
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
    setTaskGoalId(task.goalId || '');
    setShowTaskForm(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    setSubmitting(true);
    setError(null);
    try {
      if (editingTask) {
        const res = await studyTaskApi.update(editingTask.id, {
          title: taskTitle,
          description: taskDesc,
          category: taskCategory,
          priority: taskPriority,
          estimatedDuration: taskEstDuration,
          actualDuration: taskActDuration,
          status: taskStatus,
          goalId: taskGoalId || null,
        });

        const updatedTasks = (plan.tasks || []).map((t) =>
          t.id === editingTask.id ? res.studyTask : t
        );
        setPlan({ ...plan, tasks: updatedTasks });
      } else {
        const res = await studyTaskApi.create(plan.id, {
          title: taskTitle,
          description: taskDesc,
          category: taskCategory,
          priority: taskPriority,
          estimatedDuration: taskEstDuration,
          goalId: taskGoalId || null,
        });

        const updatedTasks = [...(plan.tasks || []), res.studyTask];
        setPlan({ ...plan, tasks: updatedTasks });
      }
      setShowTaskForm(false);
      await fetchPlannerData(currentWeekStart);
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
      await fetchPlannerData(currentWeekStart);
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
      await fetchPlannerData(currentWeekStart);
      triggerStreakRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  const startEditPlan = () => {
    if (!plan) return;
    setPlanTitle(plan.title || '');
    setPlanDesc(plan.description || '');
    setPlanTarget(plan.minimumStudyTarget);
    setIsEditingPlan(true);
  };

  const handleShiftTaskOrder = async (index: number, direction: 'up' | 'down') => {
    if (!plan || !plan.tasks) return;
    const newTasks = [...plan.tasks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newTasks.length) return;

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

  // Selected Day Summary
  const selectedDaySummary = weeklyData?.days.find((d) => d.date === selectedDate);
  const tasksForSelectedDay = plan?.tasks || [];

  const filteredTasks = tasksForSelectedDay.filter((t) => {
    if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
    if (filterGoal !== 'ALL') {
      if (filterGoal === 'NONE' && t.goalId) return false;
      if (filterGoal !== 'NONE' && t.goalId !== filterGoal) return false;
    }
    if (filterStatus === 'COMPLETED' && t.status !== 'COMPLETED') return false;
    if (filterStatus === 'INCOMPLETE' && t.status === 'COMPLETED') return false;
    return true;
  });

  if (loading) {
    return (
      <div className="planner-container" style={{ textAlign: 'center', paddingTop: '100px' }}>
        <div className="loader" style={{ width: '40px', height: '40px', borderTopColor: 'var(--accent)' }}></div>
        <p style={{ marginTop: '20px', color: 'var(--text)' }}>Loading study planner...</p>
      </div>
    );
  }

  return (
    <div className="planner-container">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '28px', margin: '0 0 6px', fontWeight: '700', color: 'var(--text-h)' }}>Study Planner</h2>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '15px' }}>
          Schedule study sessions, balance workloads, and track planned vs. actual focus time. Timezone: <code>{user?.timezone}</code>
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

      {/* Overdue Banner */}
      {overdueTasks.length > 0 && showOverdueBanner && (
        <div className="overdue-banner">
          <div className="overdue-banner-header">
            <h4>⚠️ {overdueTasks.length} Task{overdueTasks.length > 1 ? 's' : ''} Need Attention (Overdue)</h4>
            <button className="btn-close-banner" onClick={() => setShowOverdueBanner(false)}>×</button>
          </div>
          <div className="overdue-task-list">
            {overdueTasks.map((t) => (
              <div key={t.id} className="overdue-task-item">
                <div>
                  <strong>{t.title}</strong>
                  <span className="overdue-date">Scheduled: {t.plannedDate}</span>
                  {t.goalTitle && <span className="overdue-goal">Goal: {t.goalTitle}</span>}
                </div>
                <div className="overdue-actions">
                  <button
                    className="btn-sm btn-secondary"
                    onClick={() => handleKeepOverdueForToday(t)}
                  >
                    Keep for Today
                  </button>
                  <button
                    className="btn-sm btn-primary"
                    onClick={() => handleOpenScheduleModal({ id: t.id, title: t.title, currentEst: t.estimatedDuration, currentDate: t.plannedDate })}
                  >
                    Reschedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Global Error Banner */}
      {error && <div className="alert-error">{error}</div>}

      {/* Weekly Planning View */}
      {weeklyData && (
        <div className="weekly-planner-section">
          <div className="weekly-planner-header">
            <div>
              <h3>Weekly Schedule</h3>
              <p>
                Week of {weeklyData.startDate} — {weeklyData.endDate} | Goal Capacity: <strong>{weeklyData.dailyGoalMinutes}m / day</strong>
              </p>
            </div>
            <div className="week-nav-controls">
              <button className="btn-secondary btn-sm" onClick={handlePrevWeek}>← Previous Week</button>
              <button className="btn-secondary btn-sm" onClick={handleCurrentWeek}>Current Week</button>
              <button className="btn-secondary btn-sm" onClick={handleNextWeek}>Next Week →</button>
            </div>
          </div>

          {/* 7-Day Grid */}
          <div className="weekly-grid">
            {weeklyData.days.map((day) => {
              const isSelected = day.date === selectedDate;
              return (
                <div
                  key={day.date}
                  className={`weekly-day-card ${isSelected ? 'selected' : ''} ${day.isToday ? 'is-today' : ''}`}
                  onClick={() => setSelectedDate(day.date)}
                >
                  <div className="day-card-header">
                    <span className="day-name">{day.dayName.slice(0, 3)}</span>
                    <span className="day-date">{day.date.slice(5)}</span>
                  </div>

                  <div className="day-card-body">
                    <div className="day-minutes">
                      <span className="planned-mins">Planned: {day.plannedMinutes}m</span>
                      <span className="actual-mins">Focus: {day.actualFocusMinutes}m</span>
                    </div>

                    <span className={`workload-badge badge-${day.workloadStatus.toLowerCase()}`}>
                      {day.workloadStatus}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Day Planning Header & Workload Warning */}
      {selectedDaySummary && (
        <div className="selected-day-banner">
          <div className="selected-day-info">
            <h3>{selectedDaySummary.dayName}, {selectedDate} {selectedDaySummary.isToday ? '(Today)' : ''}</h3>
            <div className="day-capacity-meter">
              <div className="capacity-bar-container">
                <div
                  className="capacity-bar-fill"
                  style={{
                    width: `${Math.min(100, Math.round((selectedDaySummary.plannedMinutes / selectedDaySummary.dailyGoalMinutes) * 100))}%`,
                    background: selectedDaySummary.isOverloaded ? '#ef4444' : '#3b82f6',
                  }}
                />
              </div>
              <span className="capacity-text">
                Planned: {selectedDaySummary.plannedMinutes}m / Goal: {selectedDaySummary.dailyGoalMinutes}m
              </span>
            </div>
          </div>

          {selectedDaySummary.isOverloaded && (
            <div className="overloaded-warning">
              ⚠️ <strong>Heavy / Overloaded Study Day!</strong> You have planned {selectedDaySummary.plannedMinutes} minutes, which exceeds your daily goal of {selectedDaySummary.dailyGoalMinutes} minutes. Consider moving non-critical tasks to another date.
            </div>
          )}
        </div>
      )}

      {/* Primary Study Plan Area */}
      {!plan ? (
        <div className="empty-state">
          <span className="empty-state-icon">📅</span>
          <h3>No study plan for {selectedDate}</h3>
          <p>Consistency starts with planning. Create a plan for this date to schedule tasks and track study time.</p>

          {!showCreateForm ? (
            <button className="btn-primary" onClick={() => {
              setPlanTitle(`Plan for ${selectedDate}`);
              setPlanDesc('');
              setPlanTarget(60);
              setShowCreateForm(true);
            }}>Create Plan for {selectedDate}</button>
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
                  placeholder="e.g. Master React & Algorithms"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="plan-desc">Description (Optional)</label>
                <textarea
                  id="plan-desc"
                  className="form-textarea"
                  value={planDesc}
                  onChange={(e) => setPlanDesc(e.target.value)}
                  placeholder="What is your main focus area today?"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label htmlFor="plan-target">Minimum Target Focus Time (Minutes)</label>
                <input
                  id="plan-target"
                  type="number"
                  className="form-input"
                  value={planTarget}
                  onChange={(e) => setPlanTarget(Number(e.target.value))}
                  min={1}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Plan'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div>
          {/* Plan Header Card */}
          <div className="plan-header-card">
            {!isEditingPlan ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: '700', color: 'var(--text-h)' }}>{plan.title || 'Untitled Plan'}</h3>
                  {plan.description && <p style={{ margin: '0 0 10px', color: 'var(--text-muted)', fontSize: '14px' }}>{plan.description}</p>}
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text)' }}>
                    <span>Target: <strong>{plan.minimumStudyTarget} min</strong></span>
                    <span>Status: <strong className={`status-badge status-${plan.status.toLowerCase()}`}>{plan.status}</strong></span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-secondary btn-sm" onClick={startEditPlan}>Edit Plan Settings</button>
                  <button className="btn-danger btn-sm" onClick={handleDeletePlan} disabled={submitting}>Delete Plan</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4>Edit Study Plan Settings</h4>
                <input
                  type="text"
                  className="form-input"
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  placeholder="Plan Title"
                />
                <textarea
                  className="form-textarea"
                  value={planDesc}
                  onChange={(e) => setPlanDesc(e.target.value)}
                  placeholder="Plan Description"
                  rows={2}
                />
                <input
                  type="number"
                  className="form-input"
                  value={planTarget}
                  onChange={(e) => setPlanTarget(Number(e.target.value))}
                  placeholder="Target Minutes"
                  min={1}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-primary btn-sm" onClick={handleUpdatePlanMeta} disabled={submitting}>Save</button>
                  <button className="btn-secondary btn-sm" onClick={() => setIsEditingPlan(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Tasks Section */}
          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-h)' }}>Tasks for {selectedDate}</h3>
              <button className="btn-primary" onClick={openAddTask}>+ Add Task</button>
            </div>

            {/* Filters Bar */}
            <div className="planner-filter-bar">
              <div className="filter-group">
                <label>Priority:</label>
                <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                  <option value="ALL">All Priorities</option>
                  <option value="HIGH">High Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="LOW">Low Priority</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Goal:</label>
                <select value={filterGoal} onChange={(e) => setFilterGoal(e.target.value)}>
                  <option value="ALL">All Goals</option>
                  <option value="NONE">No Goal</option>
                  {activeGoals.map((g) => (
                    <option key={g.id} value={g.id}>{g.title}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Status:</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="ALL">All Statuses</option>
                  <option value="INCOMPLETE">Incomplete</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <div className="empty-tasks-box">
                <p>No tasks match the selected filters or plan.</p>
              </div>
            ) : (
              <div className="task-list">
                {filteredTasks.map((t, idx) => (
                  <div key={t.id} className={`task-card ${t.status === 'COMPLETED' ? 'completed' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={t.status === 'COMPLETED'}
                        onChange={() => handleToggleTaskCheckbox(t)}
                        style={{ marginTop: '4px', cursor: 'pointer' }}
                      />
                      <div>
                        <h4 style={{ margin: '0 0 4px', fontSize: '16px', textDecoration: t.status === 'COMPLETED' ? 'line-through' : 'none' }}>
                          {t.title}
                        </h4>
                        {t.description && <p style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--text-muted)' }}>{t.description}</p>}
                        <div className="task-meta-pills">
                          <span className={`priority-pill priority-${t.priority.toLowerCase()}`}>{t.priority}</span>
                          <span className="duration-pill">Est: {t.estimatedDuration}m</span>
                          {t.category && <span className="category-pill">{t.category}</span>}
                          {t.goalId && (
                            <span className="goal-pill">
                              🎯 {activeGoals.find((g) => g.id === t.goalId)?.title || 'Goal'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="task-actions-menu">
                      <button
                        className="btn-icon"
                        title="Re-order Up"
                        disabled={idx === 0}
                        onClick={() => handleShiftTaskOrder(idx, 'up')}
                      >
                        ▲
                      </button>
                      <button
                        className="btn-icon"
                        title="Re-order Down"
                        disabled={idx === filteredTasks.length - 1}
                        onClick={() => handleShiftTaskOrder(idx, 'down')}
                      >
                        ▼
                      </button>
                      <button
                        className="btn-sm btn-secondary"
                        onClick={() => handleOpenSmartRecommendation(t)}
                        title="Smart Schedule Recommendation"
                      >
                        💡 Smart Schedule
                      </button>
                      <button
                        className="btn-sm btn-secondary"
                        onClick={() => handleOpenScheduleModal({ id: t.id, title: t.title, currentEst: t.estimatedDuration, currentDate: selectedDate })}
                      >
                        Reschedule
                      </button>
                      <button className="btn-sm btn-secondary" onClick={() => openEditTask(t)}>Edit</button>
                      <button className="btn-sm btn-danger" onClick={() => handleDeleteTask(t.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task Add / Edit Modal */}
      {showTaskForm && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>{editingTask ? 'Edit Task' : 'Add New Task'}</h3>
            <form onSubmit={handleSaveTask}>
              <div className="form-group">
                <label>Task Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g. Solve Binary Tree Problems"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  className="form-textarea"
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Task scope or notes"
                  rows={2}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    className="form-input"
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                    placeholder="e.g. Algorithms"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <select
                    className="form-input"
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as Priority)}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Estimated Duration (mins)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={taskEstDuration}
                    onChange={(e) => setTaskEstDuration(Number(e.target.value))}
                    min={1}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Associate Goal (Optional)</label>
                  <select
                    className="form-input"
                    value={taskGoalId}
                    onChange={(e) => setTaskGoalId(e.target.value)}
                  >
                    <option value="">No Goal</option>
                    {activeGoals.map((g) => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowTaskForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule / Reschedule Modal */}
      {scheduleTaskItem && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3>Schedule Task: {scheduleTaskItem.title}</h3>
            <form onSubmit={handleConfirmSchedule}>
              <div className="form-group">
                <label>Target Date (YYYY-MM-DD)</label>
                <input
                  type="date"
                  className="form-input"
                  value={scheduleTargetDate}
                  onChange={(e) => setScheduleTargetDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Estimated Duration (mins)</label>
                <input
                  type="number"
                  className="form-input"
                  value={scheduleEstDuration}
                  onChange={(e) => setScheduleEstDuration(Number(e.target.value))}
                  min={1}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setScheduleTaskItem(null)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Smart Recommendation Modal */}
      {recommendationTask && (
        <div className="modal-backdrop">
          <div className="modal-content recommendation-modal">
            <h3>💡 Smart Schedule Recommendation</h3>
            {loadingRec ? (
              <p>Evaluating available capacity, preferred study days, and deadlines...</p>
            ) : recommendation ? (
              <div>
                <p className="rec-summary">
                  Task: <strong>{recommendation.taskTitle}</strong> ({recommendation.estimatedDuration}m)
                  {recommendation.goalTitle && <span> | Goal: <strong>{recommendation.goalTitle}</strong></span>}
                </p>

                <div className="rec-best-box">
                  <h4>Recommended Date: <strong>{recommendation.recommendedDate} ({recommendation.recommendedDayName})</strong></h4>
                  <p className="rec-reason">{recommendation.reason}</p>
                </div>

                {recommendation.candidates && recommendation.candidates.length > 0 && (
                  <div className="rec-candidates-list">
                    <h5>Alternative Options:</h5>
                    <ul>
                      {recommendation.candidates.map((c) => (
                        <li key={c.date} className={c.date === recommendation.recommendedDate ? 'active-opt' : ''}>
                          <strong>{c.date} ({c.dayName})</strong>: {c.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                  <button type="button" className="btn-secondary" onClick={() => { setRecommendationTask(null); setRecommendation(null); }}>Dismiss</button>
                  <button type="button" className="btn-primary" onClick={handleApplyRecommendation} disabled={submitting}>
                    {submitting ? 'Applying...' : `Schedule for ${recommendation.recommendedDate}`}
                  </button>
                </div>
              </div>
            ) : (
              <p>No recommendation available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
