"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import type { AnalyticsReport } from "@cut-smartfix/contracts";

function HorizontalBars({ title, values }: { title: string; values: { label: string; value: number }[] }) {
  const max = Math.max(...values.map((item) => item.value), 1);
  return <section className="card"><div className="card-header"><div className="card-title">{title}</div></div><div className="card-body"><div className="hbar-chart">{values.length ? values.slice(0, 8).map((item) => <div className="hbar-row" key={item.label}><div className="hbar-label" title={item.label}>{item.label.replace(/_/g, " ")}</div><div className="hbar-track"><div className="hbar-fill" style={{ width: `${(item.value / max) * 100}%` }} /></div><div className="hbar-val">{item.value}</div></div>) : <div className="empty-state" style={{ padding: "20px" }}>No records in this range.</div>}</div></div></section>;
}

export default function AnalyticsPage() {
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { fetchApi<AnalyticsReport>("/v1/analytics/dashboard").then(setReport).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load analytics.")).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="loading-state">Loading analytics…</div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  const stats = report?.stats;
  return <div><div className="page-header"><div><div className="page-title">Analytics</div><div className="page-subtitle">Operational intelligence across campus maintenance.</div></div><span className="date-chip">Current overview</span></div><div className="stat-cards"><div className="stat-card green"><span className="stat-card-label">Total reports</span><strong className="stat-card-value">{stats?.total ?? 0}</strong></div><div className="stat-card red"><span className="stat-card-label">Overdue</span><strong className="stat-card-value">{stats?.overdue ?? 0}</strong></div><div className="stat-card amber"><span className="stat-card-label">Reopened</span><strong className="stat-card-value">{stats?.reopened ?? 0}</strong></div><div className="stat-card blue"><span className="stat-card-label">Avg resolution</span><strong className="stat-card-value">{stats?.avgResolutionHours ? `${Math.round(stats.avgResolutionHours)}h` : "—"}</strong></div></div><div className="analytics-grid"><HorizontalBars title="Reports by category" values={report?.byCategory ?? []} /><HorizontalBars title="Reports by building" values={report?.byBuilding ?? []} /><HorizontalBars title="Reports by department" values={report?.byDepartment ?? []} /><HorizontalBars title="Technician workload" values={report?.byTechnician ?? []} /></div></div>;
}
