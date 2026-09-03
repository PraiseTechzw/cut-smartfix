"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import type { AuditLog, PaginatedList } from "@cut-smartfix/contracts";

const ACTION_OPTIONS = [
  "report.created","report.updated","report.assigned","report.closed","report.rejected","report.cancelled",
  "user.created","user.updated","user.deactivated",
  "assignment.created","material_request.approved","material_request.rejected",
];

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const PAGE_SIZE = 25;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (action) params.set("action", action);
      if (entityType) params.set("entityType", entityType);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const data = await fetchApi<PaginatedList<AuditLog>>(`/v1/audit?${params}`);
      setLogs(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit logs");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [search, action, entityType, from, to, page]);

  useEffect(() => { setPage(1); }, [search, action, entityType, from, to]);
  useEffect(() => { load(); }, [load]);

  const reset = () => {
    setSearch(""); setAction(""); setEntityType(""); setFrom(""); setTo(""); setPage(1);
  };

  const actionColor = (a: string) => {
    if (a.includes("deleted") || a.includes("cancelled") || a.includes("rejected") || a.includes("deactivated"))
      return "var(--red)";
    if (a.includes("created") || a.includes("approved")) return "var(--green)";
    if (a.includes("updated") || a.includes("assigned")) return "var(--blue)";
    return "var(--text)";
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Audit Logs</div>
          <div className="page-subtitle">
            Traceable record of all administrative actions — {total} total entries.
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="card-body" style={{ paddingBottom: "12px" }}>
          <div className="filter-bar">
            <input
              className="input input-search"
              placeholder="Search actor, entity ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="select" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">All actions</option>
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select className="select" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <option value="">All entities</option>
              {["maintenance_report","user","assignment","material_request","department","category"].map((e) => (
                <option key={e} value={e}>{e.replace(/_/g, " ")}</option>
              ))}
            </select>
            <input type="date" className="input" style={{ width: "auto" }} value={from} onChange={(e) => setFrom(e.target.value)} />
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>to</span>
            <input type="date" className="input" style={{ width: "auto" }} value={to} onChange={(e) => setTo(e.target.value)} />
            {(search || action || entityType || from || to) && (
              <button className="btn btn-secondary btn-sm" onClick={reset}>Clear</button>
            )}
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div style={{ padding: "48px", textAlign: "center", color: "var(--muted)" }}>Loading audit logs…</div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔍</div>
              <div className="empty-state-title">No audit events found</div>
              <div className="empty-state-text">Try adjusting your filters.</div>
            </div>
          ) : (
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <>
                    <tr
                      key={log.id}
                      style={{ cursor: log.newValues ? "pointer" : "default" }}
                      onClick={() => log.newValues && setExpanded(expanded === log.id ? null : log.id)}
                    >
                      <td className="text-muted text-sm" style={{ whiteSpace: "nowrap" }}>
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{log.actorName ?? "System"}</span>
                      </td>
                      <td>
                        <code style={{ fontSize: "12px", color: actionColor(log.action), fontWeight: 600 }}>
                          {log.action}
                        </code>
                      </td>
                      <td className="text-muted text-sm">
                        {log.entityType}
                        {log.entityId && (
                          <span style={{ fontFamily: "monospace", marginLeft: "6px", fontSize: "11px" }}>
                            {log.entityId.slice(0, 8)}…
                          </span>
                        )}
                      </td>
                      <td>
                        {log.newValues ? (
                          <button className="btn btn-ghost btn-xs">
                            {expanded === log.id ? "▲ Hide" : "▼ Show"}
                          </button>
                        ) : (
                          <span className="text-muted text-sm">—</span>
                        )}
                      </td>
                    </tr>
                    {expanded === log.id && (
                      <tr key={`${log.id}-detail`}>
                        <td colSpan={5} style={{ background: "#f8faf9", padding: "12px 20px" }}>
                          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
                            {log.oldValues && (
                              <div>
                                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>Before</div>
                                <pre style={{ fontSize: "11px", color: "var(--red)", margin: 0 }}>
                                  {JSON.stringify(log.oldValues, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.newValues && (
                              <div>
                                <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", marginBottom: "4px" }}>After</div>
                                <pre style={{ fontSize: "11px", color: "var(--green)", margin: 0 }}>
                                  {JSON.stringify(log.newValues, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="card-footer">
            <div className="pagination">
              <div>
                Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–
                {Math.min(page * PAGE_SIZE, total)} of {total}
              </div>
              <div className="pagination-pages">
                <button className="page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                  <button key={p} className={`page-btn${page === p ? " active" : ""}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                {totalPages > 7 && <span style={{ padding: "0 4px" }}>…</span>}
                <button className="page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
