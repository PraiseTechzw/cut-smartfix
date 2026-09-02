import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../context/auth";
import { useOfflineSync } from "../hooks/useOfflineSync";

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

    const inAuthGroup   = segments[0] === "auth";
    const onVerifyScreen = segments[0] === "auth" && segments[1] === "verify";

    // ── Case 1: Awaiting email confirmation ──────────────────
    // User signed up, email is pending verification.
    // Keep them on the verify screen regardless of token state.
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
      <Slot />
    </AuthProvider>
  );
}
