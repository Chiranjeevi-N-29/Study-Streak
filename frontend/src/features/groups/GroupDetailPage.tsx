import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupsApi } from '../../services/api.js';
import type { StudyGroupDetail, GroupProgressData, GroupMemberRole } from '../../services/api.js';
import { useAuth } from '../auth/AuthContext.js';
import './Groups.css';

type Tab = 'overview' | 'members' | 'progress' | 'settings';

export const GroupDetailPage: React.FC = () => {
  const { id: groupId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [group, setGroup] = useState<StudyGroupDetail | null>(null);
  const [progress, setProgress] = useState<GroupProgressData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Copy Feedback
  const [copiedCode, setCopiedCode] = useState(false);

  // Add Goal Modal State
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDesc, setGoalDesc] = useState('');
  const [goalTargetMinutes, setGoalTargetMinutes] = useState(120);
  const [submittingGoal, setSubmittingGoal] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);

  // Edit Group Form State (Settings tab)
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editMaxMembers, setEditMaxMembers] = useState(5);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const currentMember = group?.members.find((m) => m.id === user?.id);
  const userRole: GroupMemberRole | undefined = currentMember?.role;
  const isOwner = userRole === 'OWNER';
  const isAdminOrOwner = userRole === 'OWNER' || userRole === 'ADMIN';

  const loadGroupDetail = async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      setError(null);
      const [groupRes, progressRes] = await Promise.all([
        groupsApi.getById(groupId),
        groupsApi.getProgress(groupId),
      ]);
      setGroup(groupRes.group);
      setProgress(progressRes.progress);

      setEditName(groupRes.group.name);
      setEditDesc(groupRes.group.description || '');
      setEditMaxMembers(groupRes.group.maxMembers);
    } catch (err: any) {
      setError(err.message || 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroupDetail();
  }, [groupId]);

  const handleCopyInviteCode = () => {
    if (!group) return;
    navigator.clipboard.writeText(group.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRegenerateInvite = async () => {
    if (!groupId) return;
    try {
      const res = await groupsApi.regenerateInviteCode(groupId);
      setGroup((prev) => (prev ? { ...prev, inviteCode: res.inviteCode } : null));
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate invite code');
    }
  };

  const handleAddGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !goalTitle.trim()) {
      setGoalError('Goal title is required');
      return;
    }
    try {
      setSubmittingGoal(true);
      setGoalError(null);
      await groupsApi.createGoal(groupId, {
        title: goalTitle.trim(),
        description: goalDesc.trim() || undefined,
        targetMinutes: goalTargetMinutes,
      });
      setShowGoalModal(false);
      setGoalTitle('');
      setGoalDesc('');
      setGoalTargetMinutes(120);
      loadGroupDetail();
    } catch (err: any) {
      setGoalError(err.message || 'Failed to add group goal');
    } finally {
      setSubmittingGoal(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;
    try {
      setSavingSettings(true);
      setSettingsMsg(null);
      const res = await groupsApi.update(groupId, {
        name: editName.trim(),
        description: editDesc.trim() || null,
        ...(isOwner ? { maxMembers: editMaxMembers } : {}),
      });
      setGroup(res.group);
      setSettingsMsg({ text: 'Group settings saved successfully!' });
    } catch (err: any) {
      setSettingsMsg({ text: err.message || 'Failed to save settings', error: true });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!groupId) return;
    if (!confirm('Are you sure you want to leave this study group?')) return;
    try {
      await groupsApi.leave(groupId);
      navigate('/app/groups');
    } catch (err: any) {
      alert(err.message || 'Failed to leave group');
    }
  };

  const handleArchiveGroup = async () => {
    if (!groupId) return;
    if (!confirm('Are you sure you want to archive this group? Members will no longer be able to submit focus time.')) return;
    try {
      await groupsApi.archive(groupId);
      navigate('/app/groups');
    } catch (err: any) {
      alert(err.message || 'Failed to archive group');
    }
  };

  const handleRemoveMember = async (targetUserId: string, targetName: string) => {
    if (!groupId) return;
    if (!confirm(`Remove ${targetName} from the study group?`)) return;
    try {
      await groupsApi.removeMember(groupId, targetUserId);
      loadGroupDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member');
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: 'ADMIN' | 'MEMBER') => {
    if (!groupId) return;
    try {
      await groupsApi.updateMemberRole(groupId, targetUserId, newRole);
      loadGroupDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to update member role');
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading group details...</div>;
  }

  if (error || !group) {
    return (
      <div className="groups-container">
        <div className="empty-state" style={{ color: '#ef4444' }}>
          <h3>Access Denied or Not Found</h3>
          <p>{error || 'Study group could not be loaded.'}</p>
          <button className="btn-secondary" onClick={() => navigate('/app/groups')}>
            ← Back to Study Groups
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="groups-container">
      <button
        className="btn-secondary"
        onClick={() => navigate('/app/groups')}
        style={{ marginBottom: '1rem' }}
      >
        ← Back to Study Groups
      </button>

      {/* Group Detail Header */}
      <div className="group-detail-header">
        <div className="group-detail-top">
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>{group.name}</h1>
            {group.description && (
              <p style={{ margin: '0.4rem 0 0', color: 'var(--text-secondary, #64748b)' }}>
                {group.description}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="group-streak-badge" style={{ fontSize: '1.1rem' }}>
              🔥 {group.streak.currentStreak} Day Group Streak
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)' }}>
              Longest: {group.streak.longestStreak} days
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', fontSize: '0.9rem' }}>
          <div>
            <strong>Members:</strong> {group.memberCount} / {group.maxMembers}
          </div>
          <div>
            <strong>Active Today:</strong> {progress?.activeTodayCount ?? 0} members
          </div>
          <div>
            <strong>Role:</strong>{' '}
            <span className={`role-badge ${(userRole || 'MEMBER').toLowerCase()}`}>
              {userRole}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          🎯 Goals & Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          👥 Members ({group.members.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          📊 Progress & Activity
        </button>
        {isAdminOrOwner && (
          <button
            className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Settings
          </button>
        )}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Shared Group Goals</h2>
            {isAdminOrOwner && (
              <button className="btn-primary" onClick={() => setShowGoalModal(true)}>
                ➕ Add Group Goal
              </button>
            )}
          </div>

          {group.goals.length === 0 ? (
            <div className="empty-state">
              <h3>No Active Group Goals</h3>
              <p>Set a group target (e.g., "Complete 20 Hours of Focus Time") to track collective progress!</p>
              {isAdminOrOwner && (
                <button className="btn-primary" onClick={() => setShowGoalModal(true)}>
                  Add Group Goal
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {group.goals.map((g) => (
                <div
                  key={g.id}
                  style={{
                    background: 'var(--bg-card, #ffffff)',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    borderRadius: '10px',
                    padding: '1.2rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{g.title}</h4>
                      {g.description && (
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.88rem', color: 'var(--text-secondary, #64748b)' }}>
                          {g.description}
                        </p>
                      )}
                    </div>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: g.status === 'COMPLETED' ? '#dcfce7' : '#e0e7ff',
                        color: g.status === 'COMPLETED' ? '#166534' : '#3730a3',
                      }}
                    >
                      {g.status}
                    </span>
                  </div>

                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                      <span>
                        Progress: {g.currentMinutes} / {g.targetMinutes} mins ({Math.round(g.currentMinutes / 60 * 10) / 10} / {Math.round(g.targetMinutes / 60 * 10) / 10} hrs)
                      </span>
                      <strong>{g.progressPct}%</strong>
                    </div>
                    <div style={{ background: '#e2e8f0', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                      <div
                        style={{
                          background: g.status === 'COMPLETED' ? '#22c55e' : '#4f46e5',
                          height: '100%',
                          width: `${g.progressPct}%`,
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MEMBERS */}
      {activeTab === 'members' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Group Members</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)' }}>
              🟢 Active today (UTC) &nbsp;|&nbsp; ⚪ No activity today
            </div>
          </div>

          <div className="members-list">
            {group.members.map((m) => (
              <div key={m.id} className="member-item">
                <div className="member-info">
                  <span
                    className={`activity-dot ${m.hasActivityToday ? 'active' : 'inactive'}`}
                    title={m.hasActivityToday ? 'Active today' : 'No activity today'}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {m.name} {m.id === user?.id && '(You)'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #64748b)' }}>
                      Joined {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : 'recently'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className={`role-badge ${m.role.toLowerCase()}`}>{m.role}</span>

                  {/* Actions for OWNER */}
                  {isOwner && m.id !== user?.id && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {m.role === 'MEMBER' ? (
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => handleRoleChange(m.id, 'ADMIN')}
                        >
                          Promote Admin
                        </button>
                      ) : (
                        <button
                          className="btn-secondary"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => handleRoleChange(m.id, 'MEMBER')}
                        >
                          Demote Member
                        </button>
                      )}
                      <button
                        className="btn-danger"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        onClick={() => handleRemoveMember(m.id, m.name)}
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {/* Actions for ADMIN (can remove regular MEMBERs only) */}
                  {userRole === 'ADMIN' && m.role === 'MEMBER' && m.id !== user?.id && (
                    <button
                      className="btn-danger"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      onClick={() => handleRemoveMember(m.id, m.name)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PROGRESS & LEADERBOARD */}
      {activeTab === 'progress' && (
        <div>
          <h2 style={{ marginTop: 0, fontSize: '1.3rem' }}>7-Day Member Contribution Leaderboard</h2>
          <p style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Aggregate focus minutes contributed to group goals over the last 7 days. Member study tasks and private notes remain completely private.
          </p>

          {!progress?.leaderboard || progress.leaderboard.length === 0 ? (
            <div className="empty-state">
              <h3>No Contributions Yet This Week</h3>
              <p>Start a focus session on the Focus page and select a group goal to share your time!</p>
            </div>
          ) : (
            <div className="leaderboard-list">
              {progress.leaderboard.map((item, idx) => (
                <div key={idx} className="leaderboard-item">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className={`rank-badge rank-${idx + 1}`}>{idx + 1}</span>
                    <span style={{ fontWeight: 600 }}>{item.name}</span>
                  </div>
                  <div style={{ fontWeight: 700, color: '#4f46e5' }}>
                    {item.weeklyMinutes} mins ({Math.round(item.weeklyMinutes / 60 * 10) / 10} hrs)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SETTINGS */}
      {activeTab === 'settings' && isAdminOrOwner && (
        <div style={{ maxWidth: '600px' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.3rem' }}>Group Settings</h2>

          {/* Invite Code Box */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.4rem' }}>
              Group Invite Code
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                readOnly
                value={group.inviteCode}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  fontSize: '1.1rem',
                  letterSpacing: '1px',
                }}
              />
              <button className="btn-secondary" onClick={handleCopyInviteCode}>
                {copiedCode ? '✓ Copied!' : 'Copy Code'}
              </button>
              <button className="btn-secondary" onClick={handleRegenerateInvite}>
                🔄 Regenerate
              </button>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', margin: '0.4rem 0 0' }}>
              Share this code with friends so they can join your study group.
            </p>
          </div>

          {/* Settings Form */}
          {settingsMsg && (
            <div
              style={{
                color: settingsMsg.error ? '#ef4444' : '#15803d',
                marginBottom: '1rem',
                fontSize: '0.9rem',
              }}
            >
              {settingsMsg.text}
            </div>
          )}

          <form onSubmit={handleSaveSettings}>
            <div className="form-group">
              <label>Group Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={80}
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>

            {isOwner && (
              <div className="form-group">
                <label>Maximum Member Limit (2 - 20)</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={editMaxMembers}
                  onChange={(e) => setEditMaxMembers(parseInt(e.target.value) || 5)}
                />
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={savingSettings}>
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </form>

          <hr style={{ margin: '2rem 0', borderColor: '#e2e8f0' }} />

          {/* Danger Zone */}
          <div style={{ border: '1px solid #fee2e2', background: '#fff5f5', borderRadius: '8px', padding: '1rem' }}>
            <h4 style={{ margin: '0 0 0.5rem', color: '#991b1b' }}>Danger Zone</h4>
            {!isOwner && (
              <button className="btn-danger" onClick={handleLeaveGroup}>
                Leave Group
              </button>
            )}
            {isOwner && (
              <div>
                <p style={{ fontSize: '0.85rem', color: '#7f1d1d', margin: '0 0 0.75rem' }}>
                  Archiving the group prevents members from adding new focus time to group goals.
                </p>
                <button className="btn-danger" onClick={handleArchiveGroup}>
                  Archive Group
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Group Goal Modal */}
      {showGoalModal && (
        <div className="modal-overlay" onClick={() => setShowGoalModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add Shared Group Goal</h2>
            {goalError && (
              <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {goalError}
              </div>
            )}
            <form onSubmit={handleAddGoalSubmit}>
              <div className="form-group">
                <label htmlFor="goal-title">Goal Title *</label>
                <input
                  id="goal-title"
                  type="text"
                  placeholder="e.g. Complete 50 Hours of DSA Practice"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  maxLength={120}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="goal-desc">Description (optional)</label>
                <textarea
                  id="goal-desc"
                  placeholder="Milestone details or resource links"
                  value={goalDesc}
                  onChange={(e) => setGoalDesc(e.target.value)}
                  rows={2}
                  maxLength={500}
                />
              </div>
              <div className="form-group">
                <label htmlFor="goal-target">Target Study Time (Minutes) *</label>
                <input
                  id="goal-target"
                  type="number"
                  min={1}
                  value={goalTargetMinutes}
                  onChange={(e) => setGoalTargetMinutes(parseInt(e.target.value) || 60)}
                  required
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)' }}>
                  ≈ {Math.round(goalTargetMinutes / 60 * 10) / 10} hours
                </span>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowGoalModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submittingGoal}>
                  {submittingGoal ? 'Adding...' : 'Add Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
