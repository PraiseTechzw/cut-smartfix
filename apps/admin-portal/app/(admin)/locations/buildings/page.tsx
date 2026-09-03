"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";
import type { Area, Building, Campus } from "@cut-smartfix/contracts";

export default function BuildingsPage() {
  const [items, setItems]       = useState<Building[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [areas, setAreas]       = useState<Area[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [campusFilter, setCampusFilter] = useState("");

  const [modal, setModal]       = useState<"add"|"edit"|null>(null);
  const [editItem, setEditItem] = useState<Building | null>(null);
  const [name, setName]         = useState("");
  const [code, setCode]         = useState("");
  const [campusId, setCampusId] = useState("");
  const [areaId, setAreaId]     = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState("");
  const [toastType, setToastType] = useState<"success"|"error">("success");

  function showToast(msg: string, type: "success"|"error" = "success") {
    setToast(msg); setToastType(type); setTimeout(() => setToast(""), 3200);
  }

  useEffect(() => {
    Promise.all([
      fetchApi<Building[]>("/v1/locations/buildings"),
      fetchApi<Campus[]>("/v1/locations/campuses"),
      fetchApi<Area[]>("/v1/locations/areas"),
    ]).then(([b, c, a]) => { setItems(b); setCampuses(c); setAreas(a); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filteredAreas = campusId ? areas.filter((a) => a.campusId === campusId) : areas;

  const openAdd = () => { setEditItem(null); setName(""); setCode(""); setCampusId(""); setAreaId(""); setIsActive(true); setModal("add"); };
  const openEdit = (b: Building) => {
    setEditItem(b); setName(b.name); setCode(b.code ?? "");
    setCampusId(""); setAreaId(b.areaId); setIsActive(b.isActive); setModal("edit");
  };

  const save = async () => {
    if (!name.trim()) { showToast("Name is required.", "error"); return; }
    setSaving(true);
    try {
      const body = { name, code: code || undefined, areaId: areaId || undefined, isActive };
      if (modal === "add") {
        const created = await fetchApi<Building>("/v1/admin/buildings", { method: "POST", body: JSON.stringify(body) });
        setItems((p) => [...p, created]); showToast("Building created.");
      } else if (editItem) {
        const updated = await fetchApi<Building>(`/v1/admin/buildings/${editItem.id}`, { method: "PATCH", body: JSON.stringify(body) });
        setItems((p) => p.map((x) => x.id === updated.id ? updated : x)); showToast("Building updated.");
      }
      setModal(null);
    } catch (e) { showToast(e instanceof Error ? e.message : "Failed.", "error"); }
    finally { setSaving(false); }
  };

  const filtered = items.filter((b) => {
    if (campusFilter && b.campusName && !b.campusName.includes(campuses.find((c) => c.id === campusFilter)?.name ?? "")) return false;
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Buildings</div><div className="page-subtitle">{items.length} buildings registered</div></div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Building</button>
      </div>

      <div className="filter-bar">
        <input className="input" placeholder="Search buildings…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 260 }} />
        <select className="select" value={campusFilter} onChange={(e) => setCampusFilter(e.target.value)} style={{ minWidth: 160 }}>
          <option value="">All Campuses</option>
          {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrapper">
          {loading ? <div className="loading-state">Loading buildings…</div>
          : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No buildings found</div>
              <div className="empty-state-text">Add a building to assign rooms and floors to it.</div>
            </div>
          ) : (
            <table className="table table-striped">
              <thead><tr><th>Name</th><th>Code</th><th>Area</th><th>Campus</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 500 }}>{b.name}</td>
                    <td className="text-muted text-sm"><code>{b.code ?? "—"}</code></td>
                    <td className="text-muted text-sm">{b.areaName ?? "—"}</td>
                    <td className="text-muted text-sm">{b.campusName ?? "—"}</td>
                    <td><span className={`badge ${b.isActive ? "badge-success" : "badge-gray"}`}>{b.isActive ? "Active" : "Inactive"}</span></td>
                    <td className="text-muted text-sm">{new Date(b.createdAt).toLocaleDateString()}</td>
                    <td><button className="btn btn-ghost btn-xs" onClick={() => openEdit(b)}>Edit</button></td>
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
              <div className="modal-title">{modal === "add" ? "Add Building" : "Edit Building"}</div>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Name *</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Engineering Block A" /></div>
              <div className="form-group"><label className="form-label">Code</label><input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. ENG-A" /></div>
              <div className="form-group">
                <label className="form-label">Campus</label>
                <select className="select" value={campusId} onChange={(e) => { setCampusId(e.target.value); setAreaId(""); }}>
                  <option value="">Select campus…</option>
                  {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Area</label>
                <select className="select" value={areaId} onChange={(e) => setAreaId(e.target.value)}>
                  <option value="">Select area…</option>
                  {filteredAreas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <label className="checkbox-label"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active</label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving || !name.trim()} onClick={save}>{saving ? "Saving…" : modal === "add" ? "Create" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast-container"><div className={`toast ${toastType}`}>{toast}</div></div>}
    </div>
  );
}
