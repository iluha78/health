import { Link } from "../../lib/router";
import { AuthPanel, type AuthPanelProps } from "../auth/AuthPanel";
import { LanguageSelector } from "../../components/LanguageSelector";
import { useTranslation } from "../../i18n";
import monitorIllustration from "../../assets/feature-monitor.svg";
import nutritionIllustration from "../../assets/feature-nutrition.svg";
import assistantIllustration from "../../assets/feature-assistant.svg";
import subscriptionIllustration from "../../assets/feature-subscription.svg";
import { newsArticles, getArticleTranslation, getArticleImageAlt } from "./newsData";

type PublicLandingProps = AuthPanelProps;

export const PublicLanding = (props: PublicLandingProps) => {
  const { t, i18n } = useTranslation();
  const language = i18n.language;

  return (
    <div className="public-shell">
      <header className="public-hero">
        <div className="public-hero-inner">
          <div className="public-hero-copy">
            <div className="public-top-row">
              <span className="public-brand">HlCoAi</span>
              <LanguageSelector className="public-language" />
            </div>
            <h1>{t("landing.hero.title")}</h1>
            <p className="public-hero-lead">{t("landing.hero.lead")}</p>
            <div className="public-hero-text">
              <p>{t("landing.hero.description")}</p>
              <ul>
                <li>{t("landing.hero.point1")}</li>
                <li>{t("landing.hero.point2")}</li>
                <li>{t("landing.hero.point3")}</li>
              </ul>
            </div>
          </div>
          <div className="public-hero-auth">
            <AuthPanel
              {...props}
              showHeader={false}
              showLanguageSelector={false}
              className="public-auth"
            />
          </div>
        </div>
      </header>

      <main className="public-content">
        <section className="public-why">
          <div className="public-section-header">
            <h2>{t("landing.why.title")}</h2>
            <p>{t("landing.why.subtitle")}</p>
          </div>
          <div className="public-why-body">
            <p>{t("landing.why.point1")}</p>
            <p>{t("landing.why.point2")}</p>
            <p>{t("landing.why.point3")}</p>
          </div>
        </section>

        <section className="public-features">
          <div className="public-section-header">
            <h2>{t("landing.features.title")}</h2>
            <p>{t("landing.features.subtitle")}</p>
          </div>
          <div className="public-feature-grid">
            <article className="public-feature-card">
              <img src={monitorIllustration} alt="" aria-hidden="true" />
              <h3>{t("landing.features.monitor.title")}</h3>
              <p>{t("landing.features.monitor.text")}</p>
            </article>
            <article className="public-feature-card">
              <img src={nutritionIllustration} alt="" aria-hidden="true" />
              <h3>{t("landing.features.nutrition.title")}</h3>
              <p>{t("landing.features.nutrition.text")}</p>
            </article>
            <article className="public-feature-card">
              <img src={assistantIllustration} alt="" aria-hidden="true" />
              <h3>{t("landing.features.assistant.title")}</h3>
              <p>{t("landing.features.assistant.text")}</p>
            </article>
            <article className="public-feature-card">
              <img src={subscriptionIllustration} alt="" aria-hidden="true" />
              <h3>{t("landing.features.subscription.title")}</h3>
              <p>{t("landing.features.subscription.text")}</p>
            </article>
          </div>
        </section>

        <section className="public-news">
          <div className="public-section-header">
            <h2>{t("landing.news.title")}</h2>
            <p>{t("landing.news.subtitle")}</p>
          </div>
          <div className="public-news-grid">
            {newsArticles.map(article => {
              const translation = getArticleTranslation(article, language);
              const published = new Date(article.date);
              return (
                <article key={article.slug} className="public-news-card">
                  <img
                    src={article.image}
                    alt={getArticleImageAlt(article, language)}
                    className="public-news-image"
                  />
                  <div className="public-news-content">
                    <p className="public-news-date">
                      {t("landing.news.date", {
                        date: published.toLocaleDateString(language, {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        }),
                      })}
                    </p>
                    <h3>{translation.title}</h3>
                    <p>{translation.summary}</p>
                    <Link to={`/news/${article.slug}`} className="public-news-link">
                      {t("landing.news.readMore")}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};
