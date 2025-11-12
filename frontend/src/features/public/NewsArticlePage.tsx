import { Link, Navigate, useParams } from "../../lib/router";
import { AuthPanel, type AuthPanelProps } from "../auth/AuthPanel";
import { LanguageSelector } from "../../components/LanguageSelector";
import { useTranslation } from "../../i18n";
import { newsArticles, getArticleImageAlt, getArticleTranslation } from "./newsData";

type NewsArticlePageProps = AuthPanelProps;

export const NewsArticlePage = (props: NewsArticlePageProps) => {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const article = newsArticles.find(item => item.slug === slug);

  if (!article) {
    return <Navigate to="/" replace />;
  }

  const translation = getArticleTranslation(article, language);
  const formattedDate = new Date(article.date).toLocaleDateString(language, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="public-shell">
      <header className="public-hero">
        <div className="public-hero-inner public-hero-inner--article">
          <div className="public-hero-copy">
            <div className="public-top-row">
              <span className="public-brand">HlCoAi</span>
              <LanguageSelector className="public-language" />
            </div>
            <nav className="public-breadcrumbs">
              <Link to="/" className="public-back-link">
                {t("landing.news.back")}
              </Link>
            </nav>
            <h1>{translation.title}</h1>
            <p className="public-hero-lead">
              {t("landing.news.published", { date: formattedDate })}
            </p>
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
        <article className="public-article">
          <img
            src={article.image}
            alt={getArticleImageAlt(article, language)}
            className="public-article-image"
          />
          <div className="public-article-body">
            {translation.content.map((block, index) => {
              if (block.type === "list") {
                return (
                  <ul key={index} className="public-article-list">
                    {block.items.map(item => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={index}>
                  {block.text}
                </p>
              );
            })}
          </div>
        </article>
      </main>
    </div>
  );
};
