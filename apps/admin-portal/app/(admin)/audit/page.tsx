"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import type { AuditLog, PaginatedList } from "@cut-smartfix/contracts";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    fetchApi<PaginatedList<AuditLog>>("/v1/audit?pageSize=50")
      .then((data) => setLogs(data.items ?? []))
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load audit logs.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Audit Logs</div>
          <div className="page-subtitle">
            A traceable record of administrative actions.
          </div>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Entity</th>
              <th>Actor</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4}>
                  <div className="loading-state">Loading audit history…</div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="empty-state">
                    <div className="empty-state-icon">OK</div>
                    <div className="empty-state-title">No audit events</div>
                    <div className="empty-state-text">
                      Administrative activity will be recorded here.
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <strong>{log.action}</strong>
                  </td>
                  <td className="text-muted">
                    {log.entityType}
                    {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}
                  </td>
                  <td className="text-muted">{log.actorName ?? "System"}</td>
                  <td className="text-muted">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
