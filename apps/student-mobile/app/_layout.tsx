import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { AuthProvider, useAuth } from "../context/auth";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useOfflineSync } from "../hooks/useOfflineSync";

// ---------------------------------------------------------------------------
// Offline banner — slides in from top when connectivity is lost
// ---------------------------------------------------------------------------
// The banner includes the Android status-bar inset (48px), text, and padding.
// Its hidden translation must therefore exceed the full banner height.
const OFFLINE_BANNER_HIDDEN_Y = -100;

function OfflineBanner() {
  const { isOffline, networkType } = useNetworkStatus();
  const translateY = useRef(
    new Animated.Value(isOffline ? 0 : OFFLINE_BANNER_HIDDEN_Y),
  ).current;

  useEffect(() => {
    if (__DEV__) {
      console.log("[OfflineBanner] visibility changed", { isOffline, networkType });
    }

    Animated.timing(translateY, {
      toValue: isOffline ? 0 : OFFLINE_BANNER_HIDDEN_Y,
      duration: 280,
      useNativeDriver: true,
    }).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOffline, networkType, translateY]);

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <Text style={styles.bannerText}>⚠ No internet connection</Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Auth guard — watches auth state and redirects accordingly.
//
// States handled:
//   1. loading          → do nothing (wait for session restore from storage)
//   2. pendingEmail     → user registered but hasn't confirmed email yet
//                         → must be on /auth/verify
//   3. no token         → unauthenticated → must be on an auth/* screen
//   4. token + user     → authenticated → must NOT be on auth/* screens
// ---------------------------------------------------------------------------
function AuthGuard() {
  const { user, token, loading, pendingEmail } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Wire up offline sync — flushes pending reports when connectivity returns
  useOfflineSync();

  useEffect(() => {
    if (loading) return; // wait for storage restore

    const inAuthGroup    = segments[0] === "auth";
    const onVerifyScreen = segments[0] === "auth" && segments[1] === "verify";

    // ── Case 1: Awaiting email confirmation ──────────────────
    if (pendingEmail) {
      if (!onVerifyScreen) {
        router.replace("/auth/verify");
      }
      return;
    }

    // ── Case 2: Not authenticated ────────────────────────────
    if (!token) {
      if (!inAuthGroup) {
        router.replace("/auth/login");
      }
      return;
    }

    // ── Case 3: Authenticated, but lingering on auth screen ──
    if (token && user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, token, loading, pendingEmail, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGuard />
      <OfflineBanner />
      <Slot />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: "#1f2937",
    paddingTop: 48, // account for status bar
    paddingBottom: 10,
    alignItems: "center",
  },
  bannerText: {
    color: "#f9fafb",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
