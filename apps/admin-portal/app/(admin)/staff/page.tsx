"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import type {
  Department,
  PaginatedList,
  UserProfile,
} from "@cut-smartfix/contracts";

const ROLE_OPTIONS = ["technician", "supervisor", "administrator"];

export default function StaffPage() {
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [roleFilter, setRoleFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  // Modals
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  // Edit form
  const [editRole, setEditRole] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState("technician");
  const [inviteDept, setInviteDept] = useState("");

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(""), 3000);
  }

  useEffect(() => {
    async function load() {
      const [users, depts] = await Promise.all([
        fetchApi<PaginatedList<UserProfile>>("/v1/admin/users").catch(() => ({
          items: [], total: 0, page: 1, pageSize: 20, totalPages: 0,
        })),
        fetchApi<Department[]>("/v1/admin/departments").catch(() => []),
      ]);
      setStaff(users.items ?? []);
      setDepartments(depts);
      setLoading(false);
    }
    load();
  }, []);

  const openEdit = (user: UserProfile) => {
    setEditUser(user);
    setEditRole(user.role);
    setEditDept(user.departmentId ?? "");
    setEditActive(user.isActive);
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const updated = await fetchApi<UserProfile>(
        `/v1/admin/users/${editUser.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            role: editRole,
            departmentId: editDept || null,
            isActive: editActive,
          }),
        },
      );
      setStaff((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditUser(null);
      showToast("User updated successfully.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Update failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (user: UserProfile) => {
    if (!confirm(`Deactivate ${user.fullName}?`)) return;
    try {
      const updated = await fetchApi<UserProfile>(
        `/v1/admin/users/${user.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ isActive: false }),
        },
      );
      setStaff((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showToast("User deactivated.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Action failed.", "error");
    }
  };

  const createStaff = async () => {
    if (!inviteEmail || !inviteName || invitePassword.length < 8) {
      showToast(
        "Name, email, and a password of at least 8 characters are required.",
        "error",
      );
      return;
    }
    setSaving(true);
    try {
      await fetchApi(`/v1/admin/users`, {
        method: "POST",
        body: JSON.stringify({
          email: inviteEmail,
          fullName: inviteName,
          password: invitePassword,
          role: inviteRole,
          departmentId: inviteDept || undefined,
        }),
      });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInvitePassword("");
      showToast(
        "Staff account created. Share the temporary password securely.",
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Could not create account.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const filtered = staff.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (deptFilter && u.departmentId !== deptFilter) return false;
    if (
      searchFilter &&
      !u.fullName.toLowerCase().includes(searchFilter.toLowerCase()) &&
      !u.email.toLowerCase().includes(searchFilter.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Staff Management</div>
          <div className="page-subtitle">{staff.length} staff members</div>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setInviteOpen(true)}
        >
          + Invite Staff
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          className="input input-search"
          placeholder="Search name, email…"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
        />
        <select
          className="select"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          className="select"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

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
              Loading staff…
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <div className="empty-state-title">No staff found</div>
              <div className="empty-state-text">
                Try adjusting your filters.
              </div>
            </div>
          ) : (
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background: "var(--green-light)",
                            color: "var(--green)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11px",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {u.fullName
                            .split(" ")
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <span style={{ fontWeight: 500 }}>{u.fullName}</span>
                      </div>
                    </td>
                    <td className="text-muted text-sm">{u.email}</td>
                    <td>
                      <span
                        className={`badge ${u.role === "administrator" ? "badge-danger" : u.role === "supervisor" ? "badge-info" : "badge-gray"}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="text-muted text-sm">
                      {u.departmentName ?? "—"}
                    </td>
                    <td>
                      <span
                        className={`badge ${u.isActive ? "badge-success" : "badge-gray"}`}
                      >
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="text-muted text-sm">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => openEdit(u)}
                        >
                          Edit
                        </button>
                        {u.isActive && (
                          <button
                            className="btn btn-danger btn-xs"
                            onClick={() => deactivate(u)}
                          >
                            Deactivate
                          </button>
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

      {/* Edit modal */}
      {editUser && (
        <div className="modal-backdrop" onClick={() => setEditUser(null)}>
          <div className="modal modal-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Edit: {editUser.fullName}</div>
              <button className="modal-close" onClick={() => setEditUser(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="select"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select
                  className="select"
                  value={editDept}
                  onChange={(e) => setEditDept(e.target.value)}
                >
                  <option value="">No department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                />
                Account Active
              </label>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setEditUser(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={saving}
                onClick={saveEdit}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {inviteOpen && (
        <div className="modal-backdrop" onClick={() => setInviteOpen(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Invite Staff Member</div>
              <button
                className="modal-close"
                onClick={() => setInviteOpen(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info mb-3">
                Create a staff account with a temporary password. Share it
                securely and ask the staff member to change it after signing in.
              </div>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="input"
                  placeholder="Staff member name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Temporary Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="At least 8 characters"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="input"
                  placeholder="staff@cut.ac.zw"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="select"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select
                  className="select"
                  value={inviteDept}
                  onChange={(e) => setInviteDept(e.target.value)}
                >
                  <option value="">Select department…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={saving}
                onClick={createStaff}
              >
                {saving ? "Creating…" : "Create Staff Account"}
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
