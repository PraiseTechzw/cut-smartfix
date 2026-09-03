import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { UserProfile } from "../src/types/contracts";

// ---------------------------------------------------------------------------
// Storage abstraction — AsyncStorage when available, in-memory fallback
// ---------------------------------------------------------------------------
let asyncStorageModule: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
} | null = null;

const memoryStore: Record<string, string> = {};
const memoryStorage = {
  getItem: async (key: string): Promise<string | null> =>
    memoryStore[key] ?? null,
  setItem: async (key: string, value: string): Promise<void> => {
    memoryStore[key] = value;
  },
  removeItem: async (key: string): Promise<void> => {
    delete memoryStore[key];
  },
};

async function getStorage() {
  if (asyncStorageModule) return asyncStorageModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@react-native-async-storage/async-storage");
    asyncStorageModule = mod.default ?? mod;
    return asyncStorageModule!;
  } catch {
    return memoryStorage;
  }
}

const TOKEN_KEY         = "cut_smartfix_token";
const PENDING_EMAIL_KEY = "cut_smartfix_pending_email";

async function loadToken(): Promise<string | null> {
  const s = await getStorage();
  return s.getItem(TOKEN_KEY);
}
async function saveToken(token: string): Promise<void> {
  const s = await getStorage();
  return s.setItem(TOKEN_KEY, token);
}
async function clearToken(): Promise<void> {
  const s = await getStorage();
  return s.removeItem(TOKEN_KEY);
}
async function loadPendingEmail(): Promise<string | null> {
  const s = await getStorage();
  return s.getItem(PENDING_EMAIL_KEY);
}
async function savePendingEmail(email: string): Promise<void> {
  const s = await getStorage();
  return s.setItem(PENDING_EMAIL_KEY, email);
}
async function clearPendingEmail(): Promise<void> {
  const s = await getStorage();
  return s.removeItem(PENDING_EMAIL_KEY);
}

// ---------------------------------------------------------------------------
// Push token registration (non-fatal)
// ---------------------------------------------------------------------------
async function registerPushToken(apiToken: string): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Notifications = require("expo-notifications");
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken: string = tokenData.data;

    await fetch(
      `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000"}/v1/me/push-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({ token: pushToken }),
      },
    );
  } catch {
    // Non-fatal
  }
}

// ---------------------------------------------------------------------------
// Helpers — detect Supabase "email not confirmed" error
// ---------------------------------------------------------------------------
function isEmailNotConfirmedError(json: Record<string, unknown>): boolean {
  const msg = (
    (json?.error_description as string) ??
    (json?.msg as string) ??
    (json?.message as string) ??
    ""
  ).toLowerCase();
  return (
    msg.includes("email not confirmed") ||
    msg.includes("email_not_confirmed") ||
    msg.includes("confirm your email") ||
    // Supabase also returns error code
    json?.error_code === "email_not_confirmed"
  );
}

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------
export interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  /**
   * When a user has signed up / logged in but their email is not yet confirmed,
   * this holds their email so the verify screen can show it and send OTPs.
   * Persisted across app restarts.
   */
  pendingEmail: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    studentId: string,
  ) => Promise<void>;
  /**
   * Verify a 6-digit OTP sent to pendingEmail.
   * On success clears pendingEmail and logs the user in.
   */
  verifyOtp: (otp: string) => Promise<void>;
  /** Re-send the confirmation OTP to pendingEmail. */
  resendOtp: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API_URL          = process.env.EXPO_PUBLIC_API_URL          ?? "http://localhost:4000";
const SUPABASE_URL     = process.env.EXPO_PUBLIC_SUPABASE_URL     ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

// ---------------------------------------------------------------------------
// Supabase minimal REST helpers
// ---------------------------------------------------------------------------

/** Shared timeout for all auth network calls (ms). */
const AUTH_TIMEOUT_MS = 15_000;

/** Fetch wrapper that aborts after AUTH_TIMEOUT_MS. */
async function fetchWithAuthTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out. Check your internet connection.");
    }
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (
      msg.includes("network request failed") ||
      msg.includes("failed to fetch") ||
      msg.includes("network error")
    ) {
      throw new Error(
        "Cannot reach the server. Make sure you are connected to the internet.",
      );
    }
    throw err;
  }
}

async function supabaseSignIn(
  email: string,
  password: string,
): Promise<string> {
  const res = await fetchWithAuthTimeout(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password }),
    },
  );
  const json = await res.json();
  if (!res.ok) {
    if (isEmailNotConfirmedError(json)) {
      // Surface a typed error so callers can route to verify screen
      const err = new Error("Email not confirmed. Please verify your email.");
      (err as Error & { code: string }).code = "email_not_confirmed";
      throw err;
    }
    throw new Error(
      (json?.error_description as string) ??
        (json?.msg as string) ??
        "Login failed",
    );
  }
  return json.access_token as string;
}

async function supabaseSignUp(
  email: string,
  password: string,
  fullName: string,
  studentId: string,
): Promise<{ access_token: string | null; needsConfirmation: boolean }> {
  const res = await fetchWithAuthTimeout(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({
      email,
      password,
      data: { full_name: fullName, student_id: studentId },
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      (json?.error_description as string) ??
        (json?.msg as string) ??
        "Registration failed",
    );
  }

  // If Supabase requires email confirmation it returns a user with
  // identities[] but no session / access_token.
  const needsConfirmation =
    !json?.session?.access_token &&
    (json?.user?.identities?.length > 0 || json?.user != null);

  if (needsConfirmation) {
    return { access_token: null, needsConfirmation: true };
  }

  // Email confirmations disabled → token present immediately
  const token = (json?.session?.access_token ?? json?.access_token) as string;
  return { access_token: token, needsConfirmation: false };
}

async function supabaseVerifyOtp(
  email: string,
  token: string,
): Promise<string> {
  const res = await fetchWithAuthTimeout(`${SUPABASE_URL}/auth/v1/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ type: "signup", email, token }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      (json?.error_description as string) ??
        (json?.msg as string) ??
        "Invalid or expired code",
    );
  }
  return (json?.access_token ?? json?.session?.access_token) as string;
}

async function supabaseResendOtp(email: string): Promise<void> {
  const res = await fetchWithAuthTimeout(`${SUPABASE_URL}/auth/v1/resend`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ type: "signup", email }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(
      (json?.error_description as string) ?? "Could not resend code",
    );
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]                 = useState<UserProfile | null>(null);
  const [token, setToken]               = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);

  const fetchProfile = useCallback(async (accessToken: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    try {
      const res = await fetch(`${API_URL}/v1/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json();
        setUser(json.data as UserProfile);
      } else if (res.status === 401 || res.status === 403) {
        // Token is genuinely invalid / revoked — force logout
        setUser(null);
        setToken(null);
        await clearToken();
      }
      // Any other HTTP error (5xx, etc.) — keep the stored token and try again later
    } catch {
      clearTimeout(timer);
      // Network error or timeout — keep the stored token so the user stays logged in
      // and we can retry when connectivity returns.
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [stored, pending] = await Promise.all([
        loadToken(),
        loadPendingEmail(),
      ]);
      if (cancelled) return;

      if (pending) setPendingEmail(pending);

      if (stored) {
        setToken(stored);
        await fetchProfile(stored);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [fetchProfile]);

  // ── login ──────────────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const accessToken = await supabaseSignIn(email, password);
        // Sign-in succeeded → clear any pending confirmation state
        await clearPendingEmail();
        setPendingEmail(null);
        await saveToken(accessToken);
        setToken(accessToken);
        await fetchProfile(accessToken);
        registerPushToken(accessToken);
      } catch (err) {
        const error = err as Error & { code?: string };
        if (error.code === "email_not_confirmed") {
          // Persist the email so AuthGuard keeps the user on /auth/verify
          // across re-renders and app restarts, then re-throw so the login
          // screen can navigate to the verify page.
          await savePendingEmail(email);
          setPendingEmail(email);
        }
        throw err;
      }
    },
    [fetchProfile],
  );

  // ── register ───────────────────────────────────────────────
  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      studentId: string,
    ) => {
      const result = await supabaseSignUp(email, password, name, studentId);

      if (result.needsConfirmation || !result.access_token) {
        // Store email so verify screen can use it across restarts
        await savePendingEmail(email);
        setPendingEmail(email);
        // Do NOT store a token or set user — they're not authenticated yet
        return;
      }

      // Confirmation not required — log straight in
      await clearPendingEmail();
      setPendingEmail(null);
      await saveToken(result.access_token);
      setToken(result.access_token);
      await fetchProfile(result.access_token);
      registerPushToken(result.access_token);
    },
    [fetchProfile],
  );

  // ── verifyOtp ──────────────────────────────────────────────
  const verifyOtp = useCallback(
    async (otp: string) => {
      if (!pendingEmail) throw new Error("No pending email to verify");
      const accessToken = await supabaseVerifyOtp(pendingEmail, otp);
      await clearPendingEmail();
      setPendingEmail(null);
      await saveToken(accessToken);
      setToken(accessToken);
      await fetchProfile(accessToken);
      registerPushToken(accessToken);
    },
    [pendingEmail, fetchProfile],
  );

  // ── resendOtp ──────────────────────────────────────────────
  const resendOtp = useCallback(async () => {
    if (!pendingEmail) throw new Error("No pending email");
    await supabaseResendOtp(pendingEmail);
  }, [pendingEmail]);

  // ── refreshProfile ─────────────────────────────────────────
  const refreshProfile = useCallback(async () => {
    if (token) await fetchProfile(token);
  }, [token, fetchProfile]);

  // ── logout ─────────────────────────────────────────────────
  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    setPendingEmail(null);
    await clearToken();
    await clearPendingEmail();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        pendingEmail,
        login,
        register,
        verifyOtp,
        resendOtp,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
