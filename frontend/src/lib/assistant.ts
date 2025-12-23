import { i18n } from "../i18n";
import { apiUrl } from "./api";

export const requestAssistantPrompt = async (
  headers: Record<string, string> | undefined,
  prompt: string
): Promise<string> => {
  if (!headers) {
    throw new Error(i18n.t("common.loginRequired"));
  }
  const response = await fetch(apiUrl("/advice/general"), {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt, language: i18n.language })
  });
  const data = await response.json();
  if (!response.ok || typeof data.advice !== "string") {
    const message = typeof data.error === "string" ? data.error : i18n.t("common.adviceRequestFailed");
    throw new Error(message);
  }
  return data.advice.trim();
};
