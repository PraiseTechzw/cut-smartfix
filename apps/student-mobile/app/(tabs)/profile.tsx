import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useAuth } from "../../context/auth";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const APP_VERSION = "0.1.0";

// ---------------------------------------------------------------------------
// Notification preferences shape
// ---------------------------------------------------------------------------
interface NotificationPreferences {
  push: boolean;
  email: boolean;
  sms: boolean;
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    student: { bg: "#d4edda", text: "#155724" },
    technician: { bg: "#cce5ff", text: "#004085" },
    supervisor: { bg: "#fff3cd", text: "#856404" },
    administrator: { bg: "#f8d7da", text: "#721c24" },
  };
  const c = colors[role] ?? { bg: "#e9ecef", text: "#495057" };
  return (
    <View style={[styles.roleBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.roleBadgeText, { color: c.text }]}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Text>
    </View>
  );
}

function InitialsAvatar({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function ProfileScreen() {
  const { user, token, logout, refreshProfile } = useAuth();

  const [prefs, setPrefs] = useState<NotificationPreferences>({
    push: true,
    email: true,
    sms: false,
  });
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Debounce timer ref — we save 1.5s after the last toggle
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Load preferences from API
  // ---------------------------------------------------------------------------
  const loadPreferences = useCallback(async () => {
    if (!token) return;
    setLoadingPrefs(true);
    try {
      const res = await fetch(`${API_URL}/v1/me/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data as Partial<NotificationPreferences> | null;
        if (data) {
          setPrefs({
            push: data.push ?? true,
            email: data.email ?? true,
            sms: data.sms ?? false,
          });
        }
      }
      // If endpoint doesn't exist yet (404), we silently keep defaults
    } catch {
      // Network error — keep defaults
    } finally {
      setLoadingPrefs(false);
    }
  }, [token]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // ---------------------------------------------------------------------------
  // Save preferences to API with debounce
  // ---------------------------------------------------------------------------
  function savePreferences(updated: NotificationPreferences) {
    if (!token) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSavingPrefs(true);
      try {
        await fetch(`${API_URL}/v1/me/notifications`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updated),
        });
      } catch {
        // Silent failure — preferences saved locally, will retry on next toggle
      } finally {
        setSavingPrefs(false);
      }
    }, 1500);
  }

  function handleToggle(key: keyof NotificationPreferences, value: boolean) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    savePreferences(updated);
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------
  function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/auth/login");
        },
      },
    ]);
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.center}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.promptText}>Sign in to view your profile.</Text>
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
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + identity */}
        <View style={styles.profileSection}>
          <InitialsAvatar name={user.fullName} />
          <Text style={styles.name}>{user.fullName}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.badgeRow}>
            <RoleBadge role={user.role} />
            {user.studentId && (
              <View style={styles.studentIdBadge}>
                <Text style={styles.studentIdText}>{user.studentId}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Info card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Account Details</Text>
          <InfoRow label="Full Name" value={user.fullName} />
          <InfoRow label="Email" value={user.email} />
          {user.studentId && (
            <InfoRow label="Student ID" value={user.studentId} />
          )}
          {user.departmentName && (
            <InfoRow label="Department" value={user.departmentName} />
          )}
        </View>

        {/* Notification preferences */}
        <View style={styles.card}>
          <View style={styles.prefHeader}>
            <Text style={styles.sectionLabel}>Notification Preferences</Text>
            {savingPrefs && (
              <Text style={styles.savingText}>Saving…</Text>
            )}
          </View>

          {loadingPrefs ? (
            <Text style={styles.loadingText}>Loading preferences…</Text>
          ) : (
            <>
              <PreferenceRow
                label="Push Notifications"
                description="Receive alerts directly on your device"
                value={prefs.push}
                onToggle={(v) => handleToggle("push", v)}
              />
              <View style={styles.divider} />
              <PreferenceRow
                label="Email Notifications"
                description="Updates sent to your email address"
                value={prefs.email}
                onToggle={(v) => handleToggle("email", v)}
              />
              <View style={styles.divider} />
              <PreferenceRow
                label="SMS Notifications"
                description="Text messages for critical updates"
                value={prefs.sms}
                onToggle={(v) => handleToggle("sms", v)}
              />
            </>
          )}
        </View>

        {/* Sign out */}
        <Pressable style={styles.signOutBtn} onPress={handleLogout}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        {/* App version */}
        <Text style={styles.version}>CUT SmartFix v{APP_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function PreferenceRow({
  label,
  description,
  value,
  onToggle,
}: {
  label: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.prefRow}>
      <View style={styles.prefTextGroup}>
        <Text style={styles.prefLabel}>{label}</Text>
        <Text style={styles.prefDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#c5d4c9", true: "#0b6b57" }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f4f7f2" },
  content: { padding: 20, paddingBottom: 48 },
  profileSection: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 6,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0b6b57",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
  },
  name: {
    color: "#17231f",
    fontSize: 22,
    fontWeight: "800",
  },
  email: {
    color: "#52615b",
    fontSize: 14,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  roleBadge: {
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  studentIdBadge: {
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#e8ede9",
  },
  studentIdText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#52615b",
    fontFamily: "monospace" as const,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionLabel: {
    color: "#17231f",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  prefHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  savingText: {
    color: "#52615b",
    fontSize: 12,
  },
  loadingText: {
    color: "#52615b",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f4f1",
  },
  infoLabel: {
    color: "#52615b",
    fontSize: 14,
  },
  infoValue: {
    color: "#17231f",
    fontSize: 14,
    fontWeight: "600",
    maxWidth: "60%",
    textAlign: "right",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f4f1",
  },
  prefRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  prefTextGroup: {
    flex: 1,
    gap: 2,
  },
  prefLabel: {
    color: "#17231f",
    fontSize: 14,
    fontWeight: "600",
  },
  prefDescription: {
    color: "#52615b",
    fontSize: 12,
  },
  signOutBtn: {
    borderWidth: 1.5,
    borderColor: "#e05252",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  signOutText: {
    color: "#e05252",
    fontSize: 15,
    fontWeight: "700",
  },
  version: {
    color: "#52615b",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  title: {
    color: "#17231f",
    fontSize: 28,
    fontWeight: "800",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
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
});
