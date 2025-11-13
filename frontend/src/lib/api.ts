const rawBase = import.meta.env.VITE_API_BASE_URL;
const configuredBase = typeof rawBase === "string" ? rawBase.trim() : "";
const normalisedBase = configuredBase.replace(/\/+$/, "");
export const API_BASE_URL = normalisedBase;

export function apiUrl(
    path: string,
    params?: Record<string, string | number | undefined | null>
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // 🔧 DEV: ходим относительным путём → попадём в Vite proxy → same-origin, без CORS
  if (import.meta.env.DEV) {
    return queryString(normalizedPath, params);
  }

  if (API_BASE_URL.length === 0) {
    return queryString(normalizedPath, params);
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

function queryString(
  normalizedPath: string,
  params?: Record<string, string | number | undefined | null>
): string {
  if (!params) {
    return normalizedPath;
  }

  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    usp.set(key, String(value));
  });

  const q = usp.toString();
  return q ? `${normalizedPath}?${q}` : normalizedPath;
}
