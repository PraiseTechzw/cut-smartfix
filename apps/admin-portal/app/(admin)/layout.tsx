"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import SidebarLayout from "../../components/SidebarLayout";
import { useAuth } from "../../lib/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div
          style={{
            width: "40px", height: "40px",
            border: "3px solid var(--border)",
            borderTopColor: "var(--green)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: "13px", color: "var(--muted)" }}>Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  return <SidebarLayout>{children}</SidebarLayout>;
}
