const rawBase = import.meta.env.VITE_API_BASE_URL;
const fallbackBase = "http://localhost:8080";

const trimmedBase = (rawBase && rawBase.trim().length > 0 ? rawBase : fallbackBase).replace(/\/+$/, "");

export const API_BASE_URL = trimmedBase;

export function apiUrl(path: string, params?: Record<string, string | number | undefined | null>): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(normalizedPath, API_BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}
