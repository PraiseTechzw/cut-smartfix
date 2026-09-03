'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api, formatDate, buildQuery } from '../../../lib/api';
import type { MaintenanceReport, PaginatedList } from '@cut-smartfix/contracts';

type StatusFilter = 'terminal' | 'closed' | 'rejected' | 'cancelled' | 'duplicate';

const TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All Closed', value: 'terminal' },
  { label: 'Closed', value: 'closed' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Duplicate', value: 'duplicate' },
];

const STATUS_MAP: Record<StatusFilter, string | string[]> = {
  terminal: ['closed', 'rejected', 'cancelled', 'duplicate'],
  closed: 'closed',
  rejected: 'rejected',
  cancelled: 'cancelled',
  duplicate: 'duplicate',
};

function resolutionTime(created: string, closed?: string | null): string {
  if (!closed) return '–';
  const ms = new Date(closed).getTime() - new Date(created).getTime();
  const hours = Math.floor(ms / 3600000);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

const STATUS_LABELS: Record<string, string> = {
  closed: 'Closed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  duplicate: 'Duplicate',
};

export default function HistoryPage() {
  const [tab, setTab] = useState<StatusFilter>('terminal');
  const [tasks, setTasks] = useState<MaintenanceReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusValue = STATUS_MAP[tab];
      const params: Record<string, unknown> = {
        page,
        pageSize: PAGE_SIZE,
      };

      // Multi-status: pass comma-separated (API must support it) or multiple params
      if (Array.isArray(statusValue)) {
        // Use the first status + a custom 'terminal' shortcut if API supports it,
        // otherwise pass them comma-separated
        params.status = statusValue.join(',');
      } else {
        params.status = statusValue;
      }

      if (search.trim()) params.search = search.trim();
      if (from) params.from = from;
      if (to) params.to = to;

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
      setError(e instanceof Error ? e.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [tab, search, from, to, page]);

  useEffect(() => {
    setPage(1);
  }, [tab, search, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>History</h2>
          <p>Closed, rejected, cancelled, and duplicate tickets</p>
        </div>
      </div>

      {/* Status tabs */}
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

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className="label">Search</label>
            <div className="search-input-wrap">
              <svg className="search-icon" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                className="input"
                placeholder="Search tickets…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {(search || from || to) && (
            <button
              className="btn btn-ghost"
              onClick={() => { setSearch(''); setFrom(''); setTo(''); }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-overlay"><div className="spinner" /></div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <h3>No history found</h3>
          <p>No tickets match your search.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {tasks.map((task) => (
              <div key={task.id} className="card" style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <div>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', background: 'var(--bg)', padding: '1px 6px', borderRadius: 4 }}>
                      {task.ticketNumber}
                    </span>
                    {task.priority && (
                      <span className={`badge badge-${task.priority}`} style={{ marginLeft: 6 }}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                  <span className={`badge badge-${task.status}`}>
                    {STATUS_LABELS[task.status] ?? task.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 6, lineHeight: 1.4 }}>
                  {task.title}
                </p>

                <div style={{ display: 'flex', gap: 16, fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 12, flexWrap: 'wrap' }}>
                  <span>📍 {task.location.buildingName ?? task.location.building ?? '–'}</span>
                  <span>📅 {formatDate(task.closedAt ?? task.updatedAt)}</span>
                  <span>⏱ {resolutionTime(task.createdAt, task.closedAt ?? task.updatedAt)}</span>
                </div>

                {task.assignedToName && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 12 }}>
                    👤 {task.assignedToName}
                  </p>
                )}

                {task.rejectionReason && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--red)', marginBottom: 12, fontStyle: 'italic' }}>
                    Reason: {task.rejectionReason}
                  </p>
                )}

                <Link href={`/tasks/${task.id}`} className="btn btn-secondary btn-sm">
                  View Details
                </Link>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <div className="pagination-info">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </div>
              <div className="pagination-controls">
                <button className="pagination-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                  <button key={p} className={`pagination-btn${page === p ? ' active' : ''}`} onClick={() => setPage(p)}>
                    {p}
                  </button>
                ))}
                <button className="pagination-btn" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>›</button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
