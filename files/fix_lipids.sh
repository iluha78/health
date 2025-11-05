#!/bin/bash
# Быстрый патч для исправления ошибки "Out of range value for column 'chol'"
# Версия: 1.0

set -e

echo "=========================================="
echo "  Исправление ошибки липидного профиля"
echo "=========================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(dirname "$SCRIPT_DIR")}"

echo "Проблема: DECIMAL(4,2) → слишком мал для значений в мг/дл"
echo "Решение:  DECIMAL(6,2) → поддержка до 9999.99"
echo ""

# Проверка существования backend
if [ ! -d "$PROJECT_ROOT/backend" ]; then
    echo "❌ Ошибка: Директория backend не найдена"
    exit 1
fi

# Копирование миграции
echo "📋 Копирование миграции..."
cp "$SCRIPT_DIR/backend_migrations_005_fix_lipids_range.sql" \
   "$PROJECT_ROOT/backend/migrations/005_fix_lipids_range.sql"
echo "✅ Миграция скопирована"
echo ""

# Выбор способа применения
echo "Выберите способ применения:"
echo "  1) Composer (cd backend && composer migrate)"
echo "  2) Docker (docker-compose restart backend)"
echo "  3) Вручную (SQL команда)"
echo ""
read -p "Ваш выбор (1/2/3): " choice

case $choice in
    1)
        if command -v composer &> /dev/null; then
            cd "$PROJECT_ROOT/backend"
            echo ""
            echo "🔄 Применение миграции..."
            composer migrate
            echo ""
            echo "✅ Миграция применена!"
        else
            echo "❌ Composer не найден"
            exit 1
        fi
        ;;
    2)
        if command -v docker-compose &> /dev/null; then
            cd "$PROJECT_ROOT"
            echo ""
            echo "🔄 Перезапуск backend..."
            docker-compose restart backend
            echo ""
            echo "✅ Backend перезапущен, миграция применится автоматически"
        else
            echo "❌ docker-compose не найден"
            exit 1
        fi
        ;;
    3)
        echo ""
        echo "Выполните в MySQL:"
        echo ""
        echo "mysql -u root -p cholestofit"
        echo ""
        cat "$PROJECT_ROOT/backend/migrations/005_fix_lipids_range.sql"
        echo ""
        ;;
    *)
        echo "❌ Неверный выбор"
        exit 1
        ;;
esac

echo ""
echo "=========================================="
echo "  Проверка результата"
echo "=========================================="
echo ""
echo "Выполните для проверки:"
echo "  mysql -u root -p cholestofit -e \"DESCRIBE lipids;\""
echo ""
echo "Ожидаемый результат:"
echo "  chol  | decimal(6,2)"
echo "  hdl   | decimal(6,2)"
echo "  ldl   | decimal(6,2)"
echo "  trig  | decimal(6,2)"
echo ""
echo "✅ Готово! Теперь можно сохранять значения до 9999.99"
