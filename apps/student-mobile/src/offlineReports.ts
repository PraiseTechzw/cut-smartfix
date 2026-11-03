import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_REPORTS_KEY = "cut_pending_reports";

export async function loadPendingReports(): Promise<unknown[]> {
  const raw = await AsyncStorage.getItem(PENDING_REPORTS_KEY);
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error("Saved offline reports could not be read.", { cause: error });
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Saved offline reports are not in the expected format.");
  }

  return parsed;
}

export async function enqueuePendingReport(report: unknown): Promise<void> {
  const reports = await loadPendingReports();
  await AsyncStorage.setItem(
    PENDING_REPORTS_KEY,
    JSON.stringify([...reports, report]),
  );
}

export async function removePendingReports(
  completedReports: unknown[],
): Promise<void> {
  if (completedReports.length === 0) return;

  const reports = await loadPendingReports();
  const completedCounts = new Map<string, number>();
  for (const report of completedReports) {
    const key = JSON.stringify(report);
    completedCounts.set(key, (completedCounts.get(key) ?? 0) + 1);
  }

  const remaining = reports.filter((report) => {
    const key = JSON.stringify(report);
    const count = completedCounts.get(key) ?? 0;
    if (count === 0) return true;
    completedCounts.set(key, count - 1);
    return false;
  });

  await AsyncStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify(remaining));
}
