"use client";

import { useAuth } from "../../../lib/auth";

export default function TeamPage() {
  const { user } = useAuth();
  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Team</h2>
          <p>Maintenance team workspace and workload oversight.</p>
        </div>
      </div>
      <div className="team-banner">
        <div className="team-mark">
          {user?.departmentName?.slice(0, 1) ?? "M"}
        </div>
        <div>
          <h3>{user?.departmentName ?? "Maintenance operations"}</h3>
          <p>
            Use Assignments to review active ownership, and Tasks to manage work
            execution.
          </p>
        </div>
      </div>
      <div className="grid-3">
        <a className="feature-card" href="/assignments">
          <strong>Assignments</strong>
          <span>Review active technician workload and ticket ownership.</span>
        </a>
        <a className="feature-card" href="/requests">
          <strong>Requests</strong>
          <span>Move incoming reports from review into assignment.</span>
        </a>
        <a className="feature-card" href="/materials">
          <strong>Materials</strong>
          <span>Approve, reject, and track material requests.</span>
        </a>
      </div>
    </>
  );
}
