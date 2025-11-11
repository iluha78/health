import type { FormEvent } from "react";
import { LanguageSelector } from "../../components/LanguageSelector";
import { useTranslation } from "../../i18n";

export type AuthView = "login" | "register" | "registerVerify" | "forgotRequest" | "forgotVerify";

type AuthNavigationTarget = "login" | "register" | "forgotRequest";

export type AuthPanelProps = {
  view: AuthView;
  email: string;
  password: string;
  resetPassword: string;
  resetPasswordConfirm: string;
  showPassword: boolean;
  showResetPassword: boolean;
  error: string | null;
  verificationCode: string;
  info?: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onResetPasswordChange: (value: string) => void;
  onResetPasswordConfirmChange: (value: string) => void;
  onToggleResetPassword: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onVerificationCodeChange: (value: string) => void;
  onSwitchView: (target: AuthNavigationTarget) => void;
};

export const AuthPanel = ({
  view,
  email,
  password,
  resetPassword,
  resetPasswordConfirm,
  showPassword,
  showResetPassword,
  error,
  verificationCode,
  info,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onResetPasswordChange,
  onResetPasswordConfirmChange,
  onToggleResetPassword,
  onSubmit,
  onVerificationCodeChange,
  onSwitchView
}: AuthPanelProps) => {
  const { t } = useTranslation();

  const buttonLabel = (() => {
    switch (view) {
      case "login":
        return t("auth.login");
      case "register":
        return t("auth.register");
      case "registerVerify":
        return t("auth.verify");
      case "forgotRequest":
        return t("auth.sendResetCode");
      case "forgotVerify":
        return t("auth.resetPassword");
      default:
        return t("auth.login");
    }
  })();

  const emailReadOnly = view === "registerVerify" || view === "forgotVerify";

  return (
    <div className="auth">
      <LanguageSelector className="auth-language" />
      <h1>HlCoAi</h1>
      <p>{t("auth.subtitle")}</p>
      <form className="card" onSubmit={onSubmit}>
        <label>
          {t("auth.email")}
          <input
            type="email"
            value={email}
            onChange={event => onEmailChange(event.target.value)}
            required
            readOnly={emailReadOnly}
          />
        </label>

        {(view === "login" || view === "register") && (
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
        )}

        {view === "registerVerify" && (
          <div className="verification-step">
            {info && <p className="info">{info}</p>}
            <p className="info">{t("auth.verificationDescription")}</p>
            <label>
              {t("auth.verificationCode")}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
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

        {view === "forgotRequest" && <p className="info">{t("auth.resetRequestDescription")}</p>}

        {view === "forgotVerify" && (
          <div className="verification-step">
            {info && <p className="info">{info}</p>}
            <p className="info">{t("auth.resetDescription")}</p>
            <label>
              {t("auth.resetCode")}
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={verificationCode}
                onChange={event => {
                  const digitsOnly = event.target.value.replace(/[^0-9]/g, "").slice(0, 6);
                  onVerificationCodeChange(digitsOnly);
                }}
                required
              />
            </label>
            <label>
              {t("auth.newPassword")}
              <span className="password-input">
                <input
                  type={showResetPassword ? "text" : "password"}
                  value={resetPassword}
                  onChange={event => onResetPasswordChange(event.target.value)}
                  required
                  minLength={6}
                />
                <button type="button" className="ghost" onClick={onToggleResetPassword}>
                  {showResetPassword ? t("auth.hide") : t("auth.show")}
                </button>
              </span>
            </label>
            <label>
              {t("auth.confirmPassword")}
              <input
                type={showResetPassword ? "text" : "password"}
                value={resetPasswordConfirm}
                onChange={event => onResetPasswordConfirmChange(event.target.value)}
                required
                minLength={6}
              />
            </label>
          </div>
        )}

        <button type="submit">{buttonLabel}</button>
        {error && <p className="error">{error}</p>}
      </form>

      <div className="auth-footer">
        {view === "login" && (
          <>
            <button className="ghost" type="button" onClick={() => onSwitchView("register")}>
              {t("auth.createAccount")}
            </button>
            <button className="link-button" type="button" onClick={() => onSwitchView("forgotRequest")}>
              {t("auth.forgotPassword")}
            </button>
          </>
        )}

        {view === "register" && (
          <button className="ghost" type="button" onClick={() => onSwitchView("login")}>
            {t("auth.alreadyHaveAccount")}
          </button>
        )}

        {view === "registerVerify" && (
          <button className="ghost" type="button" onClick={() => onSwitchView("register")}>
            {t("auth.backToRegister")}
          </button>
        )}

        {view === "forgotRequest" && (
          <button className="ghost" type="button" onClick={() => onSwitchView("login")}>
            {t("auth.backToLogin")}
          </button>
        )}

        {view === "forgotVerify" && (
          <div className="auth-footer-stack">
            <button className="ghost" type="button" onClick={() => onSwitchView("login")}>
              {t("auth.backToLogin")}
            </button>
            <button className="link-button" type="button" onClick={() => onSwitchView("forgotRequest")}>
              {t("auth.resendCode")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
