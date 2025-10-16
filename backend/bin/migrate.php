<?php
declare(strict_types=1);

use Dotenv\Dotenv;
use Illuminate\Database\Capsule\Manager as Capsule;

require __DIR__ . '/../vendor/autoload.php';

$projectRoot = realpath(__DIR__ . '/..');

if ($projectRoot === false) {
    fwrite(STDERR, "Не удалось определить корень проекта.\n");
    exit(1);
}

$envPath = $projectRoot . '/.env';
if (file_exists($envPath)) {
    Dotenv::createImmutable($projectRoot)->safeLoad();
}

require $projectRoot . '/config/db.php';

$connection = Capsule::connection();
$pdo = $connection->getPdo();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$pdo->exec('CREATE TABLE IF NOT EXISTS schema_migrations (filename VARCHAR(255) PRIMARY KEY, executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');

$migrationsDir = $projectRoot . '/migrations';
if (!is_dir($migrationsDir)) {
    fwrite(STDERR, "Каталог с миграциями не найден: {$migrationsDir}\n");
    exit(1);
}

$files = glob($migrationsDir . '/*.sql');
sort($files, SORT_NATURAL);

if (empty($files)) {
    fwrite(STDOUT, "Нет файлов миграций.\n");
    exit(0);
}

$applied = 0;
foreach ($files as $file) {
    $filename = basename($file);
    $exists = $pdo->prepare('SELECT 1 FROM schema_migrations WHERE filename = ? LIMIT 1');
    $exists->execute([$filename]);

    if ($exists->fetch()) {
        continue;
    }

    $sql = file_get_contents($file);
    if ($sql === false) {
        fwrite(STDERR, "Не удалось прочитать файл {$filename}.\n");
        exit(1);
    }

    $statements = array_filter(array_map('trim', preg_split('/;\s*(?:\r?\n|$)/', $sql)));
    if (empty($statements)) {
        continue;
    }

    $pdo->beginTransaction();
    try {
        foreach ($statements as $statement) {
            if ($statement === '') {
                continue;
            }
            $pdo->exec($statement);
        }
        $insert = $pdo->prepare('INSERT INTO schema_migrations (filename) VALUES (?)');
        $insert->execute([$filename]);
        $pdo->commit();
        $applied++;
        fwrite(STDOUT, "✔ Применена миграция {$filename}\n");
    } catch (Throwable $e) {
        $pdo->rollBack();
        fwrite(STDERR, "✘ Ошибка при выполнении {$filename}: {$e->getMessage()}\n");
        exit(1);
    }
}

if ($applied === 0) {
    fwrite(STDOUT, "Все миграции уже применены.\n");
} else {
    fwrite(STDOUT, "Готово. Новых миграций: {$applied}.\n");
}
