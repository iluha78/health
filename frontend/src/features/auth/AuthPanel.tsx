import type { FormEvent } from "react";

export type AuthPanelProps = {
  mode: "login" | "register";
  email: string;
  password: string;
  showPassword: boolean;
  error: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onSwitchMode: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export const AuthPanel = ({
  mode,
  email,
  password,
  showPassword,
  error,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onSwitchMode,
  onSubmit
}: AuthPanelProps) => (
  <div className="auth">
    <h1>CholestoFit</h1>
    <p>Войдите, чтобы получить рекомендации ассистента</p>
    <form className="card" onSubmit={onSubmit}>
      <label>
        Email
        <input type="email" value={email} onChange={event => onEmailChange(event.target.value)} required />
      </label>
      <label>
        Пароль
        <span className="password-input">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={event => onPasswordChange(event.target.value)}
            required
          />
          <button type="button" className="ghost" onClick={onTogglePassword}>
            {showPassword ? "Скрыть" : "Показать"}
          </button>
        </span>
      </label>
      <button type="submit">{mode === "login" ? "Войти" : "Зарегистрироваться"}</button>
      {error && <p className="error">{error}</p>}
    </form>
    <button className="ghost" type="button" onClick={onSwitchMode}>
      {mode === "login" ? "Создать аккаунт" : "У меня уже есть аккаунт"}
    </button>
  </div>
);
