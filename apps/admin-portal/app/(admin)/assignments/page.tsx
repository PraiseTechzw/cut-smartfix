"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchApi } from "../../../lib/api";
import type {
  Assignment,
  Department,
  MaintenanceReport,
  PaginatedList,
  UserProfile,
} from "@cut-smartfix/contracts";

const CompatSuspense: any = Suspense;

function AssignmentsPage() {
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("ticketId") ?? "";

  const [tickets, setTickets] = useState<MaintenanceReport[]>([]);
  const [selected, setSelected] = useState<MaintenanceReport | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [technicians, setTechnicians] = useState<UserProfile[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [deptId, setDeptId] = useState("");
  const [techId, setTechId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(""), 3000);
  }

  useEffect(() => {
    async function load() {
      const [ticketsRes, depts, techs] = await Promise.all([
        fetchApi<PaginatedList<MaintenanceReport>>(
          "/v1/reports?status=submitted,under_review&pageSize=100",
        ).catch(() => ({
          items: [] as MaintenanceReport[],
          total: 0,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        })),
        fetchApi<Department[]>("/v1/admin/departments").catch(() => []),
        fetchApi<UserProfile[]>("/v1/admin/users?role=technician").catch(
          () => [],
        ),
      ]);
      setTickets(ticketsRes.items ?? []);
      setDepartments(depts);
      setTechnicians(techs);
      setLoading(false);

      // Pre-select ticket if query param present
      if (preselectedId) {
        const pre = ticketsRes.items.find((t) => t.id === preselectedId);
        if (pre) setSelected(pre);
      }
    }
    load();
  }, [preselectedId]);

  // Load current assignments for selected ticket
  useEffect(() => {
    if (!selected) {
      setAssignments([]);
      return;
    }
    fetchApi<Assignment[]>(`/v1/reports/${selected.id}/assignments`)
      .then(setAssignments)
      .catch(() => setAssignments([]));
  }, [selected]);

  const assign = async () => {
    if (!selected || !techId) return;
    setSaving(true);
    try {
      const result = await fetchApi<Assignment>(
        `/v1/reports/${selected.id}/assignments`,
        {
          method: "POST",
          body: JSON.stringify({
            technicianId: techId,
            departmentId: deptId || undefined,
            notes: notes || undefined,
          }),
        },
      );
      setAssignments((prev) => [result, ...prev]);
      setTickets((prev) => prev.filter((t) => t.id !== selected.id));
      setSelected(null);
      setTechId("");
      setDeptId("");
      setNotes("");
      showToast("Technician assigned successfully.");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Assignment failed.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Assignments</div>
          <div className="page-subtitle">
            Assign submitted and under-review tickets to technicians
          </div>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px",
            color: "var(--muted)",
          }}
        >
          Loading…
        </div>
      ) : (
        <div className="split-view">
          {/* Left: Unassigned Tickets */}
          <div>
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  Unassigned / Under Review ({tickets.length})
                </div>
              </div>
              <div style={{ maxHeight: "600px", overflowY: "auto" }}>
                {tickets.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">✅</div>
                    <div className="empty-state-title">
                      All tickets assigned
                    </div>
                    <div className="empty-state-text">
                      No pending tickets require assignment.
                    </div>
                  </div>
                ) : (
                  <div>
                    {tickets.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelected(t)}
                        style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid var(--border)",
                          cursor: "pointer",
                          background:
                            selected?.id === t.id
                              ? "var(--green-light)"
                              : "transparent",
                          transition: "background 0.15s",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "4px",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                          >
                            {t.ticketNumber}
                          </span>
                          <span className={`badge badge-${t.status}`}>
                            {t.status.replace(/_/g, " ")}
                          </span>
                          {t.priority && (
                            <span className={`badge badge-${t.priority}`}>
                              {t.priority}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "var(--text)",
                            marginBottom: "2px",
                          }}
                        >
                          {t.title}
                        </div>
                        <div
                          style={{ fontSize: "11px", color: "var(--muted)" }}
                        >
                          {t.reporterName} ·{" "}
                          {t.location?.buildingName ??
                            t.location?.building ??
                            "No location"}{" "}
                          · {new Date(t.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Assignment Form */}
          <div>
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  {selected
                    ? `Assign: ${selected.ticketNumber}`
                    : "Select a Ticket"}
                </div>
              </div>
              <div className="card-body">
                {!selected ? (
                  <div className="empty-state" style={{ padding: "32px" }}>
                    <div className="empty-state-icon">👈</div>
                    <div className="empty-state-text">
                      Select a ticket on the left to assign it.
                    </div>
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        padding: "12px",
                        background: "var(--bg)",
                        borderRadius: "6px",
                        marginBottom: "16px",
                        fontSize: "13px",
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                        {selected.title}
                      </div>
                      <div className="text-muted text-sm">
                        {selected.categoryName} ·{" "}
                        {selected.location?.buildingName ??
                          selected.location?.building ??
                          "No location"}{" "}
                        · Urgency: <strong>{selected.urgency}</strong>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Department</label>
                      <select
                        className="select"
                        value={deptId}
                        onChange={(e) => setDeptId(e.target.value)}
                      >
                        <option value="">Select department…</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Technician *</label>
                      <select
                        className="select"
                        value={techId}
                        onChange={(e) => setTechId(e.target.value)}
                        required
                      >
                        <option value="">Select technician…</option>
                        {technicians
                          .filter((u) => !deptId || u.departmentId === deptId)
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.fullName}{" "}
                              {u.departmentName ? `(${u.departmentName})` : ""}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Assignment Notes</label>
                      <textarea
                        className="textarea"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Instructions for the technician…"
                      />
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="btn btn-primary"
                        disabled={!techId || saving}
                        onClick={assign}
                        style={{ flex: 1 }}
                      >
                        {saving ? "Assigning…" : "Assign Technician"}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setSelected(null);
                          setTechId("");
                          setDeptId("");
                          setNotes("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Current assignments */}
            {selected && assignments.length > 0 && (
              <div className="card" style={{ marginTop: "16px" }}>
                <div className="card-header">
                  <div className="card-title">Assignment History</div>
                </div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Technician</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Current</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((a) => (
                        <tr key={a.id}>
                          <td>{a.technicianName}</td>
                          <td>
                            <span className={`badge badge-${a.status}`}>
                              {a.status}
                            </span>
                          </td>
                          <td className="text-muted text-sm">
                            {new Date(a.assignedAt).toLocaleDateString()}
                          </td>
                          <td>
                            {a.isCurrent ? (
                              <span className="badge badge-success">Yes</span>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-container">
          <div className={`toast ${toastType}`}>{toast}</div>
        </div>
      )}
    </div>
  );
}

export default function AssignmentsPageWrapper() {
  return (
    <CompatSuspense
      fallback={
        <div
          style={{
            textAlign: "center",
            padding: "48px",
            color: "var(--muted)",
          }}
        >
          Loading…
        </div>
      }
    >
      <AssignmentsPage />
    </CompatSuspense>
  );
}
