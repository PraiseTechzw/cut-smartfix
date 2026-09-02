/**
 * useOfflineSync
 *
 * Listens for network connectivity changes via @react-native-community/netinfo.
 * When connectivity returns, attempts to flush any pending reports saved
 * to AsyncStorage under the key "cut_pending_reports".
 *
 * Usage: call this hook once from the root layout (inside AuthProvider).
 */
import { useCallback, useEffect } from "react";
import { useAuth } from "../context/auth";

const PENDING_KEY = "cut_pending_reports";
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

// ---------------------------------------------------------------------------
// Storage abstraction (same pattern used elsewhere in the codebase)
// ---------------------------------------------------------------------------
let storageModule: {
  getItem: (k: string) => Promise<string | null>;
  setItem: (k: string, v: string) => Promise<void>;
} | null = null;

const memStore: Record<string, string> = {};

async function getStorage() {
  if (storageModule) return storageModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@react-native-async-storage/async-storage");
    storageModule = mod.default ?? mod;
    return storageModule!;
  } catch {
    return {
      getItem: async (k: string) => memStore[k] ?? null,
      setItem: async (k: string, v: string) => { memStore[k] = v; },
    };
  }
}

async function getPending(): Promise<unknown[]> {
  const s = await getStorage();
  const raw = await s.getItem(PENDING_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as unknown[];
  } catch {
    return [];
  }
}

async function clearPending() {
  const s = await getStorage();
  await s.setItem(PENDING_KEY, JSON.stringify([]));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useOfflineSync() {
  const { token } = useAuth();

  const flush = useCallback(async () => {
    const queue = await getPending();
    if (queue.length === 0) return;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const failed: unknown[] = [];

    for (const payload of queue) {
      try {
        const res = await fetch(`${API_URL}/v1/reports`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          failed.push(payload);
        }
        // On success the report is live — no need to keep it locally.
      } catch {
        // Still offline or transient error — keep in queue
        failed.push(payload);
      }
    }

    // Persist only the ones that failed
    const s = await getStorage();
    await s.setItem(PENDING_KEY, JSON.stringify(failed));
  }, [token]);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setup = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const NetInfo = require("@react-native-community/netinfo").default;

        unsubscribe = NetInfo.addEventListener(
          (state: { isConnected: boolean | null }) => {
            if (state.isConnected) {
              flush();
            }
          },
        );

        // Also try immediately on mount in case we're already online
        const current = await NetInfo.fetch();
        if (current.isConnected) {
          flush();
        }
      } catch {
        // NetInfo not available — run a single flush attempt on mount
        flush();
      }
    };

    setup();

    return () => {
      unsubscribe?.();
    };
  }, [flush]);
}
