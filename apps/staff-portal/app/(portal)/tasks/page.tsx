'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api, formatDate, buildQuery } from '../../../lib/api';
import type { MaintenanceReport, ReportStatus, PaginatedList } from '@cut-smartfix/contracts';

type TabFilter = 'all' | 'assigned' | 'accepted' | 'in_progress' | 'waiting_for_materials' | 'repair_completed';

const TABS: { label: string; value: TabFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Waiting Materials', value: 'waiting_for_materials' },
  { label: 'Completed', value: 'repair_completed' },
];

function locationLabel(r: MaintenanceReport) {
  const l = r.location;
  const parts = [l.buildingName ?? l.building, l.roomName ?? l.room].filter(Boolean);
  return parts.join(', ') || '–';
}

export default function TasksPage() {
  const [tab, setTab] = useState<TabFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [tasks, setTasks] = useState<MaintenanceReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const PAGE_SIZE = 15;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page, pageSize: PAGE_SIZE };
      if (tab !== 'all') params.status = tab;
      if (search.trim()) params.search = search.trim();

      const res = await api.get<PaginatedList<MaintenanceReport> | MaintenanceReport[]>(
        `/v1/tasks${buildQuery(params)}`
      );
      if (res.error) throw new Error(res.error.message);

      if (Array.isArray(res.data)) {
        setTasks(res.data);
        setTotal(res.data.length);
      } else {
        const pl = res.data as PaginatedList<MaintenanceReport>;
        setTasks(pl.items ?? []);
        setTotal(pl.total ?? 0);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [tab, search, page]);

  useEffect(() => {
    setPage(1);
  }, [tab, search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (
    taskId: string,
    newStatus: ReportStatus,
    label: string
  ) => {
    setActionLoading(taskId);
    setActionMsg(null);
    try {
      const res = await api.patch(`/v1/tasks/${taskId}`, { status: newStatus });
      if (res.error) throw new Error(res.error.message);
      setActionMsg(`Task ${label} successfully.`);
      load();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>My Tasks</h2>
          <p>Work orders assigned to you</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs">
        {TABS.map((t) => (
          <button
            key={t.value}
            className={`filter-tab${tab === t.value ? ' active' : ''}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="search-row">
        <div className="search-input-wrap">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            className="input"
            placeholder="Search by ticket, title, location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {actionMsg && (
        <div className="alert alert-success" style={{ marginBottom: 12 }}>
          {actionMsg}
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {/* Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Title</th>
              <th>Location</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Assigned</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                </td>
              </tr>
            ) : tasks.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <h3>No tasks found</h3>
                    <p>Try a different filter or search term.</p>
                  </div>
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => (window.location.href = `/tasks/${task.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>
                      {task.ticketNumber}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500 }}>{task.title}</span>
                    {task.isOverdue && (
                      <span className="badge badge-critical" style={{ marginLeft: 6, fontSize: '0.65rem' }}>
                        OVERDUE
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                    {locationLabel(task)}
                  </td>
                  <td>
                    {task.priority ? (
                      <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                    ) : (
                      <span className="badge badge-low">–</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge badge-${task.status}`}>
                      {task.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                    {formatDate(task.createdAt)}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {task.status === 'assigned' && (
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={actionLoading === task.id}
                          onClick={() => handleAction(task.id, 'accepted', 'accepted')}
                        >
                          Accept
                        </button>
                      )}
                      {task.status === 'accepted' && (
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={actionLoading === task.id}
                          onClick={() => handleAction(task.id, 'in_progress', 'started')}
                        >
                          Start Work
                        </button>
                      )}
                      <Link href={`/tasks/${task.id}`} className="btn btn-secondary btn-sm">
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <div className="pagination-info">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </div>
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              aria-label="Previous page"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  className={`pagination-btn${page === p ? ' active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              );
            })}
            <button
              className="pagination-btn"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </>
  );
}
