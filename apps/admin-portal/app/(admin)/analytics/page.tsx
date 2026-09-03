"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import type { AnalyticsReport } from "@cut-smartfix/contracts";

function HBar({ title, data, color = "var(--green)" }: {
  title: string;
  data: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="card">
      <div className="card-header"><div className="card-title">{title}</div></div>
      <div className="card-body">
        {data.length === 0 ? (
          <div className="empty-state" style={{ padding: "20px" }}>No data available.</div>
        ) : (
          <div className="hbar-chart">
            {data.slice(0, 10).map((d) => (
              <div key={d.label} className="hbar-row">
                <div className="hbar-label" title={d.label}>{d.label.replace(/_/g, " ")}</div>
                <div className="hbar-track">
                  <div className="hbar-fill" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
                </div>
                <div className="hbar-val">{d.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const last14 = data.slice(-14);
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Reports Submitted — Last 14 Days</div>
      </div>
      <div className="card-body">
        {last14.length === 0 ? (
          <div className="empty-state" style={{ padding: "20px" }}>No trend data.</div>
        ) : (
          <div>
            <div className="bar-chart" style={{ alignItems: "flex-end", gap: "4px" }}>
              {last14.map((d) => (
                <div key={d.label} className="bar-col" style={{ flex: 1 }}>
                  <div className="bar-value" style={{ fontSize: "10px" }}>{d.value > 0 ? d.value : ""}</div>
                  <div
                    className="bar"
                    style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}px` }}
                    title={`${d.label}: ${d.value}`}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: "4px", marginTop: "6px", overflowX: "auto" }}>
              {last14.map((d) => (
                <div key={d.label} className="bar-label" style={{ flex: 1, minWidth: "30px", fontSize: "10px" }}>
                  {d.label.slice(-5)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PriorityDonut({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const COLORS: Record<string, string> = {
    critical: "#dc2626", high: "#f97316", medium: "#eab308", low: "#6b7280",
  };
  return (
    <div className="card">
      <div className="card-header"><div className="card-title">Priority Breakdown</div></div>
      <div className="card-body">
        <div className="priority-grid">
          {["critical","high","medium","low"].map((p) => {
            const found = data.find((d) => d.label.toLowerCase() === p);
            const val = found?.value ?? 0;
            const pct = total > 0 ? Math.round((val / total) * 100) : 0;
            return (
              <div key={p} className={`priority-box ${p}`}>
                <div className="priority-box-count">{val}</div>
                <div className="priority-box-label">{p}</div>
                <div style={{ fontSize: "11px", opacity: 0.75 }}>{pct}%</div>
              </div>
            );
          })}
        </div>
        {total > 0 && (
          <div style={{ display: "flex", height: "10px", borderRadius: "999px", overflow: "hidden", marginTop: "16px", gap: "2px" }}>
            {["critical","high","medium","low"].map((p) => {
              const found = data.find((d) => d.label.toLowerCase() === p);
              const pct = found ? (found.value / total) * 100 : 0;
              return pct > 0 ? (
                <div key={p} style={{ width: `${pct}%`, background: COLORS[p] }} title={`${p}: ${found?.value}`} />
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchApi<AnalyticsReport>("/v1/analytics/dashboard")
      .then(setReport)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Unable to load analytics."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: "48px", textAlign: "center", color: "var(--muted)" }}>Loading analytics…</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  const stats = report?.stats;
  const resolutionRate = stats && stats.total > 0
    ? Math.round(((stats.closed + (stats.completed ?? 0)) / stats.total) * 100)
    : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Analytics</div>
          <div className="page-subtitle">Operational intelligence across campus maintenance.</div>
        </div>
        <span className="date-chip">Current overview</span>
      </div>

      {/* KPI row */}
      <div className="stat-cards" style={{ marginBottom: "24px" }}>
        <div className="stat-card green">
          <div className="stat-card-label">Total reports</div>
          <div className="stat-card-value">{stats?.total ?? 0}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-card-label">In Progress</div>
          <div className="stat-card-value">{stats?.inProgress ?? 0}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-card-label">Overdue</div>
          <div className="stat-card-value">{stats?.overdue ?? 0}</div>
        </div>
        <div className="stat-card teal">
          <div className="stat-card-label">Closed</div>
          <div className="stat-card-value">{stats?.closed ?? 0}</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-card-label">Resolution rate</div>
          <div className="stat-card-value">{resolutionRate}%</div>
        </div>
        <div className="stat-card cyan">
          <div className="stat-card-label">Avg resolution</div>
          <div className="stat-card-value">
            {stats?.avgResolutionHours
              ? `${Math.round(stats.avgResolutionHours)}h`
              : "—"}
          </div>
        </div>
      </div>

      {/* Top row: trend + priority */}
      <div className="analytics-grid-wide" style={{ marginBottom: "20px" }}>
        <TrendChart data={report?.trend ?? []} />
        <PriorityDonut data={report?.byPriority ?? []} />
      </div>

      {/* Charts grid */}
      <div className="analytics-grid" style={{ marginBottom: "20px" }}>
        <HBar title="By Status" data={report?.byStatus ?? []} color="var(--blue)" />
        <HBar title="By Category" data={report?.byCategory ?? []} color="var(--green)" />
        <HBar title="By Building" data={report?.byBuilding ?? []} color="#7c3aed" />
        <HBar title="By Department" data={report?.byDepartment ?? []} color="var(--amber)" />
        <HBar title="Technician Workload" data={report?.byTechnician ?? []} color="var(--cyan)" />
        <HBar title="Overdue by Department" data={report?.overdueByDepartment ?? []} color="var(--red)" />
      </div>

      {/* Resolution by category */}
      {(report?.avgResolutionByCategory ?? []).length > 0 && (
        <HBar
          title="Avg Resolution Time by Category (hours)"
          data={report!.avgResolutionByCategory}
          color="#0891b2"
        />
      )}
    </div>
  );
}
