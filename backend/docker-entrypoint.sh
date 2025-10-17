#!/bin/sh
set -e

AUTO_RUN=${AUTO_RUN_MIGRATIONS:-true}
if [ "${AUTO_RUN}" != "false" ]; then
  echo "Запуск миграций базы данных..."
  MAX_RETRIES=${MIGRATION_MAX_RETRIES:-10}
  RETRY_DELAY=${MIGRATION_RETRY_DELAY:-3}
  COUNT=1
  while true; do
    if php bin/migrate.php; then
      break
    fi

    if [ "$COUNT" -ge "$MAX_RETRIES" ]; then
      echo "Ошибка применения миграций" >&2
      exit 1
    fi

    COUNT=$((COUNT + 1))
    echo "Миграции не применились, повтор через ${RETRY_DELAY}с (попытка ${COUNT}/${MAX_RETRIES})" >&2
    sleep "$RETRY_DELAY"
  done
fi

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

exec php -S 0.0.0.0:8180 -t public public/index.php
