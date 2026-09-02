"use client";

import { useAuth } from "../../../lib/auth";

export default function ProfilePage() {
  const { user } = useAuth();
  const initials =
    user?.fullName
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "ST";

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <h2>Profile</h2>
          <p>Your staff account and assignment context</p>
        </div>
      </div>
      <div className="profile-layout">
        <section className="card profile-identity">
          <div className="profile-avatar">{initials}</div>
          <h3>{user?.fullName ?? "Staff member"}</h3>
          <p>{user?.email ?? "No email available"}</p>
          <span className={`badge badge-${user?.role ?? "technician"}`}>
            {user?.role ?? "technician"}
          </span>
        </section>
        <section className="card">
          <h3 className="card-title">Account details</h3>
          <div className="detail-grid profile-details">
            <div className="detail-item">
              <label>Full name</label>
              <p>{user?.fullName ?? "Not available"}</p>
            </div>
            <div className="detail-item">
              <label>Email address</label>
              <p>{user?.email ?? "Not available"}</p>
            </div>
            <div className="detail-item">
              <label>Role</label>
              <p style={{ textTransform: "capitalize" }}>
                {user?.role ?? "Not available"}
              </p>
            </div>
            <div className="detail-item">
              <label>Department</label>
              <p>{user?.departmentName ?? "Not assigned"}</p>
            </div>
            <div className="detail-item">
              <label>Account status</label>
              <p className="status-good">Active and verified</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
