import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { UserProfile } from "@cut-smartfix/contracts";

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
    // Dynamic require so bundler doesn't hard-fail when package absent
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@react-native-async-storage/async-storage");
    asyncStorageModule = mod.default ?? mod;
    return asyncStorageModule!;
  } catch {
    return memoryStorage;
  }
}

const TOKEN_KEY = "cut_smartfix_token";

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

// ---------------------------------------------------------------------------
// Push token registration
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
    // Non-fatal — push notifications degrade gracefully
  }
}

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------
export interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    studentId: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-fetch profile from API (e.g. after updating preferences) */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

// ---------------------------------------------------------------------------
// Supabase minimal REST auth helpers (no SDK needed)
// ---------------------------------------------------------------------------
async function supabaseSignIn(
  email: string,
  password: string,
): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error_description ?? json?.msg ?? "Login failed");
  }
  return json.access_token as string;
}

async function supabaseSignUp(
  email: string,
  password: string,
  fullName: string,
  studentId: string,
): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email,
      password,
      data: { full_name: fullName, student_id: studentId },
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      json?.error_description ?? json?.msg ?? "Registration failed",
    );
  }
  // After signup, sign in to get a usable token
  return supabaseSignIn(email, password);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch the profile from our API using an auth token
  const fetchProfile = useCallback(async (accessToken: string) => {
    try {
      const res = await fetch(`${API_URL}/v1/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        setUser(json.data as UserProfile);
      } else {
        // Token invalid/expired
        setUser(null);
        setToken(null);
        await clearToken();
      }
    } catch {
      // Network error — keep token so we can retry later
    }
  }, []);

  // Restore session on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadToken();
      if (!cancelled) {
        if (stored) {
          setToken(stored);
          await fetchProfile(stored);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchProfile]);

  const login = useCallback(
    async (email: string, password: string) => {
      const accessToken = await supabaseSignIn(email, password);
      await saveToken(accessToken);
      setToken(accessToken);
      await fetchProfile(accessToken);
      // Register push token — non-blocking, fires and forgets
      registerPushToken(accessToken);
    },
    [fetchProfile],
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      studentId: string,
    ) => {
      const accessToken = await supabaseSignUp(
        email,
        password,
        name,
        studentId,
      );
      await saveToken(accessToken);
      setToken(accessToken);
      await fetchProfile(accessToken);
      // Register push token — non-blocking, fires and forgets
      registerPushToken(accessToken);
    },
    [fetchProfile],
  );

  const refreshProfile = useCallback(async () => {
    if (token) await fetchProfile(token);
  }, [token, fetchProfile]);

  const logout = useCallback(async () => {
    setUser(null);
    setToken(null);
    await clearToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
