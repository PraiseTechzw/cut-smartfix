"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import type {
  Category,
  Department,
  MaintenanceReport,
  PaginatedList,
} from "@cut-smartfix/contracts";

const CompatSuspense: any = Suspense;

const STATUS_OPTIONS = [
  "submitted",
  "under_review",
  "assigned",
  "accepted",
  "in_progress",
  "waiting_for_materials",
  "repair_completed",
  "under_verification",
  "closed",
  "rejected",
  "cancelled",
  "reopened",
];

const PRIORITY_OPTIONS = ["critical", "high", "medium", "low"];

function MaintenancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Filter state
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [priority, setPriority] = useState(searchParams.get("priority") ?? "");
  const [categoryId, setCategoryId] = useState(
    searchParams.get("categoryId") ?? "",
  );
  const [departmentId, setDepartmentId] = useState(
    searchParams.get("departmentId") ?? "",
  );
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const [page, setPage] = useState(Number(searchParams.get("page") ?? "1"));
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const PAGE_SIZE = 20;

  useEffect(() => {
    async function loadFilters() {
      const [cats, depts] = await Promise.all([
        fetchApi<Category[]>("/v1/categories").catch(() => []),
        fetchApi<Department[]>("/v1/admin/departments").catch(() => []),
      ]);
      setCategories(cats);
      setDepartments(depts);
    }
    loadFilters();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (categoryId) params.set("categoryId", categoryId);
      if (departmentId) params.set("departmentId", departmentId);
      if (search) params.set("search", search);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      try {
        const result = await fetchApi<PaginatedList<MaintenanceReport>>(
          `/v1/reports?${params}`,
        );
        setReports(result.items ?? []);
        setTotal(result.total ?? 0);
        setTotalPages(result.totalPages ?? 1);
      } catch {
        setReports([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [status, priority, categoryId, departmentId, search, from, to, page]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === reports.length) setSelected(new Set());
    else setSelected(new Set(reports.map((r) => r.id)));
  };

  const resetFilters = () => {
    setStatus("");
    setPriority("");
    setCategoryId("");
    setDepartmentId("");
    setSearch("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">All Maintenance Requests</div>
          <div className="page-subtitle">{total} total tickets</div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn btn-secondary btn-sm" onClick={resetFilters}>
            Clear Filters
          </button>
          <button
            className="btn btn-secondary btn-sm"
            title="Export coming soon"
          >
            ↓ Export
          </button>
          <Link href="/assignments" className="btn btn-primary btn-sm">
            + Assign
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          type="text"
          className="input input-search"
          placeholder="Search tickets, titles…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Priorities</option>
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="input"
          style={{ width: "auto" }}
          value={from}
          onChange={(e) => {
            setFrom(e.target.value);
            setPage(1);
          }}
        />
        <span style={{ fontSize: "12px", color: "var(--muted)" }}>to</span>
        <input
          type="date"
          className="input"
          style={{ width: "auto" }}
          value={to}
          onChange={(e) => {
            setTo(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="alert alert-info" style={{ marginBottom: "12px" }}>
          <span>{selected.size} selected — </span>
          <select
            className="select"
            style={{ width: "auto", marginLeft: "8px", marginRight: "8px" }}
          >
            <option value="">Bulk: Change Status…</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm">Apply</button>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div
              style={{
                padding: "48px",
                textAlign: "center",
                color: "var(--muted)",
              }}
            >
              Loading tickets…
            </div>
          ) : reports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-title">No tickets found</div>
              <div className="empty-state-text">
                Try adjusting your filters.
              </div>
            </div>
          ) : (
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selected.size === reports.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>Ticket #</th>
                  <th>Title</th>
                  <th>Reporter</th>
                  <th>Location</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr
                    key={r.id}
                    style={{ cursor: "pointer" }}
                    onClick={() => router.push(`/maintenance/${r.id}`)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                      />
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        {r.ticketNumber}
                      </span>
                      {r.isOverdue && (
                        <span
                          className="badge badge-danger"
                          style={{ marginLeft: "4px" }}
                        >
                          !
                        </span>
                      )}
                    </td>
                    <td>
                      <div
                        style={{ maxWidth: "200px" }}
                        className="truncate"
                        title={r.title}
                      >
                        {r.title}
                      </div>
                    </td>
                    <td className="text-muted text-sm">
                      {r.reporterName ?? "—"}
                    </td>
                    <td className="text-muted text-sm">
                      {r.location?.buildingName ?? r.location?.building ?? "—"}
                    </td>
                    <td className="text-muted text-sm">
                      {r.categoryName ?? "—"}
                    </td>
                    <td>
                      {r.priority ? (
                        <span className={`badge badge-${r.priority}`}>
                          {r.priority}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${r.status}`}>
                        {r.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="text-muted text-sm">
                      {r.assignedToName ?? "—"}
                    </td>
                    <td className="text-muted text-sm">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="actions">
                        <Link
                          href={`/assignments?ticketId=${r.id}`}
                          className="btn btn-ghost btn-xs"
                          title="Assign"
                        >
                          Assign
                        </Link>
                        <Link
                          href={`/maintenance/${r.id}`}
                          className="btn btn-secondary btn-xs"
                          title="View"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
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
                <button
                  className="page-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ‹
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      className={`page-btn${page === p ? " active" : ""}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  );
                })}
                {totalPages > 7 && <span style={{ padding: "0 4px" }}>…</span>}
                <button
                  className="page-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  ›
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MaintenancePageWrapper() {
  return (
    <CompatSuspense
      fallback={
        <div
          style={{
            padding: "48px",
            textAlign: "center",
            color: "var(--muted)",
          }}
        >
          Loading…
        </div>
      }
    >
      <MaintenancePage />
    </CompatSuspense>
  );
}
