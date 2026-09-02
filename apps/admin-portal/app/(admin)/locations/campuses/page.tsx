"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";
import type { Campus } from "@cut-smartfix/contracts";

export default function CampusesPage() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editItem, setEditItem] = useState<Campus | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
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
    fetchApi<Campus[]>("/v1/locations/campuses")
      .then((d) => { setCampuses(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const openAdd = () => {
    setEditItem(null); setName(""); setCode(""); setAddress(""); setIsActive(true); setModal("add");
  };

  const openEdit = (c: Campus) => {
    setEditItem(c); setName(c.name); setCode(c.code); setAddress(c.address ?? ""); setIsActive(c.isActive); setModal("edit");
  };

  const save = async () => {
    if (!name.trim() || !code.trim()) return;
    setSaving(true);
    try {
      if (modal === "add") {
        const created = await fetchApi<Campus>("/v1/admin/campuses", {
          method: "POST",
          body: JSON.stringify({ name, code, address: address || undefined, isActive }),
        });
        setCampuses((prev) => [...prev, created]);
        showToast("Campus created.");
      } else if (editItem) {
        const updated = await fetchApi<Campus>(`/v1/admin/campuses/${editItem.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name, code, address: address || undefined, isActive }),
        });
        setCampuses((prev) => prev.map((c) => c.id === updated.id ? updated : c));
        showToast("Campus updated.");
      }
      setModal(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Campuses</div>
          <div className="page-subtitle">{campuses.length} campuses registered</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Campus</button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          {loading ? (
            <div style={{ padding: "48px", textAlign: "center", color: "var(--muted)" }}>Loading…</div>
          ) : campuses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏛️</div>
              <div className="empty-state-title">No campuses yet</div>
              <div className="empty-state-text">Add your first campus.</div>
            </div>
          ) : (
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campuses.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td><code style={{ fontSize: "12px" }}>{c.code}</code></td>
                    <td className="text-muted text-sm">{c.address ?? "—"}</td>
                    <td>
                      <span className={`badge ${c.isActive ? "badge-success" : "badge-gray"}`}>
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="text-muted text-sm">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="btn btn-ghost btn-xs" onClick={() => openEdit(c)}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{modal === "add" ? "Add Campus" : "Edit Campus"}</div>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Main Campus" />
              </div>
              <div className="form-group">
                <label className="form-label">Code *</label>
                <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="MAIN" />
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Chinhoyi, Zimbabwe" />
              </div>
              <label className="checkbox-label">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Active
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!name.trim() || !code.trim() || saving} onClick={save}>
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
