import type { ApiResponse } from '@cut-smartfix/contracts';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cut_token');
}

export async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      message = body?.error?.message ?? message;
    } catch {
      // ignore parse errors
    }
    return {
      data: null as T,
      error: { code: String(res.status), message },
    };
  }

  return res.json() as Promise<ApiResponse<T>>;
}

/** Convenience wrappers */
export const api = {
  get: <T>(path: string) => fetchApi<T>(path),

  post: <T>(path: string, body: unknown) =>
    fetchApi<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(path: string, body: unknown) =>
    fetchApi<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown) =>
    fetchApi<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string) =>
    fetchApi<T>(path, { method: 'DELETE' }),

  upload: <T>(path: string, formData: FormData) =>
    fetchApi<T>(path, {
      method: 'POST',
      body: formData,
      headers: {} as Record<string, string>, // let browser set Content-Type for multipart
    }),
};

/** Build query string from an object, skipping undefined/null values */
export function buildQuery(params: Record<string, unknown>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      q.set(k, String(v));
    }
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** Format a date string to local readable string */
export function formatDate(date: string | undefined | null): string {
  if (!date) return '–';
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Format a date+time string */
export function formatDateTime(date: string | undefined | null): string {
  if (!date) return '–';
  return new Date(date).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Time since a date, e.g. "2h ago" */
export function timeAgo(date: string | undefined | null): string {
  if (!date) return '–';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
