import { LinearGradient } from "../../components/LinearGradient";
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
import type { MaintenanceReport, PaginatedList } from "../../src/types/contracts";
import { useApi } from "../../hooks/useApi";
import { useAuth } from "../../context/auth";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const APP_VERSION = "0.1.0";

const C = {
  BG: "#f5f8f6",
  SURFACE: "#fff",
  GREEN: "#0b6b57",
  GREEN_DARK: "#084f41",
  GREEN_LIGHT: "#e8f5f0",
  TEXT: "#0f1f1b",
  MUTED: "#52615b",
  BORDER: "#d0ddd8",
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface NotificationPreferences {
  push: boolean;
  email: boolean;
  sms: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

const ACTIVE_STATUSES = new Set([
  "submitted",
  "under_review",
  "assigned",
  "accepted",
  "in_progress",
  "waiting_for_materials",
  "reopened",
]);

const RESOLVED_STATUSES = new Set([
  "repair_completed",
  "under_verification",
  "closed",
]);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Avatar circle with initials, white bg, green text */
function Avatar({ name }: { name: string }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{getInitials(name)}</Text>
    </View>
  );
}

/** Role pill badge, colored by role */
function RoleBadge({ role }: { role: string }) {
  type RoleStyle = { bg: string; text: string };
  const map: Record<string, RoleStyle> = {
    student: { bg: "#d4edda", text: "#155724" },
    technician: { bg: "#cce5ff", text: "#004085" },
    supervisor: { bg: "#fff3cd", text: "#856404" },
    administrator: { bg: "#f8d7da", text: "#721c24" },
  };
  const c: RoleStyle = map[role] ?? { bg: "#e9ecef", text: "#495057" };
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.pillText, { color: c.text }]}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Text>
    </View>
  );
}

/** Student ID monospace pill */
function StudentIdBadge({ id }: { id: string }) {
  return (
    <View style={[styles.pill, styles.pillMono]}>
      <Text style={[styles.pillText, styles.pillMonoText]}>{id}</Text>
    </View>
  );
}

/** Single info row: label left, value right */
function InfoRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/** A single stat card (Total / Active / Resolved) */
function StatCard({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** Chevron drawn from two View rectangles rotated at 45 deg */
function Chevron() {
  return (
    <View style={styles.chevronWrap}>
      <View style={styles.chevronTop} />
      <View style={styles.chevronBottom} />
    </View>
  );
}

/** Icon circle for settings rows */
function IconCircle({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.iconCircle, { backgroundColor: color }]}>
      {children}
    </View>
  );
}

/** Notification preference toggle row */
function PrefRow({
  icon,
  label,
  description,
  value,
  onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.prefRow}>
      {icon}
      <View style={styles.prefTextGroup}>
        <Text style={styles.prefLabel}>{label}</Text>
        <Text style={styles.prefDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: "#c5d4c9", true: C.GREEN }}
        thumbColor={C.SURFACE}
      />
    </View>
  );
}

/** Settings action row */
function SettingsRow({
  iconColor,
  iconContent,
  label,
  onPress,
  last,
}: {
  iconColor: string;
  iconContent: React.ReactNode;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.settingsRow,
        last && styles.settingsRowLast,
        pressed && styles.settingsRowPressed,
      ]}
      onPress={onPress}
    >
      <IconCircle color={iconColor}>{iconContent}</IconCircle>
      <Text style={styles.settingsLabel}>{label}</Text>
      <Chevron />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Icon drawables (View-based, no emoji, no images)
// ---------------------------------------------------------------------------

/** Bell icon: rectangle body + small arc (two stacked views) */
function BellIcon() {
  return (
    <View style={iconStyles.bellWrap}>
      <View style={iconStyles.bellBody} />
      <View style={iconStyles.bellBase} />
    </View>
  );
}

/** Envelope icon: thin rectangle with a diagonal line hinted via border */
function EnvelopeIcon() {
  return (
    <View style={iconStyles.envelopeOuter}>
      <View style={iconStyles.envelopeFlap} />
    </View>
  );
}

/** SMS / chat bubble icon */
function ChatIcon() {
  return (
    <View style={iconStyles.chatBubble}>
      <View style={iconStyles.chatTail} />
    </View>
  );
}

/** Question mark for Help */
function QuestionMark() {
  return <Text style={iconStyles.iconText}>?</Text>;
}

/** Shield / lock for Privacy */
function ShieldIcon() {
  return (
    <View style={iconStyles.shieldOuter}>
      <View style={iconStyles.shieldInner} />
    </View>
  );
}

/** Info "i" for About */
function InfoIcon() {
  return <Text style={iconStyles.iconText}>i</Text>;
}

const iconStyles = StyleSheet.create({
  bellWrap: {
    width: 16,
    height: 18,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bellBody: {
    width: 12,
    height: 11,
    borderRadius: 6,
    backgroundColor: C.SURFACE,
    marginBottom: 1,
  },
  bellBase: {
    width: 6,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.SURFACE,
  },
  envelopeOuter: {
    width: 16,
    height: 12,
    borderWidth: 1.5,
    borderColor: C.SURFACE,
    borderRadius: 2,
    overflow: "hidden",
    alignItems: "center",
  },
  envelopeFlap: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: C.SURFACE,
    marginTop: -1,
  },
  chatBubble: {
    width: 14,
    height: 12,
    backgroundColor: C.SURFACE,
    borderRadius: 4,
  },
  chatTail: {
    position: "absolute",
    bottom: -3,
    left: 3,
    width: 5,
    height: 5,
    backgroundColor: C.SURFACE,
    borderBottomRightRadius: 4,
  },
  shieldOuter: {
    width: 14,
    height: 16,
    backgroundColor: C.SURFACE,
    borderRadius: 3,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  shieldInner: {
    width: 6,
    height: 7,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 2,
  },
  iconText: {
    color: C.SURFACE,
    fontWeight: "800",
    fontSize: 13,
  },
});

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function ProfileScreen() {
  const { user, token, logout } = useAuth();

  // ── Reports stats ──────────────────────────────────────────
  const { data: reportsPage } = useApi<PaginatedList<MaintenanceReport>>(
    "/v1/reports",
    { skip: !token },
  );
  const reports = reportsPage?.items ?? [];
  const totalReports = reports?.length ?? 0;
  const activeReports = reports?.filter((r) => ACTIVE_STATUSES.has(r.status)).length ?? 0;
  const resolvedReports = reports?.filter((r) => RESOLVED_STATUSES.has(r.status)).length ?? 0;

  // ── Notification preferences ───────────────────────────────
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    push: true,
    email: true,
    sms: false,
  });
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPreferences = useCallback(async () => {
    if (!token) return;
    setLoadingPrefs(true);
    try {
      const res = await fetch(`${API_URL}/v1/me/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const data = (json.data ?? json) as Partial<NotificationPreferences>;
        setPrefs({
          push: data.push ?? true,
          email: data.email ?? true,
          sms: data.sms ?? false,
        });
      }
    } catch {
      // Network error — keep defaults
    } finally {
      setLoadingPrefs(false);
    }
  }, [token]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  function savePreferences(updated: NotificationPreferences) {
    if (!token) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setSavedFeedback(false);

    saveTimerRef.current = setTimeout(async () => {
      try {
        await fetch(`${API_URL}/v1/me/notifications`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updated),
        });
        setSavedFeedback(true);
        feedbackTimerRef.current = setTimeout(() => setSavedFeedback(false), 2500);
      } catch {
        // Silent failure
      }
    }, 1500);
  }

  function handleToggle(key: keyof NotificationPreferences, value: boolean) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    savePreferences(updated);
  }

  // ── Sign out ───────────────────────────────────────────────
  function handleLogout() {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of CUT SmartFix?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/auth/login");
          },
        },
      ],
    );
  }

  // ── Unauthenticated state ──────────────────────────────────
  if (!user) {
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.centerState}>
          <View style={styles.centerStateAvatar}>
            <Text style={styles.centerStateAvatarText}>?</Text>
          </View>
          <Text style={styles.centerStateTitle}>Not signed in</Text>
          <Text style={styles.centerStateSub}>
            Sign in to view your profile and manage your account.
          </Text>
          <Pressable
            style={styles.loginBtn}
            onPress={() => router.replace("/auth/login")}
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO ───────────────────────────────────────────── */}
        <View style={styles.heroOuter}>
          <LinearGradient
            colors={[C.GREEN, C.GREEN_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          />
          {/* Avatar overlapping bottom of banner */}
          <View style={styles.heroContent}>
            <View style={styles.avatarWrap}>
              <Avatar name={user.fullName} />
            </View>
            <Text style={styles.heroName}>{user.fullName}</Text>
            <Text style={styles.heroEmail}>{user.email}</Text>
            <View style={styles.heroBadgeRow}>
              <RoleBadge role={user.role} />
              {user.studentId ? (
                <StudentIdBadge id={user.studentId} />
              ) : null}
            </View>
          </View>
        </View>

        {/* ── STATS ROW ──────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatCard value={totalReports} label="Total Reports" />
          <View style={styles.statDivider} />
          <StatCard value={activeReports} label="Active" />
          <View style={styles.statDivider} />
          <StatCard value={resolvedReports} label="Resolved" />
        </View>

        {/* ── ACCOUNT DETAILS CARD ───────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Details</Text>
          <InfoRow label="Full Name" value={user.fullName} />
          <InfoRow label="Email" value={user.email} />
          {user.studentId ? (
            <InfoRow label="Student ID" value={user.studentId} />
          ) : null}
          <InfoRow
            label="Department"
            value={user.departmentName ?? "Not assigned"}
            last
          />
        </View>

        {/* ── NOTIFICATION PREFERENCES CARD ─────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Notification Preferences</Text>
            {savedFeedback ? (
              <Text style={styles.savedBadge}>Saved</Text>
            ) : null}
          </View>

          {loadingPrefs ? (
            <Text style={styles.loadingText}>Loading preferences...</Text>
          ) : (
            <>
              <PrefRow
                icon={
                  <IconCircle color={C.GREEN}>
                    <BellIcon />
                  </IconCircle>
                }
                label="Push Notifications"
                description="Receive alerts directly on your device"
                value={prefs.push}
                onToggle={(v) => handleToggle("push", v)}
              />
              <View style={styles.prefDivider} />
              <PrefRow
                icon={
                  <IconCircle color="#3b7dc8">
                    <EnvelopeIcon />
                  </IconCircle>
                }
                label="Email Notifications"
                description="Updates sent to your email address"
                value={prefs.email}
                onToggle={(v) => handleToggle("email", v)}
              />
              <View style={styles.prefDivider} />
              <PrefRow
                icon={
                  <IconCircle color="#7b5ea7">
                    <ChatIcon />
                  </IconCircle>
                }
                label="SMS Notifications"
                description="Text messages for critical updates"
                value={prefs.sms}
                onToggle={(v) => handleToggle("sms", v)}
              />
            </>
          )}
        </View>

        {/* ── SETTINGS CARD ──────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Settings</Text>
          <SettingsRow
            iconColor="#3b7dc8"
            iconContent={<QuestionMark />}
            label="Help & Support"
            onPress={() =>
              Alert.alert(
                "Help & Support",
                "For assistance, contact the CUT Facilities office or email facilities@cut.ac.zw.",
                [{ text: "OK" }],
              )
            }
          />
          <View style={styles.settingsDivider} />
          <SettingsRow
            iconColor="#52615b"
            iconContent={<ShieldIcon />}
            label="Privacy Policy"
            onPress={() =>
              Alert.alert(
                "Privacy Policy",
                "Your data is managed in accordance with the CUT data protection policy. Reports and personal details are only shared with authorised maintenance staff.",
                [{ text: "OK" }],
              )
            }
          />
          <View style={styles.settingsDivider} />
          <SettingsRow
            iconColor={C.GREEN}
            iconContent={<InfoIcon />}
            label="About CUT SmartFix"
            last
            onPress={() =>
              Alert.alert(
                "About CUT SmartFix",
                `CUT SmartFix v${APP_VERSION}\n\nCampus maintenance and facilities management for Chinhoyi University of Technology.\n\n© ${new Date().getFullYear()} Chinhoyi University of Technology`,
                [{ text: "OK" }],
              )
            }
          />
        </View>

        {/* ── SIGN OUT ───────────────────────────────────────── */}
        <Pressable
          style={({ pressed }) => [
            styles.signOutBtn,
            pressed && styles.signOutBtnPressed,
          ]}
          onPress={handleLogout}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        {/* ── VERSION FOOTER ─────────────────────────────────── */}
        <Text style={styles.version}>
          CUT SmartFix v{APP_VERSION} · Chinhoyi University of Technology
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  // ── Layout ──────────────────────────────────────────────────
  page: {
    flex: 1,
    backgroundColor: C.BG,
  },
  scrollContent: {
    paddingBottom: 52,
  },

  // ── Hero ────────────────────────────────────────────────────
  heroOuter: {
    marginBottom: 12,
  },
  heroBanner: {
    height: 160,
    width: "100%",
  },
  heroContent: {
    alignItems: "center",
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: C.BG,
  },
  avatarWrap: {
    marginTop: -36, // overlap banner
    marginBottom: 10,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.SURFACE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: C.SURFACE,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: {
    color: C.GREEN,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 1,
  },
  heroName: {
    color: C.TEXT,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 3,
  },
  heroEmail: {
    color: C.MUTED,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  heroBadgeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },

  // ── Pills ────────────────────────────────────────────────────
  pill: {
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  pillMono: {
    backgroundColor: C.GREEN_LIGHT,
  },
  pillMonoText: {
    color: C.GREEN,
    fontFamily: "monospace" as const,
    letterSpacing: 0.5,
  },

  // ── Stats row ───────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    backgroundColor: C.SURFACE,
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  statDivider: {
    width: 1,
    backgroundColor: C.BORDER,
    marginVertical: 4,
  },
  statValue: {
    color: C.GREEN,
    fontSize: 26,
    fontWeight: "800",
  },
  statLabel: {
    color: C.MUTED,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },

  // ── Cards ────────────────────────────────────────────────────
  card: {
    backgroundColor: C.SURFACE,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    color: C.TEXT,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  savedBadge: {
    color: C.GREEN,
    fontSize: 12,
    fontWeight: "700",
    backgroundColor: C.GREEN_LIGHT,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  loadingText: {
    color: C.MUTED,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 16,
    paddingBottom: 20,
  },

  // ── Info rows ────────────────────────────────────────────────
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.BORDER,
  },
  infoRowLast: {
    borderBottomWidth: 0,
    marginBottom: 12,
  },
  infoLabel: {
    color: C.MUTED,
    fontSize: 14,
  },
  infoValue: {
    color: C.TEXT,
    fontSize: 14,
    fontWeight: "600",
    maxWidth: "58%",
    textAlign: "right",
  },

  // ── Notification preference rows ─────────────────────────────
  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  prefDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.BORDER,
  },
  prefTextGroup: {
    flex: 1,
    gap: 2,
  },
  prefLabel: {
    color: C.TEXT,
    fontSize: 14,
    fontWeight: "600",
  },
  prefDesc: {
    color: C.MUTED,
    fontSize: 12,
  },

  // ── Icon circle ──────────────────────────────────────────────
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Settings rows ────────────────────────────────────────────
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    gap: 12,
  },
  settingsRowLast: {
    marginBottom: 12,
  },
  settingsRowPressed: {
    opacity: 0.6,
  },
  settingsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.BORDER,
  },
  settingsLabel: {
    flex: 1,
    color: C.TEXT,
    fontSize: 14,
    fontWeight: "500",
  },

  // ── Chevron ──────────────────────────────────────────────────
  chevronWrap: {
    width: 10,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  chevronTop: {
    position: "absolute",
    top: 2,
    right: 1,
    width: 8,
    height: 1.5,
    backgroundColor: C.MUTED,
    borderRadius: 1,
    transform: [{ rotate: "45deg" }],
  },
  chevronBottom: {
    position: "absolute",
    bottom: 2,
    right: 1,
    width: 8,
    height: 1.5,
    backgroundColor: C.MUTED,
    borderRadius: 1,
    transform: [{ rotate: "-45deg" }],
  },

  // ── Sign out ─────────────────────────────────────────────────
  signOutBtn: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#dc3545",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  signOutBtnPressed: {
    backgroundColor: "#fff5f5",
  },
  signOutText: {
    color: "#dc3545",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // ── Version footer ───────────────────────────────────────────
  version: {
    color: C.MUTED,
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },

  // ── Unauthenticated state ─────────────────────────────────────
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 36,
    gap: 12,
  },
  centerStateAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.GREEN_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  centerStateAvatarText: {
    color: C.GREEN,
    fontSize: 32,
    fontWeight: "800",
  },
  centerStateTitle: {
    color: C.TEXT,
    fontSize: 20,
    fontWeight: "700",
  },
  centerStateSub: {
    color: C.MUTED,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  loginBtn: {
    marginTop: 8,
    backgroundColor: C.GREEN,
    borderRadius: 10,
    paddingHorizontal: 36,
    paddingVertical: 13,
  },
  loginBtnText: {
    color: C.SURFACE,
    fontWeight: "700",
    fontSize: 15,
  },
});
