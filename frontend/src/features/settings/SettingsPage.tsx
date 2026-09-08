import React, { useCallback, useEffect, useState } from 'react';
import type { UserProfile, UserPreferences, NotificationPreference } from '../../services/api.js';
import { profileApi, preferencesApi, notificationApi } from '../../services/api.js';
import { useAuth } from '../auth/AuthContext.js';
import './Settings.css';
import '../../components/UIPrimitives.css';

const TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
];

const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const SettingsPage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  // Profile State
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    displayName: '',
    timezone: 'UTC',
    email: '',
  });

  // User Preferences State
  const [userPrefs, setUserPrefs] = useState<UserPreferences>({
    dailyStudyGoalMinutes: 60,
    preferredStudyDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    preferredStudyStartTime: '09:00',
    preferredStudyEndTime: '18:00',
    defaultFocusDurationMinutes: 25,
    defaultBreakDurationMinutes: 5,
    longBreakDurationMinutes: 15,
    autoStartBreak: false,
    weekStartsOn: 'Monday',
  });

  // Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreference>({
    studyRemindersEnabled: true,
    reflectionRemindersEnabled: true,
    achievementNotificationsEnabled: true,
    streakNotificationsEnabled: true,
    dailyReminderTime: '18:00',
    timezone: 'UTC',
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [browserPermission, setBrowserPermission] = useState<string>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'unsupported'
  );

  const fetchAllSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, prefRes, notifRes] = await Promise.all([
        profileApi.get().catch(() => null),
        preferencesApi.get().catch(() => null),
        notificationApi.getPreferences().catch(() => null),
      ]);

      if (profileRes && profileRes.success) {
        setProfile(profileRes.profile);
      } else if (user) {
        setProfile({
          displayName: user.name,
          email: user.email,
          timezone: user.timezone || 'UTC',
        });
      }

      if (prefRes && prefRes.success) {
        setUserPrefs(prefRes.preferences);
      }

      if (notifRes && notifRes.success) {
        setNotifPrefs(notifRes.preferences);
      }
    } catch (err) {
      console.error('Failed to load user settings:', err);
      setError('Could not load profile & preferences.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAllSettings();
  }, [fetchAllSettings]);

  const handleDetectTimezone = () => {
    if (typeof Intl !== 'undefined') {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) {
        setProfile((prev) => ({ ...prev, timezone: detected }));
        setNotifPrefs((prev) => ({ ...prev, timezone: detected }));
      }
    }
  };

  const handleToggleDay = (day: string) => {
    const current = userPrefs.preferredStudyDays || [];
    let updated: string[];
    if (current.includes(day)) {
      if (current.length === 1) return; // Must keep at least one day
      updated = current.filter((d) => d !== day);
    } else {
      updated = [...current, day];
    }
    setUserPrefs({ ...userPrefs, preferredStudyDays: updated });
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const [profRes, prefRes, notifRes] = await Promise.all([
        profileApi.update({
          displayName: profile.displayName,
          timezone: profile.timezone,
        }),
        preferencesApi.update(userPrefs),
        notificationApi.updatePreferences({
          ...notifPrefs,
          timezone: profile.timezone || notifPrefs.timezone,
        }),
      ]);

      if (profRes.success) {
        setProfile(profRes.profile);
      }
      if (prefRes.success) {
        setUserPrefs(prefRes.preferences);
      }
      if (notifRes.success) {
        setNotifPrefs(notifRes.preferences);
      }

      if (refreshUser) {
        await refreshUser();
      }

      setSuccessMsg('Profile and preferences saved successfully!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile and preferences.');
    } finally {
      setSaving(false);
    }
  };

  const handleRequestBrowserPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
    }
  };

  if (loading) {
    return (
      <div className="settings-page-container">
        <div className="card-primitive" style={{ padding: '60px', textAlign: 'center' }}>
          <div className="spinner-primitive" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page-container">
      {/* Header */}
      <div className="settings-header">
        <h1>Profile & Study Preferences</h1>
        <p>Manage your account profile, daily goals, focus targets, and notifications.</p>
      </div>

      {error && (
        <div
          className="card-primitive"
          style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSaveAll} className="settings-group">
        {/* 1. User Profile Section */}
        <div className="settings-section-card">
          <h3>👤 User Profile</h3>
          <div className="settings-group">
            <div className="setting-row">
              <div className="setting-info">
                <h4>Display Name</h4>
                <p>Your name as displayed across StudyStreak.</p>
              </div>
              <input
                type="text"
                className="setting-input"
                style={{ width: '220px' }}
                value={profile.displayName || ''}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                placeholder="Enter display name"
                required
              />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h4>Email Address</h4>
                <p>Your primary account identifier (read-only).</p>
              </div>
              <input
                type="email"
                className="setting-input"
                style={{ width: '220px', opacity: 0.7, cursor: 'not-allowed' }}
                value={profile.email || user?.email || ''}
                disabled
              />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h4>Timezone</h4>
                <p>Used to calculate local study days and reminder windows.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  className="setting-select"
                  value={profile.timezone || 'UTC'}
                  onChange={(e) => {
                    const tz = e.target.value;
                    setProfile({ ...profile, timezone: tz });
                    setNotifPrefs({ ...notifPrefs, timezone: tz });
                  }}
                >
                  {!TIMEZONES.includes(profile.timezone || 'UTC') && (
                    <option value={profile.timezone}>{profile.timezone}</option>
                  )}
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={handleDetectTimezone}
                  title="Detect local browser timezone"
                >
                  Auto-Detect
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Study Preferences Section */}
        <div className="settings-section-card">
          <h3>🎯 Study Preferences</h3>
          <div className="settings-group">
            <div className="setting-row">
              <div className="setting-info">
                <h4>Daily Study Goal</h4>
                <p>Target focus minutes per day for dashboard progress tracking.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  className="setting-input"
                  min={1}
                  max={1440}
                  value={userPrefs.dailyStudyGoalMinutes}
                  onChange={(e) =>
                    setUserPrefs({ ...userPrefs, dailyStudyGoalMinutes: parseInt(e.target.value, 10) || 60 })
                  }
                />
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>min/day</span>
              </div>
            </div>

            <div>
              <div className="setting-info" style={{ marginBottom: '8px' }}>
                <h4>Preferred Study Days</h4>
                <p>Days of the week you plan to conduct study sessions.</p>
              </div>
              <div className="day-pills-row">
                {ALL_DAYS.map((day) => {
                  const isSelected = (userPrefs.preferredStudyDays || []).includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      className={`day-pill-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleToggleDay(day)}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h4>Preferred Study Window</h4>
                <p>Ideal daily hours for study reminders and focus sessions.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="time"
                  className="setting-input"
                  style={{ width: '110px' }}
                  value={userPrefs.preferredStudyStartTime}
                  onChange={(e) => setUserPrefs({ ...userPrefs, preferredStudyStartTime: e.target.value })}
                />
                <span style={{ color: 'var(--text-muted)' }}>to</span>
                <input
                  type="time"
                  className="setting-input"
                  style={{ width: '110px' }}
                  value={userPrefs.preferredStudyEndTime}
                  onChange={(e) => setUserPrefs({ ...userPrefs, preferredStudyEndTime: e.target.value })}
                />
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h4>Week Starts On</h4>
                <p>First day of the week for calendar and weekly statistics.</p>
              </div>
              <select
                className="setting-select"
                style={{ minWidth: '140px' }}
                value={userPrefs.weekStartsOn}
                onChange={(e) =>
                  setUserPrefs({ ...userPrefs, weekStartsOn: e.target.value as 'Monday' | 'Sunday' })
                }
              >
                <option value="Monday">Monday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Focus Session Defaults Section */}
        <div className="settings-section-card">
          <h3>⏱️ Focus Session Defaults</h3>
          <div className="settings-group">
            <div className="setting-row">
              <div className="setting-info">
                <h4>Default Focus Duration</h4>
                <p>Initial target duration when starting a focus session.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  className="setting-input"
                  min={1}
                  max={720}
                  value={userPrefs.defaultFocusDurationMinutes}
                  onChange={(e) =>
                    setUserPrefs({ ...userPrefs, defaultFocusDurationMinutes: parseInt(e.target.value, 10) || 25 })
                  }
                />
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>min</span>
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h4>Short Break Duration</h4>
                <p>Target duration for short rest intervals.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  className="setting-input"
                  min={1}
                  max={120}
                  value={userPrefs.defaultBreakDurationMinutes}
                  onChange={(e) =>
                    setUserPrefs({ ...userPrefs, defaultBreakDurationMinutes: parseInt(e.target.value, 10) || 5 })
                  }
                />
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>min</span>
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h4>Long Break Duration</h4>
                <p>Target duration after completing multiple focus cycles.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  className="setting-input"
                  min={1}
                  max={120}
                  value={userPrefs.longBreakDurationMinutes}
                  onChange={(e) =>
                    setUserPrefs({ ...userPrefs, longBreakDurationMinutes: parseInt(e.target.value, 10) || 15 })
                  }
                />
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>min</span>
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h4>Auto-Start Breaks</h4>
                <p>Automatically transition to break timer upon completing focus target.</p>
              </div>
              <input
                type="checkbox"
                className="setting-checkbox"
                checked={userPrefs.autoStartBreak}
                onChange={(e) => setUserPrefs({ ...userPrefs, autoStartBreak: e.target.checked })}
              />
            </div>
          </div>
        </div>

        {/* 4. Notification Preferences Section */}
        <div className="settings-section-card">
          <h3>🔔 Notification Preferences</h3>
          <div className="settings-group">
            <div className="setting-row">
              <div className="setting-info">
                <h4>Study Reminders</h4>
                <p>Remind me about today&apos;s planned study session.</p>
              </div>
              <input
                type="checkbox"
                className="setting-checkbox"
                checked={notifPrefs.studyRemindersEnabled}
                onChange={(e) => setNotifPrefs({ ...notifPrefs, studyRemindersEnabled: e.target.checked })}
              />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h4>Reflection Reminders</h4>
                <p>Remind me to record what I learned today.</p>
              </div>
              <input
                type="checkbox"
                className="setting-checkbox"
                checked={notifPrefs.reflectionRemindersEnabled}
                onChange={(e) => setNotifPrefs({ ...notifPrefs, reflectionRemindersEnabled: e.target.checked })}
              />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h4>Achievement Notifications</h4>
                <p>Notify me when I earn milestone badges.</p>
              </div>
              <input
                type="checkbox"
                className="setting-checkbox"
                checked={notifPrefs.achievementNotificationsEnabled}
                onChange={(e) => setNotifPrefs({ ...notifPrefs, achievementNotificationsEnabled: e.target.checked })}
              />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h4>Streak Notifications</h4>
                <p>Notify me when I reach streak milestones.</p>
              </div>
              <input
                type="checkbox"
                className="setting-checkbox"
                checked={notifPrefs.streakNotificationsEnabled}
                onChange={(e) => setNotifPrefs({ ...notifPrefs, streakNotificationsEnabled: e.target.checked })}
              />
            </div>

            <div className="setting-row">
              <div className="setting-info">
                <h4>Daily Reminder Time</h4>
                <p>Preferred time for study reminders (24-hour HH:MM format).</p>
              </div>
              <input
                type="time"
                className="setting-input"
                value={notifPrefs.dailyReminderTime}
                onChange={(e) => setNotifPrefs({ ...notifPrefs, dailyReminderTime: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="settings-footer-row">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
          {successMsg && <span className="save-status-msg">{successMsg}</span>}
        </div>
      </form>

      {/* Browser Push Notifications Opt-In Box */}
      <div className="settings-section-card">
        <h3>🌐 Browser Push Notifications</h3>
        <div className="browser-notif-box">
          <div className="setting-info">
            <h4>Browser Notification Permissions</h4>
            <p>
              Status:{' '}
              <strong>
                {browserPermission === 'granted'
                  ? 'Enabled'
                  : browserPermission === 'denied'
                  ? 'Blocked in Browser Settings'
                  : 'Not Enabled'}
              </strong>
            </p>
          </div>

          {browserPermission !== 'granted' && browserPermission !== 'unsupported' && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleRequestBrowserPermission}
            >
              Enable Browser Notifications
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
