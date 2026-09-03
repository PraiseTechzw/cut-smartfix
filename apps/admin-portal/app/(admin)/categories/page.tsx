"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import type { Category, Subcategory } from "@cut-smartfix/contracts";

const ICON_OPTIONS = ["🔧","💡","🚰","🏗️","🧹","❄️","🔥","🪟","🚪","🛗","⚡","📡","🔒","🖥️","🪑","🌿","🚽","🛁"];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Category modal state
  const [catModal, setCatModal] = useState<"add" | "edit" | null>(null);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState("");
  const [catIcon, setCatIcon] = useState("🔧");
  const [catDesc, setCatDesc] = useState("");
  const [catActive, setCatActive] = useState(true);
  const [catSaving, setCatSaving] = useState(false);

  // Subcategory modal state
  const [subModal, setSubModal] = useState<"add" | "edit" | null>(null);
  const [editSub, setEditSub] = useState<Subcategory | null>(null);
  const [subParentId, setSubParentId] = useState("");
  const [subName, setSubName] = useState("");
  const [subDesc, setSubDesc] = useState("");
  const [subActive, setSubActive] = useState(true);
  const [subSaving, setSubSaving] = useState(false);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(""), 3000);
  }

  async function load() {
    const data = await fetchApi<Category[]>("/v1/categories?includeSubcategories=true").catch(() => []);
    setCategories(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // ─── Category CRUD ───────────────────────────────────────────────────────
  const openAddCat = () => {
    setEditCat(null); setCatName(""); setCatIcon("🔧"); setCatDesc(""); setCatActive(true);
    setCatModal("add");
  };
  const openEditCat = (c: Category) => {
    setEditCat(c); setCatName(c.name); setCatIcon(c.icon ?? "🔧"); setCatDesc(c.description ?? ""); setCatActive(c.isActive);
    setCatModal("edit");
  };

  const saveCat = async () => {
    if (!catName.trim()) return;
    setCatSaving(true);
    try {
      const body = { name: catName.trim(), icon: catIcon, description: catDesc || undefined, isActive: catActive };
      if (catModal === "add") {
        const created = await fetchApi<Category>("/v1/categories", { method: "POST", body: JSON.stringify(body) });
        setCategories((p) => [...p, { ...created, subcategories: [] }]);
        showToast("Category created.");
      } else if (editCat) {
        const updated = await fetchApi<Category>(`/v1/categories/${editCat.id}`, { method: "PATCH", body: JSON.stringify(body) });
        setCategories((p) => p.map((c) => c.id === updated.id ? { ...updated, subcategories: c.subcategories } : c));
        showToast("Category updated.");
      }
      setCatModal(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed.", "error");
    } finally {
      setCatSaving(false);
    }
  };

  const deleteCat = async (c: Category) => {
    if (!confirm(`Delete category "${c.name}" and all its subcategories?`)) return;
    try {
      await fetchApi(`/v1/categories/${c.id}`, { method: "DELETE" });
      setCategories((p) => p.filter((x) => x.id !== c.id));
      showToast("Category deleted.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Delete failed.", "error");
    }
  };

  // ─── Subcategory CRUD ────────────────────────────────────────────────────
  const openAddSub = (parentId: string) => {
    setEditSub(null); setSubParentId(parentId); setSubName(""); setSubDesc(""); setSubActive(true);
    setSubModal("add");
  };
  const openEditSub = (sub: Subcategory) => {
    setEditSub(sub); setSubParentId(sub.categoryId); setSubName(sub.name); setSubDesc(sub.description ?? ""); setSubActive(sub.isActive);
    setSubModal("edit");
  };

  const saveSub = async () => {
    if (!subName.trim()) return;
    setSubSaving(true);
    try {
      const body = { categoryId: subParentId, name: subName.trim(), description: subDesc || undefined, isActive: subActive };
      if (subModal === "add") {
        const created = await fetchApi<Subcategory>("/v1/subcategories", { method: "POST", body: JSON.stringify(body) });
        setCategories((p) => p.map((c) => c.id === subParentId
          ? { ...c, subcategories: [...(c.subcategories ?? []), created] }
          : c));
        showToast("Subcategory added.");
      } else if (editSub) {
        const updated = await fetchApi<Subcategory>(`/v1/subcategories/${editSub.id}`, { method: "PATCH", body: JSON.stringify(body) });
        setCategories((p) => p.map((c) => ({
          ...c,
          subcategories: (c.subcategories ?? []).map((s) => s.id === updated.id ? updated : s),
        })));
        showToast("Subcategory updated.");
      }
      setSubModal(null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed.", "error");
    } finally {
      setSubSaving(false);
    }
  };

  const deleteSub = async (sub: Subcategory) => {
    if (!confirm(`Delete subcategory "${sub.name}"?`)) return;
    try {
      await fetchApi(`/v1/subcategories/${sub.id}`, { method: "DELETE" });
      setCategories((p) => p.map((c) => ({
        ...c,
        subcategories: (c.subcategories ?? []).filter((s) => s.id !== sub.id),
      })));
      showToast("Subcategory deleted.");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Delete failed.", "error");
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Categories</div>
          <div className="page-subtitle">Manage the issue taxonomy used for triage and reporting.</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAddCat}>+ Add Category</button>
      </div>

      {loading ? (
        <div style={{ padding: "48px", textAlign: "center", color: "var(--muted)" }}>Loading categories…</div>
      ) : categories.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏷️</div>
          <div className="empty-state-title">No categories yet</div>
          <div className="empty-state-text">Add a category to start classifying maintenance requests.</div>
          <button className="btn btn-primary" style={{ marginTop: "12px" }} onClick={openAddCat}>+ Add Category</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {categories.map((cat) => (
            <div key={cat.id} className="card">
              {/* Category header */}
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px", cursor: "pointer" }}
                onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
              >
                <span style={{ fontSize: "1.6rem", flexShrink: 0 }}>{cat.icon ?? "•"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: "15px" }}>{cat.name}</span>
                    <span className={`badge ${cat.isActive ? "badge-success" : "badge-gray"}`}>
                      {cat.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="badge badge-gray">
                      {(cat.subcategories ?? []).length} sub
                    </span>
                  </div>
                  {cat.description && (
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>{cat.description}</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-ghost btn-xs" onClick={() => openAddSub(cat.id)}>+ Sub</button>
                  <button className="btn btn-ghost btn-xs" onClick={() => openEditCat(cat)}>Edit</button>
                  <button className="btn btn-danger btn-xs" onClick={() => deleteCat(cat)}>Delete</button>
                </div>
                <span style={{ color: "var(--muted)", fontSize: "12px", marginLeft: "4px" }}>
                  {expanded === cat.id ? "▲" : "▼"}
                </span>
              </div>

              {/* Subcategories */}
              {expanded === cat.id && (
                <div style={{ borderTop: "1px solid var(--border)", padding: "0 18px 14px" }}>
                  {(cat.subcategories ?? []).length === 0 ? (
                    <div style={{ padding: "16px 0", color: "var(--muted)", fontSize: "13px", textAlign: "center" }}>
                      No subcategories yet.{" "}
                      <button className="btn btn-ghost btn-xs" onClick={() => openAddSub(cat.id)}>Add one</button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "10px" }}>
                      {(cat.subcategories ?? []).map((sub) => (
                        <div
                          key={sub.id}
                          style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            padding: "8px 12px", background: "var(--bg)",
                            borderRadius: "6px", border: "1px solid var(--border)",
                          }}
                        >
                          <span style={{ fontSize: "12px", color: "var(--muted)", marginRight: "4px" }}>↳</span>
                          <span style={{ fontWeight: 500, fontSize: "13px", flex: 1 }}>{sub.name}</span>
                          {sub.description && (
                            <span style={{ fontSize: "11px", color: "var(--muted)" }}>{sub.description}</span>
                          )}
                          <span className={`badge ${sub.isActive ? "badge-success" : "badge-gray"}`} style={{ fontSize: "10px" }}>
                            {sub.isActive ? "Active" : "Inactive"}
                          </span>
                          <button className="btn btn-ghost btn-xs" onClick={() => openEditSub(sub)}>Edit</button>
                          <button className="btn btn-danger btn-xs" onClick={() => deleteSub(sub)}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Category Modal */}
      {catModal && (
        <div className="modal-backdrop" onClick={() => setCatModal(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{catModal === "add" ? "Add Category" : "Edit Category"}</div>
              <button className="modal-close" onClick={() => setCatModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Icon</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
                  {ICON_OPTIONS.map((ico) => (
                    <button
                      key={ico}
                      type="button"
                      onClick={() => setCatIcon(ico)}
                      style={{
                        width: "36px", height: "36px", fontSize: "18px",
                        border: `2px solid ${catIcon === ico ? "var(--green)" : "var(--border)"}`,
                        borderRadius: "6px", background: catIcon === ico ? "var(--green-light)" : "var(--surface)",
                        cursor: "pointer",
                      }}
                    >{ico}</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="input" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Category name" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="textarea" rows={2} value={catDesc} onChange={(e) => setCatDesc(e.target.value)} placeholder="Optional description" />
              </div>
              <label className="checkbox-label">
                <input type="checkbox" checked={catActive} onChange={(e) => setCatActive(e.target.checked)} />
                Active
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCatModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!catName.trim() || catSaving} onClick={saveCat}>
                {catSaving ? "Saving…" : catModal === "add" ? "Create" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subcategory Modal */}
      {subModal && (
        <div className="modal-backdrop" onClick={() => setSubModal(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{subModal === "add" ? "Add Subcategory" : "Edit Subcategory"}</div>
              <button className="modal-close" onClick={() => setSubModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Parent Category</label>
                <select className="select" value={subParentId} onChange={(e) => setSubParentId(e.target.value)} disabled={subModal === "add"}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="input" value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="Subcategory name" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="textarea" rows={2} value={subDesc} onChange={(e) => setSubDesc(e.target.value)} placeholder="Optional" />
              </div>
              <label className="checkbox-label">
                <input type="checkbox" checked={subActive} onChange={(e) => setSubActive(e.target.checked)} />
                Active
              </label>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSubModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={!subName.trim() || subSaving} onClick={saveSub}>
                {subSaving ? "Saving…" : subModal === "add" ? "Add" : "Save"}
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
