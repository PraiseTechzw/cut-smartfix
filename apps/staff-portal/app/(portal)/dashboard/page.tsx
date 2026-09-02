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
  inProgress: number;
  completedToday: number;
  overdue: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<MaintenanceReport[]>([]);
  const [stats, setStats] = useState<Stats>({
    assigned: 0,
    inProgress: 0,
    completedToday: 0,
    overdue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api.get<PaginatedList<MaintenanceReport> | MaintenanceReport[]>(
          '/v1/tasks?pageSize=50'
        );
        if (res.error) throw new Error(res.error.message);

        const items: MaintenanceReport[] = Array.isArray(res.data)
          ? res.data
          : (res.data as PaginatedList<MaintenanceReport>).items ?? [];

        // Compute stats
        const today = new Date().toDateString();
        const assigned = items.filter((t) => t.status === 'assigned').length;
        const inProgress = items.filter((t) => t.status === 'in_progress').length;
        const completedToday = items.filter(
          (t) =>
            t.status === 'repair_completed' &&
            t.updatedAt &&
            new Date(t.updatedAt).toDateString() === today
        ).length;
        const overdue = items.filter((t) => t.isOverdue).length;

        setStats({ assigned, inProgress, completedToday, overdue });

        // Sort by priority then date, take top 5
        const priorityOrder: Record<string, number> = {
          critical: 0,
          high: 1,
          medium: 2,
          low: 3,
        };
        const active = items
          .filter(
            (t) =>
              t.status !== 'closed' &&
              t.status !== 'repair_completed' &&
              t.status !== 'cancelled'
          )
          .sort((a, b) => {
            const pa = priorityOrder[a.priority ?? 'low'] ?? 4;
            const pb = priorityOrder[b.priority ?? 'low'] ?? 4;
            if (pa !== pb) return pa - pb;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          })
          .slice(0, 5);

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

  return (
    <>
      {/* Welcome card */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
              Good{' '}
              {new Date().getHours() < 12
                ? 'morning'
                : new Date().getHours() < 17
                ? 'afternoon'
                : 'evening'}
              , {displayName}! 👋
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`badge badge-${user?.role ?? 'technician'}`}>
              {roleLabel}
            </span>
            {user?.departmentName && (
              <span className="badge badge-medium">{user.departmentName}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card accent-blue">
          <div className="stat-card-label">My Assigned</div>
          <div className="stat-card-value">{loading ? '–' : stats.assigned}</div>
          <div className="stat-card-sub">Awaiting acceptance</div>
        </div>
        <div className="stat-card accent-amber">
          <div className="stat-card-label">In Progress</div>
          <div className="stat-card-value">{loading ? '–' : stats.inProgress}</div>
          <div className="stat-card-sub">Active work orders</div>
        </div>
        <div className="stat-card accent-green">
          <div className="stat-card-label">Completed Today</div>
          <div className="stat-card-value">{loading ? '–' : stats.completedToday}</div>
          <div className="stat-card-sub">Marked complete</div>
        </div>
        <div className="stat-card accent-red">
          <div className="stat-card-label">Overdue</div>
          <div className="stat-card-value">{loading ? '–' : stats.overdue}</div>
          <div className="stat-card-sub">Past due date</div>
        </div>
      </div>

      {/* Tasks preview */}
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
          <div className="loading-overlay">
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
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: task.isOverdue ? '#fef2f2' : 'var(--bg)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--muted)', background: 'var(--border)', padding: '1px 6px', borderRadius: 4 }}>
                      {task.ticketNumber}
                    </span>
                    {priorityBadge(task.priority)}
                    <span className={`badge badge-${task.status}`}>{task.status.replace(/_/g, ' ')}</span>
                  </div>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 2 }}>
                    {task.title}
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
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
