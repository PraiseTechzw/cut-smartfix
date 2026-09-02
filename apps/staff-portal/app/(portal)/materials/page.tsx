"use client";

import { useEffect, useState, useCallback } from "react";
import { api, timeAgo, buildQuery } from "../../../lib/api";
import { useAuth } from "../../../lib/auth";
import type {
  MaterialRequest,
  MaterialRequestStatus,
} from "@cut-smartfix/contracts";

type StatusFilter = "all" | MaterialRequestStatus;

const TABS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "requested" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Issued", value: "issued" },
  { label: "Received", value: "received" },
];

export default function MaterialsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<StatusFilter>("all");
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const isSupervisor =
    user?.role === "supervisor" || user?.role === "administrator";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {};
      if (tab !== "all") params.status = tab;

      const endpoint = `/v1/materials${buildQuery(params)}`;

      const res = await api.get<MaterialRequest[]>(endpoint);
      if (res.error) throw new Error(res.error.message);
      const data = res.data;
      if (Array.isArray(data)) {
        setRequests(data);
      } else {
        const pl = data as unknown as { items?: MaterialRequest[] };
        setRequests(pl.items ?? []);
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load material requests",
      );
    } finally {
      setLoading(false);
    }
  }, [tab, isSupervisor]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAction = async (
    id: string,
    status: MaterialRequestStatus,
    label: string,
  ) => {
    setActionLoading(id);
    setActionMsg(null);
    try {
      const res = await api.patch(`/v1/material-requests/${id}`, { status });
      if (res.error) throw new Error(res.error.message);
      setActionMsg(`Request ${label} successfully.`);
      load();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Material Requests</h2>
          <p>
            {isSupervisor
              ? "Review and approve material requests from technicians"
              : "Your submitted material requests"}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs">
        {TABS.map((t) => (
          <button
            key={t.value}
            className={`filter-tab${tab === t.value ? " active" : ""}`}
            onClick={() => setTab(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {actionMsg && (
        <div
          className={`alert ${actionMsg.includes("success") ? "alert-success" : "alert-error"}`}
        >
          {actionMsg}
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Qty</th>
              {isSupervisor && <th>Ticket</th>}
              {isSupervisor && <th>Requested By</th>}
              <th>Reason</th>
              <th>Status</th>
              <th>Date</th>
              {isSupervisor && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={isSupervisor ? 8 : 5}
                  style={{ textAlign: "center", padding: "32px 0" }}
                >
                  <div className="spinner" style={{ margin: "0 auto" }} />
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={isSupervisor ? 8 : 5}>
                  <div className="empty-state">
                    <div className="empty-state-icon">📦</div>
                    <h3>No material requests</h3>
                    <p>Nothing matching the current filter.</p>
                  </div>
                </td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} className="no-hover">
                  <td style={{ fontWeight: 500 }}>{req.materialName}</td>
                  <td>
                    {req.quantity} {req.unit}
                  </td>
                  {isSupervisor && (
                    <td>
                      {req.ticketNumber ? (
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "0.8rem",
                            background: "var(--bg)",
                            padding: "2px 6px",
                            borderRadius: 4,
                          }}
                        >
                          {req.ticketNumber}
                        </span>
                      ) : (
                        "–"
                      )}
                    </td>
                  )}
                  {isSupervisor && (
                    <td style={{ fontSize: "0.82rem" }}>
                      {req.requestedByName ?? "–"}
                    </td>
                  )}
                  <td
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--muted)",
                      maxWidth: 200,
                    }}
                  >
                    {req.reason}
                  </td>
                  <td>
                    <span className={`badge badge-${req.status}`}>
                      {req.status}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                    {timeAgo(req.createdAt)}
                  </td>
                  {isSupervisor && (
                    <td>
                      {req.status === "requested" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn btn-primary btn-sm"
                            disabled={actionLoading === req.id}
                            onClick={() =>
                              handleAction(req.id, "approved", "approved")
                            }
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            disabled={actionLoading === req.id}
                            onClick={() =>
                              handleAction(req.id, "rejected", "rejected")
                            }
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {req.status === "approved" && (
                        <button
                          className="btn btn-secondary btn-sm"
                          disabled={actionLoading === req.id}
                          onClick={() =>
                            handleAction(req.id, "issued", "issued")
                          }
                        >
                          Mark Issued
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
