'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { UserProfile } from '@cut-smartfix/contracts';

const TOKEN_KEY = 'cut_token';
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

interface AuthContextValue {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // On mount: restore token from localStorage and fetch profile
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }
    setToken(stored);
    fetchProfile(stored)
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const fetchProfile = async (jwt: string): Promise<void> => {
    const res = await fetch(`${API_URL}/v1/me`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (!res.ok) throw new Error('Failed to fetch profile');
    const json = await res.json();
    setUser(json.data ?? json);
  };

  const login = useCallback(async (email: string, password: string) => {
    // 1. Authenticate with Supabase
    const authUrl = SUPABASE_URL
      ? `${SUPABASE_URL}/auth/v1/token?grant_type=password`
      : `${API_URL}/v1/auth/login`;

    let access_token: string;

    if (SUPABASE_URL) {
      const authRes = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!authRes.ok) {
        const err = await authRes.json().catch(() => ({}));
        throw new Error(
          (err as { error_description?: string }).error_description ||
            'Invalid credentials'
        );
      }

      const authData = (await authRes.json()) as { access_token: string };
      access_token = authData.access_token;
    } else {
      // Fallback: direct API login
      const authRes = await fetch(authUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!authRes.ok) {
        const err = await authRes.json().catch(() => ({}));
        throw new Error(
          (err as { error?: { message?: string } }).error?.message ||
            'Invalid credentials'
        );
      }

      const authData = (await authRes.json()) as {
        data: { access_token: string };
      };
      access_token = authData.data.access_token;
    }

    // 2. Store token
    localStorage.setItem(TOKEN_KEY, access_token);
    setToken(access_token);

    // 3. Fetch profile
    await fetchProfile(access_token);

    // 4. Navigate to dashboard
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Hook that redirects to /login if not authenticated. Returns auth context. */
export function useRequireAuth(): AuthContextValue {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!auth.isLoading && !auth.token) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [auth.isLoading, auth.token, router, pathname]);

  return auth;
}
