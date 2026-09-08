import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsApi } from '../../services/api.js';
import type { StudyGroupListItem } from '../../services/api.js';
import './GroupDashboardWidget.css';

export const GroupDashboardWidget: React.FC = () => {
  const [groups, setGroups] = useState<StudyGroupListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    groupsApi
      .getUserGroups()
      .then((res) => {
        setGroups(res.groups || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || groups.length === 0) {
    return null; // Don't show widget if user has no groups
  }

  const primaryGroup = groups[0];

  return (
    <div className="group-widget-card">
      <div className="group-widget-header">
        <h3>👥 Study Groups</h3>
        <button
          className="btn-secondary"
          style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
          onClick={() => navigate('/app/groups')}
        >
          View All ({groups.length})
        </button>
      </div>

      <div
        className="group-widget-item"
        onClick={() => navigate(`/app/groups/${primaryGroup.id}`)}
        role="button"
        tabIndex={0}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{primaryGroup.name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', marginTop: '0.2rem' }}>
            👥 {primaryGroup.memberCount} members &nbsp;|&nbsp; 🔥 {primaryGroup.streak.currentStreak} day streak
          </div>
        </div>

        {primaryGroup.activeGoals.length > 0 && (
          <div style={{ textAlign: 'right', minWidth: '100px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4f46e5' }}>
              {primaryGroup.activeGoals[0].progressPct}%
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary, #64748b)' }}>
              Goal Progress
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
