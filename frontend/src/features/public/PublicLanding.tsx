import { useEffect, useMemo, useState } from "react";
import { Link } from "../../lib/router";
import { LanguageSelector } from "../../components/LanguageSelector";
import { useTranslation } from "../../i18n";
import { fetchLandingContent } from "./api";
import { formatPublishedDate, parsePublishedDate } from "./date";
import { resolveIllustration } from "./imageMap";
import type { LandingContent, NewsSummary } from "./types";

const buildErrorMessage = (language: string): string => {
  switch (language) {
    case "ru":
      return "Не удалось загрузить информацию. Попробуйте обновить страницу.";
    case "de":
      return "Inhalte konnten nicht geladen werden. Bitte Seite neu laden.";
    case "es":
      return "No se pudieron cargar los contenidos. Vuelve a cargar la página.";
    default:
      return "We couldn’t load the page. Please refresh.";
  }
};

export const PublicLanding = () => {
  const { i18n } = useTranslation();
  const language = i18n.language;
  const [content, setContent] = useState<LandingContent | null>(null);
  const [news, setNews] = useState<NewsSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchLandingContent(language)
      .then(response => {
        if (cancelled) {
          return;
        }
        setContent(response.content);
        setNews(response.news.articles);
      })
      .catch(() => {
        if (!cancelled) {
          setError(buildErrorMessage(language));
          setContent(null);
          setNews([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [language]);

  const hero = content?.hero;
  const newsSection = content?.newsSection;

  const newsItems = useMemo(
    () =>
      news.map(item => ({
        ...item,
        publishedDate: parsePublishedDate(item.publishedAt),
      })),
    [news],
  );

  const renderPublishedDate = (date: Date | null, fallback: string) => {
    const safeFallback = fallback && fallback.trim().length > 0 ? fallback : "—";
    return formatPublishedDate(date, language, safeFallback);
  };

  return (
    <div className="public-shell">
      <header className="public-hero">
        <div className="public-hero-inner">
          <div className="public-top-row">
            <span className="public-brand">HlCoAi</span>
            <div className="public-top-actions">
              <LanguageSelector className="public-language" />
              {hero && (
                <Link to="/login" className="public-hero-login">
                  {hero.loginLabel}
                </Link>
              )}
            </div>
          </div>
          {loading && (
            <div className="public-hero-copy">
              <h1>HlCoAi</h1>
              <p className="public-hero-lead">…</p>
              <p className="public-loading">Загрузка...</p>
            </div>
          )}
          {!loading && error && (
            <div className="public-hero-copy">
              <h1>HlCoAi</h1>
              <p className="public-error-text">{error}</p>
            </div>
          )}
          {!loading && hero && (
            <div className="public-hero-grid">
              <div className="public-hero-copy">
                <span className="public-hero-eyebrow">{hero.eyebrow}</span>
                <h1>{hero.title}</h1>
                <p className="public-hero-lead">{hero.lead}</p>
                <div className="public-hero-text">
                  <p>{hero.description}</p>
                  <ul>
                    {hero.highlights.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <Link to="/login" className="public-cta">
                    {hero.ctaLabel}
                  </Link>
                </div>
              </div>
              <figure className="public-hero-figure">
                <img src={resolveIllustration(hero.imageKey)} alt={hero.imageCaption} />
                <figcaption>{hero.imageCaption}</figcaption>
              </figure>
            </div>
          )}
        </div>
      </header>

      {!loading && content && (
        <main className="public-content">
          <section className="public-intro">
            <div className="public-section-header">
              <h2>{content.introduction.title}</h2>
            </div>
            <div className="public-intro-body">
              {content.introduction.paragraphs.map(paragraph => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>

          <section className="public-features">
            <div className="public-section-header">
              <h2>{content.pillars.title}</h2>
              <p>{content.pillars.subtitle}</p>
            </div>
            <div className="public-feature-grid">
              {content.pillars.items.map(feature => (
                <article key={feature.title} className="public-feature-card">
                  <img src={resolveIllustration(feature.imageKey)} alt="" aria-hidden="true" />
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <p className="public-feature-body">{feature.body}</p>
                  <ul>
                    {feature.bullets.map(bullet => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className="public-journey">
            <div className="public-section-header">
              <h2>{content.journey.title}</h2>
              <p>{content.journey.subtitle}</p>
            </div>
            <div className="public-journey-grid">
              {content.journey.steps.map(step => (
                <article key={step.title} className="public-journey-step">
                  <img src={resolveIllustration(step.imageKey)} alt="" aria-hidden="true" />
                  <div className="public-journey-copy">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                    <ul>
                      {step.bullets.map(point => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="public-stories">
            <div className="public-section-header">
              <h2>{content.stories.title}</h2>
              <p>{content.stories.subtitle}</p>
            </div>
            <div className="public-stories-grid">
              {content.stories.items.map(story => (
                <article key={story.name} className="public-story-card">
                  <img src={resolveIllustration(story.imageKey)} alt="" aria-hidden="true" />
                  <div className="public-story-copy">
                    <p className="public-story-name">{story.name}</p>
                    <p className="public-story-role">{story.role}</p>
                    <blockquote>{story.quote}</blockquote>
                    <p>{story.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="public-metrics">
            <div className="public-section-header">
              <h2>{content.metrics.title}</h2>
              <p>{content.metrics.subtitle}</p>
            </div>
            <div className="public-metric-grid">
              {content.metrics.stats.map(stat => (
                <article key={stat.label} className="public-metric-card">
                  <span className="public-metric-value">{stat.value}</span>
                  <h3>{stat.label}</h3>
                  <p>{stat.description}</p>
                </article>
              ))}
            </div>
            <p className="public-metric-footnote">{content.metrics.footnote}</p>
          </section>

          <section className="public-support">
            <div className="public-section-header">
              <h2>{content.support.title}</h2>
              <p>{content.support.subtitle}</p>
            </div>
            <div className="public-support-body">
              {content.support.paragraphs.map(text => (
                <p key={text}>{text}</p>
              ))}
            </div>
          </section>

          {newsSection && (
            <section className="public-news">
              <div className="public-section-header">
                <h2>{newsSection.title}</h2>
                <p>{newsSection.subtitle}</p>
              </div>
              <div className="public-news-grid">
                {newsItems.map(article => (
                  <article key={article.slug} className="public-news-card">
                    <img
                      src={resolveIllustration(article.imageKey)}
                      alt={article.imageAlt}
                      className="public-news-image"
                    />
                    <div className="public-news-content">
                      <p className="public-news-date">
                        {newsSection.dateLabel}: {renderPublishedDate(article.publishedDate, article.publishedAt)}
                      </p>
                      <h3>{article.title}</h3>
                      <p>{article.summary}</p>
                      <Link to={`/news/${article.slug}`} className="public-news-link">
                        {newsSection.readMoreLabel}
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="public-closing">
            <div className="public-section-header">
              <h2>{content.closing.title}</h2>
            </div>
            <div className="public-closing-body">
              {content.closing.paragraphs.map(text => (
                <p key={text}>{text}</p>
              ))}
              <Link to="/login" className="public-cta">
                {content.closing.ctaLabel}
              </Link>
            </div>
          </section>
        </main>
      )}
    </div>
  );
};
