"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";
import type {
  Assignment,
  AuditLog,
  Department,
  MaintenanceNote,
  MaintenanceReport,
  MaterialRequest,
  ReportTimelineEvent,
  UserProfile,
} from "@cut-smartfix/contracts";

type Tab = "overview" | "timeline" | "assignments" | "materials" | "audit";

const STATUS_OPTIONS = [
  "submitted", "under_review", "assigned", "accepted", "in_progress",
  "waiting_for_materials", "repair_completed", "under_verification",
  "closed", "rejected", "cancelled", "reopened",
];
const PRIORITY_OPTIONS = ["critical", "high", "medium", "low"];

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("overview");
  const [report, setReport] = useState<MaintenanceReport | null>(null);
  const [timeline, setTimeline] = useState<ReportTimelineEvent[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [materials, setMaterials] = useState<MaterialRequest[]>([]);
  const [notes, setNotes] = useState<MaintenanceNote[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [technicians, setTechnicians] = useState<UserProfile[]>([]);

  // Action state
  const [newStatus, setNewStatus] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [noteType, setNoteType] = useState("general");
  const [noteVisible, setNoteVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  // Reassign
  const [reassignDept, setReassignDept] = useState("");
  const [reassignTech, setReassignTech] = useState("");
  const [reassignNotes, setReassignNotes] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  useEffect(() => {
    if (!id) return;
    async function load() {
      const [r, t, a, m, n] = await Promise.all([
        fetchApi<MaintenanceReport>(`/v1/reports/${id}`),
        fetchApi<ReportTimelineEvent[]>(`/v1/reports/${id}/timeline`).catch(() => []),
        fetchApi<Assignment[]>(`/v1/reports/${id}/assignments`).catch(() => []),
        fetchApi<MaterialRequest[]>(`/v1/reports/${id}/materials`).catch(() => []),
        fetchApi<MaintenanceNote[]>(`/v1/reports/${id}/notes`).catch(() => []),
      ]);
      setReport(r);
      setTimeline(t);
      setAssignments(a);
      setMaterials(m);
      setNotes(n);
      setLoading(false);
    }
    load();

    fetchApi<Department[]>("/v1/admin/departments").then(setDepartments).catch(() => {});
    fetchApi<UserProfile[]>("/v1/admin/users?role=technician").then(setTechnicians).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (tab === "audit" && id) {
      fetchApi<{ items: AuditLog[] }>(`/v1/audit?entityId=${id}`)
        .then((r) => setAudit(r.items ?? []))
        .catch(() => {});
    }
  }, [tab, id]);

  const updateReport = async (fields: Record<string, unknown>) => {
    setSaving(true);
    try {
      const updated = await fetchApi<MaintenanceReport>(`/v1/reports/${id}`, {
        method: "PATCH",
        body: JSON.stringify(fields),
      });
      setReport(updated);
      showToast("Ticket updated successfully.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const addNote = async () => {
    if (!noteContent.trim()) return;
    setSaving(true);
    try {
      const note = await fetchApi<MaintenanceNote>(`/v1/reports/${id}/notes`, {
        method: "POST",
        body: JSON.stringify({
          content: noteContent,
          noteType,
          isVisibleToStudent: noteVisible,
        }),
      });
      setNotes((prev) => [note, ...prev]);
      setNoteContent("");
      showToast("Note added.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add note.");
    } finally {
      setSaving(false);
    }
  };

  const reassign = async () => {
    if (!reassignTech) return;
    setSaving(true);
    try {
      const a = await fetchApi<Assignment>(`/v1/reports/${id}/assignments`, {
        method: "POST",
        body: JSON.stringify({
          technicianId: reassignTech,
          departmentId: reassignDept || undefined,
          notes: reassignNotes || undefined,
        }),
      });
      setAssignments((prev) => [a, ...prev]);
      setReassignTech(""); setReassignDept(""); setReassignNotes("");
      showToast("Technician assigned.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Assignment failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "48px", textAlign: "center", color: "var(--muted)" }}>Loading ticket…</div>;
  }
  if (!report) {
    return <div className="alert alert-danger">Ticket not found.</div>;
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="breadcrumb" style={{ marginBottom: "16px" }}>
        <Link href="/dashboard">Dashboard</Link>
        <span className="sep">›</span>
        <Link href="/maintenance">Maintenance</Link>
        <span className="sep">›</span>
        <span className="current" style={{ fontFamily: "monospace" }}>{report.ticketNumber}</span>
      </nav>

      {/* Page header */}
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div className="page-title" style={{ fontFamily: "monospace" }}>{report.ticketNumber}</div>
            <span className={`badge badge-${report.status}`}>{report.status.replace(/_/g, " ")}</span>
            {report.priority && (
              <span className={`badge badge-${report.priority}`}>{report.priority}</span>
            )}
            {report.isOverdue && <span className="badge badge-danger">OVERDUE</span>}
          </div>
          <div className="page-subtitle" style={{ marginTop: "4px" }}>{report.title}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px", alignItems: "start" }}>
        {/* Left: main content */}
        <div>
          {/* Tabs */}
          <div className="tabs">
            {(["overview", "timeline", "assignments", "materials", "audit"] as Tab[]).map((t) => (
              <button
                key={t}
                className={`tab-btn${tab === t ? " active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab: Overview */}
          {tab === "overview" && (
            <div>
              <div className="card" style={{ marginBottom: "16px" }}>
                <div className="card-header"><div className="card-title">Ticket Details</div></div>
                <div className="card-body">
                  <div className="field-grid">
                    <div className="field-item">
                      <div className="field-label">Reporter</div>
                      <div className="field-value">{report.reporterName ?? "—"}</div>
                    </div>
                    <div className="field-item">
                      <div className="field-label">Email</div>
                      <div className="field-value">{report.reporterEmail ?? "—"}</div>
                    </div>
                    <div className="field-item">
                      <div className="field-label">Category</div>
                      <div className="field-value">{report.categoryName ?? "—"}</div>
                    </div>
                    <div className="field-item">
                      <div className="field-label">Subcategory</div>
                      <div className="field-value">{report.subcategoryName ?? "—"}</div>
                    </div>
                    <div className="field-item">
                      <div className="field-label">Department</div>
                      <div className="field-value">{report.assignedDepartmentName ?? "—"}</div>
                    </div>
                    <div className="field-item">
                      <div className="field-label">Urgency</div>
                      <div className="field-value" style={{ textTransform: "capitalize" }}>{report.urgency}</div>
                    </div>
                    <div className="field-item">
                      <div className="field-label">Due Date</div>
                      <div className="field-value">
                        {report.dueDate ? new Date(report.dueDate).toLocaleDateString() : "—"}
                      </div>
                    </div>
                    <div className="field-item">
                      <div className="field-label">Created</div>
                      <div className="field-value">{new Date(report.createdAt).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="divider" />
                  <div className="field-item" style={{ marginBottom: "12px" }}>
                    <div className="field-label">Location</div>
                    <div className="field-value">
                      {[
                        report.location?.campusName ?? report.location?.campus,
                        report.location?.areaName,
                        report.location?.buildingName ?? report.location?.building,
                        report.location?.floorName ?? report.location?.floor,
                        report.location?.roomName ?? report.location?.room,
                      ].filter(Boolean).join(" › ") || "Not specified"}
                    </div>
                  </div>
                  <div className="field-item">
                    <div className="field-label">Description</div>
                    <div className="field-value" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                      {report.description}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="card">
                <div className="card-header"><div className="card-title">Notes ({notes.length})</div></div>
                <div className="card-body">
                  {notes.map((n) => (
                    <div key={n.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "12px" }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 600, fontSize: "13px" }}>{n.authorName ?? "Unknown"}</span>
                        <span className="badge badge-gray text-xs">{n.noteType}</span>
                        {n.isVisibleToStudent && <span className="badge badge-info text-xs">Student visible</span>}
                        <span className="text-muted text-xs">{new Date(n.createdAt).toLocaleString()}</span>
                      </div>
                      <p style={{ fontSize: "13px", color: "var(--text)", whiteSpace: "pre-wrap" }}>{n.content}</p>
                    </div>
                  ))}
                  {notes.length === 0 && <p className="text-muted text-sm">No notes yet.</p>}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Timeline */}
          {tab === "timeline" && (
            <div className="card">
              <div className="card-body">
                {timeline.length === 0 ? (
                  <p className="text-muted">No timeline events.</p>
                ) : (
                  <div className="timeline">
                    {timeline.map((e) => (
                      <div key={e.id} className="timeline-item">
                        <div className="timeline-dot" />
                        <div className="timeline-time">{new Date(e.createdAt).toLocaleString()}</div>
                        <div className="timeline-status">
                          <span className={`badge badge-${e.status}`}>{e.status.replace(/_/g, " ")}</span>
                        </div>
                        {e.note && <div className="timeline-note">{e.note}</div>}
                        {e.actorName && <div className="timeline-actor">by {e.actorName}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Assignments */}
          {tab === "assignments" && (
            <div className="card">
              <div className="card-header"><div className="card-title">Assignment History</div></div>
              <div className="table-wrapper">
                {assignments.length === 0 ? (
                  <div className="empty-state"><div className="empty-state-text">No assignments yet.</div></div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Technician</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Assigned By</th>
                        <th>Assigned At</th>
                        <th>Notes</th>
                        <th>Current</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignments.map((a) => (
                        <tr key={a.id}>
                          <td>{a.technicianName ?? a.technicianId}</td>
                          <td>{a.departmentName ?? "—"}</td>
                          <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                          <td>{a.assignedByName ?? "—"}</td>
                          <td className="text-muted text-sm">{new Date(a.assignedAt).toLocaleString()}</td>
                          <td className="text-muted text-sm">{a.notes ?? "—"}</td>
                          <td>{a.isCurrent ? <span className="badge badge-success">Active</span> : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Tab: Materials */}
          {tab === "materials" && (
            <div className="card">
              <div className="card-header"><div className="card-title">Material Requests</div></div>
              <div className="table-wrapper">
                {materials.length === 0 ? (
                  <div className="empty-state"><div className="empty-state-text">No material requests.</div></div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Material</th>
                        <th>Qty</th>
                        <th>Unit</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th>Requested By</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((m) => (
                        <tr key={m.id}>
                          <td>{m.materialName}</td>
                          <td>{m.quantity}</td>
                          <td>{m.unit}</td>
                          <td className="text-muted text-sm">{m.reason}</td>
                          <td><span className={`badge badge-${m.status === "approved" ? "success" : m.status === "rejected" ? "danger" : "gray"}`}>{m.status}</span></td>
                          <td>{m.requestedByName ?? "—"}</td>
                          <td className="text-muted text-sm">{new Date(m.requestedAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Tab: Audit */}
          {tab === "audit" && (
            <div className="card">
              <div className="card-header"><div className="card-title">Audit Trail</div></div>
              <div className="table-wrapper">
                {audit.length === 0 ? (
                  <div className="empty-state"><div className="empty-state-text">No audit entries for this ticket.</div></div>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Actor</th>
                        <th>Action</th>
                        <th>Changes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.map((a) => (
                        <tr key={a.id}>
                          <td className="text-muted text-sm">{new Date(a.createdAt).toLocaleString()}</td>
                          <td>{a.actorName ?? "System"}</td>
                          <td><code style={{ fontSize: "11px" }}>{a.action}</code></td>
                          <td className="text-sm text-muted">
                            {a.newValues ? (
                              <pre style={{ fontSize: "11px", margin: 0 }}>
                                {JSON.stringify(a.newValues, null, 2).slice(0, 120)}
                              </pre>
                            ) : "—"}
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

        {/* Right: Actions sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Change status */}
          <div className="card">
            <div className="card-header"><div className="card-title">Change Status</div></div>
            <div className="card-body">
              <select className="select w-full mb-3" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                <option value="">Select new status…</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </select>
              <button
                className="btn btn-primary btn-sm w-full"
                disabled={!newStatus || saving}
                onClick={() => updateReport({ status: newStatus })}
              >
                Apply Status
              </button>
            </div>
          </div>

          {/* Change priority */}
          <div className="card">
            <div className="card-header"><div className="card-title">Set Priority</div></div>
            <div className="card-body">
              <select className="select w-full mb-3" value={newPriority} onChange={(e) => setNewPriority(e.target.value)}>
                <option value="">Select priority…</option>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button
                className="btn btn-primary btn-sm w-full"
                disabled={!newPriority || saving}
                onClick={() => updateReport({ priority: newPriority })}
              >
                Apply Priority
              </button>
            </div>
          </div>

          {/* Reassign */}
          <div className="card">
            <div className="card-header"><div className="card-title">Reassign Technician</div></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Department</label>
                <select className="select" value={reassignDept} onChange={(e) => setReassignDept(e.target.value)}>
                  <option value="">Select department…</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Technician</label>
                <select className="select" value={reassignTech} onChange={(e) => setReassignTech(e.target.value)}>
                  <option value="">Select technician…</option>
                  {technicians.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="textarea"
                  rows={2}
                  value={reassignNotes}
                  onChange={(e) => setReassignNotes(e.target.value)}
                  placeholder="Assignment instructions…"
                />
              </div>
              <button
                className="btn btn-primary btn-sm w-full"
                disabled={!reassignTech || saving}
                onClick={reassign}
              >
                Assign Technician
              </button>
            </div>
          </div>

          {/* Add note */}
          <div className="card">
            <div className="card-header"><div className="card-title">Add Note</div></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Note Type</label>
                <select className="select" value={noteType} onChange={(e) => setNoteType(e.target.value)}>
                  {["general", "diagnosis", "work_note", "completion", "verification", "rejection", "internal"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <textarea
                  className="textarea"
                  rows={3}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Write a note…"
                />
              </div>
              <label className="checkbox-label mb-3">
                <input type="checkbox" checked={noteVisible} onChange={(e) => setNoteVisible(e.target.checked)} />
                Visible to student
              </label>
              <button
                className="btn btn-primary btn-sm w-full"
                disabled={!noteContent.trim() || saving}
                onClick={addNote}
              >
                Add Note
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className="toast success">{toast}</div>
        </div>
      )}
    </div>
  );
}
