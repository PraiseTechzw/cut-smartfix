"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api, timeAgo, buildQuery } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import type { MaintenanceReport, PaginatedList } from "@cut-smartfix/contracts";

type TabFilter = 'all' | 'under_review' | 'assigned' | 'accepted' | 'in_progress' | 'waiting_for_materials' | 'under_verification' | 'repair_completed';

const TABS: { label: string; value: TabFilter }[] = [
  { label: 'All Active', value: 'all' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Waiting Materials', value: 'waiting_for_materials' },
  { label: 'Verification', value: 'under_verification' },
  { label: 'Completed', value: 'repair_completed' },
];

export default function AssignmentsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabFilter>('all');
  const [tasks, setTasks] = useState<MaintenanceReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSupervisor = user?.role === "supervisor" || user?.role === "administrator";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { pageSize: 100 };
      if (tab !== 'all') params.status = tab;
      // For supervisors: use reports endpoint for broader view; for technicians: tasks
      const endpoint = isSupervisor ? '/v1/reports' : '/v1/tasks';

      const res = await api.get<PaginatedList<MaintenanceReport> | MaintenanceReport[]>(
        `${endpoint}${buildQuery(params)}`
      );
      if (res.error) throw new Error(res.error.message);
      const items = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
      setTasks(items);
      setTotal(items.length);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to load assignments.");
    } finally {
      setLoading(false);
    }
  }, [tab, isSupervisor]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Assignments</h2>
          <p>
            {isSupervisor
              ? "Departmental workload and technician ownership"
              : "Your task assignments and status"}
          </p>
        </div>
        <div className="page-header-actions">
          <span className="count-chip">{loading ? '…' : `${total} ticket${total !== 1 ? 's' : ''}`}</span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
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

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="loading-overlay" style={{ minHeight: 200 }}>
            <div className="spinner" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <h3>No assignments</h3>
            <p>No tickets match the current filter.</p>
          </div>
        ) : (
          <div className="assignment-list">
            {tasks.map((task) => (
              <Link
                className={`assignment-row${task.isOverdue ? ' assignment-row-overdue' : ''}`}
                href={`/tasks/${task.id}`}
                key={task.id}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span className="ticket-code">{task.ticketNumber}</span>
                    {task.isOverdue && (
                      <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>OVERDUE</span>
                    )}
                  </div>
                  <strong style={{ fontSize: '0.9rem' }}>{task.title}</strong>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    <small className="table-muted">
                      👤 {task.assignedToName ?? "Unassigned"}
                    </small>
                    <small className="table-muted">
                      🏢 {task.assignedDepartmentName ?? "No dept"}
                    </small>
                    <small className="table-muted">
                      🕐 {timeAgo(task.updatedAt)}
                    </small>
                  </div>
                </div>
                <div className="assignment-meta">
                  <span className={`badge badge-${task.priority ?? "low"}`}>
                    {task.priority ?? "low"}
                  </span>
                  <span className={`badge badge-${task.status}`}>
                    {task.status.replace(/_/g, " ")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
