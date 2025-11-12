import { useCallback, useMemo, useSyncExternalStore } from "react";

export const LANGUAGES = [
  { value: "ru", label: "Русский" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" }
] as const;

const resources = {
  ru: {
    translation: {
      common: {
        appName: "CholestoFit",
        tagline: "Персональные рекомендации по здоровью",
        account: "Аккаунт",
        balanceLabel: "Баланс",
        openSettings: "Открыть настройки",
        settings: "Настройки",
        logout: "Выйти",
        logoutTitle: "Выйти из аккаунта",
        menuLabel: "Основные разделы",
        loginRequired: "Необходимо войти в систему",
      aiAdviceUnavailable: "AI-советы недоступны",
      adviceRequestFailed: "Не удалось получить рекомендации",
      defaultDishTitle: "Блюдо",
      language: "Язык",
      close: "Закрыть",
      retry: "Повторить попытку",
      loading: "Загрузка...",
      notSpecified: "Не указано",
      no: "Нет",
      yes: "Да",
      dateFormatWarning: "Не удалось отформатировать дату",
      networkError: "Сеть/CORS: {{message}}",
      parseError: "Не удалось разобрать ответ",
      requestError: "Ошибка запроса ({{status}})"
      },
      tabs: {
        bp: "Давление и пульс",
        lipid: "Липидный профиль и сахар",
        nutrition: "Нутрициолог",
        assistant: "AI ассистент"
      },
      billing: {
        loading: "Загрузка данных тарифа...",
        adviceNotIncluded: "Ваш тариф не включает AI-советы.",
        assistantNotIncluded: "Ваш тариф не включает AI-ассистента.",
        insufficientBalance: "Недостаточно средств на балансе.",
        monthlyLimitReached: "Достигнут месячный лимит AI-запросов.",
        infoLoading: "Информация о тарифе загружается...",
        unavailable: "Биллинг недоступен: выполните миграции базы данных.",
        failed: "Не удалось загрузить данные тарифа.",
        aiCosts: "Платный тариф включает до {{limit}} AI-запросов в месяц.",
        aiSpent: "AI-запросы в этом месяце: {{used}} из {{limit}}"
      },
      auth: {
        subtitle: "Войдите, чтобы получить рекомендации ассистента",
        email: "Электронная почта",
        password: "Пароль",
        show: "Показать",
        hide: "Скрыть",
        login: "Войти",
        register: "Зарегистрироваться",
        verificationCode: "Код подтверждения",
        verificationDescription: "Введите 6-значный код из письма, чтобы завершить регистрацию.",
        verificationInfo: "Мы отправили код на {{email}}. Проверьте почту и папку \"Спам\".",
        verify: "Подтвердить",
        createAccount: "Создать аккаунт",
        alreadyHaveAccount: "У меня уже есть аккаунт",
        loginError: "Ошибка входа",
        registerError: "Ошибка регистрации",
        verifyError: "Не удалось подтвердить код",
        forgotPassword: "Забыли пароль?",
        sendResetCode: "Отправить код",
        resetPassword: "Сбросить пароль",
        resetRequestDescription: "Мы отправим 6-значный код на указанный email.",
        resetDescription: "Введите код из письма и задайте новый пароль.",
        resetCode: "Код восстановления",
        newPassword: "Новый пароль",
        confirmPassword: "Повторите пароль",
        passwordsDoNotMatch: "Пароли не совпадают",
        resetInfo: "Мы отправили код на {{email}}. Проверьте почту и папку \"Спам\".",
        resetRequestError: "Не удалось отправить код восстановления",
        resetError: "Не удалось сбросить пароль",
        backToLogin: "Вернуться ко входу",
        backToRegister: "Назад к регистрации",
        resendCode: "Отправить код ещё раз"
      },
      assistant: {
        title: "AI ассистент",
        unavailable: "AI-ассистент временно недоступен",
        prompt: "Задайте вопрос, и ассистент ответит.",
        inputPlaceholder: "Напишите, что вас беспокоит",
        thinking: "Ассистент думает...",
        send: "Отправить",
        reset: "Очистить диалог",
        user: "Вы",
        assistant: "Ассистент"
      },
      bp: {
        title: "Давление и пульс",
        disabled: "Получение советов временно недоступно",
        systolic: "Систолическое давление, мм рт. ст.",
        diastolic: "Диастолическое давление, мм рт. ст.",
        pulse: "Пульс, уд/мин",
        concern: "Что вас беспокоит?",
        concernPlaceholder: "Например: скачет давление вечером",
        comment: "Комментарий к измерению",
        commentPlaceholder: "Дополнительные примечания",
        save: "Сохранить показатели",
        submit: "Получить советы",
        loading: "Запрашиваем рекомендации...",
        adviceTitle: "Рекомендации",
        historyTitle: "Архив давления и пульса",
        historyRemove: "Удалить запись",
        metrics: {
          systolic: "Систолическое: {{value}}",
          diastolic: "Диастолическое: {{value}}",
          pulse: "Пульс: {{value}}"
        },
        question: "Вопрос",
        commentLabel: "Комментарий"
      },
      bpPrompt: {
        role: "Ты — кардиолог, который объясняет понятным языком.",
        summary: "Пациент сообщает: {{summary}}.",
        summaryMissing: "Пациент не указал текущие показатели.",
        advice: "Дай советы, как стабилизировать давление и пульс безопасными методами.",
        lifestyle: "Добавь практические советы по образу жизни и упомяни тревожные симптомы, при которых нужно немедленно обратиться к врачу.",
        extra: "Дополнительный контекст от пациента: {{question}}.",
        metrics: {
          systolic: "систолическое давление {{value}} мм рт. ст.",
          diastolic: "диастолическое давление {{value}} мм рт. ст.",
          pulse: "пульс {{value}} уд/мин",
        comment: "комментарий: {{value}}",
        missing: "показатели не указаны"
      },
      saveError: "Заполните систолическое и диастолическое давление, а также пульс, чтобы сохранить запись",
      submitError: "Не удалось получить рекомендации"
      },
      lipid: {
        title: "Липидный профиль и сахар",
        disabled: "Получение советов недоступно",
        date: "Дата анализа",
        cholesterol: "Общий холестерин, ммоль/л",
        hdl: "Холестерин ЛПВП (HDL), ммоль/л",
        ldl: "Холестерин ЛПНП (LDL), ммоль/л",
        triglycerides: "Триглицериды, ммоль/л",
        glucose: "Уровень сахара (глюкоза), ммоль/л",
        question: "Что ещё важно уточнить?",
        questionPlaceholder: "Например: принимаю статины и хочу понять, что добавить в рацион",
        comment: "Комментарий к анализу",
        commentPlaceholder: "Например: сдавал анализ после курса терапии",
        save: "Сохранить показатели",
        submit: "Получить советы",
        loading: "Запрашиваем рекомендации...",
        adviceTitle: "Рекомендации",
        historyTitle: "Архив липидов и сахара",
        historyRemove: "Удалить запись",
        compareWithPrevious: "Сравнить с предыдущей записью",
        compareWithPreviousHelp:
          "Добавить в запрос прошлые показатели, чтобы ассистент отметил динамику.",
        metrics: {
          date: "Дата анализа: {{value}}",
          cholesterol: "Общий холестерин: {{value}}",
          hdl: "ЛПВП: {{value}}",
          ldl: "ЛНП: {{value}}",
          triglycerides: "Триглицериды: {{value}}",
          glucose: "Глюкоза: {{value}}"
        },
        questionLabel: "Вопрос",
        commentLabel: "Комментарий"
      },
      lipidPrompt: {
        role: "Ты — врач профилактической медицины и эндокринолог.",
        metrics: {
          date: "дата анализа {{value}}",
          cholesterol: "общий холестерин {{value}} ммоль/л",
          hdl: "ЛПВП {{value}} ммоль/л",
          ldl: "ЛПНП {{value}} ммоль/л",
          triglycerides: "триглицериды {{value}} ммоль/л",
          glucose: "глюкоза крови {{value}} ммоль/л",
          comment: "комментарий: {{value}}"
        },
        summary: "Актуальные показатели пациента: {{metrics}}.",
        summaryMissing: "Пациент не указал текущие показатели.",
        advice: "Дай рекомендации, как поддерживать липидный профиль и уровень сахара в безопасных пределах.",
        plan: "Составь план из нескольких пунктов: питание, активность, контроль образа жизни и когда нужно обратиться к врачу.",
        extra: "Дополнительный вопрос пациента: {{question}}.",
        compareWithPrevious: "Сравни с предыдущими показателями: {{metrics}}.",
        previousMetrics: {
          date: "предыдущая дата анализа {{value}}",
          cholesterol: "предыдущий общий холестерин {{value}} ммоль/л",
          hdl: "предыдущий ЛПВП {{value}} ммоль/л",
          ldl: "предыдущий ЛПНП {{value}} ммоль/л",
          triglycerides: "предыдущие триглицериды {{value}} ммоль/л",
          glucose: "предыдущая глюкоза {{value}} ммоль/л"
        },
        saveError: "Укажите дату анализа и хотя бы один показатель, чтобы сохранить запись",
        submitError: "Не удалось получить рекомендации"
      },
      nutrition: {
        title: "Консультация нутрициолога",
        disabled: "Получение советов недоступно",
        weight: "Вес, кг",
        height: "Рост, см",
        calories: "Калорийность рациона, ккал",
        activity: "Активность",
        activityPlaceholder: "Например: 2 тренировки в неделю",
        question: "Опишите цель или вопрос",
        questionPlaceholder: "Например: хочу снизить вес без жестких диет",
        comment: "Комментарий к измерениям",
        commentPlaceholder: "Дополнительные примечания: как чувствовали себя, что ели",
        submit: "Получить советы",
        loading: "Запрашиваем рекомендации...",
        adviceTitle: "Рекомендации",
        historyTitle: "Архив нутрициолога",
        metrics: {
          weight: "Вес: {{value}} кг",
          height: "Рост: {{value}} см",
          calories: "Калории: {{value}}",
          activity: "Активность: {{value}}",
          question: "Запрос:",
          comment: "Комментарий:"
        },
        disabledReasonFallback: "Получение советов недоступно",
        photo: {
          title: "Оценка калорий по фото",
          subtitle:
            "Загрузите фото блюда, чтобы получить примерную калорийность на порцию или на 100 г. Укажите желаемый формат в комментарии.",
          uploadLabel: "Выбрать файл",
          hint: "Поддерживаются JPG, PNG, HEIC до 5 МБ.",
          previewAlt: "Фото блюда для оценки калорийности",
          remove: "Удалить фото",
          analyze: "Оценить калорийность",
          analyzing: "Анализируем фото...",
          calories: "Оценка: около {{value}} ккал",
          caloriesUnknown: "Оценка калорийности не получена",
          confidence: "Уверенность: {{value}}",
          notesTitle: "Комментарий",
          ingredientsTitle: "Предполагаемые ингредиенты",
          missing: "Сначала выберите фото.",
          error: "Не удалось проанализировать фото",
          debugTitle: "Диагностика запроса",
          historyTitle: "История оценок калорийности",
          historyRemove: "Удалить запись"
        }
      },
      nutritionPrompt: {
        role: "Ты — нутрициолог. На основе данных клиента составь рекомендации по питанию и режиму на ближайшие 1-2 недели.",
        facts: {
          weight: "масса тела {{value}} кг",
          height: "рост {{value}} см",
          calories: "суточная калорийность {{value}} ккал",
          activity: "уровень активности: {{value}}",
          comment: "комментарий: {{value}}"
        },
        summary: "Исходные данные: {{facts}}.",
        summaryMissing: "Клиент не указал исходные данные.",
        extra: "Дополнительный запрос клиента: {{question}}.",
        universal: "Сделай рекомендации универсальными и безопасными.",
        reminder: "Напомни о необходимости консультации врача при хронических заболеваниях.",
        submitError: "Не удалось получить рекомендации"
      },
      settings: {
        title: "Цели и профиль",
        subtitle: "CholestoFit — ваш персональный помощник по здоровью сердца",
        tabsLabel: "Настройки",
        profileTab: "Профиль",
        billingTab: "Тариф",
        gender: "Пол",
        genderNotSpecified: "Не указан",
        genderMale: "Мужской",
        genderFemale: "Женский",
        age: "Возраст",
        height: "Рост (см)",
        weight: "Вес (кг)",
        activity: "Активность",
        calories: "Цель по калориям, ккал",
        satFat: "Лимит насыщенных жиров, г",
        fiber: "Цель по клетчатке, г",
        saving: "Сохраняем...",
        save: "Сохранить",
        success: "Профиль обновлен",
        planLabel: "Текущий тариф",
        monthlyFee: "Месячный платёж: {{amount}}",
        adviceAvailable: "AI-советы доступны",
        adviceUnavailable: "AI-советы недоступны",
        assistantAvailable: "AI-ассистент доступен",
        assistantUnavailable: "AI-ассистент недоступен",
        togglePlansShow: "Скрыть тарифы",
        togglePlansHide: "Сменить тариф",
        planUpdated: "Тариф обновлен",
        plansTitle: "Выберите подходящий тариф",
        planSave: "Сохранить тариф",
        planSaving: "Обновляем...",
        depositTitle: "Пополнить баланс",
        depositAmount: "Сумма, USD",
        depositSubmit: "Пополнить",
        depositSubmitting: "Пополняем...",
        depositSuccess: "Баланс пополнен",
        close: "Закрыть"
      },
      settingsActivity: {
        none: "Не указано",
        sedentary: "Сидячая",
        light: "Лёгкая",
        moderate: "Умеренная",
        high: "Высокая",
        athletic: "Спортивная"
      },
      settingsDialog: {
        fullAccess: "Полный доступ к AI-ассистенту и персональным советам.",
        adviceOnly: "Персональные AI-советы доступны, ассистент отключён.",
        noAi: "AI-инструменты в этом тарифе недоступны.",
        loading: "Загрузка информации о тарифе...",
        errorFallback: "Информация о тарифе загружается..."
      },
      settingsErrors: {
        profileSave: "Не удалось сохранить профиль",
        depositAmount: "Введите сумму пополнения",
        deposit: "Не удалось пополнить баланс",
        planSelect: "Выберите тариф",
        plan: "Не удалось обновить тариф"
      },
      storage: {
        readFailed: "Не удалось прочитать архив {{key}}"
      }
    }
  },
  en: {
    translation: {
      common: {
        appName: "CholestoFit",
        tagline: "Personalized health recommendations",
        account: "Account",
        balanceLabel: "Balance",
        openSettings: "Open settings",
        settings: "Settings",
        logout: "Log out",
        logoutTitle: "Sign out",
        menuLabel: "Main sections",
        loginRequired: "Please sign in",
      aiAdviceUnavailable: "AI advice is unavailable",
      adviceRequestFailed: "Failed to get recommendations",
      defaultDishTitle: "Dish",
      language: "Language",
      close: "Close",
      retry: "Try again",
      loading: "Loading...",
      notSpecified: "Not specified",
      no: "No",
      yes: "Yes",
      dateFormatWarning: "Failed to format date",
      networkError: "Network/CORS: {{message}}",
      parseError: "Failed to parse response",
      requestError: "Request error ({{status}})"
      },
      tabs: {
        bp: "Blood pressure",
        lipid: "Lipid profile & glucose",
        nutrition: "Nutritionist",
        assistant: "AI assistant"
      },
      billing: {
        loading: "Loading billing data...",
        adviceNotIncluded: "Your plan does not include AI advice.",
        assistantNotIncluded: "Your plan does not include the AI assistant.",
        insufficientBalance: "Insufficient balance.",
        monthlyLimitReached: "Monthly AI request limit reached.",
        infoLoading: "Billing information is loading...",
        unavailable: "Billing is unavailable: run database migrations.",
        failed: "Failed to load billing data.",
        aiCosts: "The paid plan includes up to {{limit}} AI requests per month.",
        aiSpent: "AI requests this month: {{used}} of {{limit}}"
      },
      auth: {
        subtitle: "Sign in to receive assistant recommendations",
        email: "Email",
        password: "Password",
        show: "Show",
        hide: "Hide",
        login: "Sign in",
        register: "Register",
        verificationCode: "Verification code",
        verificationDescription: "Enter the 6-digit code from the email to finish signing up.",
        verificationInfo: "We sent a confirmation code to {{email}}. Check your inbox and spam folder.",
        verify: "Verify",
        createAccount: "Create an account",
        alreadyHaveAccount: "I already have an account",
        loginError: "Sign-in failed",
        registerError: "Registration failed",
        verifyError: "Verification failed",
        forgotPassword: "Forgot password?",
        sendResetCode: "Send code",
        resetPassword: "Reset password",
        resetRequestDescription: "We'll send a 6-digit code to your email.",
        resetDescription: "Enter the code from the email and choose a new password.",
        resetCode: "Reset code",
        newPassword: "New password",
        confirmPassword: "Confirm password",
        passwordsDoNotMatch: "Passwords do not match",
        resetInfo: "We sent a code to {{email}}. Check your inbox and spam folder.",
        resetRequestError: "Could not send the reset code",
        resetError: "Could not reset the password",
        backToLogin: "Back to sign in",
        backToRegister: "Back to registration",
        resendCode: "Send the code again"
      },
      assistant: {
        title: "AI assistant",
        unavailable: "The AI assistant is temporarily unavailable",
        prompt: "Ask a question and the assistant will answer.",
        inputPlaceholder: "Tell us what concerns you",
        thinking: "The assistant is thinking...",
        send: "Send",
        reset: "Clear conversation",
        user: "You",
        assistant: "Assistant"
      },
      bp: {
        title: "Blood pressure",
        disabled: "Advice is temporarily unavailable",
        systolic: "Systolic pressure, mm Hg",
        diastolic: "Diastolic pressure, mm Hg",
        pulse: "Heart rate, bpm",
        concern: "What is bothering you?",
        concernPlaceholder: "For example: blood pressure spikes in the evening",
        comment: "Measurement note",
        commentPlaceholder: "Additional notes",
        save: "Save readings",
        submit: "Get advice",
        loading: "Requesting recommendations...",
        adviceTitle: "Recommendations",
        historyTitle: "Blood pressure history",
        historyRemove: "Remove entry",
        metrics: {
          systolic: "Systolic: {{value}}",
          diastolic: "Diastolic: {{value}}",
          pulse: "Pulse: {{value}}"
        },
        question: "Question",
        commentLabel: "Comment"
      },
      bpPrompt: {
        role: "You are a cardiologist who explains things clearly.",
        summary: "The patient reports: {{summary}}.",
        summaryMissing: "The patient did not provide current readings.",
        advice: "Give safe tips to stabilize blood pressure and heart rate.",
        lifestyle: "Add practical lifestyle tips and mention warning signs that require urgent medical care.",
        extra: "Additional context from the patient: {{question}}.",
        metrics: {
          systolic: "systolic pressure {{value}} mm Hg",
          diastolic: "diastolic pressure {{value}} mm Hg",
          pulse: "pulse {{value}} bpm",
          comment: "comment: {{value}}",
          missing: "no readings provided"
        },
        saveError: "Enter systolic and diastolic pressure plus pulse to save the record",
        submitError: "Failed to get recommendations"
      },
      lipid: {
        title: "Lipid profile & glucose",
        disabled: "Advice is unavailable",
        date: "Test date",
        cholesterol: "Total cholesterol, mmol/L",
        hdl: "HDL cholesterol, mmol/L",
        ldl: "LDL cholesterol, mmol/L",
        triglycerides: "Triglycerides, mmol/L",
        glucose: "Glucose, mmol/L",
        question: "What else should we clarify?",
        questionPlaceholder: "Example: I take statins and want to adjust my diet",
        comment: "Test notes",
        commentPlaceholder: "Example: test taken after therapy course",
        save: "Save readings",
        submit: "Get advice",
        loading: "Requesting recommendations...",
        adviceTitle: "Recommendations",
        historyTitle: "Lipid & glucose archive",
        historyRemove: "Remove entry",
        compareWithPrevious: "Compare with previous entry",
        compareWithPreviousHelp:
          "Include the last saved metrics so the assistant comments on the trend.",
        metrics: {
          date: "Test date: {{value}}",
          cholesterol: "Total cholesterol: {{value}}",
          hdl: "HDL: {{value}}",
          ldl: "LDL: {{value}}",
          triglycerides: "Triglycerides: {{value}}",
          glucose: "Glucose: {{value}}"
        },
        questionLabel: "Question",
        commentLabel: "Comment"
      },
      lipidPrompt: {
        role: "You are a preventive medicine doctor and endocrinologist.",
        metrics: {
          date: "test date {{value}}",
          cholesterol: "total cholesterol {{value}} mmol/L",
          hdl: "HDL {{value}} mmol/L",
          ldl: "LDL {{value}} mmol/L",
          triglycerides: "triglycerides {{value}} mmol/L",
          glucose: "blood glucose {{value}} mmol/L",
          comment: "comment: {{value}}"
        },
        summary: "Current readings: {{metrics}}.",
        summaryMissing: "The patient did not provide current readings.",
        advice: "Give guidance on keeping lipid profile and glucose within safe ranges.",
        plan: "Create a plan covering diet, activity, lifestyle monitoring, and when to see a doctor.",
        extra: "Additional patient question: {{question}}.",
        compareWithPrevious: "Compare against the previous results: {{metrics}}.",
        previousMetrics: {
          date: "previous test date {{value}}",
          cholesterol: "previous total cholesterol {{value}} mmol/L",
          hdl: "previous HDL {{value}} mmol/L",
          ldl: "previous LDL {{value}} mmol/L",
          triglycerides: "previous triglycerides {{value}} mmol/L",
          glucose: "previous glucose {{value}} mmol/L"
        },
        saveError: "Provide a test date and at least one metric to save the record",
        submitError: "Failed to get recommendations"
      },
      nutrition: {
        title: "Nutrition consultation",
        disabled: "Advice is unavailable",
        weight: "Weight, kg",
        height: "Height, cm",
        calories: "Daily calories, kcal",
        activity: "Activity",
        activityPlaceholder: "Example: 2 workouts per week",
        question: "Describe your goal or question",
        questionPlaceholder: "Example: lose weight without strict diets",
        comment: "Measurement notes",
        commentPlaceholder: "Additional notes: how you felt, what you ate",
        submit: "Get advice",
        loading: "Requesting recommendations...",
        adviceTitle: "Recommendations",
        historyTitle: "Nutrition archive",
        metrics: {
          weight: "Weight: {{value}} kg",
          height: "Height: {{value}} cm",
          calories: "Calories: {{value}}",
          activity: "Activity: {{value}}",
          question: "Request:",
          comment: "Comment:"
        },
        disabledReasonFallback: "Advice is unavailable",
        photo: {
          title: "Calorie estimate from photo",
          subtitle:
            "Upload a meal photo to get an approximate calorie value per serving or per 100 g. Mention the format you need in the comment.",
          uploadLabel: "Choose file",
          hint: "Supports JPG, PNG, HEIC up to 5 MB.",
          previewAlt: "Meal photo for calorie estimation",
          remove: "Remove photo",
          analyze: "Estimate calories",
          analyzing: "Analyzing photo...",
          calories: "Estimate: about {{value}} kcal",
          caloriesUnknown: "No calorie estimate available",
          confidence: "Confidence: {{value}}",
          notesTitle: "Notes",
          ingredientsTitle: "Likely ingredients",
          missing: "Please choose a photo first.",
          error: "Failed to analyze the photo",
          debugTitle: "Request diagnostics",
          historyTitle: "Calorie estimation history",
          historyRemove: "Remove entry"
        }
      },
      nutritionPrompt: {
        role: "You are a nutritionist. Use the client data to create nutrition and lifestyle tips for the next 1–2 weeks.",
        facts: {
          weight: "body weight {{value}} kg",
          height: "height {{value}} cm",
          calories: "daily calories {{value}} kcal",
          activity: "activity level: {{value}}",
          comment: "comment: {{value}}"
        },
        summary: "Initial data: {{facts}}.",
        summaryMissing: "The client did not share initial data.",
        extra: "Additional client request: {{question}}.",
        universal: "Keep the guidance safe and practical for most people.",
        reminder: "Remind them to consult a doctor if they have chronic conditions.",
        submitError: "Failed to get recommendations"
      },
      settings: {
        title: "Goals & profile",
        subtitle: "CholestoFit is your personal heart health assistant",
        tabsLabel: "Settings",
        profileTab: "Profile",
        billingTab: "Plan",
        gender: "Gender",
        genderNotSpecified: "Not specified",
        genderMale: "Male",
        genderFemale: "Female",
        age: "Age",
        height: "Height (cm)",
        weight: "Weight (kg)",
        activity: "Activity",
        calories: "Calorie goal, kcal",
        satFat: "Saturated fat limit, g",
        fiber: "Fiber goal, g",
        saving: "Saving...",
        save: "Save",
        success: "Profile updated",
        planLabel: "Current plan",
        monthlyFee: "Monthly fee: {{amount}}",
        adviceAvailable: "AI advice available",
        adviceUnavailable: "AI advice unavailable",
        assistantAvailable: "AI assistant available",
        assistantUnavailable: "AI assistant unavailable",
        togglePlansShow: "Hide plans",
        togglePlansHide: "Change plan",
        planUpdated: "Plan updated",
        plansTitle: "Choose the best plan",
        planSave: "Save plan",
        planSaving: "Updating...",
        depositTitle: "Add funds",
        depositAmount: "Amount, USD",
        depositSubmit: "Add funds",
        depositSubmitting: "Adding...",
        depositSuccess: "Balance topped up",
        close: "Close"
      },
      settingsActivity: {
        none: "Not specified",
        sedentary: "Sedentary",
        light: "Light",
        moderate: "Moderate",
        high: "High",
        athletic: "Athletic"
      },
      settingsDialog: {
        fullAccess: "Full access to the AI assistant and personal advice.",
        adviceOnly: "Personal AI advice available, assistant disabled.",
        noAi: "AI tools are not included in this plan.",
        loading: "Loading plan information...",
        errorFallback: "Billing information is loading..."
      },
      settingsErrors: {
        profileSave: "Failed to save profile",
        depositAmount: "Enter a top-up amount",
        deposit: "Failed to add funds",
        planSelect: "Choose a plan",
        plan: "Failed to update plan"
      },
      storage: {
        readFailed: "Failed to read archive {{key}}"
      }
    }
  },
  de: {
    translation: {
      common: {
        appName: "CholestoFit",
        tagline: "Personalisierte Gesundheitsempfehlungen",
        account: "Konto",
        balanceLabel: "Guthaben",
        openSettings: "Einstellungen öffnen",
        settings: "Einstellungen",
        logout: "Abmelden",
        logoutTitle: "Abmelden",
        menuLabel: "Hauptbereiche",
        loginRequired: "Bitte anmelden",
      aiAdviceUnavailable: "KI-Ratschläge sind nicht verfügbar",
      adviceRequestFailed: "Empfehlungen konnten nicht abgerufen werden",
      defaultDishTitle: "Gericht",
      language: "Sprache",
      close: "Schließen",
      retry: "Erneut versuchen",
      loading: "Wird geladen...",
      notSpecified: "Nicht angegeben",
      no: "Nein",
      yes: "Ja",
      dateFormatWarning: "Datum konnte nicht formatiert werden",
      networkError: "Netzwerk/CORS: {{message}}",
      parseError: "Antwort konnte nicht analysiert werden",
      requestError: "Anfragefehler ({{status}})"
      },
      tabs: {
        bp: "Blutdruck",
        lipid: "Lipidprofil & Glukose",
        nutrition: "Ernährungsberatung",
        assistant: "KI-Assistent"
      },
      billing: {
        loading: "Tarifdaten werden geladen...",
        adviceNotIncluded: "Ihr Tarif enthält keine KI-Ratschläge.",
        assistantNotIncluded: "Ihr Tarif enthält keinen KI-Assistenten.",
        insufficientBalance: "Unzureichendes Guthaben.",
        monthlyLimitReached: "Monatliches KI-Anfragekontingent ausgeschöpft.",
        infoLoading: "Tarifinformationen werden geladen...",
        unavailable: "Abrechnung nicht verfügbar: Datenbankmigrationen ausführen.",
        failed: "Tarifdaten konnten nicht geladen werden.",
        aiCosts: "Der kostenpflichtige Tarif enthält bis zu {{limit}} KI-Anfragen pro Monat.",
        aiSpent: "KI-Anfragen in diesem Monat: {{used}} von {{limit}}"
      },
      auth: {
        subtitle: "Melden Sie sich an, um Empfehlungen zu erhalten",
        email: "E-Mail",
        password: "Passwort",
        show: "Anzeigen",
        hide: "Ausblenden",
        login: "Anmelden",
        register: "Registrieren",
        verificationCode: "Bestätigungscode",
        verificationDescription: "Geben Sie den 6-stelligen Code aus der E-Mail ein, um die Registrierung abzuschließen.",
        verificationInfo: "Wir haben einen Bestätigungscode an {{email}} gesendet. Prüfen Sie auch den Spam-Ordner.",
        verify: "Bestätigen",
        createAccount: "Konto erstellen",
        alreadyHaveAccount: "Ich habe bereits ein Konto",
        loginError: "Anmeldung fehlgeschlagen",
        registerError: "Registrierung fehlgeschlagen",
        verifyError: "Bestätigung fehlgeschlagen",
        forgotPassword: "Passwort vergessen?",
        sendResetCode: "Code senden",
        resetPassword: "Passwort zurücksetzen",
        resetRequestDescription: "Wir senden einen 6-stelligen Code an Ihre E-Mail-Adresse.",
        resetDescription: "Geben Sie den Code aus der E-Mail ein und wählen Sie ein neues Passwort.",
        resetCode: "Wiederherstellungscode",
        newPassword: "Neues Passwort",
        confirmPassword: "Passwort bestätigen",
        passwordsDoNotMatch: "Passwörter stimmen nicht überein",
        resetInfo: "Wir haben den Code an {{email}} gesendet. Prüfen Sie Posteingang und Spam.",
        resetRequestError: "Wiederherstellungscode konnte nicht gesendet werden",
        resetError: "Passwort konnte nicht zurückgesetzt werden",
        backToLogin: "Zurück zur Anmeldung",
        backToRegister: "Zurück zur Registrierung",
        resendCode: "Code erneut senden"
      },
      assistant: {
        title: "KI-Assistent",
        unavailable: "Der KI-Assistent ist vorübergehend nicht verfügbar",
        prompt: "Stellen Sie eine Frage, und der Assistent antwortet.",
        inputPlaceholder: "Was beschäftigt Sie?",
        thinking: "Der Assistent denkt...",
        send: "Senden",
        reset: "Gespräch löschen",
        user: "Sie",
        assistant: "Assistent"
      },
      bp: {
        title: "Blutdruck",
        disabled: "Ratschläge sind vorübergehend nicht verfügbar",
        systolic: "Systolischer Druck, mmHg",
        diastolic: "Diastolischer Druck, mmHg",
        pulse: "Puls, bpm",
        concern: "Was bereitet Ihnen Sorgen?",
        concernPlaceholder: "Z. B.: Blutdruck steigt abends",
        comment: "Messnotiz",
        commentPlaceholder: "Zusätzliche Hinweise",
        save: "Werte speichern",
        submit: "Ratschläge erhalten",
        loading: "Empfehlungen werden angefordert...",
        adviceTitle: "Empfehlungen",
        historyTitle: "Blutdruckarchiv",
        historyRemove: "Eintrag löschen",
        metrics: {
          systolic: "Systolisch: {{value}}",
          diastolic: "Diastolisch: {{value}}",
          pulse: "Puls: {{value}}"
        },
        question: "Frage",
        commentLabel: "Kommentar"
      },
      bpPrompt: {
        role: "Du bist Kardiologe und erklärst verständlich.",
        summary: "Der Patient berichtet: {{summary}}.",
        summaryMissing: "Der Patient hat keine aktuellen Werte angegeben.",
        advice: "Gib sichere Tipps, um Blutdruck und Puls zu stabilisieren.",
        lifestyle: "Füge praxisnahe Alltagstipps hinzu und nenne Warnzeichen für einen Arztbesuch.",
        extra: "Zusätzlicher Kontext vom Patienten: {{question}}.",
        metrics: {
          systolic: "systolischer Druck {{value}} mmHg",
          diastolic: "diastolischer Druck {{value}} mmHg",
          pulse: "Puls {{value}} bpm",
          comment: "Kommentar: {{value}}",
          missing: "keine Werte angegeben"
        },
        saveError: "Gib systolischen und diastolischen Blutdruck sowie den Puls an, um den Eintrag zu speichern",
        submitError: "Empfehlungen konnten nicht abgerufen werden"
      },
      lipid: {
        title: "Lipidprofil & Glukose",
        disabled: "Ratschläge sind nicht verfügbar",
        date: "Analysedatum",
        cholesterol: "Gesamtcholesterin, mmol/L",
        hdl: "HDL-Cholesterin, mmol/L",
        ldl: "LDL-Cholesterin, mmol/L",
        triglycerides: "Triglyceride, mmol/L",
        glucose: "Glukose, mmol/L",
        question: "Was sollte noch geklärt werden?",
        questionPlaceholder: "Z. B.: Ich nehme Statine und möchte die Ernährung anpassen",
        comment: "Analysekommentar",
        commentPlaceholder: "Z. B.: Analyse nach Therapie",
        save: "Werte speichern",
        submit: "Ratschläge erhalten",
        loading: "Empfehlungen werden angefordert...",
        adviceTitle: "Empfehlungen",
        historyTitle: "Lipid- & Glukosearchiv",
        historyRemove: "Eintrag löschen",
        compareWithPrevious: "Mit vorherigem Eintrag vergleichen",
        compareWithPreviousHelp:
          "Füge die zuletzt gespeicherten Werte hinzu, damit der Assistent den Trend bewertet.",
        metrics: {
          date: "Analysedatum: {{value}}",
          cholesterol: "Gesamtcholesterin: {{value}}",
          hdl: "HDL: {{value}}",
          ldl: "LDL: {{value}}",
          triglycerides: "Triglyceride: {{value}}",
          glucose: "Glukose: {{value}}"
        },
        questionLabel: "Frage",
        commentLabel: "Kommentar"
      },
      lipidPrompt: {
        role: "Du bist Arzt für Präventivmedizin und Endokrinologie.",
        metrics: {
          date: "Analysedatum {{value}}",
          cholesterol: "Gesamtcholesterin {{value}} mmol/L",
          hdl: "HDL {{value}} mmol/L",
          ldl: "LDL {{value}} mmol/L",
          triglycerides: "Triglyceride {{value}} mmol/L",
          glucose: "Blutzucker {{value}} mmol/L",
          comment: "Kommentar: {{value}}"
        },
        summary: "Aktuelle Werte: {{metrics}}.",
        summaryMissing: "Der Patient hat keine aktuellen Werte angegeben.",
        advice: "Gib Hinweise, wie Lipidprofil und Glukose im sicheren Bereich bleiben.",
        plan: "Erstelle einen Plan mit Ernährung, Aktivität, Lifestyle-Kontrolle und Arztbesuch.",
        extra: "Zusätzliche Frage des Patienten: {{question}}.",
        compareWithPrevious: "Vergleiche mit den vorherigen Werten: {{metrics}}.",
        previousMetrics: {
          date: "vorheriges Analysedatum {{value}}",
          cholesterol: "vorheriges Gesamtcholesterin {{value}} mmol/L",
          hdl: "vorheriges HDL {{value}} mmol/L",
          ldl: "vorheriges LDL {{value}} mmol/L",
          triglycerides: "vorherige Triglyceride {{value}} mmol/L",
          glucose: "vorherige Glukose {{value}} mmol/L"
        },
        saveError: "Gib das Analysedatum und mindestens einen Wert an, um den Eintrag zu speichern",
        submitError: "Empfehlungen konnten nicht abgerufen werden"
      },
      nutrition: {
        title: "Ernährungsberatung",
        disabled: "Ratschläge sind nicht verfügbar",
        weight: "Gewicht, kg",
        height: "Größe, cm",
        calories: "Kalorienbedarf, kcal",
        activity: "Aktivität",
        activityPlaceholder: "Z. B.: 2 Workouts pro Woche",
        question: "Beschreiben Sie Ihr Ziel oder Ihre Frage",
        questionPlaceholder: "Z. B.: Gewicht sanft reduzieren",
        comment: "Messnotizen",
        commentPlaceholder: "Zusätzliche Hinweise: Befinden, Ernährung",
        submit: "Ratschläge erhalten",
        loading: "Empfehlungen werden angefordert...",
        adviceTitle: "Empfehlungen",
        historyTitle: "Archiv Ernährung",
        metrics: {
          weight: "Gewicht: {{value}} kg",
          height: "Größe: {{value}} cm",
          calories: "Kalorien: {{value}}",
          activity: "Aktivität: {{value}}",
          question: "Anfrage:",
          comment: "Kommentar:"
        },
        disabledReasonFallback: "Ratschläge sind nicht verfügbar",
        photo: {
          title: "Kalorienabschätzung per Foto",
          subtitle:
            "Laden Sie ein Essensfoto hoch, um eine ungefähre Kalorienzahl pro Portion oder pro 100 g zu erhalten. Geben Sie im Kommentar an, welches Format Sie brauchen.",
          uploadLabel: "Datei auswählen",
          hint: "Unterstützt JPG, PNG, HEIC bis 5 MB.",
          previewAlt: "Essensfoto zur Kalorienabschätzung",
          remove: "Foto entfernen",
          analyze: "Kalorien schätzen",
          analyzing: "Foto wird analysiert...",
          calories: "Schätzung: ca. {{value}} kcal",
          caloriesUnknown: "Keine Kalorienschätzung verfügbar",
          confidence: "Vertrauen: {{value}}",
          notesTitle: "Kommentar",
          ingredientsTitle: "Vermutete Zutaten",
          missing: "Bitte wählen Sie zuerst ein Foto.",
          error: "Fotoanalyse fehlgeschlagen",
          debugTitle: "Diagnoseprotokoll",
          historyTitle: "Verlauf der Kalorienschätzungen",
          historyRemove: "Eintrag löschen"
        }
      },
      nutritionPrompt: {
        role: "Du bist Ernährungsberater. Erstelle Empfehlungen für die nächsten 1–2 Wochen.",
        facts: {
          weight: "Körpergewicht {{value}} kg",
          height: "Größe {{value}} cm",
          calories: "Kalorienbedarf {{value}} kcal",
          activity: "Aktivitätslevel: {{value}}",
          comment: "Kommentar: {{value}}"
        },
        summary: "Ausgangsdaten: {{facts}}.",
        summaryMissing: "Der Klient hat keine Daten angegeben.",
        extra: "Zusätzliche Anfrage des Klienten: {{question}}.",
        universal: "Die Empfehlungen sollen sicher und alltagstauglich sein.",
        reminder: "Erinnere an einen Arztbesuch bei chronischen Erkrankungen.",
        submitError: "Empfehlungen konnten nicht abgerufen werden"
      },
      settings: {
        title: "Ziele & Profil",
        subtitle: "CholestoFit ist Ihr persönlicher Herzgesundheits-Assistent",
        tabsLabel: "Einstellungen",
        profileTab: "Profil",
        billingTab: "Tarif",
        gender: "Geschlecht",
        genderNotSpecified: "Nicht angegeben",
        genderMale: "Männlich",
        genderFemale: "Weiblich",
        age: "Alter",
        height: "Größe (cm)",
        weight: "Gewicht (kg)",
        activity: "Aktivität",
        calories: "Kalorienziel, kcal",
        satFat: "Limit gesättigte Fette, g",
        fiber: "Ballaststoffziel, g",
        saving: "Speichern...",
        save: "Speichern",
        success: "Profil aktualisiert",
        planLabel: "Aktueller Tarif",
        monthlyFee: "Monatliche Gebühr: {{amount}}",
        adviceAvailable: "KI-Ratschläge verfügbar",
        adviceUnavailable: "KI-Ratschläge nicht verfügbar",
        assistantAvailable: "KI-Assistent verfügbar",
        assistantUnavailable: "KI-Assistent nicht verfügbar",
        togglePlansShow: "Tarife ausblenden",
        togglePlansHide: "Tarif wechseln",
        planUpdated: "Tarif aktualisiert",
        plansTitle: "Passenden Tarif wählen",
        planSave: "Tarif speichern",
        planSaving: "Aktualisierung...",
        depositTitle: "Guthaben aufladen",
        depositAmount: "Betrag, USD",
        depositSubmit: "Aufladen",
        depositSubmitting: "Wird aufgeladen...",
        depositSuccess: "Guthaben aufgeladen",
        close: "Schließen"
      },
      settingsActivity: {
        none: "Nicht angegeben",
        sedentary: "Sitzend",
        light: "Leicht",
        moderate: "Mittel",
        high: "Hoch",
        athletic: "Sportlich"
      },
      settingsDialog: {
        fullAccess: "Voller Zugriff auf KI-Assistent und persönliche Ratschläge.",
        adviceOnly: "Personalisierte KI-Ratschläge verfügbar, Assistent deaktiviert.",
        noAi: "KI-Werkzeuge sind in diesem Tarif nicht enthalten.",
        loading: "Tarifinformationen werden geladen...",
        errorFallback: "Tarifinformationen werden geladen..."
      },
      settingsErrors: {
        profileSave: "Profil konnte nicht gespeichert werden",
        depositAmount: "Bitte Aufladebetrag eingeben",
        deposit: "Guthaben konnte nicht aufgeladen werden",
        planSelect: "Tarif auswählen",
        plan: "Tarif konnte nicht aktualisiert werden"
      },
      storage: {
        readFailed: "Archiv {{key}} konnte nicht gelesen werden"
      }
    }
  },
  es: {
    translation: {
      common: {
        appName: "CholestoFit",
        tagline: "Recomendaciones de salud personalizadas",
        account: "Cuenta",
        balanceLabel: "Saldo",
        openSettings: "Abrir ajustes",
        settings: "Ajustes",
        logout: "Cerrar sesión",
        logoutTitle: "Salir",
        menuLabel: "Secciones principales",
        loginRequired: "Inicia sesión",
      aiAdviceUnavailable: "La asesoría de IA no está disponible",
      adviceRequestFailed: "No se pudieron obtener recomendaciones",
      defaultDishTitle: "Plato",
      language: "Idioma",
      close: "Cerrar",
      retry: "Reintentar",
      loading: "Cargando...",
      notSpecified: "No especificado",
      no: "No",
      yes: "Sí",
      dateFormatWarning: "No se pudo formatear la fecha",
      networkError: "Red/CORS: {{message}}",
      parseError: "No se pudo analizar la respuesta",
      requestError: "Error de solicitud ({{status}})"
      },
      tabs: {
        bp: "Presión arterial",
        lipid: "Perfil lipídico y glucosa",
        nutrition: "Nutrición",
        assistant: "Asistente IA"
      },
      billing: {
        loading: "Cargando datos del plan...",
        adviceNotIncluded: "Tu plan no incluye asesoría de IA.",
        assistantNotIncluded: "Tu plan no incluye el asistente de IA.",
        insufficientBalance: "Saldo insuficiente.",
        monthlyLimitReached: "Se alcanzó el límite mensual de solicitudes de IA.",
        infoLoading: "La información del plan se está cargando...",
        unavailable: "Facturación no disponible: ejecuta las migraciones de la base de datos.",
        failed: "No se pudieron cargar los datos del plan.",
        aiCosts: "El plan de pago incluye hasta {{limit}} solicitudes de IA al mes.",
        aiSpent: "Solicitudes de IA este mes: {{used}} de {{limit}}"
      },
      auth: {
        subtitle: "Inicia sesión para recibir recomendaciones",
        email: "Correo electrónico",
        password: "Contraseña",
        show: "Mostrar",
        hide: "Ocultar",
        login: "Iniciar sesión",
        register: "Registrarse",
        verificationCode: "Código de verificación",
        verificationDescription: "Introduce el código de 6 dígitos del correo para completar el registro.",
        verificationInfo: "Enviamos un código de confirmación a {{email}}. Revisa también la carpeta de spam.",
        verify: "Confirmar",
        createAccount: "Crear cuenta",
        alreadyHaveAccount: "Ya tengo cuenta",
        loginError: "Error al iniciar sesión",
        registerError: "Error al registrarse",
        verifyError: "No se pudo verificar el código",
        forgotPassword: "¿Olvidaste la contraseña?",
        sendResetCode: "Enviar código",
        resetPassword: "Restablecer contraseña",
        resetRequestDescription: "Enviaremos un código de 6 dígitos a tu correo.",
        resetDescription: "Introduce el código del correo y establece una nueva contraseña.",
        resetCode: "Código de recuperación",
        newPassword: "Nueva contraseña",
        confirmPassword: "Confirmar contraseña",
        passwordsDoNotMatch: "Las contraseñas no coinciden",
        resetInfo: "Enviamos un código a {{email}}. Revisa tu bandeja de entrada y spam.",
        resetRequestError: "No se pudo enviar el código de recuperación",
        resetError: "No se pudo restablecer la contraseña",
        backToLogin: "Volver a iniciar sesión",
        backToRegister: "Volver al registro",
        resendCode: "Enviar el código de nuevo"
      },
      assistant: {
        title: "Asistente IA",
        unavailable: "El asistente de IA no está disponible temporalmente",
        prompt: "Haz una pregunta y el asistente responderá.",
        inputPlaceholder: "Cuéntanos qué te preocupa",
        thinking: "El asistente está pensando...",
        send: "Enviar",
        reset: "Limpiar conversación",
        user: "Tú",
        assistant: "Asistente"
      },
      bp: {
        title: "Presión arterial",
        disabled: "La asesoría no está disponible",
        systolic: "Presión sistólica, mm Hg",
        diastolic: "Presión diastólica, mm Hg",
        pulse: "Pulso, lpm",
        concern: "¿Qué te preocupa?",
        concernPlaceholder: "Ejemplo: la presión sube por la noche",
        comment: "Nota de la medición",
        commentPlaceholder: "Notas adicionales",
        save: "Guardar registros",
        submit: "Obtener consejos",
        loading: "Solicitando recomendaciones...",
        adviceTitle: "Recomendaciones",
        historyTitle: "Historial de presión arterial",
        historyRemove: "Eliminar entrada",
        metrics: {
          systolic: "Sistólica: {{value}}",
          diastolic: "Diastólica: {{value}}",
          pulse: "Pulso: {{value}}"
        },
        question: "Pregunta",
        commentLabel: "Comentario"
      },
      bpPrompt: {
        role: "Eres cardiólogo y explicas con claridad.",
        summary: "El paciente indica: {{summary}}.",
        summaryMissing: "El paciente no proporcionó registros actuales.",
        advice: "Ofrece consejos seguros para estabilizar la presión y el pulso.",
        lifestyle: "Incluye sugerencias prácticas de estilo de vida y síntomas de alarma para acudir al médico.",
        extra: "Contexto adicional del paciente: {{question}}.",
        metrics: {
          systolic: "presión sistólica {{value}} mm Hg",
          diastolic: "presión diastólica {{value}} mm Hg",
          pulse: "pulso {{value}} lpm",
          comment: "comentario: {{value}}",
          missing: "no se proporcionaron registros"
        },
        saveError: "Indica la presión sistólica, diastólica y el pulso para guardar el registro",
        submitError: "No se pudieron obtener recomendaciones"
      },
      lipid: {
        title: "Perfil lipídico y glucosa",
        disabled: "La asesoría no está disponible",
        date: "Fecha del análisis",
        cholesterol: "Colesterol total, mmol/L",
        hdl: "Colesterol HDL, mmol/L",
        ldl: "Colesterol LDL, mmol/L",
        triglycerides: "Triglicéridos, mmol/L",
        glucose: "Glucosa, mmol/L",
        question: "¿Qué más debemos aclarar?",
        questionPlaceholder: "Ejemplo: tomo estatinas y quiero ajustar la dieta",
        comment: "Comentario del análisis",
        commentPlaceholder: "Ejemplo: prueba después de un tratamiento",
        save: "Guardar registros",
        submit: "Obtener consejos",
        loading: "Solicitando recomendaciones...",
        adviceTitle: "Recomendaciones",
        historyTitle: "Archivo de lípidos y glucosa",
        historyRemove: "Eliminar entrada",
        compareWithPrevious: "Comparar con el registro anterior",
        compareWithPreviousHelp:
          "Incluye los últimos valores guardados para que el asistente comente la tendencia.",
        metrics: {
          date: "Fecha del análisis: {{value}}",
          cholesterol: "Colesterol total: {{value}}",
          hdl: "HDL: {{value}}",
          ldl: "LDL: {{value}}",
          triglycerides: "Triglicéridos: {{value}}",
          glucose: "Glucosa: {{value}}"
        },
        questionLabel: "Pregunta",
        commentLabel: "Comentario"
      },
      lipidPrompt: {
        role: "Eres médico de medicina preventiva y endocrinólogo.",
        metrics: {
          date: "fecha del análisis {{value}}",
          cholesterol: "colesterol total {{value}} mmol/L",
          hdl: "HDL {{value}} mmol/L",
          ldl: "LDL {{value}} mmol/L",
          triglycerides: "triglicéridos {{value}} mmol/L",
          glucose: "glucosa en sangre {{value}} mmol/L",
          comment: "comentario: {{value}}"
        },
        summary: "Valores actuales: {{metrics}}.",
        summaryMissing: "El paciente no proporcionó registros actuales.",
        advice: "Indica cómo mantener el perfil lipídico y la glucosa dentro de rangos seguros.",
        plan: "Crea un plan con alimentación, actividad, seguimiento del estilo de vida y cuándo acudir al médico.",
        extra: "Pregunta adicional del paciente: {{question}}.",
        compareWithPrevious: "Compara con los resultados anteriores: {{metrics}}.",
        previousMetrics: {
          date: "fecha anterior del análisis {{value}}",
          cholesterol: "colesterol total anterior {{value}} mmol/L",
          hdl: "HDL anterior {{value}} mmol/L",
          ldl: "LDL anterior {{value}} mmol/L",
          triglycerides: "triglicéridos anteriores {{value}} mmol/L",
          glucose: "glucosa anterior {{value}} mmol/L"
        },
        saveError: "Indica la fecha del análisis y al menos un valor para guardar el registro",
        submitError: "No se pudieron obtener recomendaciones"
      },
      nutrition: {
        title: "Consulta nutricional",
        disabled: "La asesoría no está disponible",
        weight: "Peso, kg",
        height: "Altura, cm",
        calories: "Calorías diarias, kcal",
        activity: "Actividad",
        activityPlaceholder: "Ejemplo: 2 entrenamientos por semana",
        question: "Describe tu objetivo o pregunta",
        questionPlaceholder: "Ejemplo: bajar de peso sin dietas estrictas",
        comment: "Notas de las mediciones",
        commentPlaceholder: "Notas adicionales: cómo te sentiste, qué comiste",
        submit: "Obtener consejos",
        loading: "Solicitando recomendaciones...",
        adviceTitle: "Recomendaciones",
        historyTitle: "Archivo de nutrición",
        metrics: {
          weight: "Peso: {{value}} kg",
          height: "Altura: {{value}} cm",
          calories: "Calorías: {{value}}",
          activity: "Actividad: {{value}}",
          question: "Solicitud:",
          comment: "Comentario:"
        },
        disabledReasonFallback: "La asesoría no está disponible",
        photo: {
          title: "Estimación de calorías por foto",
          subtitle:
            "Sube una foto del plato para obtener una estimación aproximada por porción o por 100 g. Indica en el comentario el formato que necesitas.",
          uploadLabel: "Elegir archivo",
          hint: "Compatible con JPG, PNG, HEIC de hasta 5 MB.",
          previewAlt: "Foto del plato para estimar calorías",
          remove: "Eliminar foto",
          analyze: "Calcular calorías",
          analyzing: "Analizando foto...",
          calories: "Estimación: unas {{value}} kcal",
          caloriesUnknown: "No se obtuvo estimación de calorías",
          confidence: "Confianza: {{value}}",
          notesTitle: "Comentario",
          ingredientsTitle: "Ingredientes estimados",
          missing: "Selecciona primero una foto.",
          error: "No se pudo analizar la foto",
          debugTitle: "Diagnóstico de la solicitud",
          historyTitle: "Historial de estimaciones de calorías",
          historyRemove: "Eliminar entrada"
        }
      },
      nutritionPrompt: {
        role: "Eres nutricionista. Usa los datos para proponer recomendaciones para 1-2 semanas.",
        facts: {
          weight: "peso corporal {{value}} kg",
          height: "altura {{value}} cm",
          calories: "calorías diarias {{value}} kcal",
          activity: "nivel de actividad: {{value}}",
          comment: "comentario: {{value}}"
        },
        summary: "Datos iniciales: {{facts}}.",
        summaryMissing: "El cliente no proporcionó datos iniciales.",
        extra: "Solicitud adicional del cliente: {{question}}.",
        universal: "Haz que las recomendaciones sean seguras y prácticas.",
        reminder: "Recuerda consultar al médico si hay enfermedades crónicas.",
        submitError: "No se pudieron obtener recomendaciones"
      },
      settings: {
        title: "Metas y perfil",
        subtitle: "CholestoFit es tu asistente personal para la salud del corazón",
        tabsLabel: "Ajustes",
        profileTab: "Perfil",
        billingTab: "Plan",
        gender: "Género",
        genderNotSpecified: "No especificado",
        genderMale: "Masculino",
        genderFemale: "Femenino",
        age: "Edad",
        height: "Altura (cm)",
        weight: "Peso (kg)",
        activity: "Actividad",
        calories: "Meta de calorías, kcal",
        satFat: "Límite de grasas saturadas, g",
        fiber: "Meta de fibra, g",
        saving: "Guardando...",
        save: "Guardar",
        success: "Perfil actualizado",
        planLabel: "Plan actual",
        monthlyFee: "Pago mensual: {{amount}}",
        adviceAvailable: "Asesoría de IA disponible",
        adviceUnavailable: "Asesoría de IA no disponible",
        assistantAvailable: "Asistente de IA disponible",
        assistantUnavailable: "Asistente de IA no disponible",
        togglePlansShow: "Ocultar planes",
        togglePlansHide: "Cambiar plan",
        planUpdated: "Plan actualizado",
        plansTitle: "Elige el plan adecuado",
        planSave: "Guardar plan",
        planSaving: "Actualizando...",
        depositTitle: "Recargar saldo",
        depositAmount: "Monto, USD",
        depositSubmit: "Recargar",
        depositSubmitting: "Recargando...",
        depositSuccess: "Saldo recargado",
        close: "Cerrar"
      },
      settingsActivity: {
        none: "No especificado",
        sedentary: "Sedentario",
        light: "Ligero",
        moderate: "Moderado",
        high: "Alto",
        athletic: "Atlético"
      },
      settingsDialog: {
        fullAccess: "Acceso completo al asistente IA y consejos personalizados.",
        adviceOnly: "Consejos de IA disponibles, asistente desactivado.",
        noAi: "Las herramientas de IA no están incluidas en este plan.",
        loading: "Cargando información del plan...",
        errorFallback: "La información del plan se está cargando..."
      },
      settingsErrors: {
        profileSave: "No se pudo guardar el perfil",
        depositAmount: "Ingresa un monto a recargar",
        deposit: "No se pudo recargar el saldo",
        planSelect: "Selecciona un plan",
        plan: "No se pudo actualizar el plan"
      },
      storage: {
        readFailed: "No se pudo leer el archivo {{key}}"
      }
    }
  }
};

const LANGUAGE_STORAGE_KEY = "cholestofit_language";
const DEFAULT_LANGUAGE = "ru";
const FALLBACK_LANGUAGES = ["en", DEFAULT_LANGUAGE] as const;

type TranslationParams = Record<string, string | number | boolean | null | undefined>;
type LanguageCode = (typeof LANGUAGES)[number]["value"];

const listeners = new Set<() => void>();

const normaliseLanguage = (language: string): LanguageCode => {
  const normalised = language.toLowerCase();
  if (LANGUAGES.some(option => option.value === normalised)) {
    return normalised as LanguageCode;
  }
  const shortCode = normalised.split("-")[0];
  if (LANGUAGES.some(option => option.value === shortCode)) {
    return shortCode as LanguageCode;
  }
  return DEFAULT_LANGUAGE;
};

const readInitialLanguage = (): LanguageCode => {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored) {
    return normaliseLanguage(stored);
  }
  const browserLanguage = window.navigator.languages?.[0] ?? window.navigator.language;
  if (browserLanguage) {
    return normaliseLanguage(browserLanguage);
  }
  return DEFAULT_LANGUAGE;
};

let currentLanguage: LanguageCode = readInitialLanguage();

const getTranslationValue = (language: string, path: string[]): unknown => {
  const root = resources[language as keyof typeof resources]?.translation;
  if (!root) {
    return undefined;
  }
  let value: unknown = root;
  for (const segment of path) {
    if (typeof value !== "object" || value === null || !(segment in value)) {
      return undefined;
    }
    value = (value as Record<string, unknown>)[segment];
  }
  return value;
};

const formatTranslation = (template: string, params?: TranslationParams): string => {
  if (!params) {
    return template;
  }
  return template.replace(/{{\s*([^}\s]+)\s*}}/g, (_, key: string) => {
    const replacement = params[key];
    return replacement === undefined || replacement === null ? "" : String(replacement);
  });
};

const translate = (key: string, params?: TranslationParams, language = currentLanguage): string => {
  const path = key.split(".");
  const candidates = [language, ...FALLBACK_LANGUAGES];
  const seen = new Set<string>();
  for (const candidate of candidates) {
    const normalised = normaliseLanguage(candidate);
    if (seen.has(normalised)) {
      continue;
    }
    seen.add(normalised);
    const value = getTranslationValue(normalised, path);
    if (typeof value === "string") {
      return formatTranslation(value, params);
    }
  }
  return key;
};

const notify = () => {
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => currentLanguage;

const setLanguage = (language: string) => {
  const nextLanguage = normaliseLanguage(language);
  if (nextLanguage === currentLanguage) {
    return;
  }
  currentLanguage = nextLanguage;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
  }
  notify();
};

export const changeLanguage = (language: string) => {
  setLanguage(language);
};

type TranslationFunction = (key: string, params?: TranslationParams) => string;

const baseI18n = {
  t: ((key: string, params?: TranslationParams) => translate(key, params)) as TranslationFunction,
  changeLanguage: (language: string) => setLanguage(language),
};

export type I18nApi = {
  readonly language: LanguageCode;
  t: TranslationFunction;
  changeLanguage: (language: string) => void;
};

export const i18n: I18nApi = Object.defineProperty(baseI18n, "language", {
  enumerable: true,
  get: () => currentLanguage,
}) as I18nApi;

export const useTranslation = () => {
  const language = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const t = useCallback<TranslationFunction>(
    (key, params) => translate(key, params, language),
    [language]
  );
  const api = useMemo<I18nApi>(
    () => ({
      language,
      t,
      changeLanguage,
    }),
    [language, t]
  );
  return { t, i18n: api };
};
