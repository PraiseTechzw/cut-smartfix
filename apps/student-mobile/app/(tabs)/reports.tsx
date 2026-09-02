import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../context/auth";
import { useApi } from "../../hooks/useApi";
import type { MaintenanceReport, ReportStatus } from "@cut-smartfix/contracts";

// ─────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────
const C = {
  BG: "#f5f8f6",
  SURFACE: "#fff",
  GREEN: "#0b6b57",
  GREEN_DARK: "#084f41",
  GREEN_LIGHT: "#e8f5f0",
  TEXT: "#0f1f1b",
  MUTED: "#52615b",
  BORDER: "#d0ddd8",
  AMBER: "#d97706",
  BLUE: "#2563eb",
  RED: "#dc2626",
} as const;

// ─────────────────────────────────────────
// Filter types
// ─────────────────────────────────────────
type FilterType = "all" | "active" | "completed" | "rejected";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Rejected" },
];

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

const REJECTED_STATUSES: ReportStatus[] = [
  "rejected",
  "duplicate",
  "cancelled",
];

function filterReports(
  reports: MaintenanceReport[],
  filter: FilterType,
): MaintenanceReport[] {
  switch (filter) {
    case "active":
      return reports.filter((r) => ACTIVE_STATUSES.includes(r.status));
    case "completed":
      return reports.filter((r) => COMPLETED_STATUSES.includes(r.status));
    case "rejected":
      return reports.filter((r) => REJECTED_STATUSES.includes(r.status));
    default:
      return reports;
  }
}

function getStatusGroup(
  status: ReportStatus,
): "active" | "completed" | "rejected" | "unknown" {
  if (ACTIVE_STATUSES.includes(status)) return "active";
  if (COMPLETED_STATUSES.includes(status)) return "completed";
  if (REJECTED_STATUSES.includes(status)) return "rejected";
  return "unknown";
}

// ─────────────────────────────────────────
// Status badge colours
// ─────────────────────────────────────────
const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  submitted: { bg: "#fef3c7", text: "#92400e" },
  under_review: { bg: "#fef3c7", text: "#92400e" },
  reopened: { bg: "#fef3c7", text: "#92400e" },
  assigned: { bg: "#dbeafe", text: "#1e40af" },
  accepted: { bg: "#dbeafe", text: "#1e40af" },
  in_progress: { bg: "#dbeafe", text: "#1e40af" },
  waiting_for_materials: { bg: "#ede9fe", text: "#5b21b6" },
  repair_completed: { bg: "#d1fae5", text: "#065f46" },
  under_verification: { bg: "#d1fae5", text: "#065f46" },
  closed: { bg: C.GREEN_LIGHT, text: C.GREEN_DARK },
  rejected: { bg: "#fee2e2", text: "#991b1b" },
  duplicate: { bg: "#fee2e2", text: "#991b1b" },
  cancelled: { bg: "#f3f4f6", text: "#374151" },
};

// Accent border colour on card left edge
const ACCENT_COLOR: Record<"active" | "completed" | "rejected" | "unknown", string> = {
  active: C.AMBER,
  completed: C.GREEN,
  rejected: C.RED,
  unknown: C.BORDER,
};

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────
function toTitleCase(str: string): string {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ─────────────────────────────────────────
// Shimmer skeleton
// ─────────────────────────────────────────
function ShimmerBlock({
  width,
  height,
  borderRadius = 6,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.9],
  });

  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: "#d8e8e3",
        opacity,
      }}
    />
  );
}

function SkeletonCard() {
  return (
    <View style={styles.card}>
      {/* accent bar */}
      <View style={[styles.cardAccent, { backgroundColor: C.BORDER }]} />
      <View style={styles.cardInner}>
        {/* top row */}
        <View style={styles.cardTopRow}>
          <ShimmerBlock width={90} height={13} />
          <ShimmerBlock width={80} height={22} borderRadius={100} />
        </View>
        {/* title */}
        <ShimmerBlock width="75%" height={16} />
        <ShimmerBlock width="50%" height={13} />
        {/* bottom row */}
        <View style={styles.cardBottomRow}>
          <ShimmerBlock width={70} height={22} borderRadius={100} />
          <ShimmerBlock width={80} height={13} />
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────
function StatusBadge({ status }: { status: ReportStatus }) {
  const colors = STATUS_BADGE[status] ?? { bg: "#e5e7eb", text: "#374151" };
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>
        {toTitleCase(status)}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────
// Category pill with dot icon
// ─────────────────────────────────────────
function CategoryPill({ label }: { label: string }) {
  return (
    <View style={styles.categoryPill}>
      {/* dot icon */}
      <View style={styles.categoryDot} />
      <Text style={styles.categoryPillText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────
// Report card
// ─────────────────────────────────────────
function ReportCard({ item }: { item: MaintenanceReport }) {
  const scale = useRef(new Animated.Value(1)).current;
  const group = getStatusGroup(item.status);
  const accentColor = ACCENT_COLOR[group];

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  return (
    <Pressable
      onPress={() => router.push(`/report/${item.id}`)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        {/* left accent border */}
        <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />
        <View style={styles.cardInner}>
          {/* top row: ticket + badge */}
          <View style={styles.cardTopRow}>
            <Text style={styles.ticketNumber}>{item.ticketNumber}</Text>
            <StatusBadge status={item.status} />
          </View>
          {/* title */}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {/* bottom row: category + date */}
          <View style={styles.cardBottomRow}>
            {item.categoryName ? (
              <CategoryPill label={item.categoryName} />
            ) : (
              <View />
            )}
            <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────
function EmptyState({ filter }: { filter: FilterType }) {
  const titles: Record<FilterType, string> = {
    all: "No reports yet",
    active: "No active reports",
    completed: "No completed reports",
    rejected: "No rejected reports",
  };

  const bodies: Record<FilterType, string> = {
    all: "Submit a maintenance issue and track its progress here.",
    active: "You have no reports in progress at the moment.",
    completed: "None of your reports have been completed yet.",
    rejected: "None of your reports have been rejected.",
  };

  return (
    <View style={styles.emptyContainer}>
      {/* Icon: clipboard shape */}
      <View style={styles.emptyIconWrap}>
        <View style={styles.emptyClipboard}>
          <View style={styles.emptyClipboardClip} />
          <View style={styles.emptyLine} />
          <View style={[styles.emptyLine, { width: 36 }]} />
          <View style={[styles.emptyLine, { width: 44 }]} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>{titles[filter]}</Text>
      <Text style={styles.emptyBody}>{bodies[filter]}</Text>
      {filter === "all" && (
        <Pressable
          style={styles.ctaBtn}
          onPress={() => router.push("/report-wizard")}
        >
          <Text style={styles.ctaBtnText}>Report an Issue</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─────────────────────────────────────────
// FAB
// ─────────────────────────────────────────
function FAB() {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View style={[styles.fab, { transform: [{ scale }] }]}>
      <Pressable
        style={styles.fabInner}
        onPress={() => router.push("/report-wizard")}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityLabel="Create new report"
        accessibilityRole="button"
      >
        {/* Plus sign: horizontal bar */}
        <View style={styles.plusH} />
        {/* Plus sign: vertical bar */}
        <View style={styles.plusV} />
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────
// Count badge
// ─────────────────────────────────────────
function CountBadge({ count }: { count: number }) {
  return (
    <View style={styles.countBadge}>
      <Text style={styles.countBadgeText}>
        {count} {count === 1 ? "report" : "reports"}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────
// Filter chips
// ─────────────────────────────────────────
function FilterChips({
  active,
  onChange,
}: {
  active: FilterType;
  onChange: (f: FilterType) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipsRow}
    >
      {FILTERS.map((f) => (
        <Pressable
          key={f.key}
          style={[
            styles.chip,
            active === f.key ? styles.chipActive : styles.chipInactive,
          ]}
          onPress={() => onChange(f.key)}
        >
          <Text
            style={[
              styles.chipText,
              active === f.key
                ? styles.chipTextActive
                : styles.chipTextInactive,
            ]}
          >
            {f.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

// ─────────────────────────────────────────
// Error state
// ─────────────────────────────────────────
function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.errorContainer}>
      {/* X icon from two rotated bars */}
      <View style={styles.errorIconWrap}>
        <View style={[styles.xBar, { transform: [{ rotate: "45deg" }] }]} />
        <View
          style={[
            styles.xBar,
            { transform: [{ rotate: "-45deg" }], position: "absolute" },
          ]}
        />
      </View>
      <Text style={styles.errorTitle}>Failed to load reports</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <Pressable style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryBtnText}>Try again</Text>
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────
// Screen
// ─────────────────────────────────────────
export default function ReportsScreen() {
  const { token } = useAuth();
  const [filter, setFilter] = useState<FilterType>("all");
  const [refreshTick, setRefreshTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, error, refetch } = useApi<MaintenanceReport[]>(
    "/v1/reports",
    { skip: !token },
  );

  // Re-run fetch when refreshTick changes (pull-to-refresh)
  useEffect(() => {
    if (refreshTick > 0) {
      refetch();
    }
  }, [refreshTick, refetch]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshTick((t) => t + 1);
    // Clear the refreshing spinner after a short delay once data arrives
    // (useApi manages its own loading state; we just mimic the gesture)
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const reports = data ?? [];
  const filtered = filterReports(reports, filter);

  // ── not authenticated ──────────────────
  if (!token) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.loginPrompt}>
          <Text style={styles.loginTitle}>My Reports</Text>
          <Text style={styles.loginBody}>Sign in to view your reports.</Text>
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

  // ── main layout ───────────────────────
  return (
    <SafeAreaView style={styles.page}>
      {/* ── sticky header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>My Reports</Text>
          {!loading && <CountBadge count={reports.length} />}
        </View>
        <FilterChips active={filter} onChange={setFilter} />
      </View>

      {/* ── content ── */}
      {loading ? (
        // Skeleton loading state
        <FlatList
          data={[1, 2, 3, 4]}
          keyExtractor={(item) => String(item)}
          contentContainerStyle={styles.listContent}
          renderItem={() => <SkeletonCard />}
          scrollEnabled={false}
        />
      ) : error ? (
        // Error state
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        // Report list
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            filtered.length === 0
              ? styles.listContentEmpty
              : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={C.GREEN}
              colors={[C.GREEN]}
            />
          }
          ListEmptyComponent={<EmptyState filter={filter} />}
          renderItem={({ item }) => <ReportCard item={item} />}
        />
      )}

      {/* ── FAB ── */}
      <FAB />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────
// Styles
// ─────────────────────────────────────────
const styles = StyleSheet.create({
  // ── page ──
  page: {
    flex: 1,
    backgroundColor: C.BG,
  },

  // ── header ──
  header: {
    backgroundColor: C.SURFACE,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.BORDER,
    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerTitle: {
    color: C.TEXT,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  // ── count badge ──
  countBadge: {
    backgroundColor: C.GREEN_LIGHT,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countBadgeText: {
    color: C.GREEN,
    fontSize: 12,
    fontWeight: "700",
  },

  // ── filter chips ──
  chipsRow: {
    paddingHorizontal: 20,
    gap: 8,
    flexDirection: "row",
  },
  chip: {
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: C.GREEN,
  },
  chipInactive: {
    backgroundColor: C.SURFACE,
    borderWidth: 1,
    borderColor: C.BORDER,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: C.SURFACE,
  },
  chipTextInactive: {
    color: C.MUTED,
  },

  // ── list ──
  listContent: {
    padding: 16,
    paddingBottom: 96, // space for FAB
    gap: 10,
  },
  listContentEmpty: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 96,
  },

  // ── card ──
  card: {
    backgroundColor: C.SURFACE,
    borderRadius: 16,
    flexDirection: "row",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  cardAccent: {
    width: 4,
  },
  cardInner: {
    flex: 1,
    padding: 14,
    gap: 7,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ticketNumber: {
    color: C.GREEN,
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cardTitle: {
    color: C.TEXT,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  cardDate: {
    color: C.MUTED,
    fontSize: 12,
  },

  // ── status badge ──
  badge: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // ── category pill ──
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.GREEN_LIGHT,
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 3,
    maxWidth: 160,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.GREEN,
  },
  categoryPillText: {
    color: C.GREEN_DARK,
    fontSize: 11,
    fontWeight: "600",
  },

  // ── empty state ──
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 48,
    gap: 12,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyClipboard: {
    width: 40,
    height: 48,
    backgroundColor: C.SURFACE,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.GREEN,
    alignItems: "center",
    paddingTop: 14,
    gap: 5,
  },
  emptyClipboardClip: {
    position: "absolute",
    top: -7,
    width: 18,
    height: 10,
    backgroundColor: C.GREEN,
    borderRadius: 4,
  },
  emptyLine: {
    width: 22,
    height: 3,
    backgroundColor: C.BORDER,
    borderRadius: 2,
  },
  emptyTitle: {
    color: C.TEXT,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyBody: {
    color: C.MUTED,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  ctaBtn: {
    backgroundColor: C.GREEN,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 4,
    shadowColor: C.GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaBtnText: {
    color: C.SURFACE,
    fontSize: 15,
    fontWeight: "700",
  },

  // ── error state ──
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 10,
  },
  errorIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  xBar: {
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.RED,
  },
  errorTitle: {
    color: C.TEXT,
    fontSize: 17,
    fontWeight: "700",
  },
  errorMessage: {
    color: C.MUTED,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.GREEN,
    paddingHorizontal: 28,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: C.GREEN,
    fontWeight: "700",
    fontSize: 14,
  },

  // ── FAB ──
  fab: {
    position: "absolute",
    bottom: 28,
    right: 24,
    zIndex: 10,
    shadowColor: C.GREEN_DARK,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  fabInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  plusH: {
    position: "absolute",
    width: 22,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.SURFACE,
  },
  plusV: {
    position: "absolute",
    width: 3,
    height: 22,
    borderRadius: 2,
    backgroundColor: C.SURFACE,
  },

  // ── login prompt ──
  loginPrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 14,
  },
  loginTitle: {
    color: C.TEXT,
    fontSize: 24,
    fontWeight: "800",
  },
  loginBody: {
    color: C.MUTED,
    fontSize: 15,
    textAlign: "center",
  },
  loginBtn: {
    backgroundColor: C.GREEN,
    borderRadius: 12,
    paddingHorizontal: 36,
    paddingVertical: 13,
    marginTop: 4,
  },
  loginBtnText: {
    color: C.SURFACE,
    fontWeight: "700",
    fontSize: 15,
  },
});
