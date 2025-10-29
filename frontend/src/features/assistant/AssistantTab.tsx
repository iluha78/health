import type { ChangeEvent, FormEvent } from "react";
import type { AssistantMessage } from "../../types/api";

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
}: AssistantTabProps) => (
  <div className="tab-panel assistant-panel">
    <h2>AI ассистент</h2>
    <div className="card assistant-card form-card">
      <div className="assistant-messages">
        {disabled ? (
          <p className="error">{disabledReason ?? "AI-ассистент временно недоступен"}</p>
        ) : (
          messages.length === 0 && <p className="muted">Задайте вопрос, и ассистент ответит.</p>
        )}
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`assistant-message ${message.role}`}>
            <span className="assistant-role">{message.role === "user" ? "Вы" : "Ассистент"}</span>
            <p>{message.content}</p>
          </div>
        ))}
      </div>
      <form className="assistant-form" onSubmit={onSubmit}>
        <textarea
          placeholder="Напишите, что вас беспокоит"
          value={input}
          onChange={onInputChange}
          disabled={disabled}
          rows={3}
        />
        <div className="assistant-actions">
          <button type="submit" disabled={loading || disabled}>
            {loading ? "Ассистент думает..." : "Отправить"}
          </button>
          <button type="button" className="ghost" onClick={onReset} disabled={disabled}>
            Очистить диалог
          </button>
          {!disabled && error && <p className="error">{error}</p>}
        </div>
      </form>
    </div>
  </div>
);
