#!/bin/bash
# Скрипт автоматической установки обновлений для хранения данных в БД
# Версия: 1.0
# Дата: 2025-11-02

set -e  # Остановка при ошибке

echo "================================================"
echo "  Установка обновлений CholestoFit"
echo "  Хранение измерений давления и сахара в БД"
echo "================================================"
echo ""

# Определение корневой директории проекта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(dirname "$SCRIPT_DIR")}"

echo "Корневая директория проекта: $PROJECT_ROOT"
echo ""

# Проверка существования backend директории
if [ ! -d "$PROJECT_ROOT/backend" ]; then
    echo "❌ Ошибка: Директория backend не найдена в $PROJECT_ROOT"
    echo "   Убедитесь, что вы запускаете скрипт из корня проекта"
    exit 1
fi

echo "✅ Директория backend найдена"
echo ""

# Проверка наличия файлов для установки
FILES_DIR="$SCRIPT_DIR"
REQUIRED_FILES=(
    "backend_migrations_004_blood_pressure.sql"
    "backend_BloodPressureRecord.php"
    "backend_BloodPressureController.php"
    "routes.php"
)

echo "Проверка наличия необходимых файлов..."
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$FILES_DIR/$file" ]; then
        echo "❌ Ошибка: Файл $file не найден в $FILES_DIR"
        exit 1
    fi
    echo "  ✓ $file"
done
echo ""

# Создание резервных копий
echo "Создание резервных копий..."
BACKUP_DIR="$PROJECT_ROOT/backend/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [ -f "$PROJECT_ROOT/backend/config/routes.php" ]; then
    cp "$PROJECT_ROOT/backend/config/routes.php" "$BACKUP_DIR/routes.php.bak"
    echo "  ✓ Резервная копия routes.php создана"
fi

echo "  ✓ Резервные копии сохранены в: $BACKUP_DIR"
echo ""

# Копирование файлов
echo "Копирование файлов..."

# Миграция
cp "$FILES_DIR/backend_migrations_004_blood_pressure.sql" \
   "$PROJECT_ROOT/backend/migrations/004_blood_pressure.sql"
echo "  ✓ Миграция скопирована"

# Модель
cp "$FILES_DIR/backend_BloodPressureRecord.php" \
   "$PROJECT_ROOT/backend/src/Models/BloodPressureRecord.php"
echo "  ✓ Модель скопирована"

# Контроллер
cp "$FILES_DIR/backend_BloodPressureController.php" \
   "$PROJECT_ROOT/backend/src/Controllers/BloodPressureController.php"
echo "  ✓ Контроллер скопирован"

# Роуты
cp "$FILES_DIR/routes.php" \
   "$PROJECT_ROOT/backend/config/routes.php"
echo "  ✓ Роуты обновлены"

echo ""
echo "✅ Все файлы успешно скопированы"
echo ""

# Обновление автозагрузки Composer
echo "Обновление автозагрузки Composer..."
cd "$PROJECT_ROOT/backend"

if command -v composer &> /dev/null; then
    composer dump-autoload
    echo "  ✓ Автозагрузка обновлена"
else
    echo "  ⚠ Composer не найден, пропускаем обновление автозагрузки"
    echo "    Выполните вручную: cd backend && composer dump-autoload"
fi

echo ""

# Применение миграции
echo "Применение миграции..."
echo "Выберите способ применения:"
echo "  1) Автоматически (через composer migrate)"
echo "  2) Вручную (пропустить, применю позже)"
echo "  3) Через Docker (docker-compose restart backend)"
echo ""
read -p "Ваш выбор (1/2/3): " migration_choice

case $migration_choice in
    1)
        if command -v composer &> /dev/null; then
            cd "$PROJECT_ROOT/backend"
            composer migrate
            echo "  ✅ Миграция применена успешно"
        else
            echo "  ❌ Composer не найден"
            echo "     Примените миграцию вручную: cd backend && composer migrate"
        fi
        ;;
    2)
        echo "  ⚠ Миграция пропущена"
        echo "    Не забудьте применить её вручную:"
        echo "    cd backend && composer migrate"
        ;;
    3)
        if command -v docker-compose &> /dev/null; then
            cd "$PROJECT_ROOT"
            docker-compose restart backend
            echo "  ✅ Backend перезапущен, миграция будет применена автоматически"
        else
            echo "  ❌ docker-compose не найден"
            echo "     Перезапустите контейнер вручную"
        fi
        ;;
    *)
        echo "  ⚠ Неверный выбор, миграция пропущена"
        echo "    Примените миграцию вручную позже"
        ;;
esac

echo ""
echo "================================================"
echo "  ✅ Установка завершена!"
echo "================================================"
echo ""
echo "Что дальше:"
echo ""
echo "1. Проверьте, что миграция применилась:"
echo "   mysql -u root -p cholestofit -e 'SHOW TABLES LIKE \"blood_pressure_records\";'"
echo ""
echo "2. Проверьте API:"
echo "   curl -H \"Authorization: Bearer YOUR_TOKEN\" http://localhost:8080/blood-pressure"
echo ""
echo "3. Обновите frontend для работы с новым API"
echo "   См. файл CHANGES_SUMMARY.md для примеров кода"
echo ""
echo "4. Резервные копии сохранены в:"
echo "   $BACKUP_DIR"
echo ""
echo "Подробная документация:"
echo "  - INSTALLATION_GUIDE.md - полная инструкция"
echo "  - CHANGES_SUMMARY.md - краткая сводка и примеры"
echo ""
