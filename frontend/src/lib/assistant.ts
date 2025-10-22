import { apiUrl } from "./api";

export const requestAssistantPrompt = async (
  headers: Record<string, string> | undefined,
  prompt: string
): Promise<string> => {
  if (!headers) {
    throw new Error("Необходимо войти в систему");
  }
  const response = await fetch(apiUrl("/assistant/chat"), {
    method: "POST",
    headers,
    body: JSON.stringify({ message: prompt, history: [] })
  });
  const data = await response.json();
  if (!response.ok || typeof data.reply !== "string") {
    const message = typeof data.error === "string" ? data.error : "Не удалось получить ответ ассистента";
    throw new Error(message);
  }
  return data.reply.trim();
};
