import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/auth";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export interface UseApiOptions extends Omit<RequestInit, "headers"> {
  /** Skip the initial fetch. Useful when you want manual-only refetch. */
  skip?: boolean;
  headers?: Record<string, string>;
}

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Simple typed fetch wrapper.
 * Automatically attaches the Bearer token from AuthContext.
 * Returns { data, loading, error, refetch }.
 */
export function useApi<T>(
  path: string,
  options?: UseApiOptions,
): UseApiResult<T> {
  const { token } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!options?.skip);
  const [error, setError] = useState<string | null>(null);

  // Keep a stable counter to trigger refetches
  const [fetchTick, setFetchTick] = useState(0);

  // Track mount status to avoid state updates on unmounted components
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const { skip, headers: extraHeaders, ...restOptions } = options ?? {};

  useEffect(() => {
    if (skip) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...extraHeaders,
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    fetch(`${API_URL}${path}`, {
      ...restOptions,
      headers,
    })
      .then(async (res) => {
        if (cancelled || !mountedRef.current) return;
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try {
            const body = await res.json();
            msg = body?.error?.message ?? body?.message ?? msg;
          } catch {
            // ignore
          }
          setError(msg);
          setLoading(false);
          return;
        }
        const json = await res.json();
        // Our API wraps responses in { data, error }
        const payload = (json as { data?: T }).data !== undefined
          ? (json as { data: T }).data
          : (json as T);
        setData(payload);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled || !mountedRef.current) return;
        setError(err.message ?? "Network error");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, token, skip, fetchTick]);

  const refetch = useCallback(() => {
    setFetchTick((t) => t + 1);
  }, []);

  return { data, loading, error, refetch };
}
