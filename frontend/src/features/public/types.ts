export type LandingFeature = {
  title: string;
  description: string;
  body: string;
  imageKey: string;
  bullets: string[];
};

export type LandingStep = {
  title: string;
  description: string;
  imageKey: string;
  bullets: string[];
};

export type LandingStory = {
  name: string;
  role: string;
  quote: string;
  text: string;
  imageKey: string;
};

export type LandingStat = {
  value: string;
  label: string;
  description: string;
};

export type LandingContent = {
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
    description: string;
    highlights: string[];
    imageKey: string;
    imageCaption: string;
    ctaLabel: string;
    loginLabel: string;
  };
  introduction: {
    title: string;
    paragraphs: string[];
  };
  pillars: {
    title: string;
    subtitle: string;
    items: LandingFeature[];
  };
  journey: {
    title: string;
    subtitle: string;
    steps: LandingStep[];
  };
  stories: {
    title: string;
    subtitle: string;
    items: LandingStory[];
  };
  metrics: {
    title: string;
    subtitle: string;
    stats: LandingStat[];
    footnote: string;
  };
  support: {
    title: string;
    subtitle: string;
    paragraphs: string[];
  };
  closing: {
    title: string;
    paragraphs: string[];
    ctaLabel: string;
  };
  newsSection: {
    title: string;
    subtitle: string;
    readMoreLabel: string;
    backLabel: string;
    publishedLabel: string;
    dateLabel: string;
  };
};

export type NewsSummary = {
  slug: string;
  title: string;
  summary: string;
  imageKey: string;
  imageAlt: string;
  publishedAt: string;
};

export type LandingResponse = {
  locale: string;
  content: LandingContent;
  news: {
    articles: NewsSummary[];
  };
};

export type ArticleBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string; attribution?: string };

export type NewsArticleResponse = {
  locale: string;
  article: {
    slug: string;
    title: string;
    summary: string;
    imageKey: string;
    imageAlt: string;
    publishedAt: string;
    content: ArticleBlock[];
  };
  labels: {
    backLabel: string;
    publishedLabel: string;
    dateLabel: string;
    loginLabel: string;
  };
};
