import { Link } from "../../lib/router";
import { LanguageSelector } from "../../components/LanguageSelector";
import { useTranslation } from "../../i18n";
import { AuthPanel, type AuthPanelProps } from "../auth/AuthPanel";

export const LoginPage = (props: AuthPanelProps) => {
  const { t } = useTranslation();

  return (
    <div className="public-shell">
      <header className="public-hero">
        <div className="public-hero-inner public-hero-inner--login">
          <div className="public-hero-copy">
            <div className="public-top-row">
              <span className="public-brand">HlCoAi</span>
              <LanguageSelector className="public-language" />
              <Link to="/" className="public-hero-login">
                {t("auth.backToLanding")}
              </Link>
            </div>
            <h1>{t("auth.loginTitle")}</h1>
            <p className="public-hero-lead">{t("auth.loginSubtitle")}</p>
            <p className="public-hero-description">{t("auth.loginDescription")}</p>
          </div>
          <div className="public-hero-auth">
            <AuthPanel {...props} showLanguageSelector={false} className="public-auth" />
          </div>
        </div>
      </header>
    </div>
  );
};
