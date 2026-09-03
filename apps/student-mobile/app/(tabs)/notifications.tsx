import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  SectionList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/auth";
import type { Notification } from "../../src/types/contracts";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------
const C = {
  BG: "#f5f8f6",
  SURFACE: "#fff",
  SURFACE_READ: "#fafcfb",
  GREEN: "#0b6b57",
  GREEN_DARK: "#084f41",
  GREEN_LIGHT: "#e8f5f0",
  TEXT: "#0f1f1b",
  MUTED: "#52615b",
  BORDER: "#d0ddd8",
  BLUE: "#2563eb",
  AMBER: "#d97706",
  RED: "#dc2626",
  GRAY: "#9ca3af",
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function relTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.round(diff / 60000);
    if (m < 1) return "Just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(iso).toLocaleDateString("en-ZW", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

function dayBucket(iso: string): "Today" | "Yesterday" | "Earlier" {
  const today = new Date();
  const d = new Date(iso);
  if (today.toDateString() === d.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (yesterday.toDateString() === d.toDateString()) return "Yesterday";
  return "Earlier";
}

function groupByDay(
  list: Notification[],
): { title: string; data: Notification[] }[] {
  const map: Record<string, Notification[]> = {};
  for (const n of list) {
    const bucket = dayBucket(n.createdAt);
    if (!map[bucket]) map[bucket] = [];
    map[bucket].push(n);
  }
  return (["Today", "Yesterday", "Earlier"] as const)
    .filter((k) => map[k]?.length)
    .map((k) => ({ title: k, data: map[k] }));
}

// Resolve icon props from notification type
function iconForType(type: string): { letter: string; bg: string } {
  const t = type.toLowerCase();
  if (t.includes("status") || t.includes("update"))
    return { letter: "S", bg: C.BLUE };
  if (t.includes("assign")) return { letter: "A", bg: C.GREEN };
  if (t.includes("system") || t.includes("info"))
    return { letter: "i", bg: C.GRAY };
  // Fallback: use first letter of type, gray bg
  return { letter: type.charAt(0).toUpperCase() || "N", bg: C.GRAY };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Colored circle icon drawn purely with Views + Text — no emoji */
function TypeIcon({ type }: { type: string }) {
  const { letter, bg } = iconForType(type);
  return (
    <View style={[styles.typeIcon, { backgroundColor: bg }]}>
      <Text style={styles.typeIconLetter}>{letter}</Text>
    </View>
  );
}

/** Bell drawn with Views for the empty state */
function BellIllustration() {
  return (
    <View style={styles.bellWrap} accessibilityLabel="Bell icon">
      {/* Bell dome */}
      <View style={styles.bellDome} />
      {/* Bell body */}
      <View style={styles.bellBody} />
      {/* Bell clapper */}
      <View style={styles.bellClapper} />
    </View>
  );
}

/** Skeleton placeholder row */
function SkeletonRow() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonCircle} />
      <View style={styles.skeletonLines}>
        <View style={[styles.skeletonLine, { width: "60%", marginBottom: 8 }]} />
        <View style={[styles.skeletonLine, { width: "90%" }]} />
        <View style={[styles.skeletonLine, { width: "40%", marginTop: 8 }]} />
      </View>
    </View>
  );
}

/** Ticket number pill */
function TicketPill({ number }: { number: string }) {
  return (
    <View style={styles.ticketPill}>
      <Text style={styles.ticketPillText}>{number}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function NotificationsScreen() {
  const { token } = useAuth();

  // Primary data fetch via useApi hook
  const {
    data: rawData,
    loading,
    error,
    refetch,
  } = useApi<Notification[]>("/v1/notifications");

  // Local overlay for optimistic read/dismiss mutations
  const [localOverrides, setLocalOverrides] = useState<
    Record<string, Partial<Notification> | null>
  >({});
  const [refreshing, setRefreshing] = useState(false);

  // Merge API data with local optimistic overrides
  // null override means dismissed (removed from list)
  const notifications: Notification[] = (rawData ?? [])
    .filter((n) => localOverrides[n.id] !== null)
    .map((n) =>
      localOverrides[n.id]
        ? { ...n, ...(localOverrides[n.id] as Partial<Notification>) }
        : n,
    );

  const unreadCount = notifications.filter((n) => !n.readAt).length;
  const sections = groupByDay(notifications);

  // ── Pull to refresh ──────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // Clear local overrides so we get a clean view from server
    setLocalOverrides({});
    refetch();
    // Wait a short moment so the spinner shows, then clear flag
    setTimeout(() => setRefreshing(false), 800);
  }, [refetch]);

  // ── Mark single notification read ────────────────────────────
  const markRead = useCallback(
    async (id: string) => {
      if (!token) return;
      const now = new Date().toISOString();
      // Optimistic
      setLocalOverrides((prev) => ({
        ...prev,
        [id]: { ...prev[id], readAt: now },
      }));
      try {
        await fetch(`${API_URL}/v1/notifications/${id}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Revert on failure
        setLocalOverrides((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [token],
  );

  // ── Mark all read ─────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    if (!token) return;
    const now = new Date().toISOString();
    // Optimistic: mark every known notification read
    setLocalOverrides((prev) => {
      const next = { ...prev };
      for (const n of rawData ?? []) {
        if (!n.readAt) next[n.id] = { ...(next[n.id] ?? {}), readAt: now };
      }
      return next;
    });
    try {
      await fetch(`${API_URL}/v1/notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Revert all our optimistic marks
      setLocalOverrides((prev) => {
        const next = { ...prev };
        for (const n of rawData ?? []) {
          if (!n.readAt) delete next[n.id];
        }
        return next;
      });
    }
  }, [token, rawData]);

  // ── Dismiss (delete) a notification ──────────────────────────
  const dismiss = useCallback(
    async (id: string) => {
      if (!token) return;
      // Optimistic: set to null = hidden
      setLocalOverrides((prev) => ({ ...prev, [id]: null }));
      try {
        await fetch(`${API_URL}/v1/notifications/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Revert — un-hide it
        setLocalOverrides((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [token],
  );

  // ── Long-press action sheet ───────────────────────────────────
  const handleLongPress = useCallback(
    (item: Notification) => {
      Alert.alert(
        item.title,
        "What would you like to do?",
        [
          {
            text: item.readAt ? "Already read" : "Mark as read",
            onPress: () => {
              if (!item.readAt) markRead(item.id);
            },
          },
          {
            text: "Dismiss",
            style: "destructive",
            onPress: () => dismiss(item.id),
          },
          { text: "Cancel", style: "cancel" },
        ],
        { cancelable: true },
      );
    },
    [markRead, dismiss],
  );

  // ── Tap handler ───────────────────────────────────────────────
  const handlePress = useCallback(
    (item: Notification) => {
      markRead(item.id);
      if (item.reportId) {
        router.push(`/report/${item.reportId}`);
      }
    },
    [markRead],
  );

  // ── Unauthenticated state ─────────────────────────────────────
  if (!token) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.center}>
          <Text style={styles.headerTitle}>Alerts</Text>
          <Text style={styles.promptText}>Sign in to see your alerts.</Text>
          <Pressable
            style={styles.loginBtn}
            onPress={() => router.push("/auth/login")}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
          >
            <Text style={styles.loginBtnText}>Sign In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────────
  if (loading && !rawData) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Alerts</Text>
          </View>
        </View>
        <View style={styles.skeletonWrap}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ───────────────────────────────────────────────
  if (error && !rawData) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Alerts</Text>
          </View>
        </View>
        <View style={styles.center}>
          <View style={styles.errorDot} />
          <Text style={styles.errorTitle}>Could not load alerts</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => refetch()}
            accessibilityRole="button"
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main render ───────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.page}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Alerts</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge} accessibilityLabel={`${unreadCount} unread`}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </View>
          {unreadCount > 0 && (
            <Pressable
              onPress={markAllRead}
              accessibilityRole="button"
              accessibilityLabel="Mark all as read"
              hitSlop={8}
            >
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── List ── */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          notifications.length === 0 ? styles.listEmpty : styles.list
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={C.GREEN}
            colors={[C.GREEN]}
          />
        }
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const isUnread = !item.readAt;
          return (
            <Pressable
              style={[styles.card, isUnread ? styles.cardUnread : styles.cardRead]}
              onPress={() => handlePress(item)}
              onLongPress={() => handleLongPress(item)}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              accessibilityHint={
                item.reportId ? "Opens the related report" : "Marks as read"
              }
            >
              {/* Left type icon */}
              <TypeIcon type={item.type} />

              {/* Content */}
              <View style={styles.cardContent}>
                <Text
                  style={[styles.cardTitle, isUnread && styles.cardTitleUnread]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text style={styles.cardBody} numberOfLines={2}>
                  {item.body}
                </Text>
                {/* Bottom row: ticket + time */}
                <View style={styles.cardFooter}>
                  {item.ticketNumber ? (
                    <TicketPill number={item.ticketNumber} />
                  ) : (
                    <View />
                  )}
                  <Text style={styles.cardTime}>{relTime(item.createdAt)}</Text>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <BellIllustration />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>No new notifications</Text>
            <Text style={styles.swipeHint}>
              Long-press any alert to dismiss it
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: C.BG,
  },

  // ── Header ──────────────────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    backgroundColor: C.BG,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: C.TEXT,
    letterSpacing: -0.3,
  },
  unreadBadge: {
    backgroundColor: C.GREEN,
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: "center",
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  markAllText: {
    color: C.GREEN,
    fontSize: 13,
    fontWeight: "700",
  },

  // ── List ─────────────────────────────────────────────────────
  list: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    paddingTop: 4,
  },
  listEmpty: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // ── Section header ────────────────────────────────────────────
  sectionHeader: {
    color: C.MUTED,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 8,
  },

  // ── Cards ─────────────────────────────────────────────────────
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  cardUnread: {
    backgroundColor: C.SURFACE,
    borderLeftWidth: 3,
    borderLeftColor: C.GREEN,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardRead: {
    backgroundColor: C.SURFACE_READ,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: C.MUTED,
  },
  cardTitleUnread: {
    color: C.TEXT,
    fontWeight: "700",
  },
  cardBody: {
    fontSize: 13,
    color: C.MUTED,
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  cardTime: {
    fontSize: 11,
    color: C.MUTED,
  },

  // ── Type icon ─────────────────────────────────────────────────
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  typeIconLetter: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 16,
  },

  // ── Ticket pill ───────────────────────────────────────────────
  ticketPill: {
    backgroundColor: C.GREEN_LIGHT,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ticketPillText: {
    color: C.GREEN_DARK,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "monospace" as const,
    letterSpacing: 0.4,
  },

  // ── Empty state ───────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
    paddingTop: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.TEXT,
  },
  emptySubtitle: {
    fontSize: 14,
    color: C.MUTED,
  },
  swipeHint: {
    fontSize: 12,
    color: C.BORDER,
    marginTop: 16,
    textAlign: "center",
  },

  // ── Bell illustration (Views only, no emoji) ─────────────────
  bellWrap: {
    width: 72,
    height: 84,
    alignItems: "center",
    marginBottom: 8,
  },
  bellDome: {
    width: 48,
    height: 30,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: C.BORDER,
  },
  bellBody: {
    width: 56,
    height: 28,
    borderRadius: 4,
    backgroundColor: C.BORDER,
    marginTop: 0,
  },
  bellClapper: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.MUTED,
    marginTop: 4,
  },

  // ── Skeleton ──────────────────────────────────────────────────
  skeletonWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  skeletonCard: {
    backgroundColor: C.SURFACE,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    opacity: 0.7,
  },
  skeletonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.BORDER,
    flexShrink: 0,
  },
  skeletonLines: {
    flex: 1,
    gap: 0,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: C.BORDER,
  },

  // ── Error state ───────────────────────────────────────────────
  errorDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fef2f2",
    borderWidth: 2,
    borderColor: C.RED,
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.TEXT,
  },
  errorBody: {
    fontSize: 13,
    color: C.MUTED,
    textAlign: "center",
  },
  retryBtn: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: C.GREEN,
    paddingHorizontal: 28,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryBtnText: {
    color: C.GREEN,
    fontWeight: "700",
    fontSize: 14,
  },

  // ── Misc ──────────────────────────────────────────────────────
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 32,
  },
  promptText: {
    color: C.MUTED,
    fontSize: 15,
    textAlign: "center",
  },
  loginBtn: {
    backgroundColor: C.GREEN,
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginTop: 4,
  },
  loginBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
});
