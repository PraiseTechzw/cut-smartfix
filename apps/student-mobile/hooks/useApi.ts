import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/auth";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

/** Default timeout per request in milliseconds. */
const DEFAULT_TIMEOUT_MS = 15_000;

/** Number of automatic retries on transient network errors. */
const DEFAULT_RETRIES = 1;

export interface UseApiOptions extends Omit<RequestInit, "headers"> {
  /** Skip the initial fetch. Useful when you want manual-only refetch. */
  skip?: boolean;
  headers?: Record<string, string>;
  /** Milliseconds before the request is aborted. Default: 15 000. */
  timeoutMs?: number;
  /** How many times to retry on network error before giving up. Default: 1. */
  retries?: number;
}

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a human-readable message for common fetch errors. */
function friendlyError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (err.name === "AbortError" || msg.includes("aborted")) {
      return "Request timed out. Please check your connection and try again.";
    }
    if (
      msg.includes("network request failed") ||
      msg.includes("network error") ||
      msg.includes("failed to fetch") ||
      msg.includes("econnrefused")
    ) {
      return "Cannot reach the server. Make sure you are on the same Wi-Fi network as the API.";
    }
    return err.message;
  }
  return "An unexpected error occurred. Please try again.";
}

/** Sleep helper used between retries. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with an AbortController-based timeout.
 * Retries `retries` times on transient network errors (not on HTTP errors).
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  retries: number,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      // Don't retry on explicit abort (user unmounted or cancelled)
      if (err instanceof Error && err.name === "AbortError" && attempt === 0) {
        // Still counts as a timeout on the first attempt — re-throw directly
        throw err;
      }
      // Wait briefly before retrying
      if (attempt < retries) {
        await sleep(500 * (attempt + 1));
      }
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Simple typed fetch wrapper.
 * Automatically attaches the Bearer token from AuthContext.
 * Supports timeout (default 15 s) and automatic retry on network errors.
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

  const {
    skip,
    headers: extraHeaders,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    ...restOptions
  } = options ?? {};

  useEffect(() => {
    if (skip) return;

    // External cancellation flag (component unmounted mid-flight)
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

    fetchWithTimeout(
      `${API_URL}${path}`,
      { ...restOptions, headers },
      timeoutMs,
      retries,
    )
      .then(async (res) => {
        if (cancelled || !mountedRef.current) return;
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try {
            const body = await res.json();
            msg = body?.error?.message ?? body?.message ?? msg;
          } catch {
            // ignore parse errors
          }
          setError(msg);
          setLoading(false);
          return;
        }
        const json = await res.json();
        // Our API wraps responses in { data, error }
        const payload =
          (json as { data?: T }).data !== undefined
            ? (json as { data: T }).data
            : (json as T);
        setData(payload);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled || !mountedRef.current) return;
        setError(friendlyError(err));
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
