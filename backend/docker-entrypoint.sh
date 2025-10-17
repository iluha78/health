#!/bin/sh
set -e

AUTO_RUN=${AUTO_RUN_MIGRATIONS:-true}
if [ "${AUTO_RUN}" != "false" ]; then
  echo "Запуск миграций базы данных..."
  if ! php bin/migrate.php; then
    echo "Ошибка применения миграций" >&2
    exit 1
  fi
fi

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

exec php -S 0.0.0.0:8080 -t public public/index.php
