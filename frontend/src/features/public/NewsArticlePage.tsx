import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "../../lib/router";
import { LanguageSelector } from "../../components/LanguageSelector";
import { useTranslation } from "../../i18n";
import { fetchNewsArticle } from "./api";
import { resolveIllustration } from "./imageMap";
import type { ArticleBlock, NewsArticleResponse } from "./types";

export const NewsArticlePage = () => {
  const { slug } = useParams();
  const { i18n } = useTranslation();
  const language = i18n.language;
  const [data, setData] = useState<NewsArticleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);

    fetchNewsArticle(slug, language)
      .then(response => {
        if (!cancelled) {
          setData(response);
        }
      })
      .catch(error => {
        if (cancelled) {
          return;
        }
        const status = (error as Error & { status?: number }).status;
        if (status === 404) {
          setNotFound(true);
        } else {
          setError(language === "ru" ? "Не удалось загрузить новость" : "Failed to load the article");
        }
        setData(null);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [language, slug]);

  if (!slug || notFound) {
    return <Navigate to="/" replace />;
  }

  const labels = data?.labels;
  const article = data?.article;
  const publishedDate = article ? new Date(article.publishedAt) : null;

  return (
    <div className="public-shell">
      <header className="public-hero">
        <div className="public-hero-inner public-hero-inner--article">
          <div className="public-hero-copy">
            <div className="public-top-row">
              <span className="public-brand">HlCoAi</span>
              <LanguageSelector className="public-language" />
              {labels && (
                <Link to="/login" className="public-hero-login">
                  {labels.loginLabel}
                </Link>
              )}
            </div>
            <nav className="public-breadcrumbs">
              <Link to="/" className="public-back-link">
                {labels?.backLabel ?? "← Back"}
              </Link>
            </nav>
            {loading && <h1>…</h1>}
            {!loading && article && <h1>{article.title}</h1>}
            {!loading && article && labels && publishedDate && (
              <p className="public-hero-lead">
                {labels.publishedLabel}: {publishedDate.toLocaleDateString(language, {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
            {error && <p className="public-error-text">{error}</p>}
          </div>
        </div>
      </header>

      {!loading && article && (
        <main className="public-content">
          <article className="public-article">
            <img
              src={resolveIllustration(article.imageKey)}
              alt={article.imageAlt}
              className="public-article-image"
            />
            <div className="public-article-body">
              {article.content.map((block: ArticleBlock, index) => {
                if (block.type === "list") {
                  return (
                    <ul key={`${block.type}-${index}`} className="public-article-list">
                      {block.items.map(item => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  );
                }
                if (block.type === "quote") {
                  return (
                    <blockquote key={`${block.type}-${index}`} className="public-article-quote">
                      {block.text}
                      {block.attribution && <cite>{block.attribution}</cite>}
                    </blockquote>
                  );
                }
                return (
                  <p key={`${block.type}-${index}`}>
                    {block.text}
                  </p>
                );
              })}
            </div>
          </article>
        </main>
      )}
    </div>
  );
};
