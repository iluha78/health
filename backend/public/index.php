<?php
use App\Middleware\CorsMiddleware;
use App\Support\Env;
use App\Support\MigrationRunner;
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';
Env::bootstrap([dirname(__DIR__), dirname(__DIR__, 2)]);

$app = AppFactory::create();
$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();
$app->add(CorsMiddleware::fromEnv($app->getResponseFactory()));

require __DIR__ . '/../config/db.php';

$shouldAutoMigrate = Env::bool('AUTO_RUN_MIGRATIONS', true);

if ($shouldAutoMigrate) {
    try {
        $runner = new MigrationRunner();
        $applied = $runner->run();

        if ($applied > 0) {
            error_log("Применены {$applied} миграции(й) при старте приложения.");
        }
    } catch (\Throwable $e) {
        error_log('Не удалось применить миграции: ' . $e->getMessage());
        http_response_code(500);
        echo 'Сервер не готов к обработке запросов (ошибка миграции).';
        exit(1);
    }
}

require __DIR__ . '/../config/routes.php';

$app->run();
