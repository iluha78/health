import type { FormEvent } from "react";
import { LanguageSelector } from "../../components/LanguageSelector";
import { useTranslation } from "../../i18n";

export type AuthPanelProps = {
  mode: "login" | "register";
  email: string;
  password: string;
  showPassword: boolean;
  error: string | null;
  verificationCode: string;
  isVerificationStep: boolean;
  info?: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onSwitchMode: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onVerificationCodeChange: (value: string) => void;
};

export const AuthPanel = ({
  mode,
  email,
  password,
  showPassword,
  error,
  verificationCode,
  isVerificationStep,
  info,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onSwitchMode,
  onSubmit,
  onVerificationCodeChange
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
        {mode === "register" && isVerificationStep && (
          <div className="verification-step">
            {info && <p className="info">{info}</p>}
            <p className="info">{t("auth.verificationDescription")}</p>
            <label>
              {t("auth.verificationCode")}
              <input
                type="text"
                inputMode="numeric"
                pattern="\\d{6}"
                maxLength={6}
                value={verificationCode}
                onChange={event => {
                  const digitsOnly = event.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                  onVerificationCodeChange(digitsOnly);
                }}
                required
              />
            </label>
          </div>
        )}
        <button type="submit">
          {mode === "login"
            ? t("auth.login")
            : isVerificationStep
              ? t("auth.verify")
              : t("auth.register")}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
      <button className="ghost" type="button" onClick={onSwitchMode}>
        {mode === "login" ? t("auth.createAccount") : t("auth.alreadyHaveAccount")}
      </button>
    </div>
  );
};
