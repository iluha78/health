export type NewsTranslation = {
  title: string;
  summary: string;
};

export type NewsItem = {
  id: string;
  date: string;
  link?: string;
  translations: Record<string, NewsTranslation>;
};

export const newsItems: NewsItem[] = [
  {
    id: "ai-coach-update",
    date: "2025-02-12",
    link: "https://example.com/blog/ai-coach",
    translations: {
      ru: {
        title: "AI-ассистент научился учитывать ваш образ жизни",
        summary:
          "Теперь рекомендации подстраиваются под уровень активности и привычки сна, чтобы поддерживать здоровое давление и пульс.",
      },
      en: {
        title: "AI coach now adapts to your daily routine",
        summary:
          "Personalised insights consider your activity level and sleep habits to keep blood pressure and pulse in the safe zone.",
      },
      de: {
        title: "Der KI-Coach passt sich Ihrem Alltag an",
        summary:
          "Individuelle Tipps berücksichtigen jetzt Aktivitätsniveau und Schlafgewohnheiten für stabile Werte.",
      },
      es: {
        title: "El entrenador con IA se adapta a tu rutina diaria",
        summary:
          "Los consejos personalizados tienen en cuenta tu nivel de actividad y hábitos de sueño para mantener los valores seguros.",
      },
    },
  },
  {
    id: "nutrition-photo-release",
    date: "2025-01-28",
    link: "https://example.com/blog/nutrition-photo",
    translations: {
      ru: {
        title: "Оценка калорий по фото стала точнее",
        summary:
          "Обновили модель распознавания блюд: теперь нутрициолог быстрее анализирует состав и рекомендует баланс рациона.",
      },
      en: {
        title: "Photo calorie estimation just got smarter",
        summary:
          "Our nutritionist model recognises dishes faster and recommends balanced meals with higher accuracy.",
      },
      de: {
        title: "Kalorienbewertung per Foto wird präziser",
        summary:
          "Das neue Modell erkennt Mahlzeiten schneller und liefert ausgewogene Ernährungsempfehlungen.",
      },
      es: {
        title: "La estimación de calorías por foto es más precisa",
        summary:
          "El nuevo modelo reconoce platos con mayor rapidez y sugiere un plan equilibrado al instante.",
      },
    },
  },
  {
    id: "community-launch",
    date: "2024-12-10",
    translations: {
      ru: {
        title: "Запустили клуб пользователей HlCoAi",
        summary:
          "Общайтесь с экспертами, делитесь опытом контроля холестерина и следите за новыми мероприятиями.",
      },
      en: {
        title: "HlCoAi community space is live",
        summary:
          "Connect with specialists, share cholesterol-control progress, and stay tuned for live sessions.",
      },
      de: {
        title: "Die HlCoAi Community ist gestartet",
        summary:
          "Tauschen Sie sich mit Expertinnen aus, teilen Sie Erfolge und verpassen Sie keine Live-Sessions.",
      },
      es: {
        title: "Lanzamos la comunidad HlCoAi",
        summary:
          "Habla con especialistas, comparte tu progreso y descubre nuevos eventos en directo.",
      },
    },
  },
];
