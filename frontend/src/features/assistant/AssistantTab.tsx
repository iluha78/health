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
  onSubmit,
  onReset
}: AssistantTabProps) => {
  const { t } = useTranslation();

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
              <p>{message.content}</p>
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
