"use client";

import { useState } from "react";
import { useAuth } from "../../../lib/auth";
import { fetchApi } from "../../../lib/api";

type Section = "profile" | "password" | "system" | "notifications";

export default function SettingsPage() {
  const { user } = useAuth();
  const [section, setSection] = useState<Section>("profile");

  // Profile form
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email] = useState(user?.email ?? "");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password form
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // System settings (display only, no backend yet)
  const [orgName, setOrgName] = useState("Chinhoyi University of Technology");
  const [timezone, setTimezone] = useState("Africa/Harare");
  const [overdueHours, setOverdueHours] = useState("48");
  const [systemSaving, setSystemSaving] = useState(false);
  const [systemMsg, setSystemMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Notification prefs
  const [notifCritical, setNotifCritical] = useState(true);
  const [notifOverdue, setNotifOverdue] = useState(true);
  const [notifAssignment, setNotifAssignment] = useState(false);

  const saveProfile = async () => {
    if (!fullName.trim()) return;
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await fetchApi(`/v1/admin/users/${user?.id}`, {
        method: "PATCH",
        body: JSON.stringify({ fullName }),
      });
      setProfileMsg({ type: "success", text: "Profile updated successfully." });
    } catch (e) {
      setProfileMsg({ type: "error", text: e instanceof Error ? e.message : "Update failed." });
    } finally {
      setProfileSaving(false);
    }
  };

  const changePassword = async () => {
    if (!currentPw || !newPw || newPw !== confirmPw) {
      setPwMsg({ type: "error", text: "Passwords do not match or fields are empty." });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      await fetchApi(`/v1/auth/change-password`, {
        method: "POST",
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setPwMsg({ type: "success", text: "Password changed successfully." });
    } catch (e) {
      setPwMsg({ type: "error", text: e instanceof Error ? e.message : "Password change failed." });
    } finally {
      setPwSaving(false);
    }
  };

  const saveSystem = async () => {
    setSystemSaving(true);
    setSystemMsg(null);
    // Simulated — these would POST to a /v1/admin/settings endpoint
    await new Promise((r) => setTimeout(r, 600));
    setSystemSaving(false);
    setSystemMsg({ type: "success", text: "System settings saved." });
  };

  const SECTIONS: { id: Section; label: string; icon: string }[] = [
    { id: "profile", label: "My Profile", icon: "👤" },
    { id: "password", label: "Password", icon: "🔒" },
    { id: "system", label: "System", icon: "⚙️" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Manage your account and system configuration.</div>
        </div>
      </div>

      <div className="settings-layout">
        {/* Sidebar nav */}
        <nav className="settings-nav card">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={`settings-nav-item${section === s.id ? " active" : ""}`}
              onClick={() => setSection(s.id)}
            >
              <span className="settings-nav-icon">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="settings-content">

          {/* Profile */}
          {section === "profile" && (
            <div className="card">
              <div className="card-header"><div className="card-title">My Profile</div></div>
              <div className="card-body">
                <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "28px" }}>
                  <div className="settings-avatar">
                    {(user?.fullName ?? "A").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "16px" }}>{user?.fullName}</div>
                    <div style={{ color: "var(--muted)", fontSize: "13px" }}>{user?.email}</div>
                    <span className={`badge badge-${user?.role}`} style={{ marginTop: "6px" }}>{user?.role}</span>
                  </div>
                </div>

                {profileMsg && (
                  <div className={`alert alert-${profileMsg.type === "success" ? "success" : "danger"}`} style={{ marginBottom: "16px" }}>
                    {profileMsg.text}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    className="input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="input" value={email} disabled style={{ background: "var(--bg)", color: "var(--muted)" }} />
                  <div className="form-hint">Email cannot be changed here. Contact your Supabase administrator.</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <input className="input" value={user?.role ?? ""} disabled style={{ background: "var(--bg)", color: "var(--muted)", textTransform: "capitalize" }} />
                </div>
                <button className="btn btn-primary" onClick={saveProfile} disabled={profileSaving || !fullName.trim()}>
                  {profileSaving ? "Saving…" : "Save Profile"}
                </button>
              </div>
            </div>
          )}

          {/* Password */}
          {section === "password" && (
            <div className="card">
              <div className="card-header"><div className="card-title">Change Password</div></div>
              <div className="card-body">
                {pwMsg && (
                  <div className={`alert alert-${pwMsg.type === "success" ? "success" : "danger"}`} style={{ marginBottom: "16px" }}>
                    {pwMsg.text}
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input
                    type="password"
                    className="input"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Repeat new password"
                  />
                </div>
                {newPw && confirmPw && newPw !== confirmPw && (
                  <div className="alert alert-danger" style={{ marginBottom: "12px" }}>
                    Passwords do not match.
                  </div>
                )}
                <button
                  className="btn btn-primary"
                  onClick={changePassword}
                  disabled={pwSaving || !currentPw || !newPw || !confirmPw}
                >
                  {pwSaving ? "Changing…" : "Change Password"}
                </button>
              </div>
            </div>
          )}

          {/* System */}
          {section === "system" && (
            <div className="card">
              <div className="card-header"><div className="card-title">System Configuration</div></div>
              <div className="card-body">
                <div className="alert alert-info" style={{ marginBottom: "20px" }}>
                  These settings affect the entire CUT SmartFix platform. Changes require a system restart to fully take effect.
                </div>

                {systemMsg && (
                  <div className={`alert alert-${systemMsg.type === "success" ? "success" : "danger"}`} style={{ marginBottom: "16px" }}>
                    {systemMsg.text}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Organisation Name</label>
                  <input className="input" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                  <div className="form-hint">Displayed in emails and reports.</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Timezone</label>
                  <select className="select" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                    <option value="Africa/Harare">Africa/Harare (UTC+2)</option>
                    <option value="Africa/Johannesburg">Africa/Johannesburg (UTC+2)</option>
                    <option value="UTC">UTC</option>
                    <option value="Europe/London">Europe/London</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Overdue Threshold (hours)</label>
                  <input
                    type="number"
                    className="input"
                    style={{ width: "120px" }}
                    min="1"
                    value={overdueHours}
                    onChange={(e) => setOverdueHours(e.target.value)}
                  />
                  <div className="form-hint">Tickets older than this are flagged overdue.</div>
                </div>

                <div className="settings-divider" />

                <div className="form-group">
                  <label className="form-label">API URL</label>
                  <input
                    className="input"
                    value={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}
                    disabled
                    style={{ background: "var(--bg)", color: "var(--muted)", fontFamily: "monospace", fontSize: "13px" }}
                  />
                  <div className="form-hint">Set via NEXT_PUBLIC_API_URL environment variable.</div>
                </div>

                <button className="btn btn-primary" onClick={saveSystem} disabled={systemSaving}>
                  {systemSaving ? "Saving…" : "Save System Settings"}
                </button>
              </div>
            </div>
          )}

          {/* Notifications */}
          {section === "notifications" && (
            <div className="card">
              <div className="card-header"><div className="card-title">Notification Preferences</div></div>
              <div className="card-body">
                <div className="settings-pref-list">
                  <div className="settings-pref-item">
                    <div>
                      <div className="settings-pref-label">Critical ticket alerts</div>
                      <div className="settings-pref-sub">Receive a notification when a critical-priority ticket is submitted.</div>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={notifCritical}
                        onChange={(e) => setNotifCritical(e.target.checked)}
                      />
                      <span className="toggle-track" />
                    </label>
                  </div>
                  <div className="settings-pref-item">
                    <div>
                      <div className="settings-pref-label">Overdue ticket alerts</div>
                      <div className="settings-pref-sub">Get notified when tickets pass the overdue threshold.</div>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={notifOverdue}
                        onChange={(e) => setNotifOverdue(e.target.checked)}
                      />
                      <span className="toggle-track" />
                    </label>
                  </div>
                  <div className="settings-pref-item">
                    <div>
                      <div className="settings-pref-label">Assignment notifications</div>
                      <div className="settings-pref-sub">Notify admin when a technician is assigned to a ticket.</div>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={notifAssignment}
                        onChange={(e) => setNotifAssignment(e.target.checked)}
                      />
                      <span className="toggle-track" />
                    </label>
                  </div>
                </div>
                <div style={{ marginTop: "20px" }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => alert("Notification preferences saved (UI only — connect to your API settings endpoint).")}
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
