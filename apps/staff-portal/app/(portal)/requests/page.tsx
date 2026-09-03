"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api, buildQuery, timeAgo } from "../../../lib/api";
import type { MaintenanceReport, PaginatedList, UserProfile, ReportStatus } from "@cut-smartfix/contracts";

type TabFilter = 'incoming' | 'under_review' | 'assigned' | 'all';

const TABS: { label: string; value: TabFilter }[] = [
  { label: 'Incoming', value: 'incoming' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'All', value: 'all' },
];

const TAB_STATUS_MAP: Record<TabFilter, string | undefined> = {
  incoming: 'submitted',
  under_review: 'under_review',
  assigned: 'assigned',
  all: undefined,
};

export default function RequestsPage() {
  const [tab, setTab] = useState<TabFilter>('incoming');
  const [requests, setRequests] = useState<MaintenanceReport[]>([]);
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline assign state
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignTechId, setAssignTechId] = useState<string>('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Review action state
  const [reviewLoading, setReviewLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActionMsg(null);
    try {
      const status = TAB_STATUS_MAP[tab];
      const params: Record<string, unknown> = { pageSize: 100 };
      if (status) params.status = status;

      const res = await api.get<PaginatedList<MaintenanceReport> | MaintenanceReport[]>(
        `/v1/reports${buildQuery(params)}`
      );
      if (res.error) throw new Error(res.error.message);
      const items = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
      setRequests(items);

      // Load staff list for assignment if not already loaded
      if (staff.length === 0) {
        const staffRes = await api.get<UserProfile[] | { items?: UserProfile[] }>('/v1/users?role=technician&pageSize=100');
        if (!staffRes.error) {
          const data = staffRes.data as unknown;
          if (Array.isArray(data)) setStaff(data as UserProfile[]);
          else setStaff((data as { items?: UserProfile[] }).items ?? []);
        }
      }
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to load requests.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (id: string, newStatus: ReportStatus) => {
    setReviewLoading(id);
    setActionMsg(null);
    try {
      const res = await api.patch(`/v1/reports/${id}`, { status: newStatus });
      if (res.error) throw new Error(res.error.message);
      setActionMsg(`Report moved to ${newStatus.replace(/_/g, ' ')}`);
      load();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setReviewLoading(null);
    }
  };

  const handleAssign = async (reportId: string) => {
    if (!assignTechId) return;
    setAssignLoading(true);
    setActionMsg(null);
    try {
      const res = await api.post(`/v1/reports/${reportId}/assignments`, {
        reportId,
        technicianId: assignTechId,
      });
      if (res.error) throw new Error(res.error.message);
      setActionMsg('Technician assigned successfully.');
      setAssigningId(null);
      setAssignTechId('');
      load();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : 'Assignment failed');
    } finally {
      setAssignLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Requests</h2>
          <p>Review incoming maintenance reports before assignment.</p>
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

      {actionMsg && (
        <div className={`alert ${actionMsg.includes('failed') || actionMsg.includes('Failed') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 12 }}>
          {actionMsg}
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Ticket</th>
              <th>Request</th>
              <th>Location</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Age</th>
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
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📥</div>
                    <h3>No requests</h3>
                    <p>
                      {tab === 'incoming'
                        ? 'New student reports will appear here.'
                        : 'No requests match this filter.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              requests.map((request) => (
                <>
                  <tr key={request.id}>
                    <td>
                      <span className="ticket-code">{request.ticketNumber}</span>
                    </td>
                    <td>
                      <strong style={{ fontSize: '0.9rem' }}>{request.title}</strong>
                      <br />
                      <small className="table-muted">
                        {request.reporterName ?? "Student report"}
                      </small>
                    </td>
                    <td className="table-muted" style={{ fontSize: '0.82rem' }}>
                      {request.location.buildingName ??
                        request.location.building ??
                        "Location pending"}
                    </td>
                    <td>
                      <span className={`badge badge-${request.priority ?? "low"}`}>
                        {request.priority ?? "–"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${request.status}`}>
                        {request.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="table-muted" style={{ fontSize: '0.82rem' }}>
                      {timeAgo(request.createdAt)}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {request.status === 'submitted' && (
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={reviewLoading === request.id}
                            onClick={() => handleStatusChange(request.id, 'under_review')}
                          >
                            Review
                          </button>
                        )}
                        {request.status === 'under_review' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setAssigningId(assigningId === request.id ? null : request.id);
                              setAssignTechId('');
                            }}
                          >
                            {assigningId === request.id ? 'Cancel' : 'Assign'}
                          </button>
                        )}
                        <Link
                          className="btn btn-secondary btn-sm"
                          href={`/tasks/${request.id}`}
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                  {/* Inline assign form */}
                  {assigningId === request.id && (
                    <tr key={`${request.id}-assign`}>
                      <td colSpan={7} style={{ background: '#f8fafc', padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <label className="label" style={{ margin: 0, minWidth: 110 }}>
                            Assign to:
                          </label>
                          <select
                            className="select"
                            style={{ flex: 1, minWidth: 180, maxWidth: 280 }}
                            value={assignTechId}
                            onChange={(e) => setAssignTechId(e.target.value)}
                          >
                            <option value="">— Choose technician —</option>
                            {staff.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.fullName}{s.departmentName ? ` (${s.departmentName})` : ''}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={!assignTechId || assignLoading}
                            onClick={() => handleAssign(request.id)}
                          >
                            {assignLoading ? 'Assigning…' : 'Confirm Assign'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
