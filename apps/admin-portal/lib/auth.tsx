"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { UserProfile } from "@cut-smartfix/contracts";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "auth_token";

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    loading: true,
  });

  // Fetch current user profile from /v1/me
  const fetchMe = useCallback(async (token: string): Promise<UserProfile | null> => {
    try {
      const res = await fetch(`${API_URL}/v1/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { data: UserProfile; error: unknown };
      if (json.error) return null;
      return json.data;
    } catch {
      return null;
    }
  }, []);

  // Bootstrap: restore session from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setState({ user: null, token: null, loading: false });
      return;
    }
    fetchMe(stored).then((user) => {
      if (user && (user.role === "administrator" || user.role === "supervisor")) {
        setState({ user, token: stored, loading: false });
      } else {
        localStorage.removeItem(TOKEN_KEY);
        setState({ user: null, token: null, loading: false });
      }
    });
  }, [fetchMe]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      // Authenticate via Supabase REST directly for simplicity
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      }

      const authRes = await fetch(
        `${supabaseUrl}/auth/v1/token?grant_type=password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: supabaseKey,
          },
          body: JSON.stringify({ email, password }),
        },
      );

      const authJson = (await authRes.json()) as {
        access_token?: string;
        error?: string;
        error_description?: string;
      };

      if (!authRes.ok || !authJson.access_token) {
        throw new Error(
          authJson.error_description ?? authJson.error ?? "Login failed.",
        );
      }

      const token = authJson.access_token;
      const user = await fetchMe(token);

      if (!user) throw new Error("Failed to load user profile.");
      if (user.role !== "administrator" && user.role !== "supervisor") {
        throw new Error("Access denied. This portal is for administrators and supervisors only.");
      }

      localStorage.setItem(TOKEN_KEY, token);
      setState({ user, token, loading: false });
    },
    [fetchMe],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, token: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
