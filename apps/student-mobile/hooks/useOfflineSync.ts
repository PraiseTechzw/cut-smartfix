import NetInfo from "@react-native-community/netinfo";
import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "../context/auth";
import { API_URL } from "../src/constants/api";
import {
  loadPendingReports,
  removePendingReports,
} from "../src/offlineReports";

export function useOfflineSync() {
  const { token } = useAuth();
  const flushing = useRef(false);

  const flush = useCallback(async () => {
    if (!token || flushing.current) return;
    flushing.current = true;

    try {
      const queue = await loadPendingReports();
      if (queue.length === 0) return;

      const completed: unknown[] = [];
      for (const payload of queue) {
        try {
          const response = await fetch(`${API_URL}/v1/reports`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + token,
            },
            body: JSON.stringify(payload),
          });
          if (response.ok) {
            completed.push(payload);
          } else {
            console.error(
              `Offline report sync failed with HTTP ${response.status}; keeping it queued.`,
            );
          }
        } catch {
          // Keep the report queued until connectivity returns.
        }
      }

      await removePendingReports(completed);
    } catch (error) {
      console.error("Could not sync saved offline reports.", error);
    } finally {
      flushing.current = false;
    }
  }, [token]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) void flush();
    });

    void NetInfo.fetch()
      .then((state) => {
        if (state.isConnected) void flush();
      })
      .catch((error: unknown) => {
        console.error(
          "Could not check connectivity for offline report sync.",
          error,
        );
      });

    return unsubscribe;
  }, [flush]);
}
