import { useEffect, useMemo } from "react";
import { LanguageSelector } from "../components/LanguageSelector";
import { useTranslation } from "../i18n";
import { newsItems } from "../content/news";
import "./LandingPage.css";

type LocalisedNews = {
  id: string;
  date: string;
  title: string;
  summary: string;
  link?: string;
};

const getLanguageCode = (language: string) => language.split("-")[0];

export const LandingPage = () => {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.body.classList.add("landing-active");
    return () => {
      document.body.classList.remove("landing-active");
    };
  }, []);

  const translatedNews = useMemo<LocalisedNews[]>(() => {
    const language = getLanguageCode(i18n.language);
    const items: LocalisedNews[] = [];
    for (const item of newsItems) {
      const translation = item.translations[language] ?? item.translations.en;
      if (!translation) {
        continue;
      }
      items.push({
        id: item.id,
        date: item.date,
        title: translation.title,
        summary: translation.summary,
        link: item.link,
      });
    }
    return items;
  }, [i18n.language]);

  return (
    <div className="landing-page">
      <header className="landing-hero" id="home">
        <div className="landing-topbar">
          <div className="landing-brand">
            <span className="landing-logo">HlCoAi</span>
            <span className="landing-tagline">{t("common.tagline")}</span>
          </div>
          <nav className="landing-nav" aria-label={t("landing.nav.aria")}>
            <a href="#features">{t("landing.nav.features")}</a>
            <a href="#pricing">{t("landing.nav.pricing")}</a>
            <a href="#news">{t("landing.nav.news")}</a>
          </nav>
          <div className="landing-actions">
            <LanguageSelector className="landing-language" />
            <a className="landing-login" href="/app">
              {t("landing.hero.secondaryCta")}
            </a>
          </div>
        </div>
        <div className="landing-hero-content">
          <h1>{t("landing.hero.title")}</h1>
          <p className="landing-hero-subtitle">{t("landing.hero.subtitle")}</p>
          <div className="landing-cta">
            <a className="landing-primary-cta" href="/app">
              {t("landing.hero.primaryCta")}
            </a>
            <span className="landing-price">{t("landing.hero.priceLabel")}</span>
          </div>
          <p className="landing-highlight">{t("landing.hero.highlight")}</p>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-section landing-features" id="features">
          <h2>{t("landing.features.title")}</h2>
          <p className="landing-section-subtitle">{t("landing.features.subtitle")}</p>
          <div className="landing-feature-grid">
            <article className="landing-feature-card">
              <h3>{t("landing.features.tracking.title")}</h3>
              <p>{t("landing.features.tracking.description")}</p>
            </article>
            <article className="landing-feature-card">
              <h3>{t("landing.features.nutrition.title")}</h3>
              <p>{t("landing.features.nutrition.description")}</p>
            </article>
            <article className="landing-feature-card">
              <h3>{t("landing.features.ai.title")}</h3>
              <p>{t("landing.features.ai.description")}</p>
            </article>
            <article className="landing-feature-card">
              <h3>{t("landing.features.subscription.title")}</h3>
              <p>{t("landing.features.subscription.description")}</p>
            </article>
          </div>
        </section>

        <section className="landing-section landing-subscription" id="pricing">
          <div className="landing-subscription-card">
            <h2>{t("landing.subscription.title")}</h2>
            <p className="landing-subscription-price">{t("landing.subscription.priceLabel")}</p>
            <p className="landing-subscription-note">{t("landing.subscription.note")}</p>
            <ul className="landing-subscription-list">
              <li>{t("landing.subscription.points.one")}</li>
              <li>{t("landing.subscription.points.two")}</li>
              <li>{t("landing.subscription.points.three")}</li>
            </ul>
            <a className="landing-primary-cta" href="/app">
              {t("landing.subscription.cta")}
            </a>
          </div>
        </section>

        <section className="landing-section landing-news" id="news">
          <h2>{t("landing.news.title")}</h2>
          <p className="landing-section-subtitle">{t("landing.news.subtitle")}</p>
          {translatedNews.length > 0 ? (
            <div className="landing-news-grid">
              {translatedNews.map(item => (
                <article key={item.id} className="landing-news-card">
                  <time dateTime={item.date}>{item.date}</time>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="landing-news-link"
                    >
                      {t("landing.news.readMore")}
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="landing-news-empty">{t("landing.news.empty")}</p>
          )}
        </section>
      </main>

      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} HlCoAi. {t("landing.footer.rights")}</p>
        <a className="landing-footer-link" href="mailto:hello@hlco.ai">
          {t("landing.footer.contact")}
        </a>
      </footer>
    </div>
  );
};
