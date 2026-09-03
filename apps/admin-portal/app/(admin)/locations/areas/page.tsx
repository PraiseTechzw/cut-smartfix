"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";
import type { Area, Campus } from "@cut-smartfix/contracts";

export default function AreasPage() {
  const [items, setItems]       = useState<Area[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [campusFilter, setCampusFilter] = useState("");
  const [modal, setModal]   = useState<"add" | "edit" | null>(null);
  const [editItem, setEditItem] = useState<Area | null>(null);
  const [name, setName]         = useState("");
  const [campusId, setCampusId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState("");
  const [toastType, setToastType] = useState<"success"|"error">("success");

  function showToast(msg: string, type: "success"|"error" = "success") {
    setToast(msg); setToastType(type); setTimeout(() => setToast(""), 3200);
  }

  useEffect(() => {
    Promise.all([
      fetchApi<Area[]>("/v1/locations/areas"),
      fetchApi<Campus[]>("/v1/locations/campuses"),
    ]).then(([a, c]) => { setItems(a); setCampuses(c); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openAdd = () => { setEditItem(null); setName(""); setCampusId(""); setIsActive(true); setModal("add"); };
  const openEdit = (a: Area) => { setEditItem(a); setName(a.name); setCampusId(a.campusId); setIsActive(a.isActive); setModal("edit"); };

  const save = async () => {
    if (!name.trim() || !campusId) { showToast("Name and campus are required.", "error"); return; }
    setSaving(true);
    try {
      if (modal === "add") {
        const created = await fetchApi<Area>("/v1/admin/areas", { method: "POST", body: JSON.stringify({ name, campusId, isActive }) });
        setItems((p) => [...p, created]); showToast("Area created.");
      } else if (editItem) {
        const updated = await fetchApi<Area>(`/v1/admin/areas/${editItem.id}`, { method: "PATCH", body: JSON.stringify({ name, campusId, isActive }) });
        setItems((p) => p.map((x) => x.id === updated.id ? updated : x)); showToast("Area updated.");
      }
      setModal(null);
    } catch (e) { showToast(e instanceof Error ? e.message : "Failed.", "error"); }
    finally { setSaving(false); }
  };

  const filtered = items.filter((a) => {
    if (campusFilter && a.campusId !== campusFilter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Areas</div>
          <div className="page-subtitle">{items.length} areas across all campuses</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Area</button>
      </div>

      <div className="filter-bar">
        <input className="input" placeholder="Search areas…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 260 }} />
        <select className="select" value={campusFilter} onChange={(e) => setCampusFilter(e.target.value)} style={{ minWidth: 160 }}>
          <option value="">All Campuses</option>
          {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrapper">
          {loading ? <div className="loading-state">Loading areas…</div>
          : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">—</div>
              <div className="empty-state-title">No areas found</div>
              <div className="empty-state-text">Add an area to organise locations within a campus.</div>
            </div>
          ) : (
            <table className="table table-striped">
              <thead><tr><th>Name</th><th>Campus</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 500 }}>{a.name}</td>
                    <td className="text-muted text-sm">{a.campusName ?? "—"}</td>
                    <td><span className={`badge ${a.isActive ? "badge-success" : "badge-gray"}`}>{a.isActive ? "Active" : "Inactive"}</span></td>
                    <td className="text-muted text-sm">{new Date(a.createdAt).toLocaleDateString()}</td>
                    <td><button className="btn btn-ghost btn-xs" onClick={() => openEdit(a)}>Edit</button></td>
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
              <div className="modal-title">{modal === "add" ? "Add Area" : "Edit Area"}</div>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Academic Zone" />
              </div>
              <div className="form-group">
                <label className="form-label">Campus *</label>
                <select className="select" value={campusId} onChange={(e) => setCampusId(e.target.value)}>
                  <option value="">Select campus…</option>
                  {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <label className="checkbox-label"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active</label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving || !name.trim() || !campusId} onClick={save}>{saving ? "Saving…" : modal === "add" ? "Create" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast-container"><div className={`toast ${toastType}`}>{toast}</div></div>}
    </div>
  );
}
