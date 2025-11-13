import { apiUrl } from "../../lib/api";
import type { LandingResponse, NewsArticleResponse } from "./types";

type ApiError = Error & { status?: number };

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`) as ApiError;
    error.status = response.status;
    throw error;
  }

  const data = (await response.json()) as T;
  return data;
};

export const fetchLandingContent = async (locale: string): Promise<LandingResponse> => {
  const response = await fetch(apiUrl("/public/landing", { locale }));
  return handleResponse<LandingResponse>(response);
};

export const fetchNewsArticle = async (slug: string, locale: string): Promise<NewsArticleResponse> => {
  const response = await fetch(apiUrl(`/public/news/${encodeURIComponent(slug)}`, { locale }));
  return handleResponse<NewsArticleResponse>(response);
};
