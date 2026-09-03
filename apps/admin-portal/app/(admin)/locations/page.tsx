"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchApi } from "../../../lib/api";
import type { Area, Building, Campus, Floor, Room } from "@cut-smartfix/contracts";

interface Counts { campuses: number; areas: number; buildings: number; floors: number; rooms: number; }

export default function LocationsPage() {
  const [counts, setCounts] = useState<Counts>({ campuses: 0, areas: 0, buildings: 0, floors: 0, rooms: 0 });

  useEffect(() => {
    Promise.all([
      fetchApi<Campus[]>("/v1/locations/campuses").catch(() => [] as Campus[]),
      fetchApi<Area[]>("/v1/locations/areas").catch(() => [] as Area[]),
      fetchApi<Building[]>("/v1/locations/buildings").catch(() => [] as Building[]),
      fetchApi<Floor[]>("/v1/locations/floors").catch(() => [] as Floor[]),
      fetchApi<Room[]>("/v1/locations/rooms").catch(() => [] as Room[]),
    ]).then(([c, a, b, f, r]) => setCounts({ campuses: c.length, areas: a.length, buildings: b.length, floors: f.length, rooms: r.length }));
  }, []);

  const cards = [
    { href: "/locations/campuses", label: "Campuses",  desc: "University campuses and sites", count: counts.campuses, color: "#0b6b57" },
    { href: "/locations/areas",    label: "Areas",     desc: "Campus zones and functional areas", count: counts.areas, color: "#2563eb" },
    { href: "/locations/buildings",label: "Buildings", desc: "Physical buildings on each campus", count: counts.buildings, color: "#7c3aed" },
    { href: "/locations/floors",   label: "Floors",    desc: "Floor levels within buildings", count: counts.floors, color: "#d97706" },
    { href: "/locations/rooms",    label: "Rooms",     desc: "Individual rooms and spaces", count: counts.rooms, color: "#dc2626" },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Locations</div>
          <div className="page-subtitle">Manage the full campus location hierarchy</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 16 }}>
        {cards.map((c) => (
          <Link key={c.href} href={c.href} style={{ textDecoration: "none" }}>
            <div className="card" style={{ padding: 24, cursor: "pointer", transition: "box-shadow 0.15s, transform 0.15s", borderTop: `3px solid ${c.color}` }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = ""; }}
            >
              <div style={{ fontSize: 28, fontWeight: 800, color: c.color, lineHeight: 1, marginBottom: 8 }}>{c.count}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{c.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
