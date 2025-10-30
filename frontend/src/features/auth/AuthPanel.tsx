import type { FormEvent } from "react";
import { LanguageSelector } from "../../components/LanguageSelector";
import { useTranslation } from "../../i18n";

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
}: AuthPanelProps) => {
  const { t } = useTranslation();

  return (
    <div className="auth">
      <LanguageSelector className="auth-language" />
      <h1>CholestoFit</h1>
      <p>{t("auth.subtitle")}</p>
      <form className="card" onSubmit={onSubmit}>
        <label>
          {t("auth.email")}
          <input type="email" value={email} onChange={event => onEmailChange(event.target.value)} required />
        </label>
        <label>
          {t("auth.password")}
          <span className="password-input">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={event => onPasswordChange(event.target.value)}
              required
            />
            <button type="button" className="ghost" onClick={onTogglePassword}>
              {showPassword ? t("auth.hide") : t("auth.show")}
            </button>
          </span>
        </label>
        <button type="submit">{mode === "login" ? t("auth.login") : t("auth.register")}</button>
        {error && <p className="error">{error}</p>}
      </form>
      <button className="ghost" type="button" onClick={onSwitchMode}>
        {mode === "login" ? t("auth.createAccount") : t("auth.alreadyHaveAccount")}
      </button>
    </div>
  );
};
