import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import { useTranslation } from "../../i18n";
import { apiUrl } from "../../lib/api";
import type { AssistantAttachment, AssistantHistoryItem, AssistantMessage } from "../../types/api";

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
      const attachments: AssistantAttachment[] | undefined = item.user_image_url
        ? [
            {
              type: "image",
              url: item.user_image_url,
              name: item.user_image_name ?? null
            }
          ]
        : undefined;
      messages.push({ role: "user", content: userMessage, attachments });
    }
    const assistantReply = item.assistant_reply?.trim();
    if (assistantReply) {
      messages.push({ role: "assistant", content: assistantReply });
    }
  }
  return messages;
};

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

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
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

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

  const removeAttachment = useCallback(() => {
    setAttachment(null);
    setAttachmentPreview(null);
    setAttachmentName(null);
  }, []);

  const handleAttachmentChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;

      if (!file) {
        removeAttachment();
        return;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        removeAttachment();
        setError(t("assistant.photoTooLarge"));
        return;
      }

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        removeAttachment();
        setError(t("assistant.photoUnsupported"));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === "string" ? reader.result : null;
        if (!result) {
          removeAttachment();
          setError(t("assistant.photoUnsupported"));
          return;
        }
        setAttachment(file);
        setAttachmentPreview(result);
        setAttachmentName(file.name);
        setError(null);
      };
      reader.onerror = () => {
        removeAttachment();
        setError(t("assistant.photoUnsupported"));
      };
      reader.readAsDataURL(file);
    },
    [removeAttachment, t]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setInput("");
    setError(null);
    removeAttachment();
  }, [removeAttachment]);

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

      const fileForUpload = attachment;
      const preview = attachmentPreview;
      const displayName = attachmentName ?? fileForUpload?.name ?? null;
      const userMessage: AssistantMessage = preview
        ? {
            role: "user",
            content: text,
            attachments: [
              {
                type: "image",
                url: preview,
                name: displayName
              }
            ]
          }
        : { role: "user", content: text };

      setMessages(prev => [...prev, userMessage]);
      setInput("");
      removeAttachment();
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append("message", text);
      formData.append("history", JSON.stringify(historyPayload));
      if (fileForUpload) {
        formData.append("image", fileForUpload);
      }

      const sanitizedHeaders = headers
        ? Object.fromEntries(
            Object.entries(headers).filter(([key]) => key.toLowerCase() !== "content-type")
          )
        : undefined;

      try {
        const requestInit: RequestInit = {
          method: "POST",
          body: formData
        };
        if (sanitizedHeaders && Object.keys(sanitizedHeaders).length > 0) {
          requestInit.headers = sanitizedHeaders;
        }

        const response = await fetch(apiUrl("/assistant/chat"), requestInit);
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
    [
      attachment,
      attachmentName,
      attachmentPreview,
      disabledReason,
      enabled,
      headers,
      input,
      messages,
      onUsage,
      removeAttachment,
      t,
      token
    ]
  );

  return {
    messages,
    input,
    loading,
    error,
    handleInputChange,
    handleAttachmentChange,
    submit,
    reset,
    removeAttachment,
    attachmentPreview,
    attachmentName,
    setInput
  };
};
