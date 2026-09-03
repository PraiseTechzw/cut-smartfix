"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import type { Notification } from "@cut-smartfix/contracts";

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");

  async function load() {
    setLoading(true);
    try {
      const data = await fetchApi<Notification[] | { items?: Notification[] }>(
        "/v1/notifications?pageSize=100",
      );
      if (Array.isArray(data)) setItems(data);
      else setItems((data as { items?: Notification[] }).items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    try {
      await fetchApi(`/v1/notifications/${id}/read`, { method: "PATCH" });
      setItems((prev) =>
        prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n),
      );
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await fetchApi("/v1/notifications/read-all", { method: "POST" });
      setItems((prev) =>
        prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
      );
    } catch { /* silent */ } finally {
      setMarkingAll(false);
    }
  };

  const displayed = items
    .filter((n) => tab === "all" || !n.readAt)
    .sort((a, b) => {
      // Unread first, then by date desc
      const au = !a.readAt ? 1 : 0;
      const bu = !b.readAt ? 1 : 0;
      if (au !== bu) return bu - au;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const unreadCount = items.filter((n) => !n.readAt).length;

  const typeIcon = (type: string) => {
    if (type?.includes("critical") || type?.includes("overdue")) return "🚨";
    if (type?.includes("assign")) return "📋";
    if (type?.includes("material")) return "📦";
    if (type?.includes("complete") || type?.includes("closed")) return "✅";
    if (type?.includes("reject") || type?.includes("cancel")) return "❌";
    return "🔔";
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Notifications</div>
          <div className="page-subtitle">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up — no unread notifications."}
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={markAllRead}
            disabled={markingAll}
          >
            {markingAll ? "Marking…" : "Mark all as read"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="filter-bar" style={{ marginBottom: "16px" }}>
        <button
          className={`btn btn-sm ${tab === "all" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setTab("all")}
        >
          All ({items.length})
        </button>
        <button
          className={`btn btn-sm ${tab === "unread" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setTab("unread")}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: "48px", textAlign: "center", color: "var(--muted)" }}>
              Loading notifications…
            </div>
          ) : displayed.length === 0 ? (
            <div className="empty-state" style={{ padding: "48px" }}>
              <div className="empty-state-icon">🔔</div>
              <div className="empty-state-title">
                {tab === "unread" ? "No unread notifications" : "No notifications yet"}
              </div>
              <div className="empty-state-text">
                Critical requests, overdue tickets, and material decisions will appear here.
              </div>
            </div>
          ) : (
            displayed.map((notif) => {
              const isUnread = !notif.readAt;
              return (
                <div
                  key={notif.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "14px",
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--border)",
                    background: isUnread ? "#f0fdf4" : "transparent",
                    transition: "background 0.15s",
                  }}
                >
                  {/* Type icon */}
                  <span style={{ fontSize: "1.3rem", flexShrink: 0, marginTop: "2px" }}>
                    {typeIcon(notif.type)}
                  </span>

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: isUnread ? 700 : 500, fontSize: "14px" }}>
                        {notif.title}
                      </span>
                      {isUnread && (
                        <span className="badge badge-success" style={{ fontSize: "10px" }}>NEW</span>
                      )}
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--muted)", margin: "0 0 6px" }}>
                      {notif.body}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>{timeAgo(notif.createdAt)}</span>
                      {notif.ticketNumber && (
                        <Link
                          href={notif.actionUrl ?? `/maintenance/${notif.reportId}`}
                          className="btn btn-ghost btn-xs"
                          style={{ fontFamily: "monospace" }}
                          onClick={() => isUnread && markRead(notif.id)}
                        >
                          {notif.ticketNumber} →
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Mark read button */}
                  {isUnread && (
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => markRead(notif.id)}
                      title="Mark as read"
                      style={{ flexShrink: 0, marginTop: "2px" }}
                    >
                      ✓
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
