import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../context/auth";
import { useApi } from "../../hooks/useApi";
import type {
  MaintenanceReport,
  PaginatedList,
  ReportStatus,
} from "../../src/types/contracts";

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────
const BG          = "#f5f8f6";
const SURFACE     = "#ffffff";
const GREEN       = "#0b6b57";
const GREEN_DARK  = "#084f41";
const GREEN_LIGHT = "#e8f5f0";
const TEXT        = "#0f1f1b";
const MUTED       = "#52615b";
const BORDER      = "#d0ddd8";
const AMBER       = "#d97706";
const BLUE        = "#2563eb";
const RED         = "#dc2626";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function greet(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${name}`;
  if (h < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

function formatDate(d: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
}

type StatusGroup = "open" | "active" | "done" | "rejected";

function getStatusGroup(status: ReportStatus): StatusGroup {
  if (
    status === "submitted" ||
    status === "under_review" ||
    status === "reopened"
  )
    return "open";
  if (
    status === "assigned" ||
    status === "accepted" ||
    status === "in_progress" ||
    status === "waiting_for_materials"
  )
    return "active";
  if (
    status === "repair_completed" ||
    status === "under_verification" ||
    status === "closed"
  )
    return "done";
  return "rejected";
}

function getGroupColor(group: StatusGroup): string {
  switch (group) {
    case "open":     return AMBER;
    case "active":   return BLUE;
    case "done":     return GREEN;
    case "rejected": return RED;
  }
}

interface BadgeColors { bg: string; text: string }

const STATUS_BADGE: Record<ReportStatus, BadgeColors> = {
  submitted:              { bg: "#fffbeb", text: "#92400e" },
  under_review:           { bg: "#fffbeb", text: "#92400e" },
  reopened:               { bg: "#fff7ed", text: "#9a3412" },
  assigned:               { bg: "#eff6ff", text: "#1d4ed8" },
  accepted:               { bg: "#eff6ff", text: "#1d4ed8" },
  in_progress:            { bg: "#eff6ff", text: "#1d4ed8" },
  waiting_for_materials:  { bg: "#f0f9ff", text: "#0369a1" },
  repair_completed:       { bg: "#f0fdf4", text: "#166534" },
  under_verification:     { bg: "#f0fdf4", text: "#166534" },
  closed:                 { bg: "#f0fdf4", text: "#166534" },
  rejected:               { bg: "#fef2f2", text: "#991b1b" },
  cancelled:              { bg: "#fef2f2", text: "#991b1b" },
  duplicate:              { bg: "#fdf4ff", text: "#7e22ce" },
};

function badgeColors(status: ReportStatus): BadgeColors {
  return STATUS_BADGE[status] ?? { bg: "#f1f5f9", text: "#475569" };
}

function humanStatus(status: ReportStatus): string {
  return status.replace(/_/g, " ");
}

// ─────────────────────────────────────────────────────────────────────────────
// Shimmer / pulse animation hook
// ─────────────────────────────────────────────────────────────────────────────
function usePulse() {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return opacity;
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton block
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonBlock({
  width,
  height,
  borderRadius = 6,
  opacity,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  opacity: Animated.Value;
}) {
  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: "#dde8e3",
          opacity,
        },
      ]}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Plus icon drawn with two View rectangles
// ─────────────────────────────────────────────────────────────────────────────
function PlusIcon({ size = 18, color = "#fff" }: { size?: number; color?: string }) {
  const thick = Math.max(2, Math.round(size * 0.14));
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* horizontal bar */}
      <View
        style={{
          position: "absolute",
          width: size,
          height: thick,
          borderRadius: thick,
          backgroundColor: color,
        }}
      />
      {/* vertical bar */}
      <View
        style={{
          position: "absolute",
          width: thick,
          height: size,
          borderRadius: thick,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Envelope illustration (no emoji) for the empty state
// ─────────────────────────────────────────────────────────────────────────────
function EnvelopeIllustration() {
  return (
    <View style={il.container}>
      {/* envelope body */}
      <View style={il.body}>
        {/* flap left diagonal */}
        <View style={il.flapLeft} />
        {/* flap right diagonal */}
        <View style={il.flapRight} />
        {/* bottom-left diagonal */}
        <View style={il.bottomLeft} />
        {/* bottom-right diagonal */}
        <View style={il.bottomRight} />
      </View>
    </View>
  );
}

const ENV_W = 72;
const ENV_H = 48;
const il = StyleSheet.create({
  container: {
    width: ENV_W,
    height: ENV_H,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  body: {
    width: ENV_W,
    height: ENV_H,
    borderRadius: 6,
    backgroundColor: GREEN_LIGHT,
    borderWidth: 2,
    borderColor: GREEN,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  // V-flap lines drawn as rotated thin views
  flapLeft: {
    position: "absolute",
    top: 0,
    left: 0,
    width: ENV_W * 0.56,
    height: 2,
    backgroundColor: GREEN,
    transformOrigin: "top left",
    transform: [{ rotate: "30deg" }],
  },
  flapRight: {
    position: "absolute",
    top: 0,
    right: 0,
    width: ENV_W * 0.56,
    height: 2,
    backgroundColor: GREEN,
    transformOrigin: "top right",
    transform: [{ rotate: "-30deg" }],
  },
  bottomLeft: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: ENV_W * 0.56,
    height: 2,
    backgroundColor: GREEN,
    transformOrigin: "bottom left",
    transform: [{ rotate: "-22deg" }],
  },
  bottomRight: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: ENV_W * 0.56,
    height: 2,
    backgroundColor: GREEN,
    transformOrigin: "bottom right",
    transform: [{ rotate: "22deg" }],
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// StatCard
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  accentColor,
  loading,
  pulseOpacity,
}: {
  label: string;
  value: number;
  accentColor: string;
  loading: boolean;
  pulseOpacity: Animated.Value;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.93,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  }
  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ flex: 1 }}
      accessibilityLabel={`${label}: ${value}`}
    >
      <Animated.View
        style={[
          styles.statCard,
          { transform: [{ scale }] },
        ]}
      >
        {/* left accent strip */}
        <View style={[styles.statAccentStrip, { backgroundColor: accentColor }]} />
        <View style={styles.statContent}>
          {loading ? (
            <>
              <SkeletonBlock width={36} height={32} borderRadius={6} opacity={pulseOpacity} />
              <SkeletonBlock width={48} height={12} borderRadius={4} opacity={pulseOpacity} />
            </>
          ) : (
            <>
              <Text style={[styles.statValue, { color: accentColor }]}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick action button
// ─────────────────────────────────────────────────────────────────────────────
function QuickActionButton({ onPress }: { onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }
  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 10,
    }).start();
  }

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Report an Issue"
      style={{ marginBottom: 28 }}
    >
      <Animated.View
        style={[styles.ctaOuter, { transform: [{ scale }] }]}
      >
        {/* Gradient simulation: two overlapping views */}
        <View style={[StyleSheet.absoluteFillObject, styles.ctaGradientLeft]} />
        <View style={[StyleSheet.absoluteFillObject, styles.ctaGradientRight]} />
        <View style={styles.ctaInner}>
          <PlusIcon size={20} color="#fff" />
          <Text style={styles.ctaText}>Report an Issue</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton report card
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonReportCard({ opacity }: { opacity: Animated.Value }) {
  return (
    <View style={[styles.reportCard, { borderLeftColor: "#dde8e3" }]}>
      <View style={styles.reportCardTopRow}>
        <SkeletonBlock width={90} height={13} opacity={opacity} />
        <SkeletonBlock width={80} height={22} borderRadius={100} opacity={opacity} />
      </View>
      <SkeletonBlock width={"80%"} height={16} opacity={opacity} />
      <SkeletonBlock width={"55%"} height={12} opacity={opacity} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Report card
// ─────────────────────────────────────────────────────────────────────────────
function ReportCard({ report }: { report: MaintenanceReport }) {
  const group = getStatusGroup(report.status);
  const borderColor = getGroupColor(group);
  const badge = badgeColors(report.status);

  const createdDate = new Date(report.createdAt);
  const dateStr = formatDate(createdDate);

  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Animated.spring(scale, { toValue: 0.98, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }
  function handlePressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 25, bounciness: 8 }).start();
  }

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => router.push(`/report/${report.id}` as never)}
      accessibilityRole="button"
      accessibilityLabel={`Ticket ${report.ticketNumber}: ${report.title}`}
    >
      <Animated.View
        style={[
          styles.reportCard,
          { borderLeftColor: borderColor, transform: [{ scale }] },
        ]}
      >
        <View style={styles.reportCardTopRow}>
          <Text style={styles.ticketNumber}>{report.ticketNumber}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>
              {humanStatus(report.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.reportTitle} numberOfLines={2}>
          {report.title}
        </Text>

        <View style={styles.reportMetaRow}>
          {report.categoryName ? (
            <Text style={styles.reportCategory}>{report.categoryName}</Text>
          ) : null}
          {report.categoryName ? (
            <View style={styles.reportMetaDot} />
          ) : null}
          <Text style={styles.reportDate}>{dateStr}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <EnvelopeIllustration />
      <Text style={styles.emptyTitle}>No reports yet</Text>
      <Text style={styles.emptyBody}>
        Tap the button above to submit your first maintenance issue.
      </Text>
      <Pressable
        style={styles.emptyButton}
        onPress={() => router.push("/report-wizard" as never)}
        accessibilityRole="button"
        accessibilityLabel="Submit your first report"
      >
        <Text style={styles.emptyButtonText}>Submit a Report</Text>
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Error state
// ─────────────────────────────────────────────────────────────────────────────
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.errorContainer}>
      {/* warning icon drawn as exclamation mark in a circle */}
      <View style={styles.errorIconCircle}>
        <Text style={styles.errorIconText}>!</Text>
      </View>
      <Text style={styles.errorTitle}>Could not load reports</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <Pressable
        style={styles.retryButton}
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry loading reports"
      >
        <Text style={styles.retryButtonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────────
function HomeHeader({
  displayName,
  loading,
  pulseOpacity,
}: {
  displayName: string;
  loading: boolean;
  pulseOpacity: Animated.Value;
}) {
  const today = new Date();
  const dateStr = formatDate(today);

  return (
    <View style={styles.header}>
      {/* gradient simulation */}
      <View style={[StyleSheet.absoluteFillObject, styles.headerGradLeft]} />
      <View style={[StyleSheet.absoluteFillObject, styles.headerGradRight]} />

      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          <Text style={styles.eyebrow}>CUT SMARTFIX</Text>
          {loading ? (
            <View style={{ marginTop: 6 }}>
              <SkeletonBlock
                width={220}
                height={32}
                borderRadius={8}
                opacity={pulseOpacity}
              />
            </View>
          ) : (
            <Text style={styles.greeting}>{greet(displayName)}</Text>
          )}
        </View>
        <Text style={styles.headerDate}>{dateStr}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user, token } = useAuth();
  const pulseOpacity = usePulse();

  const {
    data: reportsRaw,
    loading,
    error,
    refetch,
  } = useApi<PaginatedList<MaintenanceReport>>("/v1/reports", { skip: !token });

  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    refetch();
    // Give the fetch a moment to start, then rely on `loading` to gate UI.
    // We resolve after a minimum delay so the spinner feels intentional.
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
    setRefreshing(false);
  }, [refetch]);

  const reports = reportsRaw?.items ?? [];

  // Computed stats
  const openCount = reports.filter((r) => getStatusGroup(r.status) === "open").length;
  const activeCount = reports.filter((r) => getStatusGroup(r.status) === "active").length;
  const doneCount = reports.filter((r) => getStatusGroup(r.status) === "done").length;
  const recent = reports.slice(0, 3);

  const displayName = user?.fullName?.split(" ")[0] ?? "Student";

  return (
    <SafeAreaView style={styles.page}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={GREEN}
            colors={[GREEN]}
          />
        }
      >
        {/* ── Header ── */}
        <HomeHeader
          displayName={displayName}
          loading={loading}
          pulseOpacity={pulseOpacity}
        />

        {/* ── Body ── */}
        <View style={styles.body}>

          {/* ── Stats row ── */}
          <View style={styles.statsRow}>
            <StatCard
              label="Open"
              value={openCount}
              accentColor={AMBER}
              loading={loading}
              pulseOpacity={pulseOpacity}
            />
            <StatCard
              label="In Progress"
              value={activeCount}
              accentColor={BLUE}
              loading={loading}
              pulseOpacity={pulseOpacity}
            />
            <StatCard
              label="Closed"
              value={doneCount}
              accentColor={GREEN}
              loading={loading}
              pulseOpacity={pulseOpacity}
            />
          </View>

          {/* ── Quick action ── */}
          <QuickActionButton
            onPress={() => router.push("/report-wizard" as never)}
          />

          {/* ── Recent activity ── */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Pressable
              onPress={() => router.push("/(tabs)/reports" as never)}
              accessibilityRole="button"
              accessibilityLabel="View all reports"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.viewAllLink}>View all  {"\u2192"}</Text>
            </Pressable>
          </View>

          {/* error */}
          {error && !loading ? (
            <ErrorState message={error} onRetry={refetch} />
          ) : loading ? (
            /* skeleton cards */
            <>
              <SkeletonReportCard opacity={pulseOpacity} />
              <SkeletonReportCard opacity={pulseOpacity} />
              <SkeletonReportCard opacity={pulseOpacity} />
            </>
          ) : !token ? (
            /* not signed in */
            <View style={styles.loginPrompt}>
              <Text style={styles.loginPromptText}>
                Sign in to see your reports.
              </Text>
              <Pressable
                style={styles.loginButton}
                onPress={() => router.push("/auth/login" as never)}
                accessibilityRole="button"
              >
                <Text style={styles.loginButtonText}>Sign In</Text>
              </Pressable>
            </View>
          ) : recent.length === 0 ? (
            <EmptyState />
          ) : (
            recent.map((r) => <ReportCard key={r.id} report={r} />)
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Page
  page: {
    flex: 1,
    backgroundColor: GREEN_DARK, // matches header so status bar area blends
  },
  scrollContent: {
    paddingBottom: 48,
    backgroundColor: BG,
  },

  // ── Header
  header: {
    overflow: "hidden",
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  headerGradLeft: {
    backgroundColor: GREEN,
    right: "40%",
  },
  headerGradRight: {
    backgroundColor: GREEN_DARK,
    left: "60%",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 4,
  },
  greeting: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 32,
  },
  headerDate: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "500",
    paddingBottom: 2,
  },

  // ── Body
  body: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  // ── Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: 16,
    overflow: "hidden",
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statAccentStrip: {
    width: 4,
  },
  statContent: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 30,
    fontWeight: "800",
    lineHeight: 34,
  },
  statLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },

  // ── Quick action
  ctaOuter: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  ctaGradientLeft: {
    backgroundColor: GREEN,
    right: "40%",
    borderRadius: 14,
  },
  ctaGradientRight: {
    backgroundColor: GREEN_DARK,
    left: "60%",
    borderRadius: 14,
  },
  ctaInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // ── Section header
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "700",
  },
  viewAllLink: {
    color: GREEN,
    fontSize: 13,
    fontWeight: "600",
  },

  // ── Report card
  reportCard: {
    backgroundColor: SURFACE,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderLeftWidth: 4,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  reportCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ticketNumber: {
    fontFamily: "monospace",
    color: GREEN,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
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
  reportTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 21,
  },
  reportMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  reportCategory: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "400",
  },
  reportMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 100,
    backgroundColor: BORDER,
    marginHorizontal: 6,
  },
  reportDate: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "400",
  },

  // ── Empty state
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: TEXT,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyBody: {
    color: MUTED,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  emptyButtonText: {
    color: GREEN,
    fontSize: 15,
    fontWeight: "700",
  },

  // ── Error state
  errorContainer: {
    alignItems: "center",
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  errorIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fef2f2",
    borderWidth: 2,
    borderColor: RED,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  errorIconText: {
    color: RED,
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 26,
  },
  errorTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  errorMessage: {
    color: MUTED,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: BORDER,
    paddingVertical: 11,
    paddingHorizontal: 28,
  },
  retryButtonText: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "600",
  },

  // ── Login prompt
  loginPrompt: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 14,
  },
  loginPromptText: {
    color: MUTED,
    fontSize: 15,
  },
  loginButton: {
    backgroundColor: GREEN,
    borderRadius: 14,
    paddingHorizontal: 36,
    paddingVertical: 13,
  },
  loginButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
});
