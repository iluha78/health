CREATE TABLE IF NOT EXISTS public_pages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(64) NOT NULL,
    locale VARCHAR(5) NOT NULL,
    payload LONGTEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_public_pages_slug_locale (slug, locale)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS news_articles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(128) NOT NULL,
    locale VARCHAR(5) NOT NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    content LONGTEXT NOT NULL,
    image_key VARCHAR(64) NOT NULL,
    image_alt VARCHAR(255) NOT NULL,
    published_at DATETIME NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_news_slug_locale (slug, locale),
    KEY idx_news_published (published_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO public_pages (slug, locale, payload) VALUES
('landing', 'ru', '{
  "hero": {
    "eyebrow": "Сердце под контролем каждый день",
    "title": "HlCoAi сопровождает здоровье, когда нет рядом клиники",
    "lead": "Мы объединяем давление, анализы, сон и питание в единую историю, чтобы вы и ваш врач видели динамику без догадок",
    "description": "Команда кардиологов, нутрициологов и специалистов по данным помогает выстроить устойчивые привычки и вовремя замечать тревожные сигналы",
    "highlights": [
      "Алгоритмы анализируют измерения и объясняют, что значат цифры",
      "Куратор связывается, если показатели выходят за пределы нормы",
      "Готовим отчеты для приема, чтобы разговор с врачом был предметным"
    ],
    "imageKey": "hero-cardiology",
    "imageCaption": "Пульс, давление и советы специалистов на единой панели",
    "ctaLabel": "Войти",
    "loginLabel": "Войти"
  },
  "introduction": {
    "title": "Основано на ежедневной практике с тысячами измерений",
    "paragraphs": [
      "HlCoAi родился в клинических программах наблюдения пациентов с гипертонией и метаболическим синдромом. Мы знаем, как сложно вести дневники, собирать рекомендации и не терять мотивацию, поэтому собрали все в платформе, где данные автоматически превращаются в подсказки и планы действий",
      "Каждое утро вы получаете обзор ключевых метрик, а вечером мягкие напоминания о привычках. Мы помогаем держать под контролем не только давление и холестерин, но и сон, стресс и питание, чтобы здоровье стало понятным проектом, а не набором случайных мер"
    ]
  },
  "pillars": {
    "title": "Четыре опоры цифрового сопровождения",
    "subtitle": "Мониторинг, советы, обучение и поддержка близких работают вместе",
    "items": [
      {
        "title": "Дневник давления и пульса",
        "description": "Точные графики, автоматические пороги и напоминания помогают видеть тенденции, а не отдельные всплески",
        "body": "Мы собираем измерения с тонометров, часов и ручных записей, отмечаем подозрительные сочетания и формируем рекомендации по режиму дня",
        "imageKey": "feature-monitor",
        "bullets": [
          "Подсказки по времени и позе измерения",
          "Сигналы о рисках при резком росте пульса",
          "Готовый отчет для врача в PDF"
        ]
      },
      {
        "title": "Нутрициолог и фото дневник",
        "description": "Достаточно сфотографировать блюдо, чтобы узнать калорийность и получить идеи, как сбалансировать меню",
        "body": "Алгоритмы анализируют состав, а диетологи дают понятные комментарии что добавить, что убрать и чем заменить без стресса",
        "imageKey": "feature-nutrition",
        "bullets": [
          "Точность оценки блюд до 92 процентов",
          "Сезонные планы питания по целям",
          "Поддержка при изменении веса"
        ]
      },
      {
        "title": "AI ассистент и живая команда",
        "description": "Вопросы о таблетках, самочувствии или тренировке разбираем в чате: сначала AI, затем куратор, если нужен человек",
        "body": "Мы не заменяем врача, но помогаем подготовиться к визиту, собрать симптомы и не забыть важные детали",
        "imageKey": "feature-assistant",
        "bullets": [
          "Ответы двадцать четыре семь на понятном языке",
          "Подсказки, когда стоит сделать анализ",
          "Проверка опасных комбинаций препаратов"
        ]
      },
      {
        "title": "Подписка без сюрпризов",
        "description": "Один тариф покрывает консультации, аналитику и отчетность без скрытых платежей",
        "body": "Вы знаете, на что уходят средства: на технологии анализа, специалистов и поддержку, которая всегда на связи",
        "imageKey": "feature-subscription",
        "bullets": [
          "Прозрачные лимиты на AI запросы",
          "Семейный доступ для близких",
          "Оплата раз в месяц или год"
        ]
      }
    ]
  },
  "journey": {
    "title": "Как выглядит путь участника",
    "subtitle": "От первых измерений до устойчивого самочувствия шаг за шагом",
    "steps": [
      {
        "title": "Диагностика и цели",
        "description": "Начинаем с профиля: измерения, лекарства, привычки. Алгоритм подсвечивает риски и формирует базовый план",
        "imageKey": "journey-track",
        "bullets": [
          "Импорт данных из устройств и дневников",
          "Сравнение с клиническими целями",
          "Рекомендации для первого месяца"
        ]
      },
      {
        "title": "Активная поддержка",
        "description": "Каждую неделю вы получаете короткий отчет, а куратор проверяет показатели и дает советы как скорректировать режим",
        "imageKey": "journey-coach",
        "bullets": [
          "Личные сообщения с напоминаниями",
          "Совместные планы с семьей",
          "AI анализ изменений давления"
        ]
      },
      {
        "title": "Уверенное управление",
        "description": "Через три месяца формируется стабильный ритм: привычки закреплены, показатели выровнены, тревога уступает место пониманию",
        "imageKey": "journey-celebrate",
        "bullets": [
          "Сценарии действий при отклонениях",
          "Выгрузка истории для врача",
          "Регулярные обзоры прогресса"
        ]
      }
    ]
  },
  "stories": {
    "title": "Истории участников",
    "subtitle": "Реальные семьи и специалисты делятся, как HlCoAi вписался в их жизнь",
    "items": [
      {
        "name": "Ольга, 54 года",
        "role": "инженер строитель",
        "quote": "\"Когда давление скакало ночью, я не знала что делать. Теперь у меня есть сценарий и команда, которая все объясняет\"",
        "text": "После инсульта мужа я боялась, что упускаю свои симптомы. HlCoAi показал, как питание и стресс влияют на давление, и научил менять режим постепенно",
        "imageKey": "story-olga"
      },
      {
        "name": "Игорь, 38 лет",
        "role": "тренер по плаванию",
        "quote": "\"Важно не только тренироваться, но и знать, как организм восстанавливается. Платформа дает мне эту уверенность\"",
        "text": "Я веду команду подростков и часто перегружал себя. Система подсказала, когда пульс на тренировках зашкаливает, и помогла сбалансировать нагрузку",
        "imageKey": "story-igor"
      },
      {
        "name": "Алла Николаевна",
        "role": "кардиолог и куратор программ",
        "quote": "\"Цифровой дневник дисциплинирует пациентов и экономит время на приеме: мы обсуждаем действия, а не вспоминаем факты\"",
        "text": "Врачам нужны точные данные, а пациентам поддержка. HlCoAi создает мост: я вижу динамику и могу вовремя подключиться, не перегружая человека сообщениями",
        "imageKey": "story-alla"
      }
    ]
  },
  "metrics": {
    "title": "Измерим результат цифрами",
    "subtitle": "Мы анализировали 12 400 отчетов и увидели устойчивые изменения у участников программ",
    "stats": [
      {
        "value": "-9 мм рт. ст.",
        "label": "Среднее снижение САД",
        "description": "Через восемь недель регулярного контроля и корректировок"
      },
      {
        "value": "+28%",
        "label": "Соблюдение назначения",
        "description": "Пациенты чаще выполняют рекомендации врачей"
      },
      {
        "value": "92%",
        "label": "Оценка удовлетворенности",
        "description": "По опросу после трех месяцев сопровождения"
      }
    ],
    "footnote": "*Данные собраны в когортах пользователей с подпиской PRO в 2023 2024 годах"
  },
  "support": {
    "title": "Нам важно вовремя помочь",
    "subtitle": "Команда кураторов дежурит, чтобы вы не оставались наедине с тревогой",
    "paragraphs": [
      "Если показатели резко выходят за пределы целевых значений, мы свяжемся с вами или вашим доверенным лицом и предложим действия до визита к врачу",
      "Поддержка доступна в мессенджере, по телефону и на регулярных онлайн встречах. Вы всегда знаете, к кому обратиться и какие шаги предпринять"
    ]
  },
  "closing": {
    "title": "Присоединяйтесь, чтобы управлять здоровьем осознанно",
    "paragraphs": [
      "HlCoAi подстраивается под ваш ритм: кто то отмечает показатели ежедневно, кто то несколько раз в неделю. В любом сценарии вы получаете понятные подсказки и поддержку",
      "Начните со входа в личный кабинет и расскажите нам о своих целях мы поможем превратить заботу о сердце в привычку"
    ],
    "ctaLabel": "Войти в личный кабинет"
  },
  "newsSection": {
    "title": "Новости сообщества HlCoAi",
    "subtitle": "Рассказываем о новых функциях, исследованиях и историях участников",
    "readMoreLabel": "Читать полностью",
    "backLabel": "← Ко всем новостям",
    "publishedLabel": "Опубликовано",
    "dateLabel": "Дата"
  }
}'),
('landing', 'en', '{
  "hero": {
    "eyebrow": "Daily confidence in your heart health",
    "title": "HlCoAi supports you between clinic visits",
    "lead": "We combine pressure, labs, sleep, and meals into a single story so you and your clinician see clear dynamics",
    "description": "Cardiologists, nutritionists, and data specialists work together to build lasting habits and detect risk signals in time",
    "highlights": [
      "Algorithms interpret every reading and explain what the numbers mean",
      "A care coach reaches out when metrics drift beyond the safe zone",
      "Download structured visit reports so each appointment is focused and efficient"
    ],
    "imageKey": "hero-cardiology",
    "imageCaption": "Pressure, heart rate, and expert advice on one dashboard",
    "ctaLabel": "Sign in",
    "loginLabel": "Sign in"
  },
  "introduction": {
    "title": "Built with thousands of daily measurements",
    "paragraphs": [
      "HlCoAi grew inside long term hypertension and metabolic programmes. We know how exhausting paper logs and scattered recommendations can be, so we turn raw numbers into timely nudges and plans",
      "Each morning you receive a snapshot of key metrics and every evening gentle reminders help you stay on track. Beyond pressure and cholesterol we monitor sleep, stress, and nutrition so health management becomes an understandable project"
    ]
  },
  "pillars": {
    "title": "Four pillars of guided care",
    "subtitle": "Monitoring, advice, learning, and family support work together",
    "items": [
      {
        "title": "Blood pressure journal",
        "description": "Granular trends, automatic thresholds, and reminders reveal patterns instead of isolated spikes",
        "body": "We aggregate data from devices and manual notes, flag risky combinations, and suggest daily routine adjustments",
        "imageKey": "feature-monitor",
        "bullets": [
          "Smart prompts about position and timing",
          "Alerts when heart rate rises abruptly",
          "Physician ready PDF reports"
        ]
      },
      {
        "title": "Nutrition coach with photos",
        "description": "Snap a meal to understand calories and receive actionable swaps to balance the plate",
        "body": "Computer vision estimates nutrients while dietitians provide approachable comments without strict restrictions",
        "imageKey": "feature-nutrition",
        "bullets": [
          "Up to ninety two percent accuracy on common dishes",
          "Seasonal meal plans by goal",
          "Guidance for weight management"
        ]
      },
      {
        "title": "AI assistant plus human experts",
        "description": "Ask about medication, symptoms, or workouts; AI responds instantly and escalates to a coach when a human voice is needed",
        "body": "We do not replace clinicians but prepare you for the visit with structured history and clarifying questions",
        "imageKey": "feature-assistant",
        "bullets": [
          "Twenty four seven answers in plain language",
          "Reminders when labs are due",
          "Safety checks for risky combinations"
        ]
      },
      {
        "title": "Transparent subscription",
        "description": "One plan covers consultations, analytics, and reporting with no hidden fees",
        "body": "You know where the resources go: data science, medical experts, and proactive outreach whenever you need it",
        "imageKey": "feature-subscription",
        "bullets": [
          "Clear AI usage allowance",
          "Family access for caregivers",
          "Monthly or annual billing options"
        ]
      }
    ]
  },
  "journey": {
    "title": "What the journey feels like",
    "subtitle": "From the first measurements to steady confidence",
    "steps": [
      {
        "title": "Discover and align",
        "description": "We start with your profile: readings, medication, lifestyle. The system highlights risks and drafts a starter plan",
        "imageKey": "journey-track",
        "bullets": [
          "Import from wearables and logs",
          "Compare against clinical goals",
          "First month actions tailored to you"
        ]
      },
      {
        "title": "Guided routines",
        "description": "Weekly recaps show what changed, while a coach checks in and suggests simple adjustments",
        "imageKey": "journey-coach",
        "bullets": [
          "Personal nudges and reminders",
          "Plans you can share with family",
          "AI insights into pressure shifts"
        ]
      },
      {
        "title": "Confident control",
        "description": "After three months most members gain a rhythm: habits stick, metrics stabilise, and they know how to react to deviations",
        "imageKey": "journey-celebrate",
        "bullets": [
          "Ready to use action playbooks",
          "Exportable history for clinicians",
          "Regular progress reviews"
        ]
      }
    ]
  },
  "stories": {
    "title": "Member voices",
    "subtitle": "Families and clinicians describe how HlCoAi fits their routine",
    "items": [
      {
        "name": "Olga, 54",
        "role": "civil engineer",
        "quote": "\"Night time spikes felt scary. Now I have a plan and a team that explains every change\"",
        "text": "After her husband’s stroke Olga worried she was missing her own symptoms. HlCoAi revealed how stress and meals affected her pressure and suggested gradual adjustments",
        "imageKey": "story-olga"
      },
      {
        "name": "Igor, 38",
        "role": "swim coach",
        "quote": "\"Training is only half the story; recovery matters just as much. The platform gives me that insight\"",
        "text": "Coaching teenagers meant Igor often overtrained. The system highlighted when his heart rate stayed elevated and guided him to balance load and rest",
        "imageKey": "story-igor"
      },
      {
        "name": "Dr. Alla",
        "role": "cardiologist and care lead",
        "quote": "\"A digital log disciplines patients and saves time at the appointment—we discuss actions instead of guessing timelines\"",
        "text": "Clinicians need reliable data while patients need reassurance. HlCoAi builds that bridge so I can step in early without overwhelming people with messages",
        "imageKey": "story-alla"
      }
    ]
  },
  "metrics": {
    "title": "Measured outcomes",
    "subtitle": "Insights from 12 400 progress reviews across our programmes",
    "stats": [
      {
        "value": "-9 mm Hg",
        "label": "Average systolic drop",
        "description": "After eight weeks of guided monitoring"
      },
      {
        "value": "+28%",
        "label": "Adherence uplift",
        "description": "Members follow clinician advice more consistently"
      },
      {
        "value": "92%",
        "label": "Satisfaction score",
        "description": "Reported after three months on the plan"
      }
    ],
    "footnote": "*Aggregated across PRO subscribers in 2023 2024"
  },
  "support": {
    "title": "Support when it matters",
    "subtitle": "Coaches stay on call so you never feel alone with a worrying number",
    "paragraphs": [
      "If metrics drift beyond safe ranges we contact you or a caregiver with immediate guidance before your clinician visit",
      "Help is available via messenger, phone, and live sessions. You always know who to reach and which steps to take"
    ]
  },
  "closing": {
    "title": "Join to manage health with clarity",
    "paragraphs": [
      "HlCoAi adapts to your rhythm—log daily or a few times a week and still receive digestible insights and encouragement",
      "Start by signing in and sharing your goals; we will help turn heart care into a sustainable habit"
    ],
    "ctaLabel": "Sign in"
  },
  "newsSection": {
    "title": "HlCoAi community news",
    "subtitle": "Product updates, research findings, and member stories",
    "readMoreLabel": "Read the full story",
    "backLabel": "← Back to all news",
    "publishedLabel": "Published",
    "dateLabel": "Date"
  }
}');

INSERT INTO news_articles (slug, locale, title, summary, content, image_key, image_alt, published_at) VALUES
('ai-pulse-coach', 'ru', 'AI-куратор следит за давлением без лишних тревог', 'Мы обучили модель замечать опасные сочетания давления и пульса и связываться с куратором, если риск подтверждается', '[{"type":"paragraph","text":"Алгоритм анализирует каждое измерение в контексте последних двух недель, учитывая сон, активность и прием лекарств"},{"type":"paragraph","text":"Если видим устойчивый рост давления и учащение пульса, пользователь получает сценарий действий, а куратор подключается к диалогу"},{"type":"list","items":["Тревоги отправляются только при подтвержденном риске","Журнал фиксирует, какие рекомендации были выполнены","Врач получает краткий отчет перед консультацией"]},{"type":"paragraph","text":"В тестовой группе ложные срабатывания сократились на 37 процентов, а пользователи стали чаще делиться данными с врачами"}]', 'news-ai', 'Иллюстрация датчиков давления и пульса', '2024-05-14 09:00:00'),
('photo-nutrition-updates', 'ru', 'Фотоаналитика блюд распознает сезонные продукты', 'Добавили 180 популярных блюд из летнего и зимнего меню, чтобы подсказки были точнее и локальнее', '[{"type":"paragraph","text":"Мы обновили справочник рецептов и обучили модель распознавать окрошку, щавелевый суп, хурму и другие блюда, которые раньше приходилось вводить вручную"},{"type":"paragraph","text":"Теперь приложение предлагает замены с учетом сезона: летом легкие блюда и охлаждающие напитки, зимой согревающие супы и источники витамина D"},{"type":"quote","text":"\\"Нам важно, чтобы рекомендации звучали по делу, а не как общие советы из статьи\\"","attribution":"Ксения, нутрициолог HlCoAi"},{"type":"paragraph","text":"Точность распознавания на тестовой выборке выросла до 92 процентов, а пользователи стали на 24 процента чаще отмечать приемы пищи"}]', 'news-food', 'Тарелка с полезными продуктами', '2024-04-02 11:30:00'),
('research-outcomes', 'ru', 'Исследование: через три месяца участники реже попадают в стационар', 'Совместно с партнерской клиникой мы оценили влияние цифрового сопровождения на госпитализации', '[{"type":"paragraph","text":"Проанализировали 620 историй пациентов с гипертонией. Группа с HlCoAi реже попадала в стационар по неотложным показаниям 12 процентов против 19 процентов в контрольной группе"},{"type":"paragraph","text":"Главные факторы успеха: своевременные сообщения о рисках, совместный анализ препаратов и поддержка семьи через общий кабинет"},{"type":"list","items":["Среднее время реакции на опасный скачок давления сократилось до 26 минут","Пациенты чаще делились данными с лечащим врачом","70 процентов участников продолжили вести дневник после завершения исследования"]},{"type":"paragraph","text":"Мы открываем данные для научного сообщества и готовы обсуждать совместные проекты"}]', 'news-research', 'График со снижением рисков', '2024-03-12 15:45:00'),
('ai-pulse-coach', 'en', 'AI pulse coach reduces false alarms', 'Our model now evaluates risky pressure and heart rate combinations before escalating to a human coach', '[{"type":"paragraph","text":"The algorithm reviews each reading against two weeks of context including sleep, activity, and medication timing"},{"type":"paragraph","text":"When it detects sustained elevation it shares an action checklist with the member and pings a coach to join the conversation"},{"type":"list","items":["Alerts trigger only after a confirmed risk","The journal records which advice was followed","Clinicians receive a concise briefing before the visit"]},{"type":"paragraph","text":"In trials false positives dropped by 37 percent and members shared more data with their physicians"}]', 'news-ai', 'Illustration of sensors measuring pressure and pulse', '2024-05-14 09:00:00'),
('photo-nutrition-updates', 'en', 'Seasonal dishes arrive in photo nutrition', 'We added 180 popular recipes so guidance stays precise whether it is winter soups or summer salads', '[{"type":"paragraph","text":"The catalogue now recognises chilled okroshka, sorrel soup, persimmon desserts, and more meals that previously required manual entry"},{"type":"paragraph","text":"Recommendations adapt to the season: lighter meals and cooling drinks for summer, warming soups and vitamin D sources for winter"},{"type":"quote","text":"\\"Advice should sound specific, not like a generic article tip\\"","attribution":"Ksenia, HlCoAi nutritionist"},{"type":"paragraph","text":"Accuracy on the validation set reached 92 percent and members logged 24 percent more meals"}]', 'news-food', 'Plate filled with fresh produce', '2024-04-02 11:30:00'),
('research-outcomes', 'en', 'Study: guided care lowers hospitalisations', 'Together with a clinical partner we evaluated how digital support affects admissions', '[{"type":"paragraph","text":"We analysed 620 hypertension cases. Members using HlCoAi had fewer urgent admissions 12 percent versus 19 percent in the control group"},{"type":"paragraph","text":"Key drivers included timely risk alerts, collaborative medication reviews, and family support through shared access"},{"type":"list","items":["Average response time to dangerous spikes dropped to 26 minutes","Physicians received more frequent progress updates","70 percent of members kept logging after the study ended"]},{"type":"paragraph","text":"We plan to share anonymised findings with research partners interested in cardiology prevention"}]', 'news-research', 'Chart showing declining risk', '2024-03-12 15:45:00');
