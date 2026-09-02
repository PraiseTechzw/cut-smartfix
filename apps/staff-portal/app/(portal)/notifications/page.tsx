'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, timeAgo } from '../../../lib/api';
import type { Notification } from '@cut-smartfix/contracts';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Notification[]>('/v1/notifications?pageSize=100');
      if (res.error) throw new Error(res.error.message);
      const data = res.data;
      if (Array.isArray(data)) setNotifications(data);
      else {
        const pl = data as unknown as { items?: Notification[] };
        setNotifications(pl.items ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await api.patch(`/v1/notifications/${id}/read`, {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.post('/v1/notifications/read-all', {});
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
      );
    } catch {
      // silent
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  // Priority notifications first (based on title keywords), then by date
  const sorted = [...notifications].sort((a, b) => {
    const aIsUnread = !a.readAt ? 1 : 0;
    const bIsUnread = !b.readAt ? 1 : 0;
    if (aIsUnread !== bIsUnread) return bIsUnread - aIsUnread;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Notifications</h2>
          <p>
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'All caught up!'}
          </p>
        </div>
        <div className="page-header-actions">
          {unreadCount > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={markAllRead}
              disabled={markingAll}
            >
              {markingAll ? 'Marking…' : 'Mark all as read'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ padding: '8px 20px' }}>
        {loading ? (
          <div className="loading-overlay"><div className="spinner" /></div>
        ) : sorted.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔔</div>
            <h3>No notifications</h3>
            <p>You&apos;re all caught up!</p>
          </div>
        ) : (
          sorted.map((notif) => {
            const isUnread = !notif.readAt;
            return (
              <div
                key={notif.id}
                className="notification-item"
                style={{ opacity: isUnread ? 1 : 0.7 }}
              >
                <div
                  className={`notification-dot${isUnread ? '' : ' read'}`}
                  onClick={() => isUnread && markRead(notif.id)}
                  style={{ cursor: isUnread ? 'pointer' : 'default' }}
                  title={isUnread ? 'Mark as read' : undefined}
                />
                <div className="notification-content">
                  <div className="notification-title" style={{ fontWeight: isUnread ? 600 : 500 }}>
                    {notif.title}
                  </div>
                  <div className="notification-body">{notif.body}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <span className="notification-time">{timeAgo(notif.createdAt)}</span>
                    {notif.ticketNumber && (
                      <Link
                        href={notif.actionUrl ?? `/tasks/${notif.reportId}`}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                        onClick={() => isUnread && markRead(notif.id)}
                      >
                        {notif.ticketNumber} →
                      </Link>
                    )}
                  </div>
                </div>
                {isUnread && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => markRead(notif.id)}
                    style={{ fontSize: '0.72rem', flexShrink: 0, alignSelf: 'flex-start', padding: '4px 8px' }}
                  >
                    ✓
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
