import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
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
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  submitted: { bg: "#fff3cd", text: "#92580a" },
  under_review: { bg: "#fff3cd", text: "#92580a" },
  reopened: { bg: "#fff3cd", text: "#92580a" },
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

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-ZW", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

type FilterType = "all" | "active" | "completed";

const ACTIVE_STATUSES: ReportStatus[] = [
  "submitted",
  "under_review",
  "assigned",
  "accepted",
  "in_progress",
  "waiting_for_materials",
  "reopened",
];
const COMPLETED_STATUSES: ReportStatus[] = [
  "repair_completed",
  "under_verification",
  "closed",
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function ReportsScreen() {
  const { token } = useAuth();
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  const fetchReports = useCallback(
    async (isRefresh = false) => {
      if (!token) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/v1/reports`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setReports(json.data ?? []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filtered = reports.filter((r) => {
    if (filter === "active") return ACTIVE_STATUSES.includes(r.status);
    if (filter === "completed") return COMPLETED_STATUSES.includes(r.status);
    return true;
  });

  if (!token) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.loginPrompt}>
          <Text style={styles.title}>My Reports</Text>
          <Text style={styles.promptText}>Sign in to view your reports.</Text>
          <Pressable
            style={styles.loginBtn}
            onPress={() => router.push("/auth/login")}
          >
            <Text style={styles.loginBtnText}>Sign In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Reports</Text>
        {/* Filter chips */}
        <View style={styles.filters}>
          {(["all", "active", "completed"] as FilterType[]).map((f) => (
            <Pressable
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f && styles.filterTextActive,
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#0b6b57" size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load: {error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => fetchReports()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            filtered.length === 0 ? styles.listEmpty : styles.list
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchReports(true)}
              tintColor="#0b6b57"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>
                {filter === "all"
                  ? "No reports yet"
                  : `No ${filter} reports`}
              </Text>
              <Text style={styles.emptyBody}>
                {filter === "all"
                  ? "Submit a maintenance issue and track it here."
                  : `You have no ${filter} reports at the moment.`}
              </Text>
              {filter === "all" && (
                <Pressable
                  style={styles.ctaBtn}
                  onPress={() => router.push("/report-wizard")}
                >
                  <Text style={styles.ctaBtnText}>Report an Issue</Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/report/${item.id}`)}
            >
              <View style={styles.cardTop}>
                <Text style={styles.ticketNumber}>{item.ticketNumber}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.cardMeta}>
                {item.categoryName ? (
                  <Text style={styles.metaText}>{item.categoryName}</Text>
                ) : null}
                <Text style={styles.metaDate}>
                  {formatDate(item.createdAt)}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f4f7f2" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    backgroundColor: "#f4f7f2",
  },
  title: {
    color: "#17231f",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 12,
  },
  filters: {
    flexDirection: "row",
    gap: 8,
  },
  filterBtn: {
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#c5d4c9",
    paddingHorizontal: 16,
    paddingVertical: 7,
    backgroundColor: "#fff",
  },
  filterBtnActive: {
    backgroundColor: "#0b6b57",
    borderColor: "#0b6b57",
  },
  filterText: {
    color: "#52615b",
    fontSize: 13,
    fontWeight: "600",
  },
  filterTextActive: {
    color: "#fff",
  },
  list: {
    padding: 20,
    paddingTop: 8,
    gap: 10,
  },
  listEmpty: {
    flex: 1,
    padding: 20,
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
  cardTop: {
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaText: {
    color: "#52615b",
    fontSize: 13,
  },
  metaDate: {
    color: "#52615b",
    fontSize: 12,
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    color: "#721c24",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0b6b57",
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: "#0b6b57",
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 52 },
  emptyTitle: {
    color: "#17231f",
    fontSize: 18,
    fontWeight: "700",
  },
  emptyBody: {
    color: "#52615b",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  ctaBtn: {
    backgroundColor: "#0b6b57",
    borderRadius: 10,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 8,
  },
  ctaBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  loginPrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  promptText: { color: "#52615b", fontSize: 15 },
  loginBtn: {
    backgroundColor: "#0b6b57",
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  loginBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
