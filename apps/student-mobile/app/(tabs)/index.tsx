import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../context/auth";
import type { MaintenanceReport, ReportStatus } from "@cut-smartfix/contracts";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function greet(name: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 18) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  submitted: { bg: "#fff3cd", text: "#92580a" },
  under_review: { bg: "#fff3cd", text: "#92580a" },
  assigned: { bg: "#cce5ff", text: "#004085" },
  accepted: { bg: "#cce5ff", text: "#004085" },
  in_progress: { bg: "#cce5ff", text: "#004085" },
  waiting_for_materials: { bg: "#cce5ff", text: "#004085" },
  repair_completed: { bg: "#d4edda", text: "#155724" },
  under_verification: { bg: "#d4edda", text: "#155724" },
  closed: { bg: "#d4edda", text: "#155724" },
  rejected: { bg: "#f8d7da", text: "#721c24" },
  duplicate: { bg: "#f8d7da", text: "#721c24" },
  cancelled: { bg: "#f8d7da", text: "#721c24" },
  reopened: { bg: "#fff3cd", text: "#92580a" },
};

function StatusBadge({ status }: { status: ReportStatus }) {
  const colors = STATUS_COLORS[status] ?? { bg: "#e9ecef", text: "#495057" };
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>
        {status.replace(/_/g, " ")}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------
function Skeleton({ width, height }: { width: number | string; height: number }) {
  return (
    <View
      style={[
        styles.skeleton,
        { width: width as number, height },
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function HomeScreen() {
  const { user, token } = useAuth();
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${API_URL}/v1/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setReports(json.data ?? []);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const openCount = reports.filter(
    (r) =>
      r.status === "submitted" ||
      r.status === "under_review" ||
      r.status === "reopened",
  ).length;
  const inProgressCount = reports.filter(
    (r) =>
      r.status === "assigned" ||
      r.status === "accepted" ||
      r.status === "in_progress" ||
      r.status === "waiting_for_materials",
  ).length;
  const closedCount = reports.filter(
    (r) => r.status === "closed" || r.status === "repair_completed",
  ).length;
  const recent = reports.slice(0, 3);
  const displayName = user?.fullName?.split(" ")[0] ?? "Student";

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>CUT SMARTFIX</Text>
          {loading ? (
            <Skeleton width={220} height={32} />
          ) : (
            <Text style={styles.greeting}>{greet(displayName)}</Text>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard label="Open" value={openCount} color="#e3b23c" loading={loading} />
          <StatCard label="In Progress" value={inProgressCount} color="#3b8adb" loading={loading} />
          <StatCard label="Closed" value={closedCount} color="#0b6b57" loading={loading} />
        </View>

        {/* CTA */}
        <Pressable
          style={styles.ctaButton}
          onPress={() => router.push("/report-wizard")}
        >
          <Text style={styles.ctaText}>＋  Report an Issue</Text>
        </Pressable>

        {/* Recent activity */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Could not load reports: {error}</Text>
          </View>
        )}

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : !token ? (
          <View style={styles.loginPrompt}>
            <Text style={styles.loginPromptText}>
              Sign in to see your reports.
            </Text>
            <Pressable
              style={styles.loginButton}
              onPress={() => router.push("/auth/login")}
            >
              <Text style={styles.loginButtonText}>Sign In</Text>
            </Pressable>
          </View>
        ) : recent.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No reports yet.</Text>
            <Text style={styles.emptySubtext}>
              Tap the button above to submit your first issue.
            </Text>
          </View>
        ) : (
          recent.map((r) => (
            <Pressable
              key={r.id}
              style={styles.card}
              onPress={() => router.push(`/report/${r.id}`)}
            >
              <View style={styles.cardRow}>
                <Text style={styles.ticketNumber}>{r.ticketNumber}</Text>
                <StatusBadge status={r.status} />
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {r.title}
              </Text>
              {r.categoryName ? (
                <Text style={styles.cardMeta}>{r.categoryName}</Text>
              ) : null}
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  color,
  loading,
}: {
  label: string;
  value: number;
  color: string;
  loading: boolean;
}) {
  return (
    <View style={[styles.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      {loading ? (
        <Skeleton width={32} height={28} />
      ) : (
        <Text style={[styles.statValue, { color }]}>{value}</Text>
      )}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <Skeleton width={100} height={14} />
        <Skeleton width={70} height={22} />
      </View>
      <Skeleton width="80%" height={18} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f4f7f2" },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24 },
  eyebrow: {
    color: "#0b6b57",
    fontWeight: "700",
    letterSpacing: 2,
    fontSize: 11,
    marginBottom: 6,
  },
  greeting: {
    color: "#17231f",
    fontSize: 28,
    fontWeight: "800",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 2,
  },
  statLabel: {
    color: "#52615b",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  ctaButton: {
    backgroundColor: "#0b6b57",
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginBottom: 28,
    shadowColor: "#0b6b57",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  sectionTitle: {
    color: "#17231f",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    gap: 6,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ticketNumber: {
    color: "#0b6b57",
    fontFamily: "monospace" as const,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cardTitle: {
    color: "#17231f",
    fontSize: 15,
    fontWeight: "600",
  },
  cardMeta: {
    color: "#52615b",
    fontSize: 13,
  },
  badge: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  skeleton: {
    backgroundColor: "#e8ede9",
    borderRadius: 6,
  },
  errorBox: {
    backgroundColor: "#f8d7da",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    color: "#721c24",
    fontSize: 13,
  },
  loginPrompt: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  loginPromptText: {
    color: "#52615b",
    fontSize: 15,
  },
  loginButton: {
    backgroundColor: "#0b6b57",
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyIcon: { fontSize: 40 },
  emptyText: { color: "#17231f", fontSize: 16, fontWeight: "600" },
  emptySubtext: { color: "#52615b", fontSize: 14, textAlign: "center" },
});
