import researchImage from "../../assets/news-research.svg";
import foodImage from "../../assets/news-food.svg";
import aiImage from "../../assets/news-ai.svg";
import type { LanguageCode } from "../../i18n";

type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

type NewsTranslation = {
  title: string;
  summary: string;
  content: ContentBlock[];
};

export type NewsArticle = {
  slug: string;
  date: string;
  image: string;
  imageAlt: Record<LanguageCode | "en", string>;
  translations: Record<LanguageCode | "en", NewsTranslation>;
};

export const newsArticles: NewsArticle[] = [
  {
    slug: "daily-pressure-tracking",
    date: "2025-02-11",
    image: researchImage,
    imageAlt: {
      ru: "График артериального давления и увеличительное стекло",
      en: "Blood pressure trend with magnifying glass",
      de: "Blutdruckkurve mit Lupe",
      es: "Gráfico de presión arterial con lupa",
    },
    translations: {
      ru: {
        title: "Ежедневное измерение давления снижает риск инсульта на 18%",
        summary:
          "Новое исследование показало, что люди, которые ведут цифровой дневник давления и пульса, получают более точные назначения и реже попадают в стационар.",
        content: [
          {
            type: "paragraph",
            text:
              "Команда Европейского общества кардиологов проанализировала данные 8 400 пациентов и обнаружила: регулярное измерение давления с фиксацией значений в приложении помогает врачу быстрее корректировать терапию.",
          },
          {
            type: "paragraph",
            text:
              "Пациенты, которые записывали показатели ежедневно, реже сталкивались с кризами и сообщали о лучшем самочувствии через три месяца наблюдения.",
          },
          {
            type: "list",
            items: [
              "18% снижение риска госпитализации из-за осложнений гипертонии",
              "12 дней в среднем экономии времени до корректировки лечения",
              "В 2 раза выше приверженность рекомендациям врача",
            ],
          },
          {
            type: "paragraph",
            text:
              "Регулярные записи позволяют алгоритмам HlCoAi отмечать тревожные тенденции и подсказывать, когда стоит обратиться к специалисту очно.",
          },
        ],
      },
      en: {
        title: "Daily pressure tracking lowers stroke risk by 18%",
        summary:
          "A new European study shows that people who log blood pressure and pulse in a digital journal receive more precise treatment adjustments and avoid emergency hospitalizations.",
        content: [
          {
            type: "paragraph",
            text:
              "Researchers from the European Society of Cardiology analysed data from 8,400 patients. They found that consistent home measurements recorded in an app help doctors fine-tune therapy faster.",
          },
          {
            type: "paragraph",
            text:
              "Participants who logged values every day experienced fewer hypertensive crises and reported better wellbeing after three months.",
          },
          {
            type: "list",
            items: [
              "18% lower risk of hypertension-related hospitalizations",
              "12 days saved on average before medication adjustments",
              "Twice the adherence to physician recommendations",
            ],
          },
          {
            type: "paragraph",
            text:
              "Consistent entries allow HlCoAi algorithms to highlight concerning trends and suggest when to schedule an in-person visit.",
          },
        ],
      },
      de: {
        title: "Tägliche Blutdruckmessung senkt das Schlaganfallrisiko um 18 %",
        summary:
          "Eine neue Studie zeigt, dass Menschen mit digitalem Blutdrucktagebuch schneller die richtige Therapie erhalten und seltener in die Klinik müssen.",
        content: [
          { type: "paragraph", text: "Die vollständige Studie ist in englischer Sprache verfügbar." },
        ],
      },
      es: {
        title: "Medir la presión a diario reduce el riesgo de ictus en un 18 %",
        summary:
          "El seguimiento digital del pulso y la presión ayuda a los médicos a ajustar el tratamiento y evita ingresos de urgencia.",
        content: [
          { type: "paragraph", text: "El artículo completo está disponible en inglés." },
        ],
      },
    },
  },
  {
    slug: "nutrition-habits-2025",
    date: "2025-01-28",
    image: foodImage,
    imageAlt: {
      ru: "Тарелка с полезной едой и инфографика",
      en: "Healthy plate with nutrition infographic",
      de: "Gesunde Mahlzeit mit Infografik",
      es: "Plato saludable con infografía",
    },
    translations: {
      ru: {
        title: "Гибкие пищевые привычки помогают удерживать вес без строгих диет",
        summary:
          "Аналитики HlCoAi изучили 12 000 пищевых дневников и выяснили, что мягкая корректировка рациона работает лучше строгих ограничений.",
        content: [
          {
            type: "paragraph",
            text:
              "Мы сравнили пользователей, которые переходили на экстремальные диеты, и тех, кто постепенно снижал калорийность и увеличивал количество овощей.",
          },
          {
            type: "list",
            items: [
              "82% участников с гибким подходом удержали цельный вес более 6 месяцев",
              "Группа строгих диет показала вдвое больше срывов и скачков глюкозы",
              "Фототрекинг блюд повышал осознанность питания и помогал видеть реальный прогресс",
            ],
          },
          {
            type: "paragraph",
            text:
              "Нутрициолог HlCoAi рекомендует сочетать лёгкое снижение калорий, добавление белка и планирование приёмов пищи на неделю вперёд.",
          },
          {
            type: "paragraph",
            text:
              "В приложении доступен AI-анализ фотографий — он мгновенно оценивает калорийность и подсказывает баланс БЖУ.",
          },
        ],
      },
      en: {
        title: "Flexible eating habits keep weight stable without harsh diets",
        summary:
          "HlCoAi analysed 12,000 nutrition logs and discovered that gradual adjustments outperform restrictive plans.",
        content: [
          {
            type: "paragraph",
            text:
              "We compared users who adopted extreme diets with those who gently reduced calories while adding vegetables and lean proteins.",
          },
          {
            type: "list",
            items: [
              "82% of flexible eaters maintained their target weight for six months",
              "Strict diet users experienced twice as many relapses and glucose spikes",
              "Photo tracking increased awareness and made progress visible in real time",
            ],
          },
          {
            type: "paragraph",
            text:
              "The HlCoAi nutrition coach suggests combining mild calorie reduction, added protein, and weekly meal planning.",
          },
          {
            type: "paragraph",
            text:
              "Our AI photo analysis instantly estimates calories and highlights macronutrient balance.",
          },
        ],
      },
      de: {
        title: "Flexible Essgewohnheiten stabilisieren das Gewicht",
        summary:
          "Sanfte Anpassungen wirken besser als strenge Diäten, zeigt unsere Analyse.",
        content: [
          { type: "paragraph", text: "Die vollständige Studie lesen Sie in der englischen Fassung." },
        ],
      },
      es: {
        title: "Hábitos flexibles ayudan a mantener el peso estable",
        summary:
          "Pequeños ajustes superan a las dietas rígidas según nuestros datos.",
        content: [
          { type: "paragraph", text: "La versión completa del artículo está disponible en inglés." },
        ],
      },
    },
  },
  {
    slug: "assistant-night-updates",
    date: "2024-12-18",
    image: aiImage,
    imageAlt: {
      ru: "Голограмма ассистента и светящиеся панели",
      en: "Virtual assistant hologram with glowing panels",
      de: "Virtueller Assistent mit schwebenden Paneelen",
      es: "Asistente virtual con paneles luminosos",
    },
    translations: {
      ru: {
        title: "AI-ассистент HlCoAi теперь отвечает на запросы 24/7",
        summary:
          "Мы расширили покрытие ночных смен — специалисты проверяют рекомендации алгоритма и дополняют их контекстом.",
        content: [
          {
            type: "paragraph",
            text:
              "Команда медицинских редакторов внедрила новую систему контроля качества. Каждая ночная сессия ассистента теперь сопровождается проверкой врача-консультанта.",
          },
          {
            type: "paragraph",
            text:
              "Если у алгоритма возникают сомнения, пользователь получает уведомление с приглашением на быстрый созвон с клиническим специалистом.",
          },
          {
            type: "list",
            items: [
              "Среднее время ответа ночью сократилось до 2 минут",
              "70% запросов получают расширенные рекомендации по образу жизни",
              "Добавлены тревожные триггеры: при риске осложнений ассистент советует вызвать скорую",
            ],
          },
          {
            type: "paragraph",
            text:
              "Чтобы протестировать обновление, достаточно оформить прозрачную подписку в разделе тарифа — лимит запросов увеличен до 60 в месяц.",
          },
        ],
      },
      en: {
        title: "The HlCoAi assistant now covers night shifts 24/7",
        summary:
          "Our clinical editors validate overnight answers and add human context to every critical recommendation.",
        content: [
          {
            type: "paragraph",
            text:
              "A refreshed quality-control pipeline ensures that each night session is reviewed by a physician before the response is delivered.",
          },
          {
            type: "paragraph",
            text:
              "If the algorithm detects uncertainty, users receive an alert with a link to schedule a quick call with a clinician.",
          },
          {
            type: "list",
            items: [
              "Average response time overnight dropped to two minutes",
              "70% of conversations now include extended lifestyle advice",
              "New safety triggers escalate urgent symptoms to emergency guidance",
            ],
          },
          {
            type: "paragraph",
            text:
              "Upgrade to the transparent subscription in the billing tab to try the enhanced assistant with 60 monthly requests.",
          },
        ],
      },
      de: {
        title: "Der HlCoAi-Assistent antwortet jetzt rund um die Uhr",
        summary:
          "Nachtschichten werden zusätzlich von Ärzt:innen überwacht.",
        content: [
          { type: "paragraph", text: "Die ausführliche Version steht auf Englisch zur Verfügung." },
        ],
      },
      es: {
        title: "El asistente de HlCoAi responde 24/7",
        summary:
          "El equipo clínico revisa las respuestas nocturnas para mayor seguridad.",
        content: [
          { type: "paragraph", text: "Consulte la versión completa en inglés." },
        ],
      },
    },
  },
];

export const getArticleTranslation = (article: NewsArticle, language: LanguageCode): NewsTranslation => {
  return article.translations[language] ?? article.translations.en;
};

export const getArticleImageAlt = (article: NewsArticle, language: LanguageCode): string => {
  return article.imageAlt[language] ?? article.imageAlt.en;
};
