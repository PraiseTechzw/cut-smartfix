"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";
import type { Building, Floor } from "@cut-smartfix/contracts";

export default function FloorsPage() {
  const [items, setItems]         = useState<Floor[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [buildingFilter, setBuildingFilter] = useState("");

  const [modal, setModal]       = useState<"add"|"edit"|null>(null);
  const [editItem, setEditItem] = useState<Floor | null>(null);
  const [name, setName]         = useState("");
  const [levelNumber, setLevelNumber] = useState<number | "">("");
  const [buildingId, setBuildingId]   = useState("");
  const [isActive, setIsActive]       = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState("");
  const [toastType, setToastType] = useState<"success"|"error">("success");

  function showToast(msg: string, type: "success"|"error" = "success") {
    setToast(msg); setToastType(type); setTimeout(() => setToast(""), 3200);
  }

  useEffect(() => {
    Promise.all([
      fetchApi<Floor[]>("/v1/locations/floors"),
      fetchApi<Building[]>("/v1/locations/buildings"),
    ]).then(([f, b]) => { setItems(f); setBuildings(b); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openAdd = () => { setEditItem(null); setName(""); setLevelNumber(""); setBuildingId(""); setIsActive(true); setModal("add"); };
  const openEdit = (f: Floor) => { setEditItem(f); setName(f.name ?? ""); setLevelNumber(f.levelNumber ?? ""); setBuildingId(f.buildingId); setIsActive(f.isActive); setModal("edit"); };

  const save = async () => {
    if (!buildingId) { showToast("Building is required.", "error"); return; }
    setSaving(true);
    try {
      const body = { name: name || undefined, levelNumber: levelNumber !== "" ? Number(levelNumber) : undefined, buildingId, isActive };
      if (modal === "add") {
        const created = await fetchApi<Floor>("/v1/admin/floors", { method: "POST", body: JSON.stringify(body) });
        setItems((p) => [...p, created]); showToast("Floor created.");
      } else if (editItem) {
        const updated = await fetchApi<Floor>(`/v1/admin/floors/${editItem.id}`, { method: "PATCH", body: JSON.stringify(body) });
        setItems((p) => p.map((x) => x.id === updated.id ? updated : x)); showToast("Floor updated.");
      }
      setModal(null);
    } catch (e) { showToast(e instanceof Error ? e.message : "Failed.", "error"); }
    finally { setSaving(false); }
  };

  const filtered = items.filter((f) => {
    if (buildingFilter && f.buildingId !== buildingFilter) return false;
    if (search && !(f.name ?? "").toLowerCase().includes(search.toLowerCase()) && String(f.levelNumber).includes(search)) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Floors</div><div className="page-subtitle">{items.length} floors registered</div></div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Floor</button>
      </div>

      <div className="filter-bar">
        <input className="input" placeholder="Search floors…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
        <select className="select" value={buildingFilter} onChange={(e) => setBuildingFilter(e.target.value)} style={{ minWidth: 180 }}>
          <option value="">All Buildings</option>
          {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrapper">
          {loading ? <div className="loading-state">Loading floors…</div>
          : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No floors found</div>
              <div className="empty-state-text">Add a floor level to a building.</div>
            </div>
          ) : (
            <table className="table table-striped">
              <thead><tr><th>Name / Label</th><th>Level #</th><th>Building</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map((f) => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 500 }}>{f.name ?? <span className="text-muted">—</span>}</td>
                    <td className="text-muted text-sm">{f.levelNumber ?? "—"}</td>
                    <td className="text-muted text-sm">{f.buildingName ?? "—"}</td>
                    <td><span className={`badge ${f.isActive ? "badge-success" : "badge-gray"}`}>{f.isActive ? "Active" : "Inactive"}</span></td>
                    <td className="text-muted text-sm">{new Date(f.createdAt).toLocaleDateString()}</td>
                    <td><button className="btn btn-ghost btn-xs" onClick={() => openEdit(f)}>Edit</button></td>
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
              <div className="modal-title">{modal === "add" ? "Add Floor" : "Edit Floor"}</div>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Level Number</label><input type="number" className="input" value={levelNumber} onChange={(e) => setLevelNumber(e.target.value ? Number(e.target.value) : "")} placeholder="e.g. 1" /></div>
              <div className="form-group"><label className="form-label">Name / Label</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ground Floor" /></div>
              <div className="form-group">
                <label className="form-label">Building *</label>
                <select className="select" value={buildingId} onChange={(e) => setBuildingId(e.target.value)}>
                  <option value="">Select building…</option>
                  {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <label className="checkbox-label"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active</label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving || !buildingId} onClick={save}>{saving ? "Saving…" : modal === "add" ? "Create" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast-container"><div className={`toast ${toastType}`}>{toast}</div></div>}
    </div>
  );
}
