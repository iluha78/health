# CholestoFit Frontend

React-приложение панели мониторинга CholestoFit. Интерфейс использует REST API бэкенда для авторизации, учёта липидов, пищевого дневника и AI-сервисов.

## Конфигурация API

1. Скопируйте `.env.example` в `.env`.
2. Укажите переменную `VITE_API_BASE_URL` с полным адресом REST API, например:
   ```env
   VITE_API_BASE_URL=http://localhost:8080
   ```
3. Перезапустите dev-сервер после изменения переменных окружения.

## Запуск

```bash
npm install
npm run dev
```

Сборка production-версии:

```bash
npm run build
```
