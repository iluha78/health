import { useCallback, useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { apiUrl } from "../../lib/api";
import type { AssistantMessage } from "../../types/api";

export const useAssistantChat = (
  token: string | null,
  headers: Record<string, string> | undefined
) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    setInput("");
    setError(null);
  }, []);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const text = input.trim();
      if (!text) return;
      if (!token || !headers) {
        setError("Необходимо войти, чтобы общаться с ассистентом");
        return;
      }
      const historyPayload = [...messages, { role: "user" as const, content: text }].map(message => ({
        role: message.role,
        content: message.content
      }));
      setMessages(prev => [...prev, { role: "user", content: text }]);
      setInput("");
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(apiUrl("/assistant/chat"), {
          method: "POST",
          headers,
          body: JSON.stringify({ message: text, history: historyPayload })
        });
        const data = await response.json();
        if (!response.ok || typeof data.reply !== "string") {
          const message = typeof data.error === "string" ? data.error : "Ассистент временно недоступен";
          throw new Error(message);
        }
        setMessages(prev => [...prev, { role: "assistant", content: data.reply.trim() }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ассистент временно недоступен");
      } finally {
        setLoading(false);
      }
    },
    [headers, input, messages, token]
  );

  return {
    messages,
    input,
    loading,
    error,
    handleInputChange,
    submit,
    reset,
    setInput
  };
};
