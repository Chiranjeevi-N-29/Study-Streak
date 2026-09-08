import React, { useState } from 'react';
import { goalApi } from '../../../services/api.js';
import type { GoalProgressType, StudyGoal } from '../../../services/api.js';
import '../Goals.css';

interface CreateGoalModalProps {
  onClose: () => void;
  onGoalCreated: (goal: StudyGoal) => void;
}

export const CreateGoalModal: React.FC<CreateGoalModalProps> = ({ onClose, onGoalCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [progressType, setProgressType] = useState<GoalProgressType>('FOCUS_TIME');
  const [targetInput, setTargetInput] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [milestonesInput, setMilestonesInput] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddMilestoneField = () => {
    setMilestonesInput([...milestonesInput, '']);
  };

  const handleMilestoneChange = (index: number, value: string) => {
    const next = [...milestonesInput];
    next[index] = value;
    setMilestonesInput(next);
  };

  const handleRemoveMilestoneField = (index: number) => {
    setMilestonesInput(milestonesInput.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Goal title is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let numericTarget: number | undefined;
      if (targetInput) {
        const parsed = parseInt(targetInput, 10);
        if (!isNaN(parsed) && parsed > 0) {
          // If FOCUS_TIME, user inputs hours in UI -> convert to minutes for backend
          numericTarget = progressType === 'FOCUS_TIME' ? parsed * 60 : parsed;
        }
      }

      const filteredMilestones = milestonesInput
        .map((m) => m.trim())
        .filter((m) => m.length > 0)
        .map((mTitle) => ({ title: mTitle }));

      const res = await goalApi.create({
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        targetDate: targetDate || null,
        progressType,
        targetValue: numericTarget || null,
        milestones: filteredMilestones.length > 0 ? filteredMilestones : undefined,
      });

      if (res.success) {
        onGoalCreated(res.goal);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create study goal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🎯 Create Study Goal</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="goal-title">Goal Title *</label>
            <input
              id="goal-title"
              type="text"
              className="form-control"
              placeholder="e.g. Learn React & Next.js"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="goal-description">Description</label>
            <textarea
              id="goal-description"
              className="form-control"
              rows={3}
              placeholder="e.g. Master modern frontend development and build production apps"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="goal-category">Category</label>
            <input
              id="goal-category"
              type="text"
              className="form-control"
              placeholder="e.g. Frontend, Computer Science, Languages"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="progress-type">Progress Calculation Metric</label>
            <select
              id="progress-type"
              className="form-control"
              value={progressType}
              onChange={(e) => setProgressType(e.target.value as GoalProgressType)}
            >
              <option value="FOCUS_TIME">⏱ Focus Study Hours</option>
              <option value="TASKS">📚 Completed Study Tasks</option>
              <option value="MILESTONES">🎯 Completed Milestones</option>
              <option value="MANUAL">✍️ Manual Progress Counter</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="target-value">
              Target Value {progressType === 'FOCUS_TIME' ? '(in Hours)' : ''}
            </label>
            <input
              id="target-value"
              type="number"
              min="1"
              className="form-control"
              placeholder={
                progressType === 'FOCUS_TIME'
                  ? 'e.g. 50 (hours)'
                  : progressType === 'TASKS'
                  ? 'e.g. 25 (tasks)'
                  : 'e.g. 10 (milestones / target count)'
              }
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="target-date">Target Deadline (Optional)</label>
            <input
              id="target-date"
              type="date"
              className="form-control"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          {progressType === 'MILESTONES' && (
            <div className="form-group">
              <label>Initial Milestones</label>
              {milestonesInput.map((m, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={`Milestone #${idx + 1}`}
                    value={m}
                    onChange={(e) => handleMilestoneChange(idx, e.target.value)}
                  />
                  {milestonesInput.length > 1 && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleRemoveMilestoneField(idx)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="btn-secondary"
                onClick={handleAddMilestoneField}
                style={{ marginTop: '4px' }}
              >
                + Add Milestone
              </button>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
