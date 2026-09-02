"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import type { Notification } from "@cut-smartfix/contracts";

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    fetchApi<Notification[]>("/v1/notifications")
      .then(setItems)
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load notifications.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Notifications</div>
          <div className="page-subtitle">
            Operational alerts for administrators and supervisors.
          </div>
        </div>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="loading-state">Loading notifications…</div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">OK</div>
              <div className="empty-state-title">No notifications</div>
              <div className="empty-state-text">
                New critical requests, overdue work, and material decisions will
                appear here.
              </div>
            </div>
          ) : (
            items.map((item) => (
              <div className="admin-notification" key={item.id}>
                <span
                  className={`notification-status${item.readAt ? " read" : ""}`}
                />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  <small>{new Date(item.createdAt).toLocaleString()}</small>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
