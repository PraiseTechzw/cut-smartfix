"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import type { AnalyticsReport, DashboardStats, MaintenanceReport, PaginatedList } from "@cut-smartfix/contracts";

interface DashboardData {
  stats: DashboardStats;
  byStatus: { label: string; value: number }[];
  byPriority: { label: string; value: number }[];
  trend: { label: string; value: number }[];
}

function StatCard({
  label, value, sub, color,
}: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className={`stat-card ${color ?? "green"}`}>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">{value}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [critical, setCritical] = useState<MaintenanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [analytics, tickets] = await Promise.all([
          fetchApi<AnalyticsReport>("/v1/analytics/dashboard"),
          fetchApi<PaginatedList<MaintenanceReport>>("/v1/reports?priority=critical&pageSize=10"),
        ]);
        setData({
          stats: analytics.stats,
          byStatus: analytics.byStatus ?? [],
          byPriority: analytics.byPriority ?? [],
          trend: analytics.trend ?? [],
        });
        setCritical(tickets.items ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "48px 0", textAlign: "center", color: "var(--muted)" }}>
        Loading dashboard…
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger">{error}</div>
    );
  }

  const stats = data?.stats;

  // Chart helpers
  const maxTrend = Math.max(...(data?.trend.map((d) => d.value) ?? [1]), 1);
  const maxStatus = Math.max(...(data?.byStatus.map((d) => d.value) ?? [1]), 1);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Facilities management overview for CUT</div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link href="/assignments" className="btn btn-primary btn-sm">
            + New Assignment
          </Link>
          <Link href="/maintenance?isOverdue=true" className="btn btn-secondary btn-sm">
            View Overdue
          </Link>
          <Link href="/audit" className="btn btn-secondary btn-sm">
            Audit Logs
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards">
        <StatCard label="Total" value={stats?.total ?? 0} color="gray" />
        <StatCard label="Pending" value={stats?.pending ?? 0} sub="submitted + reviewing" color="amber" />
        <StatCard label="Assigned" value={stats?.assigned ?? 0} color="blue" />
        <StatCard label="In Progress" value={stats?.inProgress ?? 0} color="cyan" />
        <StatCard label="Overdue" value={stats?.overdue ?? 0} color="red" sub="past due date" />
        <StatCard label="Critical" value={stats?.critical ?? 0} color="red" sub="highest priority" />
        <StatCard label="Completed" value={stats?.completed ?? 0} color="teal" />
        <StatCard label="Closed" value={stats?.closed ?? 0} color="green" />
      </div>

      {/* Charts row */}
      <div className="grid-2" style={{ marginBottom: "24px" }}>
        {/* Status Distribution */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Status Distribution</div>
          </div>
          <div className="card-body">
            {data?.byStatus.length ? (
              <div className="hbar-chart">
                {data.byStatus.map((d) => (
                  <div key={d.label} className="hbar-row">
                    <div className="hbar-label" title={d.label}>{d.label.replace(/_/g, " ")}</div>
                    <div className="hbar-track">
                      <div
                        className="hbar-fill"
                        style={{ width: `${(d.value / maxStatus) * 100}%` }}
                      />
                    </div>
                    <div className="hbar-val">{d.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "24px" }}>No data</div>
            )}
          </div>
        </div>

        {/* 7-day Trend */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Reports — Last 7 Days</div>
          </div>
          <div className="card-body">
            {data?.trend.length ? (
              <div>
                <div className="bar-chart">
                  {data.trend.slice(-7).map((d) => (
                    <div key={d.label} className="bar-col">
                      <div className="bar-value">{d.value}</div>
                      <div
                        className="bar"
                        style={{ height: `${(d.value / maxTrend) * 80}px` }}
                        title={`${d.label}: ${d.value}`}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                  {data.trend.slice(-7).map((d) => (
                    <div key={d.label} className="bar-label" style={{ flex: 1 }}>
                      {d.label.slice(-5)}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "24px" }}>No trend data</div>
            )}
          </div>
        </div>
      </div>

      {/* Priority distribution */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="card-header">
          <div className="card-title">Priority Distribution</div>
        </div>
        <div className="card-body">
          <div className="priority-grid">
            {["critical", "high", "medium", "low"].map((p) => {
              const found = data?.byPriority.find((d) =>
                d.label.toLowerCase() === p,
              );
              return (
                <div key={p} className={`priority-box ${p}`}>
                  <div className="priority-box-count">{found?.value ?? 0}</div>
                  <div className="priority-box-label">{p}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Critical Issues */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Recent Critical Issues</div>
          <Link href="/maintenance?priority=critical" className="btn btn-ghost btn-sm">
            View all →
          </Link>
        </div>
        <div className="table-wrapper">
          {critical.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <div className="empty-state-title">No critical issues</div>
              <div className="empty-state-text">All critical tickets are resolved.</div>
            </div>
          ) : (
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Ticket #</th>
                  <th>Title</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {critical.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="text-bold" style={{ fontFamily: "monospace" }}>
                        {r.ticketNumber}
                      </span>
                    </td>
                    <td>
                      <div style={{ maxWidth: "220px" }} className="truncate" title={r.title}>
                        {r.title}
                      </div>
                      {r.isOverdue && (
                        <span className="badge badge-danger" style={{ marginTop: "2px" }}>
                          Overdue
                        </span>
                      )}
                    </td>
                    <td className="text-muted">
                      {r.location?.buildingName ?? r.location?.building ?? "—"}
                    </td>
                    <td>
                      <span className={`badge badge-${r.status}`}>
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="text-muted">{r.assignedToName ?? "Unassigned"}</td>
                    <td className="text-muted">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <Link href={`/maintenance/${r.id}`} className="btn btn-ghost btn-xs">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
