import React, { useCallback, useEffect, useState } from 'react';
import type { NotificationPreference } from '../../services/api.js';
import { notificationApi } from '../../services/api.js';
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

export const SettingsPage: React.FC = () => {
  const [prefs, setPrefs] = useState<NotificationPreference>({
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

  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationApi.getPreferences();
      if (res.success) {
        setPrefs(res.preferences);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Could not load notification preferences.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPreferences();
  }, [fetchPreferences]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await notificationApi.updatePreferences(prefs);
      if (res.success) {
        setPrefs(res.preferences);
        setSuccessMsg('Notification preferences saved successfully!');
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Could not save notification preferences.');
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
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page-container">
      {/* Header */}
      <div className="settings-header">
        <h1>Account & Notification Settings</h1>
        <p>Customize your study reminders, timezone, and notification preferences.</p>
      </div>

      {error && (
        <div className="card-primitive" style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="settings-section-card">
        <h3>🔔 Notification Preferences</h3>

        <div className="settings-group">
          {/* Study Reminders */}
          <div className="setting-row">
            <div className="setting-info">
              <h4>Study Reminders</h4>
              <p>Remind me about today&apos;s planned study session.</p>
            </div>
            <input
              type="checkbox"
              className="setting-checkbox"
              checked={prefs.studyRemindersEnabled}
              onChange={(e) =>
                setPrefs({ ...prefs, studyRemindersEnabled: e.target.checked })
              }
            />
          </div>

          {/* Reflection Reminders */}
          <div className="setting-row">
            <div className="setting-info">
              <h4>Reflection Reminders</h4>
              <p>Remind me to record what I learned today.</p>
            </div>
            <input
              type="checkbox"
              className="setting-checkbox"
              checked={prefs.reflectionRemindersEnabled}
              onChange={(e) =>
                setPrefs({ ...prefs, reflectionRemindersEnabled: e.target.checked })
              }
            />
          </div>

          {/* Achievement Notifications */}
          <div className="setting-row">
            <div className="setting-info">
              <h4>Achievement Notifications</h4>
              <p>Notify me when I earn milestone badges.</p>
            </div>
            <input
              type="checkbox"
              className="setting-checkbox"
              checked={prefs.achievementNotificationsEnabled}
              onChange={(e) =>
                setPrefs({
                  ...prefs,
                  achievementNotificationsEnabled: e.target.checked,
                })
              }
            />
          </div>

          {/* Streak Notifications */}
          <div className="setting-row">
            <div className="setting-info">
              <h4>Streak Notifications</h4>
              <p>Notify me when I reach streak milestones.</p>
            </div>
            <input
              type="checkbox"
              className="setting-checkbox"
              checked={prefs.streakNotificationsEnabled}
              onChange={(e) =>
                setPrefs({ ...prefs, streakNotificationsEnabled: e.target.checked })
              }
            />
          </div>

          {/* Daily Reminder Time */}
          <div className="setting-row">
            <div className="setting-info">
              <h4>Daily Reminder Time</h4>
              <p>Preferred time for study reminders (24-hour HH:MM format).</p>
            </div>
            <input
              type="time"
              className="setting-input"
              value={prefs.dailyReminderTime}
              onChange={(e) => setPrefs({ ...prefs, dailyReminderTime: e.target.value })}
            />
          </div>

          {/* Timezone Selection */}
          <div className="setting-row">
            <div className="setting-info">
              <h4>Timezone</h4>
              <p>Used to calculate local study days and schedule timely reminders.</p>
            </div>
            <select
              className="setting-select"
              value={prefs.timezone}
              onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Form Action Controls */}
        <div className="settings-footer-row">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Preferences'}
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
