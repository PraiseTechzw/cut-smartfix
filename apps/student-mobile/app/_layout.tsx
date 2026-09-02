import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../context/auth";

// ---------------------------------------------------------------------------
// Auth guard — watches auth state and redirects accordingly.
// Runs inside AuthProvider so it can call useAuth().
// ---------------------------------------------------------------------------
function AuthGuard() {
  const { user, token, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return; // wait for session restore

    // First segment tells us which "group" we're in
    const inAuthGroup = segments[0] === "auth";

    if (!user && !token && !inAuthGroup) {
      // Not authenticated, not already on an auth screen → redirect to login
      router.replace("/auth/login");
    } else if (user && inAuthGroup) {
      // Authenticated but still on auth screen → send to dashboard
      router.replace("/(tabs)");
    }
  }, [user, token, loading, segments, router]);

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
