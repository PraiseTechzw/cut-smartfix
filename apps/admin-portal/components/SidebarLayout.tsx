"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import { useAuth } from "../lib/auth";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}
interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "◉" },
    ],
  },
  {
    title: "Maintenance",
    items: [
      { href: "/maintenance", label: "All Requests", icon: "🔧" },
      { href: "/assignments", label: "Assignments", icon: "📋" },
      { href: "/maintenance?status=in_progress", label: "Active Work", icon: "⚡" },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/staff", label: "Staff Management", icon: "👥" },
      { href: "/departments", label: "Departments", icon: "🏢" },
    ],
  },
  {
    title: "Locations",
    items: [
      { href: "/locations/campuses", label: "Campuses", icon: "🏛️" },
      { href: "/locations/areas", label: "Areas", icon: "🗺️" },
      { href: "/locations/buildings", label: "Buildings", icon: "🏗️" },
      { href: "/locations/floors", label: "Floors", icon: "📐" },
      { href: "/locations/rooms", label: "Rooms", icon: "🚪" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/categories", label: "Categories", icon: "🏷️" },
      { href: "/analytics", label: "Analytics", icon: "📊" },
      { href: "/reports", label: "Reports", icon: "📄" },
      { href: "/notifications", label: "Notifications", icon: "🔔" },
      { href: "/audit", label: "Audit Logs", icon: "🔍" },
      { href: "/settings", label: "Settings", icon: "⚙️" },
    ],
  },
];

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return <div className="sidebar-avatar">{initials}</div>;
}

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const isActive = (href: string) => {
    if (href.includes("?")) {
      const base = href.split("?")[0];
      return pathname === base || pathname.startsWith(base + "/");
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Build breadcrumb from pathname
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbParts = segments.map((seg, i) => ({
    label: seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    href: "/" + segments.slice(0, i + 1).join("/"),
  }));

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">C</div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">CUT SmartFix</div>
            <div className="sidebar-brand-sub">Admin Portal</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((section) => (
            <div key={section.title} className="sidebar-section">
              <button
                className="sidebar-section-label"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingRight: "16px",
                }}
                onClick={() => toggleSection(section.title)}
              >
                {section.title}
                <span style={{ fontSize: "10px", opacity: 0.6 }}>
                  {collapsedSections.has(section.title) ? "▶" : "▼"}
                </span>
              </button>

              {!collapsedSections.has(section.title) &&
                section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link${isActive(item.href) ? " active" : ""}`}
                  >
                    <span className="icon">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div
            className="sidebar-user"
            onClick={() => setUserMenuOpen((v) => !v)}
          >
            {user && <UserAvatar name={user.fullName} />}
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.fullName ?? "Admin"}</div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginLeft: "auto" }}>▲</span>
          </div>

          {userMenuOpen && (
            <div
              style={{
                marginTop: "8px",
                background: "rgba(255,255,255,0.08)",
                borderRadius: "6px",
                overflow: "hidden",
              }}
            >
              <Link
                href="/settings"
                className="sidebar-link"
                style={{ fontSize: "12px" }}
                onClick={() => setUserMenuOpen(false)}
              >
                <span className="icon">⚙️</span> Settings
              </Link>
              <button
                onClick={logout}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  width: "100%", padding: "7px 16px", background: "none",
                  border: "none", color: "rgba(255,255,255,0.78)", fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                <span style={{ width: "16px", textAlign: "center" }}>🚪</span>
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Top Bar */}
      <header className="topbar">
        <nav className="topbar-breadcrumb breadcrumb" aria-label="Breadcrumb">
          <Link href="/dashboard">Home</Link>
          {breadcrumbParts.map((part, i) => (
            <React.Fragment key={part.href}>
              <span className="sep">›</span>
              {i === breadcrumbParts.length - 1 ? (
                <span className="current">{part.label}</span>
              ) : (
                <Link href={part.href}>{part.label}</Link>
              )}
            </React.Fragment>
          ))}
        </nav>

        <div className="topbar-actions">
          <div style={{ position: "relative" }}>
            <button
              className="topbar-icon-btn"
              aria-label="Notifications"
              onClick={() => setNotifOpen((v) => !v)}
            >
              🔔
              <span className="topbar-notif-badge" />
            </button>
            {notifOpen && (
              <div
                style={{
                  position: "absolute", right: 0, top: "100%", marginTop: "4px",
                  width: "280px", background: "var(--surface)",
                  border: "1px solid var(--border)", borderRadius: "var(--radius)",
                  boxShadow: "var(--shadow-md)", zIndex: 300, padding: "8px 0",
                }}
              >
                <div style={{ padding: "8px 16px 4px", fontSize: "12px", fontWeight: 600, color: "var(--muted)" }}>
                  NOTIFICATIONS
                </div>
                <div style={{ padding: "12px 16px", fontSize: "13px", color: "var(--muted)", textAlign: "center" }}>
                  No new notifications
                </div>
              </div>
            )}
          </div>

          <div
            className="topbar-user"
            onClick={() => setUserMenuOpen((v) => !v)}
          >
            {user && (
              <div
                className="sidebar-avatar"
                style={{
                  width: "28px", height: "28px",
                  background: "var(--green)", fontSize: "11px",
                  color: "#fff", fontWeight: 700,
                  borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                {user.fullName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </div>
            )}
            <div>
              <div className="topbar-user-name">{user?.fullName ?? "Admin"}</div>
              <div className="topbar-user-role">{user?.role}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="main-content">
        <div className="page-body">
          {children}
        </div>
      </main>
    </div>
  );
}
