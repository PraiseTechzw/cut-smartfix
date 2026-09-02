import type {
  ApiResponse,
  MaintenanceReport,
  UserProfile,
} from "@cut-smartfix/contracts";

export function createApiClient(
  baseUrl: string,
  getToken?: () => Promise<string | null>,
) {
  async function request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const token = await getToken?.();
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
    return response.json() as Promise<ApiResponse<T>>;
  }

  return {
    getMe: () => request<UserProfile>("/v1/me"),
    listReports: () => request<MaintenanceReport[]>("/v1/reports"),
    getReport: (id: string) => request<MaintenanceReport>(`/v1/reports/${id}`),
  };
}
