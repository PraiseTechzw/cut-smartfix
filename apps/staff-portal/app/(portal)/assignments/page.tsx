"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";
import type { MaintenanceReport, PaginatedList } from "@cut-smartfix/contracts";

export default function AssignmentsPage() {
  const [tasks, setTasks] = useState<MaintenanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api
      .get<PaginatedList<MaintenanceReport> | MaintenanceReport[]>(
        "/v1/tasks?pageSize=100",
      )
      .then((result) => {
        if (result.error) throw new Error(result.error.message);
        setTasks(
          Array.isArray(result.data) ? result.data : (result.data?.items ?? []),
        );
      })
      .catch((reason: unknown) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load assignments.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Assignments</h2>
          <p>See departmental workload and current technician ownership.</p>
        </div>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="card">
        <div className="section-heading">
          <div>
            <h3 className="card-title">Current workload</h3>
            <p className="card-subtitle">
              Active tickets assigned across the maintenance team.
            </p>
          </div>
          <span className="count-chip">
            {loading ? "..." : `${tasks.length} active`}
          </span>
        </div>
        {loading ? (
          <div className="loading-overlay">
            <div className="spinner" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">OK</div>
            <h3>No active assignments</h3>
            <p>There are no open assignments to review.</p>
          </div>
        ) : (
          <div className="assignment-list">
            {tasks.map((task) => (
              <Link
                className="assignment-row"
                href={`/tasks/${task.id}`}
                key={task.id}
              >
                <div>
                  <span className="ticket-code">{task.ticketNumber}</span>
                  <strong>{task.title}</strong>
                  <small className="table-muted">
                    {task.assignedToName ?? "Unassigned"} ·{" "}
                    {task.assignedDepartmentName ?? "No department"}
                  </small>
                </div>
                <div className="assignment-meta">
                  <span className={`badge badge-${task.priority ?? "low"}`}>
                    {task.priority ?? "low"}
                  </span>
                  <span className={`badge badge-${task.status}`}>
                    {task.status.replace(/_/g, " ")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
