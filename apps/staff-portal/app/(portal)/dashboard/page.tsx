'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../lib/auth';
import { api, timeAgo } from '../../../lib/api';
import type { MaintenanceReport, PaginatedList } from '@cut-smartfix/contracts';

function priorityBadge(priority?: string) {
  if (!priority) return <span className="badge badge-low">–</span>;
  return <span className={`badge badge-${priority}`}>{priority}</span>;
}

function locationLabel(r: MaintenanceReport) {
  const l = r.location;
  const parts = [
    l.campusName ?? l.campus,
    l.buildingName ?? l.building,
    l.floorName ?? l.floor,
    l.roomName ?? l.room,
  ].filter(Boolean);
  return parts.join(' › ') || '–';
}

interface Stats {
  assigned: number;
  accepted: number;
  inProgress: number;
  waitingMaterials: number;
  completedToday: number;
  overdue: number;
  total: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<MaintenanceReport[]>([]);
  const [stats, setStats] = useState<Stats>({
    assigned: 0,
    accepted: 0,
    inProgress: 0,
    waitingMaterials: 0,
    completedToday: 0,
    overdue: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSupervisor = user?.role === 'supervisor' || user?.role === 'administrator';

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api.get<PaginatedList<MaintenanceReport> | MaintenanceReport[]>(
          '/v1/tasks?pageSize=100'
        );
        if (res.error) throw new Error(res.error.message);

        const items: MaintenanceReport[] = Array.isArray(res.data)
          ? res.data
          : (res.data as PaginatedList<MaintenanceReport>).items ?? [];

        const today = new Date().toDateString();
        const assigned = items.filter((t) => t.status === 'assigned').length;
        const accepted = items.filter((t) => t.status === 'accepted').length;
        const inProgress = items.filter((t) => t.status === 'in_progress').length;
        const waitingMaterials = items.filter((t) => t.status === 'waiting_for_materials').length;
        const completedToday = items.filter(
          (t) =>
            (t.status === 'repair_completed' || t.status === 'closed') &&
            t.updatedAt &&
            new Date(t.updatedAt).toDateString() === today
        ).length;
        const overdue = items.filter((t) => t.isOverdue).length;

        setStats({ assigned, accepted, inProgress, waitingMaterials, completedToday, overdue, total: items.length });

        const priorityOrder: Record<string, number> = {
          critical: 0, high: 1, medium: 2, low: 3,
        };
        const active = items
          .filter(
            (t) =>
              t.status !== 'closed' &&
              t.status !== 'repair_completed' &&
              t.status !== 'cancelled' &&
              t.status !== 'rejected' &&
              t.status !== 'duplicate'
          )
          .sort((a, b) => {
            // Overdue first
            if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
            const pa = priorityOrder[a.priority ?? 'low'] ?? 4;
            const pb = priorityOrder[b.priority ?? 'low'] ?? 4;
            if (pa !== pb) return pa - pb;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          })
          .slice(0, 6);

        setTasks(active);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const displayName = user?.fullName?.split(' ')[0] ?? 'Staff';
  const roleLabel =
    user?.role === 'supervisor'
      ? 'Supervisor'
      : user?.role === 'administrator'
      ? 'Administrator'
      : 'Technician';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  return (
    <>
      {/* Welcome card */}
      <div className="card dashboard-welcome">
        <div className="dashboard-welcome-left">
          <h2 className="dashboard-welcome-title">
            Good {greeting}, {displayName}! 👋
          </h2>
          <p className="dashboard-welcome-date">
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            <span className={`badge badge-${user?.role ?? 'technician'}`}>{roleLabel}</span>
            {user?.departmentName && (
              <span className="badge badge-medium">{user.departmentName}</span>
            )}
          </div>
        </div>
        {stats.overdue > 0 && (
          <div className="overdue-alert">
            <span className="overdue-alert-icon">⚠️</span>
            <div>
              <div className="overdue-alert-title">{stats.overdue} overdue</div>
              <div className="overdue-alert-sub">Require immediate attention</div>
            </div>
            <Link href="/tasks" className="btn btn-danger btn-sm">
              View →
            </Link>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <Link href="/tasks?status=assigned" className="stat-card stat-card-link accent-blue">
          <div className="stat-card-label">Assigned</div>
          <div className="stat-card-value">{loading ? '–' : stats.assigned}</div>
          <div className="stat-card-sub">Awaiting acceptance</div>
        </Link>
        <Link href="/tasks?status=in_progress" className="stat-card stat-card-link accent-amber">
          <div className="stat-card-label">In Progress</div>
          <div className="stat-card-value">{loading ? '–' : stats.inProgress + stats.accepted}</div>
          <div className="stat-card-sub">{stats.accepted > 0 ? `${stats.accepted} accepted, ${stats.inProgress} active` : 'Active work orders'}</div>
        </Link>
        <Link href="/tasks?status=waiting_for_materials" className="stat-card stat-card-link accent-orange">
          <div className="stat-card-label">Waiting Materials</div>
          <div className="stat-card-value">{loading ? '–' : stats.waitingMaterials}</div>
          <div className="stat-card-sub">Pending materials</div>
        </Link>
        <div className="stat-card accent-green">
          <div className="stat-card-label">Completed Today</div>
          <div className="stat-card-value">{loading ? '–' : stats.completedToday}</div>
          <div className="stat-card-sub">Marked complete today</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 14, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Quick Actions
        </h3>
        <div className="quick-actions">
          <Link href="/tasks" className="quick-action">
            <span className="quick-action-icon">📋</span>
            <span className="quick-action-label">My Tasks</span>
          </Link>
          <Link href="/active-work" className="quick-action">
            <span className="quick-action-icon">🔧</span>
            <span className="quick-action-label">Active Work</span>
          </Link>
          <Link href="/materials" className="quick-action">
            <span className="quick-action-icon">📦</span>
            <span className="quick-action-label">Materials</span>
          </Link>
          <Link href="/history" className="quick-action">
            <span className="quick-action-icon">📂</span>
            <span className="quick-action-label">History</span>
          </Link>
          {isSupervisor && (
            <Link href="/requests" className="quick-action">
              <span className="quick-action-icon">📥</span>
              <span className="quick-action-label">Requests</span>
            </Link>
          )}
          {isSupervisor && (
            <Link href="/assignments" className="quick-action">
              <span className="quick-action-icon">👥</span>
              <span className="quick-action-label">Assignments</span>
            </Link>
          )}
          <Link href="/notifications" className="quick-action">
            <span className="quick-action-icon">🔔</span>
            <span className="quick-action-label">Notifications</span>
          </Link>
          <Link href="/profile" className="quick-action">
            <span className="quick-action-icon">👤</span>
            <span className="quick-action-label">Profile</span>
          </Link>
        </div>
      </div>

      {/* Most urgent tasks */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Most Urgent Tasks</h3>
          <Link href="/tasks" className="btn btn-secondary btn-sm">
            View all →
          </Link>
        </div>

        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        {loading ? (
          <div className="loading-overlay" style={{ minHeight: 120 }}>
            <div className="spinner" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <h3>All clear!</h3>
            <p>No active tasks assigned to you right now.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`task-row${task.isOverdue ? ' task-row-overdue' : ''}`}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div className="task-row-meta">
                    <span className="ticket-mono">{task.ticketNumber}</span>
                    {priorityBadge(task.priority)}
                    <span className={`badge badge-${task.status}`}>
                      {task.status.replace(/_/g, ' ')}
                    </span>
                    {task.isOverdue && (
                      <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>
                        OVERDUE
                      </span>
                    )}
                  </div>
                  <p className="task-row-title">{task.title}</p>
                  <p className="task-row-sub">
                    📍 {locationLabel(task)} · {timeAgo(task.createdAt)}
                  </p>
                </div>
                <Link href={`/tasks/${task.id}`} className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
