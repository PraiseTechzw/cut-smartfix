"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import type { Department } from "@cut-smartfix/contracts";

interface DeptWithCount extends Department {
  staffCount?: number;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<DeptWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(""), 3000);
  }

  useEffect(() => {
    fetchApi<Department[]>("/v1/admin/departments")
      .then((d) => { setDepartments(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const openAdd = () => {
    setEditDept(null); setName(""); setDescription(""); setIsActive(true);
    setModal("add");
  };

  const openEdit = (d: Department) => {
    setEditDept(d); setName(d.name); setDescription(d.description ?? ""); setIsActive(d.isActive);
    setModal("edit");
  };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (modal === "add") {
        const created = await fetchApi<Department>("/v1/admin/departments", {
          method: "POST",
          body: JSON.stringify({ name, description: description || undefined, isActive }),
        });
        setDepartments((prev) => [...prev, created]);
        showToast("Department created.");
      } else if (editDept) {
        const updated = await fetchApi<Department>(`/v1/admin/departments/${editDept.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name, description: description || undefined, isActive }),
        });
        setDepartments((prev) => prev.map((d) => d.id === updated.id ? updated : d));
        showToast("Department updated.");
      }
      setModal(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (d: Department) => {
    if (!confirm(`Deactivate "${d.name}"?`)) return;
    try {
      const updated = await fetchApi<Department>(`/v1/admin/departments/${d.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      });
      setDepartments((prev) => prev.map((x) => x.id === updated.id ? updated : x));
      showToast("Department deactivated.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed.", "error");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Departments</div>
          <div className="page-subtitle">{departments.length} departments</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Department</button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div style={{ padding: "48px", textAlign: "center", color: "var(--muted)" }}>Loading…</div>
          ) : departments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏢</div>
              <div className="empty-state-title">No departments yet</div>
              <div className="empty-state-text">Add a department to get started.</div>
            </div>
          ) : (
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 500 }}>{d.name}</td>
                    <td className="text-muted text-sm">{d.description ?? "—"}</td>
                    <td>
                      <span className={`badge ${d.isActive ? "badge-success" : "badge-gray"}`}>
                        {d.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="text-muted text-sm">{new Date(d.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-ghost btn-xs" onClick={() => openEdit(d)}>Edit</button>
                        {d.isActive && (
                          <button className="btn btn-danger btn-xs" onClick={() => deactivate(d)}>Deactivate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{modal === "add" ? "Add Department" : "Edit Department"}</div>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Department name" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description (optional)" />
              </div>
              <label className="checkbox-label">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Active
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!name.trim() || saving} onClick={save}>
                {saving ? "Saving…" : modal === "add" ? "Create" : "Save Changes"}
              </button>
            </div>
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
