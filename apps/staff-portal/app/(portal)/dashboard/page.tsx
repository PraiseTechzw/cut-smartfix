'use client';

import { useCallback, useEffect, useState } from 'react';
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
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);

  const isSupervisor = user?.role === 'supervisor' || user?.role === 'administrator';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PaginatedList<MaintenanceReport> | MaintenanceReport[]>(
        '/v1/tasks?pageSize=100'
      );
      if (res.error) throw new Error(res.error.message);

      const items: MaintenanceReport[] = Array.isArray(res.data)
        ? res.data
        : (res.data as PaginatedList<MaintenanceReport>).items ?? [];
      const totalOpenTasks = Array.isArray(res.data)
        ? items.length
        : (res.data as PaginatedList<MaintenanceReport>).total ?? items.length;
      const today = new Date().toDateString();
      const assigned = items.filter((task) => task.status === 'assigned').length;
      const accepted = items.filter((task) => task.status === 'accepted').length;
      const inProgress = items.filter((task) => task.status === 'in_progress').length;
      const waitingMaterials = items.filter((task) => task.status === 'waiting_for_materials').length;
      const completedToday = items.filter(
        (task) =>
          (task.status === 'repair_completed' || task.status === 'closed') &&
          task.updatedAt &&
          new Date(task.updatedAt).toDateString() === today
      ).length;
      const overdue = items.filter((task) => task.isOverdue).length;
      const active = items
        .filter((task) => !['closed', 'repair_completed', 'cancelled', 'rejected', 'duplicate'].includes(task.status))
        .sort((a, b) => {
          if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
          const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
          const priorityDifference = (priorityOrder[a.priority ?? 'low'] ?? 4) - (priorityOrder[b.priority ?? 'low'] ?? 4);
          if (priorityDifference !== 0) return priorityDifference;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

      setStats({ assigned, accepted, inProgress, waitingMaterials, completedToday, overdue, total: totalOpenTasks });
      setTasks(active.slice(0, 6));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateTask = async (taskId: string, status: 'accepted' | 'in_progress') => {
    setActionLoading(taskId);
    setActionMessage(null);
    setActionError(false);
    try {
      const res = await api.patch(`/v1/tasks/${taskId}`, { status });
      if (res.error) throw new Error(res.error.message);
      setActionMessage(status === 'accepted' ? 'Assignment accepted.' : 'Work started.');
      await load();
    } catch (e) {
      setActionError(true);
      setActionMessage(e instanceof Error ? e.message : 'Could not update this task.');
    } finally {
      setActionLoading(null);
    }
  };

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
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">STAFF WORKSPACE</p>
          <h1>Dashboard</h1>
          <p>Track your work orders and keep maintenance moving.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => void load()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh tasks'}
        </button>
      </div>

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
      <div className="dashboard-stat-grid">
        <Link href="/tasks" className="stat-card stat-card-link accent-green">
          <div className="stat-card-label">Open Work</div>
          <div className="stat-card-value">{loading ? '–' : stats.total}</div>
          <div className="stat-card-sub">Active work orders</div>
        </Link>
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
        <Link href="/tasks" className="stat-card stat-card-link accent-red">
          <div className="stat-card-label">Overdue</div>
          <div className="stat-card-value">{loading ? '–' : stats.overdue}</div>
          <div className="stat-card-sub">Need attention</div>
        </Link>
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
      <div className="card dashboard-tasks-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem' }}>Priority work</h3>
            <p className="dashboard-section-caption">Your most urgent active assignments</p>
          </div>
          <Link href="/tasks" className="btn btn-secondary btn-sm">
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="loading-overlay" style={{ minHeight: 120 }}>
            <div className="spinner" />
          </div>
        ) : error ? (
          <div className="dashboard-load-error">
            <div>
              <strong>We couldn’t load your tasks.</strong>
              <p>{error}</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => void load()}>Try again</button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <h3>All clear!</h3>
            <p>No active tasks assigned to you right now.</p>
          </div>
        ) : (
          <div className="dashboard-task-list">
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
                  <p className="task-row-sub">{locationLabel(task)} · Reported {timeAgo(task.createdAt)}</p>
                </div>
                <div className="dashboard-task-actions">
                  {task.status === 'assigned' && (
                    <button className="btn btn-primary btn-sm" disabled={actionLoading === task.id} onClick={() => void updateTask(task.id, 'accepted')}>
                      {actionLoading === task.id ? 'Saving…' : 'Accept'}
                    </button>
                  )}
                  {task.status === 'accepted' && (
                    <button className="btn btn-primary btn-sm" disabled={actionLoading === task.id} onClick={() => void updateTask(task.id, 'in_progress')}>
                      {actionLoading === task.id ? 'Saving…' : 'Start work'}
                    </button>
                  )}
                  <Link href={`/tasks/${task.id}`} className="btn btn-secondary btn-sm">Details</Link>
                </div>
              </div>
            ))}
          </div>
        )}
        {actionMessage && (
          <div className={`alert ${actionError ? 'alert-error' : 'alert-success'}`} style={{ marginTop: 14 }}>
            {actionMessage}
          </div>
        )}
      </div>
    </>
  );
}
