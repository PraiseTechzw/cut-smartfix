import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../context/auth";
import type { Notification } from "@cut-smartfix/contracts";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatRelative(iso: string): string {
  try {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diffMin = Math.round((now - then) / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.round(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return new Date(iso).toLocaleDateString("en-ZW", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

function dayBucket(iso: string): string {
  const today = new Date();
  const d = new Date(iso);
  const todayStr = today.toDateString();
  const dStr = d.toDateString();
  if (todayStr === dStr) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (yesterday.toDateString() === dStr) return "Yesterday";
  return "Earlier";
}

function groupByDay(notifications: Notification[]): {
  title: string;
  data: Notification[];
}[] {
  const map: Record<string, Notification[]> = {};
  for (const n of notifications) {
    const bucket = dayBucket(n.createdAt);
    if (!map[bucket]) map[bucket] = [];
    map[bucket].push(n);
  }
  const order = ["Today", "Yesterday", "Earlier"];
  return order
    .filter((k) => map[k] && map[k].length > 0)
    .map((k) => ({ title: k, data: map[k] }));
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function NotificationsScreen() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(
    async (isRefresh = false) => {
      if (!token) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/v1/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setNotifications(json.data ?? []);
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
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = useCallback(
    async (id: string) => {
      if (!token) return;
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
        ),
      );
      try {
        await fetch(`${API_URL}/v1/notifications/${id}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Revert on failure
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, readAt: undefined } : n)),
        );
      }
    },
    [token],
  );

  const markAllRead = useCallback(async () => {
    if (!token) return;
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: now })));
    try {
      await fetch(`${API_URL}/v1/notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      fetchNotifications();
    }
  }, [token, fetchNotifications]);

  if (!token) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.center}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.promptText}>Sign in to see notifications.</Text>
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

  const unreadCount = notifications.filter((n) => !n.readAt).length;
  const sections = groupByDay(notifications);

  return (
    <SafeAreaView style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>
            Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
          </Text>
          {unreadCount > 0 && (
            <Pressable onPress={markAllRead}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#0b6b57" size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load: {error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => fetchNotifications()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptyBody}>No notifications right now.</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              tintColor="#0b6b57"
            />
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => {
            const isUnread = !item.readAt;
            return (
              <Pressable
                style={[styles.notifCard, isUnread && styles.notifCardUnread]}
                onPress={() => markRead(item.id)}
              >
                <View style={styles.notifLeft}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: isUnread ? "#3b8adb" : "#c5d4c9" },
                    ]}
                  />
                </View>
                <View style={styles.notifContent}>
                  <View style={styles.notifRow}>
                    <Text style={styles.notifTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.notifTime}>
                      {formatRelative(item.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.notifBody} numberOfLines={2}>
                    {item.body}
                  </Text>
                  {item.ticketNumber && (
                    <Text style={styles.notifTicket}>
                      #{item.ticketNumber}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          }}
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
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: "#17231f",
    fontSize: 28,
    fontWeight: "800",
  },
  markAllText: {
    color: "#0b6b57",
    fontSize: 13,
    fontWeight: "700",
  },
  list: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  sectionHeader: {
    color: "#52615b",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 8,
  },
  notifCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  notifCardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: "#3b8adb",
  },
  notifLeft: {
    paddingTop: 4,
    width: 12,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notifContent: {
    flex: 1,
    gap: 3,
  },
  notifRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  notifTitle: {
    color: "#17231f",
    fontSize: 14,
    fontWeight: "700",
    flex: 1,
  },
  notifTime: {
    color: "#52615b",
    fontSize: 11,
    flexShrink: 0,
  },
  notifBody: {
    color: "#52615b",
    fontSize: 13,
    lineHeight: 18,
  },
  notifTicket: {
    color: "#0b6b57",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "monospace" as const,
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  promptText: { color: "#52615b", fontSize: 15, textAlign: "center" },
  loginBtn: {
    backgroundColor: "#0b6b57",
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  loginBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  errorText: {
    color: "#721c24",
    fontSize: 14,
    textAlign: "center",
  },
  retryBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#0b6b57",
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: { color: "#0b6b57", fontWeight: "700" },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: "#17231f", fontSize: 18, fontWeight: "700" },
  emptyBody: { color: "#52615b", fontSize: 14, textAlign: "center" },
});
