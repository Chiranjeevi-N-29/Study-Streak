import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupsApi } from '../../services/api.js';
import type { StudyGroupListItem } from '../../services/api.js';
import './Groups.css';

export const GroupsPage: React.FC = () => {
  const [groups, setGroups] = useState<StudyGroupListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showJoinModal, setShowJoinModal] = useState<boolean>(false);

  // Create Form State
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createMaxMembers, setCreateMaxMembers] = useState(5);
  const [createError, setCreateError] = useState<string | null>(null);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Join Form State
  const [joinInviteCode, setJoinInviteCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [submittingJoin, setSubmittingJoin] = useState(false);

  const navigate = useNavigate();

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await groupsApi.getUserGroups();
      setGroups(res.groups || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load study groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      setCreateError('Group name is required');
      return;
    }
    try {
      setSubmittingCreate(true);
      setCreateError(null);
      const res = await groupsApi.create({
        name: createName.trim(),
        description: createDesc.trim() || undefined,
        maxMembers: createMaxMembers,
      });
      setShowCreateModal(false);
      setCreateName('');
      setCreateDesc('');
      setCreateMaxMembers(5);
      navigate(`/app/groups/${res.group.id}`);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create group');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinInviteCode.trim()) {
      setJoinError('Invite code is required');
      return;
    }
    try {
      setSubmittingJoin(true);
      setJoinError(null);
      const res = await groupsApi.join(joinInviteCode.trim());
      setShowJoinModal(false);
      setJoinInviteCode('');
      navigate(`/app/groups/${res.group.id}`);
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join group. Check invite code.');
    } finally {
      setSubmittingJoin(false);
    }
  };

  return (
    <div className="groups-container">
      <div className="groups-header">
        <div>
          <h1>👥 Study Groups</h1>
          <p style={{ color: 'var(--text-secondary, #64748b)', margin: '0.25rem 0 0' }}>
            Study together, share group goals, and stay accountable.
          </p>
        </div>
        <div className="groups-header-actions">
          <button className="btn-secondary" onClick={() => setShowJoinModal(true)}>
            🔑 Join with Code
          </button>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            ➕ Create Group
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading study groups...</div>
      ) : error ? (
        <div className="empty-state" style={{ color: '#ef4444' }}>
          <p>{error}</p>
          <button className="btn-secondary" onClick={loadGroups}>Retry</button>
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <h3>No Study Groups Yet</h3>
          <p>Create a small private group with friends or join an existing group with an invite code!</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn-secondary" onClick={() => setShowJoinModal(true)}>
              Join Group
            </button>
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              Create Group
            </button>
          </div>
        </div>
      ) : (
        <div className="groups-grid">
          {groups.map((group) => (
            <div
              key={group.id}
              className="group-card"
              onClick={() => navigate(`/app/groups/${group.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/app/groups/${group.id}`)}
            >
              <div>
                <div className="group-card-top">
                  <h3 className="group-card-title">{group.name}</h3>
                  <span className={`role-badge ${group.userRole.toLowerCase()}`}>
                    {group.userRole}
                  </span>
                </div>
                {group.description && <p className="group-card-desc">{group.description}</p>}
              </div>

              <div>
                {group.activeGoals.length > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary, #64748b)', marginBottom: '0.2rem' }}>
                      Group Goal: {group.activeGoals[0].title}
                    </div>
                    <div style={{ background: '#e2e8f0', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                      <div
                        style={{
                          background: '#4f46e5',
                          height: '100%',
                          width: `${group.activeGoals[0].progressPct}%`,
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="group-card-stats">
                  <span>
                    👥 {group.memberCount} / {group.maxMembers} members
                  </span>
                  <div className="group-streak-badge">
                    🔥 {group.streak.currentStreak} day streak
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create Private Study Group</h2>
            {createError && (
              <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {createError}
              </div>
            )}
            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label htmlFor="create-name">Group Name *</label>
                <input
                  id="create-name"
                  type="text"
                  placeholder="e.g. Algorithms & Data Structures"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  maxLength={80}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="create-desc">Description (optional)</label>
                <textarea
                  id="create-desc"
                  placeholder="What is this group focusing on?"
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div className="form-group">
                <label htmlFor="create-max">Member Limit (2 - 20)</label>
                <input
                  id="create-max"
                  type="number"
                  min={2}
                  max={20}
                  value={createMaxMembers}
                  onChange={(e) => setCreateMaxMembers(parseInt(e.target.value) || 5)}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submittingCreate}>
                  {submittingCreate ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Group Modal */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Join Study Group</h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #64748b)', marginTop: '-0.5rem' }}>
              Enter the invite code shared by the group creator.
            </p>
            {joinError && (
              <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {joinError}
              </div>
            )}
            <form onSubmit={handleJoinSubmit}>
              <div className="form-group">
                <label htmlFor="join-code">Invite Code *</label>
                <input
                  id="join-code"
                  type="text"
                  placeholder="e.g. X7K9M2P4"
                  value={joinInviteCode}
                  onChange={(e) => setJoinInviteCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowJoinModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submittingJoin}>
                  {submittingJoin ? 'Joining...' : 'Join Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
