"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../../lib/api";
import type { Building, Floor, Room } from "@cut-smartfix/contracts";

const ROOM_TYPES = ["lecture", "office", "lab", "bathroom", "storage", "workshop", "other"];

export default function RoomsPage() {
  const [items, setItems]         = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors]       = useState<Floor[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [buildingFilter, setBuildingFilter] = useState("");

  const [modal, setModal]       = useState<"add"|"edit"|null>(null);
  const [editItem, setEditItem] = useState<Room | null>(null);
  const [name, setName]         = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [roomType, setRoomType]     = useState("");
  const [floorId, setFloorId]       = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [capacity, setCapacity]     = useState<number | "">("");
  const [isActive, setIsActive]     = useState(true);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState("");
  const [toastType, setToastType]   = useState<"success"|"error">("success");

  function showToast(msg: string, type: "success"|"error" = "success") {
    setToast(msg); setToastType(type); setTimeout(() => setToast(""), 3200);
  }

  useEffect(() => {
    Promise.all([
      fetchApi<Room[]>("/v1/locations/rooms"),
      fetchApi<Building[]>("/v1/locations/buildings"),
      fetchApi<Floor[]>("/v1/locations/floors"),
    ]).then(([r, b, f]) => { setItems(r); setBuildings(b); setFloors(f); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filteredFloors = buildingId ? floors.filter((f) => f.buildingId === buildingId) : floors;

  const openAdd = () => { setEditItem(null); setName(""); setRoomNumber(""); setRoomType(""); setFloorId(""); setBuildingId(""); setCapacity(""); setIsActive(true); setModal("add"); };
  const openEdit = (r: Room) => { setEditItem(r); setName(r.name); setRoomNumber(r.roomNumber ?? ""); setRoomType(r.roomType ?? ""); setFloorId(r.floorId); setBuildingId(""); setCapacity(r.capacity ?? ""); setIsActive(r.isActive); setModal("edit"); };

  const save = async () => {
    if (!name.trim() || !floorId) { showToast("Name and floor are required.", "error"); return; }
    setSaving(true);
    try {
      const body = { name, roomNumber: roomNumber || undefined, roomType: roomType || undefined, floorId, capacity: capacity !== "" ? Number(capacity) : undefined, isActive };
      if (modal === "add") {
        const created = await fetchApi<Room>("/v1/admin/rooms", { method: "POST", body: JSON.stringify(body) });
        setItems((p) => [...p, created]); showToast("Room created.");
      } else if (editItem) {
        const updated = await fetchApi<Room>(`/v1/admin/rooms/${editItem.id}`, { method: "PATCH", body: JSON.stringify(body) });
        setItems((p) => p.map((x) => x.id === updated.id ? updated : x)); showToast("Room updated.");
      }
      setModal(null);
    } catch (e) { showToast(e instanceof Error ? e.message : "Failed.", "error"); }
    finally { setSaving(false); }
  };

  const filtered = items.filter((r) => {
    if (buildingFilter && r.buildingName && !r.buildingName.includes(buildings.find((b) => b.id === buildingFilter)?.name ?? "")) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !(r.roomNumber ?? "").includes(search)) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Rooms</div><div className="page-subtitle">{items.length} rooms registered</div></div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add Room</button>
      </div>

      <div className="filter-bar">
        <input className="input" placeholder="Search rooms…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
        <select className="select" value={buildingFilter} onChange={(e) => setBuildingFilter(e.target.value)} style={{ minWidth: 180 }}>
          <option value="">All Buildings</option>
          {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrapper">
          {loading ? <div className="loading-state">Loading rooms…</div>
          : filtered.length === 0 ? (
            <div className="empty-state"><div className="empty-state-title">No rooms found</div><div className="empty-state-text">Add a room to enable precise issue reporting.</div></div>
          ) : (
            <table className="table table-striped">
              <thead><tr><th>Name</th><th>Room #</th><th>Type</th><th>Floor</th><th>Building</th><th>Capacity</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td className="text-muted text-sm"><code>{r.roomNumber ?? "—"}</code></td>
                    <td className="text-muted text-sm" style={{ textTransform: "capitalize" }}>{r.roomType ?? "—"}</td>
                    <td className="text-muted text-sm">{r.floorName ?? "—"}</td>
                    <td className="text-muted text-sm">{r.buildingName ?? "—"}</td>
                    <td className="text-muted text-sm">{r.capacity ?? "—"}</td>
                    <td><span className={`badge ${r.isActive ? "badge-success" : "badge-gray"}`}>{r.isActive ? "Active" : "Inactive"}</span></td>
                    <td><button className="btn btn-ghost btn-xs" onClick={() => openEdit(r)}>Edit</button></td>
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
              <div className="modal-title">{modal === "add" ? "Add Room" : "Edit Room"}</div>
              <button className="modal-close" onClick={() => setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Name *</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Room 101" /></div>
              <div className="form-group"><label className="form-label">Room Number</label><input className="input" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} placeholder="e.g. 101" /></div>
              <div className="form-group">
                <label className="form-label">Room Type</label>
                <select className="select" value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                  <option value="">Select type…</option>
                  {ROOM_TYPES.map((t) => <option key={t} value={t} style={{ textTransform: "capitalize" }}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Building</label>
                <select className="select" value={buildingId} onChange={(e) => { setBuildingId(e.target.value); setFloorId(""); }}>
                  <option value="">Select building…</option>
                  {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Floor *</label>
                <select className="select" value={floorId} onChange={(e) => setFloorId(e.target.value)}>
                  <option value="">Select floor…</option>
                  {filteredFloors.map((f) => <option key={f.id} value={f.id}>{f.name ?? `Level ${f.levelNumber}`}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Capacity</label><input type="number" className="input" value={capacity} onChange={(e) => setCapacity(e.target.value ? Number(e.target.value) : "")} placeholder="e.g. 40" /></div>
              <label className="checkbox-label"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active</label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving || !name.trim() || !floorId} onClick={save}>{saving ? "Saving…" : modal === "add" ? "Create" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast-container"><div className={`toast ${toastType}`}>{toast}</div></div>}
    </div>
  );
}
