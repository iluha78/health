import { useId, useRef } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { AssistantMessage } from "../../types/api";
import { useTranslation } from "../../i18n";

export type AssistantTabProps = {
  messages: AssistantMessage[];
  input: string;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  disabledReason: string | null;
  onInputChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  attachmentPreview: string | null;
  attachmentName: string | null;
  onAttachmentChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onAttachmentRemove: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
};

export const AssistantTab = ({
  messages,
  input,
  loading,
  error,
  disabled,
  disabledReason,
  onInputChange,
  attachmentPreview,
  attachmentName,
  onAttachmentChange,
  onAttachmentRemove,
  onSubmit,
  onReset
}: AssistantTabProps) => {
  const { t } = useTranslation();
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleAttachmentButtonClick = () => {
    if (disabled) {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleAttachmentInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    onAttachmentChange(event);
    // allow selecting the same file again
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleAttachmentRemove = () => {
    onAttachmentRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="tab-panel assistant-panel">
      <h2>{t("assistant.title")}</h2>
      <div className="card assistant-card form-card">
        <div className="assistant-messages">
          {disabled ? (
            <p className="error">{disabledReason ?? t("assistant.unavailable")}</p>
          ) : (
            messages.length === 0 && <p className="muted">{t("assistant.prompt")}</p>
          )}
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`assistant-message ${message.role}`}>
              <span className="assistant-role">{message.role === "user" ? t("assistant.user") : t("assistant.assistant")}</span>
              {message.content && <p>{message.content}</p>}
              {message.attachments && message.attachments.length > 0 && (
                <div className="assistant-attachments">
                  {message.attachments.map((attachment, attachmentIndex) => {
                    if (attachment.type !== "image") {
                      return null;
                    }
                    return (
                      <figure
                        key={`attachment-${index}-${attachmentIndex}`}
                        className="assistant-attachment"
                      >
                        <img
                          src={attachment.url}
                          alt={attachment.name ?? t("assistant.attachmentPreviewAlt")}
                          loading="lazy"
                        />
                        {attachment.name && <figcaption>{attachment.name}</figcaption>}
                      </figure>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
        <form className="assistant-form" onSubmit={onSubmit}>
          <textarea
            placeholder={t("assistant.inputPlaceholder")}
            value={input}
            onChange={onInputChange}
            disabled={disabled}
            rows={3}
          />
          <div className="assistant-attachment-controls hidden">
            <input
              id={fileInputId}
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="assistant-file-input"
              onChange={handleAttachmentInputChange}
              disabled={disabled}
            />
            <button
              type="button"
              className="ghost"
              onClick={handleAttachmentButtonClick}
              disabled={disabled}
            >
              {t("assistant.attachPhoto")}
            </button>
          </div>
          {attachmentPreview && (
            <div className="assistant-attachment-preview">
              <img
                src={attachmentPreview}
                alt={t("assistant.attachmentPreviewAlt")}
                className="assistant-attachment-image"
              />
              <div className="assistant-attachment-meta">
                {attachmentName && <p className="assistant-attachment-name">{attachmentName}</p>}
                <button
                  type="button"
                  className="ghost small"
                  onClick={handleAttachmentRemove}
                  disabled={disabled}
                >
                  {t("assistant.removePhoto")}
                </button>
              </div>
            </div>
          )}
          <div className="assistant-actions">
            <button type="submit" disabled={loading || disabled}>
              {loading ? t("assistant.thinking") : t("assistant.send")}
            </button>
            <button type="button" className="ghost" onClick={onReset} disabled={disabled}>
              {t("assistant.reset")}
            </button>
            {!disabled && error && <p className="error">{error}</p>}
          </div>
        </form>
      </div>
    </div>
  );
};
