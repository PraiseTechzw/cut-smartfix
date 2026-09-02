'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, formatDate, timeAgo } from '../../../lib/api';
import type { MaintenanceReport, PaginatedList } from '@cut-smartfix/contracts';

function locationLabel(r: MaintenanceReport) {
  const l = r.location;
  const parts = [l.buildingName ?? l.building, l.floorName ?? l.floor, l.roomName ?? l.room].filter(Boolean);
  return parts.join(' › ') || '–';
}

export default function ActiveWorkPage() {
  const [tasks, setTasks] = useState<MaintenanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api.get<PaginatedList<MaintenanceReport> | MaintenanceReport[]>(
          '/v1/tasks?status=in_progress&pageSize=50'
        );
        if (res.error) throw new Error(res.error.message);
        const items: MaintenanceReport[] = Array.isArray(res.data)
          ? res.data
          : (res.data as PaginatedList<MaintenanceReport>).items ?? [];
        setTasks(items);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Active Work</h2>
          <p>Tasks currently in progress</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-overlay"><div className="spinner" /></div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔧</div>
          <h3>No active work</h3>
          <p>No tasks are currently in progress.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tasks.map((task) => (
            <div key={task.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '14px 18px' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', background: 'var(--bg)', padding: '1px 6px', borderRadius: 4 }}>
                    {task.ticketNumber}
                  </span>
                  {task.priority && <span className={`badge badge-${task.priority}`}>{task.priority}</span>}
                  {task.isOverdue && <span className="badge badge-critical">OVERDUE</span>}
                </div>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>{task.title}</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                  📍 {locationLabel(task)} · Started {timeAgo(task.updatedAt)}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.82rem', color: 'var(--muted)', flexShrink: 0 }}>
                <span>Assigned: {formatDate(task.createdAt)}</span>
                <Link href={`/tasks/${task.id}`} className="btn btn-primary btn-sm">
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
