import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { useTranslation } from "../../i18n";
import { apiUrl } from "../../lib/api";
import type { AssistantHistoryItem, AssistantMessage } from "../../types/api";

const mapHistoryToMessages = (history: AssistantHistoryItem[]): AssistantMessage[] => {
  if (history.length === 0) {
    return [];
  }

  const sorted = [...history].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (aTime !== bTime) {
      return aTime - bTime;
    }
    return a.id - b.id;
  });

  const messages: AssistantMessage[] = [];
  for (const item of sorted) {
    const userMessage = item.user_message?.trim();
    if (userMessage) {
      messages.push({ role: "user", content: userMessage });
    }
    const assistantReply = item.assistant_reply?.trim();
    if (assistantReply) {
      messages.push({ role: "assistant", content: assistantReply });
    }
  }
  return messages;
};

export const useAssistantChat = (
  token: string | null,
  headers: Record<string, string> | undefined,
  enabled: boolean,
  disabledReason: string | null,
  onUsage?: () => Promise<void> | void
) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !headers) {
      setMessages([]);
      return;
    }

    const controller = new AbortController();

    const fetchHistory = async () => {
      try {
        const response = await fetch(apiUrl("/assistant/history"), {
          headers,
          signal: controller.signal
        });
        if (!response.ok) {
          return;
        }
        const data: unknown = await response.json();
        if (Array.isArray(data)) {
          setMessages(mapHistoryToMessages(data as AssistantHistoryItem[]));
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Failed to load assistant history", err);
        }
      }
    };

    void fetchHistory();

    return () => {
      controller.abort();
    };
  }, [headers, token]);

  useEffect(() => {
    if (!enabled && disabledReason) {
      setError(disabledReason);
    } else if (enabled) {
      setError(null);
    }
  }, [disabledReason, enabled]);

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
      if (!enabled) {
        setError(disabledReason || t("assistant.unavailable"));
        return;
      }
      if (!token || !headers) {
        setError(t("common.loginRequired"));
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
          const message = typeof data.error === "string" ? data.error : t("assistant.unavailable");
          throw new Error(message);
        }
        setMessages(prev => [...prev, { role: "assistant", content: data.reply.trim() }]);
        if (onUsage) {
          await onUsage();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("assistant.unavailable"));
      } finally {
        setLoading(false);
      }
    },
    [disabledReason, enabled, headers, input, messages, onUsage, t, token]
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
