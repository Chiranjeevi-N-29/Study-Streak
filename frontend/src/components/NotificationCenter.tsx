import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NotificationItem } from '../services/api.js';
import { notificationApi } from '../services/api.js';
import './NotificationCenter.css';

export const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      if (res.success) {
        setUnreadCount(res.count);
      }
    } catch {
      // Ignore background errors
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationApi.getAll();
      if (res.success) {
        setNotifications(res.notifications);
        const count = res.notifications.filter((n) => !n.read).length;
        setUnreadCount(count);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUnreadCount();
    // Poll unread count periodically every 60 seconds
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const toggleDropdown = () => {
    if (!open) {
      fetchNotifications();
    }
    setOpen((prev) => !prev);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      try {
        await notificationApi.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Error marking notification read:', err);
      }
    }

    setOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'STUDY_REMINDER':
      case 'PLAN_INCOMPLETE':
        return '📚';
      case 'REFLECTION_REMINDER':
        return '📝';
      case 'ACHIEVEMENT_UNLOCKED':
        return '🎉';
      case 'STREAK_MILESTONE':
        return '🔥';
      default:
        return '🔔';
    }
  };

  const formatRelativeTime = (isoDateStr: string) => {
    try {
      const d = new Date(isoDateStr);
      const diffSec = Math.floor((new Date().getTime() - d.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="notification-center-rel" ref={dropdownRef}>
      <button
        className="notif-bell-btn"
        onClick={toggleDropdown}
        aria-label="Open notifications center"
      >
        <span>🔔</span>
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-dropdown" role="dialog" aria-label="Notifications Panel">
          <div className="notif-dropdown-header">
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button className="notif-mark-all-btn" onClick={handleMarkAllRead}>
                Mark all as read
              </button>
            )}
          </div>

          <div className="notif-list-container">
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty-state">
                <span>🔔</span>
                <p>You&apos;re all caught up!</p>
                <p style={{ fontSize: '11px', marginTop: '4px', opacity: 0.8 }}>
                  New study reminders and achievements will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="notif-item-icon">{getIconForType(n.type)}</div>
                  <div className="notif-item-content">
                    <div className="notif-item-title">
                      <span>{n.title}</span>
                      {!n.read && <span className="unread-dot" title="Unread" />}
                    </div>
                    <p className="notif-item-msg">{n.message}</p>
                    <div className="notif-item-time">{formatRelativeTime(n.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
