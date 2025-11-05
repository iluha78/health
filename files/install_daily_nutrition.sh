#!/bin/bash
# Установка обновления: Фото еды и консультации по дням
# Версия: 1.0

set -e

echo "===================================================="
echo "  Фото еды и консультации по дням"
echo "===================================================="
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(dirname "$SCRIPT_DIR")}"

echo "📋 Что будет установлено:"
echo "  ✓ Таблица daily_food_photos (фото еды с калориями)"
echo "  ✓ Обновление таблицы nutrition_advices (добавление даты)"
echo "  ✓ API для работы с данными по дням"
echo "  ✓ Автоматический подсчет суммы калорий"
echo ""

# Проверка backend
if [ ! -d "$PROJECT_ROOT/backend" ]; then
    echo "❌ Ошибка: Директория backend не найдена"
    exit 1
fi

echo "✅ Директория backend найдена"
echo ""

# Проверка файлов
REQUIRED_FILES=(
    "backend_migrations_006_daily_nutrition.sql"
    "backend_DailyFoodPhoto.php"
    "backend_NutritionAdvice.php"
    "backend_DailyFoodPhotoController.php"
    "backend_NutritionAdviceController.php"
    "routes_updated.php"
)

echo "Проверка файлов..."
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$SCRIPT_DIR/$file" ]; then
        echo "❌ Ошибка: Файл $file не найден"
        exit 1
    fi
    echo "  ✓ $file"
done
echo ""

# Создание backup
echo "📦 Создание резервной копии..."
BACKUP_DIR="$PROJECT_ROOT/backend/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup существующих файлов
if [ -f "$PROJECT_ROOT/backend/src/Models/NutritionAdvice.php" ]; then
    cp "$PROJECT_ROOT/backend/src/Models/NutritionAdvice.php" "$BACKUP_DIR/"
    echo "  ✓ Backup NutritionAdvice.php"
fi

if [ -f "$PROJECT_ROOT/backend/config/routes.php" ]; then
    cp "$PROJECT_ROOT/backend/config/routes.php" "$BACKUP_DIR/routes.php.bak"
    echo "  ✓ Backup routes.php"
fi

echo "  ✓ Backup сохранен в: $BACKUP_DIR"
echo ""

# Копирование файлов
echo "📁 Копирование файлов..."

# Миграция
cp "$SCRIPT_DIR/backend_migrations_006_daily_nutrition.sql" \
   "$PROJECT_ROOT/backend/migrations/006_daily_nutrition.sql"
echo "  ✓ Миграция"

# Модели
cp "$SCRIPT_DIR/backend_DailyFoodPhoto.php" \
   "$PROJECT_ROOT/backend/src/Models/DailyFoodPhoto.php"
echo "  ✓ Модель DailyFoodPhoto"

cp "$SCRIPT_DIR/backend_NutritionAdvice.php" \
   "$PROJECT_ROOT/backend/src/Models/NutritionAdvice.php"
echo "  ✓ Модель NutritionAdvice (обновлена)"

# Контроллеры
cp "$SCRIPT_DIR/backend_DailyFoodPhotoController.php" \
   "$PROJECT_ROOT/backend/src/Controllers/DailyFoodPhotoController.php"
echo "  ✓ Контроллер DailyFoodPhotoController"

cp "$SCRIPT_DIR/backend_NutritionAdviceController.php" \
   "$PROJECT_ROOT/backend/src/Controllers/NutritionAdviceController.php"
echo "  ✓ Контроллер NutritionAdviceController"

# Роуты
cp "$SCRIPT_DIR/routes_updated.php" \
   "$PROJECT_ROOT/backend/config/routes.php"
echo "  ✓ Роуты обновлены"

echo ""
echo "✅ Все файлы скопированы"
echo ""

# Composer autoload
echo "🔄 Обновление Composer autoload..."
cd "$PROJECT_ROOT/backend"

if command -v composer &> /dev/null; then
    composer dump-autoload
    echo "  ✓ Autoload обновлен"
else
    echo "  ⚠️  Composer не найден, выполните вручную:"
    echo "     cd backend && composer dump-autoload"
fi

echo ""

# Применение миграции
echo "💾 Применение миграции..."
echo "Выберите способ:"
echo "  1) Composer (composer migrate)"
echo "  2) Docker (docker-compose restart backend)"
echo "  3) Вручную (пропустить)"
echo ""
read -p "Ваш выбор (1/2/3): " migration_choice

case $migration_choice in
    1)
        if command -v composer &> /dev/null; then
            cd "$PROJECT_ROOT/backend"
            composer migrate
            echo "  ✅ Миграция применена"
        else
            echo "  ❌ Composer не найден"
            exit 1
        fi
        ;;
    2)
        if command -v docker-compose &> /dev/null; then
            cd "$PROJECT_ROOT"
            docker-compose restart backend
            echo "  ✅ Backend перезапущен"
        else
            echo "  ❌ docker-compose не найден"
            exit 1
        fi
        ;;
    3)
        echo "  ⚠️  Миграция пропущена"
        echo "     Примените вручную: cd backend && composer migrate"
        ;;
    *)
        echo "  ⚠️  Неверный выбор"
        ;;
esac

echo ""
echo "===================================================="
echo "  ✅ Установка завершена!"
echo "===================================================="
echo ""
echo "🎯 Что теперь доступно:"
echo ""
echo "Фото еды с калориями:"
echo "  GET    /daily-food/{date}"
echo "  POST   /daily-food"
echo "  GET    /daily-food-history"
echo "  DELETE /daily-food/{id}"
echo ""
echo "Консультации нутрициолога:"
echo "  GET    /nutrition-advice/{date}"
echo "  POST   /nutrition-advice"
echo "  GET    /nutrition-advice-history"
echo "  DELETE /nutrition-advice/{id}"
echo ""
echo "📚 Документация:"
echo "  DAILY_NUTRITION_API.md - полное описание API"
echo ""
echo "🧪 Проверка:"
echo "  curl -H 'Authorization: Bearer TOKEN' \\"
echo "    http://localhost:8080/daily-food/$(date +%Y-%m-%d)"
echo ""
echo "🎉 Готово!"
