<?php
declare(strict_types=1);

use App\Support\MigrationRunner;
use Dotenv\Dotenv;
use Throwable;

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

$runner = new MigrationRunner($projectRoot . '/migrations');

try {
    $applied = $runner->run(static function (string $level, string $message): void {
        $stream = $level === 'error' ? STDERR : STDOUT;
        fwrite($stream, $message . PHP_EOL);
    });
} catch (Throwable $e) {
    fwrite(STDERR, "✘ Ошибка миграции: {$e->getMessage()}\n");
    exit(1);
}

if ($applied === 0) {
    fwrite(STDOUT, "Все миграции уже применены.\n");
} else {
    fwrite(STDOUT, "Готово. Новых миграций: {$applied}.\n");
}
