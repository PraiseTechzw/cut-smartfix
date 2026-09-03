"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useAuth } from "../lib/auth";

// ─── SVG icon components ────────────────────────────────────────────────────
const iconProps = {
  width: 16, height: 16, viewBox: "0 0 24 24",
  fill: "none", stroke: "currentColor",
  strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
};

const DashboardIcon     = () => <svg {...iconProps}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
const WrenchIcon        = () => <svg {...iconProps}><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>;
const ClipboardIcon     = () => <svg {...iconProps}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12l2 2 4-4"/></svg>;
const LightningIcon     = () => <svg {...iconProps}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
const UsersIcon         = () => <svg {...iconProps}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>;
const BuildingIcon      = () => <svg {...iconProps}><path d="M3 21h18M9 21V7l6-4v18M9 7H3v14M15 11h2M15 15h2M9 11H7M9 15H7"/></svg>;
const MapPinIcon        = () => <svg {...iconProps}><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const MapIcon           = () => <svg {...iconProps}><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16M16 6v16"/></svg>;
const LayersIcon        = () => <svg {...iconProps}><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>;
const DoorIcon          = () => <svg {...iconProps}><path d="M3 21h18"/><rect x="6" y="3" width="12" height="18" rx="1"/><circle cx="14.5" cy="12" r="0.5" fill="currentColor"/></svg>;
const TagIcon           = () => <svg {...iconProps}><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></svg>;
const BarChartIcon      = () => <svg {...iconProps}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>;
const FileTextIcon      = () => <svg {...iconProps}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const BellIcon          = () => <svg {...iconProps}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
const ShieldCheckIcon   = () => <svg {...iconProps}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>;
const SettingsIcon      = () => <svg {...iconProps}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
const LogoutIcon        = () => <svg {...iconProps}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const ChevronDownIcon   = () => <svg {...iconProps} width={12} height={12}><polyline points="6 9 12 15 18 9"/></svg>;
const ChevronRightIcon  = () => <svg {...iconProps} width={12} height={12}><polyline points="9 6 15 12 9 18"/></svg>;
const OfficeIcon        = () => <svg {...iconProps}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;

// ─── Nav definition ──────────────────────────────────────────────────────────
interface NavItem { href: string; label: string; Icon: React.FC; }
interface NavSection { title: string; items: NavItem[]; }

const NAV: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard",  label: "Dashboard",    Icon: DashboardIcon },
    ],
  },
  {
    title: "Maintenance",
    items: [
      { href: "/maintenance",                   label: "All Requests", Icon: WrenchIcon },
      { href: "/assignments",                   label: "Assignments",  Icon: ClipboardIcon },
      { href: "/maintenance?status=in_progress", label: "Active Work",  Icon: LightningIcon },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/staff",       label: "Staff",       Icon: UsersIcon },
      { href: "/departments", label: "Departments", Icon: OfficeIcon },
    ],
  },
  {
    title: "Locations",
    items: [
      { href: "/locations",           label: "Overview",   Icon: MapIcon },
      { href: "/locations/campuses",  label: "Campuses",   Icon: MapPinIcon },
      { href: "/locations/areas",     label: "Areas",      Icon: MapIcon },
      { href: "/locations/buildings", label: "Buildings",  Icon: BuildingIcon },
      { href: "/locations/floors",    label: "Floors",     Icon: LayersIcon },
      { href: "/locations/rooms",     label: "Rooms",      Icon: DoorIcon },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/categories",    label: "Categories",    Icon: TagIcon },
      { href: "/analytics",     label: "Analytics",     Icon: BarChartIcon },
      { href: "/reports",       label: "Reports",       Icon: FileTextIcon },
      { href: "/notifications", label: "Notifications", Icon: BellIcon },
      { href: "/audit",         label: "Audit Logs",    Icon: ShieldCheckIcon },
      { href: "/settings",      label: "Settings",      Icon: SettingsIcon },
    ],
  },
];

// ─── Avatar helper ───────────────────────────────────────────────────────────
function getInitials(name?: string): string {
  return (name?.trim() || "Admin")
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function UserAvatar({ name, size = 28 }: { name?: string; size?: number }) {
  const initials = getInitials(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.25)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#fff", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const toggle = (t: string) => setCollapsed((p) => { const n = new Set(p); n.has(t) ? n.delete(t) : n.add(t); return n; });

  const isActive = (href: string) => {
    const base = href.split("?")[0];
    return pathname === base || pathname.startsWith(base + "/");
  };

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((seg, i) => ({
    label: seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    href: "/" + segments.slice(0, i + 1).join("/"),
  }));

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">CUT SmartFix</div>
            <div className="sidebar-brand-sub">Admin Portal</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {NAV.map((section) => {
            const isCollapsed = collapsed.has(section.title);
            return (
              <div key={section.title} className="sidebar-section">
                <button
                  onClick={() => toggle(section.title)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "6px 16px 4px", background: "none", border: "none",
                    cursor: "pointer", color: "rgba(255,255,255,0.45)", fontSize: "10px",
                    fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px",
                  }}
                >
                  {section.title}
                  <span style={{ opacity: 0.6 }}>
                    {isCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
                  </span>
                </button>

                {!isCollapsed && section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`sidebar-link${active ? " active" : ""}`}
                    >
                      <span className="icon" style={{ display: "flex", alignItems: "center" }}>
                        <item.Icon />
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={() => setUserMenuOpen((v) => !v)}>
            {user && <UserAvatar name={user.fullName} />}
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.fullName ?? "Admin"}</div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
            <span style={{ color: "rgba(255,255,255,0.35)", marginLeft: "auto" }}>
              <ChevronDownIcon />
            </span>
          </div>

          {userMenuOpen && (
            <div style={{ marginTop: 6, background: "rgba(0,0,0,0.2)", borderRadius: 6, overflow: "hidden" }}>
              <Link
                href="/settings"
                className="sidebar-link"
                style={{ fontSize: 12 }}
                onClick={() => setUserMenuOpen(false)}
              >
                <span className="icon" style={{ display: "flex" }}><SettingsIcon /></span>
                Settings
              </Link>
              <button
                onClick={() => { setUserMenuOpen(false); logout(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: "7px 16px", background: "none", border: "none",
                  color: "rgba(255,255,255,0.78)", fontSize: 12, cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", width: 16 }}><LogoutIcon /></span>
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Topbar ── */}
      <header className="topbar">
        <nav className="topbar-breadcrumb breadcrumb" aria-label="Breadcrumb">
          <Link href="/dashboard">Home</Link>
          {breadcrumbs.map((part, i) => (
            <React.Fragment key={part.href}>
              <span className="sep">›</span>
              {i === breadcrumbs.length - 1
                ? <span className="current">{part.label}</span>
                : <Link href={part.href}>{part.label}</Link>}
            </React.Fragment>
          ))}
        </nav>

        <div className="topbar-actions">
          {/* Bell */}
          <div style={{ position: "relative" }}>
            <button
              className="topbar-icon-btn"
              aria-label="Notifications"
              onClick={() => setNotifOpen((v) => !v)}
            >
              <BellIcon />
              <span className="topbar-notif-badge" />
            </button>
            {notifOpen && (
              <div style={{
                position: "absolute", right: 0, top: "100%", marginTop: 4,
                width: 280, background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)", zIndex: 300, padding: "8px 0",
              }}>
                <div style={{ padding: "8px 16px 4px", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 1 }}>
                  Notifications
                </div>
                <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted)", textAlign: "center" }}>
                  No new notifications
                </div>
                <div style={{ borderTop: "1px solid var(--border)", padding: "8px 16px 4px" }}>
                  <Link href="/notifications" style={{ fontSize: 12, color: "var(--green)", fontWeight: 600 }} onClick={() => setNotifOpen(false)}>
                    View all notifications →
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User pill */}
          <div className="topbar-user" onClick={() => setUserMenuOpen((v) => !v)}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", background: "var(--green)",
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {getInitials(user?.fullName)}
            </div>
            <div>
              <div className="topbar-user-name">{user?.fullName ?? "Admin"}</div>
              <div className="topbar-user-role">{user?.role}</div>
            </div>
            <span style={{ color: "var(--muted)", marginLeft: 4 }}><ChevronDownIcon /></span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="main-content">
        <div className="page-body">
          {children}
        </div>
      </main>
    </div>
  );
}
