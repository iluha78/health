import { apiUrl } from "./api";

export const requestAssistantPrompt = async (
  headers: Record<string, string> | undefined,
  prompt: string
): Promise<string> => {
  if (!headers) {
    throw new Error("Необходимо войти в систему");
  }
  const response = await fetch(apiUrl("/advice/general"), {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt })
  });
  const data = await response.json();
  if (!response.ok || typeof data.advice !== "string") {
    const message = typeof data.error === "string" ? data.error : "Не удалось получить рекомендации";
    throw new Error(message);
  }
  return data.advice.trim();
};
