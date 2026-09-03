/**
 * useNetworkStatus
 *
 * Provides real-time network connectivity info.
 * Uses @react-native-community/netinfo (already installed).
 * Falls back gracefully when the native module is unavailable (e.g. Expo Go web).
 *
 * Returns:
 *   isOnline    – true when there is an active internet connection
 *   isOffline   – convenience inverse of isOnline
 *   networkType – "wifi" | "cellular" | "ethernet" | "none" | "unknown"
 */
import { useEffect, useState } from "react";

type NetworkType = "wifi" | "cellular" | "ethernet" | "none" | "unknown";

interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  networkType: NetworkType;
}

// Minimal shape we need from NetInfo
interface NetInfoState {
  isConnected: boolean | null;
  type: string;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: true,   // optimistic default so screens don't flash "offline" on load
    isOffline: false,
    networkType: "unknown",
  });

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        // Dynamic require so the build doesn't fail without the native module
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const NetInfo = require("@react-native-community/netinfo").default;

        function update(state: NetInfoState) {
          const online = state.isConnected === true;
          const raw = (state.type ?? "unknown").toLowerCase();
          const type: NetworkType =
            raw === "wifi" ||
            raw === "cellular" ||
            raw === "ethernet" ||
            raw === "none"
              ? (raw as NetworkType)
              : "unknown";

          setStatus({ isOnline: online, isOffline: !online, networkType: type });
        }

        // Fetch the current state immediately
        const current: NetInfoState = await NetInfo.fetch();
        update(current);

        // Subscribe to future changes
        unsubscribe = NetInfo.addEventListener(update);
      } catch {
        // Native module unavailable (web / unsupported platform) — assume online
        setStatus({ isOnline: true, isOffline: false, networkType: "unknown" });
      }
    })();

    return () => {
      unsubscribe?.();
    };
  }, []);

  return status;
}

// ---------------------------------------------------------------------------
// Standalone helper — useful in plain async functions (not inside React).
// Resolves true when the device has internet connectivity.
// ---------------------------------------------------------------------------
export async function checkIsOnline(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const NetInfo = require("@react-native-community/netinfo").default;
    const state: NetInfoState = await NetInfo.fetch();
    return state.isConnected === true;
  } catch {
    return true; // assume online if we can't check
  }
}
