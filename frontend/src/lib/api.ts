const rawBase = import.meta.env.VITE_API_BASE_URL;
const fallbackBase = "http://localhost:8180";
const trimmedBase = (rawBase && rawBase.trim().length > 0 ? rawBase : fallbackBase).replace(/\/+$/, "");
export const API_BASE_URL = trimmedBase;

export function apiUrl(
    path: string,
    params?: Record<string, string | number | undefined | null>
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // 🔧 DEV: ходим относительным путём → попадём в Vite proxy → same-origin, без CORS
  if (import.meta.env.DEV) {
    const usp = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null) continue;
        usp.set(k, String(v));
      }
    }
    const q = usp.toString();
    return q ? `${normalizedPath}?${q}` : normalizedPath;
  }

  // PROD: абсолютный адрес из ENV
  const url = new URL(normalizedPath, API_BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}
