'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, buildQuery, timeAgo } from '../../../../lib/api';
import type { MaintenanceReport, PaginatedList } from '@cut-smartfix/contracts';

export default function RequestsPage() {
  const [requests, setRequests] = useState<MaintenanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<PaginatedList<MaintenanceReport> | MaintenanceReport[]>(`/v1/reports${buildQuery({ pageSize: 50 })}`)
      .then((result) => {
        if (result.error) throw new Error(result.error.message);
        setRequests(Array.isArray(result.data) ? result.data : result.data?.items ?? []);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load requests.'))
      .finally(() => setLoading(false));
  }, []);

  return <><div className="page-header"><div className="page-header-left"><h2>Requests</h2><p>Review incoming maintenance work before assignment.</p></div></div>{error && <div className="alert alert-error">{error}</div>}<div className="table-wrapper"><table className="table"><thead><tr><th>Ticket</th><th>Request</th><th>Location</th><th>Priority</th><th>Status</th><th>Age</th><th /></tr></thead><tbody>{loading ? <tr><td colSpan={7}><div className="loading-overlay"><div className="spinner" /></div></td></tr> : requests.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">OK</div><h3>No incoming requests</h3><p>New student reports will appear here.</p></div></td></tr> : requests.map((request) => <tr key={request.id}><td><span className="ticket-code">{request.ticketNumber}</span></td><td><strong>{request.title}</strong><small className="table-muted">{request.reporterName ?? 'Student report'}</small></td><td className="table-muted">{request.location.buildingName ?? request.location.building ?? 'Location pending'}</td><td><span className={`badge badge-${request.priority ?? 'low'}`}>{request.priority ?? 'unassigned'}</span></td><td><span className={`badge badge-${request.status}`}>{request.status.replace(/_/g, ' ')}</span></td><td className="table-muted">{timeAgo(request.createdAt)}</td><td><Link className="btn btn-secondary btn-sm" href={`/tasks/${request.id}`}>Review</Link></td></tr>)}</tbody></table></div></>;
}
