"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import type {
  MaintenanceReport,
  PaginatedList,
  Department,
  Category,
} from "@cut-smartfix/contracts";

const STATUS_OPTIONS = [
  "submitted","under_review","assigned","accepted","in_progress",
  "waiting_for_materials","repair_completed","under_verification",
  "closed","rejected","cancelled","reopened",
];
const PRIORITY_OPTIONS = ["critical","high","medium","low"];

interface SummaryStats {
  total: number;
  closed: number;
  rejected: number;
  cancelled: number;
  overdue: number;
  avgResolutionDays: number | null;
}

function computeStats(reports: MaintenanceReport[]): SummaryStats {
  const closed = reports.filter((r) => r.status === "closed").length;
  const rejected = reports.filter((r) => r.status === "rejected").length;
  const cancelled = reports.filter((r) => r.status === "cancelled").length;
  const overdue = reports.filter((r) => r.isOverdue).length;
  const resolved = reports.filter(
    (r) => r.status === "closed" && r.closedAt,
  );
  const avgMs =
    resolved.length > 0
      ? resolved.reduce(
          (sum, r) =>
            sum + (new Date(r.closedAt!).getTime() - new Date(r.createdAt).getTime()),
          0,
        ) / resolved.length
      : null;
  return {
    total: reports.length,
    closed,
    rejected,
    cancelled,
    overdue,
    avgResolutionDays: avgMs !== null ? Math.round(avgMs / 86400000) : null,
  };
}

function exportCSV(reports: MaintenanceReport[]) {
  const header = [
    "Ticket","Title","Status","Priority","Reporter","Building",
    "Category","Assigned To","Department","Created","Closed",
  ].join(",");
  const rows = reports.map((r) =>
    [
      r.ticketNumber,
      `"${(r.title ?? "").replace(/"/g, '""')}"`,
      r.status,
      r.priority ?? "",
      `"${(r.reporterName ?? "").replace(/"/g, '""')}"`,
      `"${(r.location?.buildingName ?? r.location?.building ?? "").replace(/"/g, '""')}"`,
      r.categoryName ?? "",
      `"${(r.assignedToName ?? "").replace(/"/g, '""')}"`,
      r.assignedDepartmentName ?? "",
      new Date(r.createdAt).toLocaleDateString(),
      r.closedAt ? new Date(r.closedAt).toLocaleDateString() : "",
    ].join(","),
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cut-smartfix-report-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");

  // Filters
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [deptId, setDeptId] = useState("");
  const [catId, setCatId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchApi<Department[]>("/v1/admin/departments").catch(() => []),
      fetchApi<Category[]>("/v1/categories").catch(() => []),
    ]).then(([d, c]) => {
      setDepartments(d);
      setCategories(c);
    });
  }, []);

  const runReport = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ pageSize: "500" });
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (deptId) params.set("departmentId", deptId);
      if (catId) params.set("categoryId", catId);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (isOverdue) params.set("isOverdue", "true");

      const result = await fetchApi<PaginatedList<MaintenanceReport>>(
        `/v1/reports?${params}`,
      );
      setReports(result.items ?? []);
      setHasLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const stats = hasLoaded ? computeStats(reports) : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Reports &amp; Export</div>
          <div className="page-subtitle">
            Filter tickets and export to CSV for analysis or record-keeping.
          </div>
        </div>
        {hasLoaded && reports.length > 0 && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => exportCSV(reports)}
          >
            ↓ Export CSV ({reports.length})
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div className="card-header">
          <div className="card-title">Report Filters</div>
        </div>
        <div className="card-body">
          <div className="filter-grid">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All statuses</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">All priorities</option>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="select" value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                <option value="">All departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="select" value={catId} onChange={(e) => setCatId(e.target.value)}>
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">From date</label>
              <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">To date</label>
              <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "8px", flexWrap: "wrap" }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={isOverdue}
                onChange={(e) => setIsOverdue(e.target.checked)}
              />
              Overdue only
            </label>
            <button className="btn btn-primary" onClick={runReport} disabled={loading}>
              {loading ? "Generating…" : "Generate Report"}
            </button>
            {hasLoaded && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setStatus(""); setPriority(""); setDeptId(""); setCatId("");
                  setFrom(""); setTo(""); setIsOverdue(false);
                  setReports([]); setHasLoaded(false);
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Summary stats */}
      {stats && (
        <div className="stat-cards" style={{ marginBottom: "20px" }}>
          <div className="stat-card gray">
            <div className="stat-card-label">Total matched</div>
            <div className="stat-card-value">{stats.total}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-card-label">Closed</div>
            <div className="stat-card-value">{stats.closed}</div>
          </div>
          <div className="stat-card red">
            <div className="stat-card-label">Rejected</div>
            <div className="stat-card-value">{stats.rejected}</div>
          </div>
          <div className="stat-card gray">
            <div className="stat-card-label">Cancelled</div>
            <div className="stat-card-value">{stats.cancelled}</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-card-label">Overdue</div>
            <div className="stat-card-value">{stats.overdue}</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-card-label">Avg resolution</div>
            <div className="stat-card-value">
              {stats.avgResolutionDays !== null ? `${stats.avgResolutionDays}d` : "—"}
            </div>
          </div>
        </div>
      )}

      {/* Results table */}
      {hasLoaded && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Results ({reports.length})</div>
            {reports.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={() => exportCSV(reports)}>
                ↓ CSV
              </button>
            )}
          </div>
          <div className="table-wrapper">
            {reports.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <div className="empty-state-title">No results</div>
                <div className="empty-state-text">Try different filter criteria.</div>
              </div>
            ) : (
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Ticket</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Reporter</th>
                    <th>Building</th>
                    <th>Category</th>
                    <th>Assigned To</th>
                    <th>Created</th>
                    <th>Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 600 }}>
                          {r.ticketNumber}
                        </span>
                        {r.isOverdue && (
                          <span className="badge badge-danger" style={{ marginLeft: "4px" }}>!</span>
                        )}
                      </td>
                      <td>
                        <div style={{ maxWidth: "200px" }} className="truncate" title={r.title}>
                          {r.title}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${r.status}`}>
                          {r.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>
                        {r.priority ? (
                          <span className={`badge badge-${r.priority}`}>{r.priority}</span>
                        ) : "—"}
                      </td>
                      <td className="text-muted text-sm">{r.reporterName ?? "—"}</td>
                      <td className="text-muted text-sm">
                        {r.location?.buildingName ?? r.location?.building ?? "—"}
                      </td>
                      <td className="text-muted text-sm">{r.categoryName ?? "—"}</td>
                      <td className="text-muted text-sm">{r.assignedToName ?? "—"}</td>
                      <td className="text-muted text-sm">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="text-muted text-sm">
                        {r.closedAt ? new Date(r.closedAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
