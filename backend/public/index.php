<?php
use App\Middleware\CorsMiddleware;
use App\Support\Env;
use App\Support\MigrationRunner;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Exception\HttpException;
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';
Env::bootstrap([dirname(__DIR__), dirname(__DIR__, 2)]);

$app = AppFactory::create();
$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();
$app->add(CorsMiddleware::fromEnv($app->getResponseFactory()));

$errorMiddleware = $app->addErrorMiddleware(
    Env::bool('APP_DEBUG', false),
    true,
    true
);

$errorMiddleware->setDefaultErrorHandler(
    function (Request $request, \Throwable $exception, bool $displayErrorDetails, bool $logErrors, bool $logErrorDetails) use ($app) {
        if ($logErrors) {
            $message = $exception->getMessage();
            if ($logErrorDetails) {
                $message .= PHP_EOL . $exception->getTraceAsString();
            }

            error_log($message);
        }

        $statusCode = $exception instanceof HttpException ? $exception->getCode() : 500;
        if ($statusCode < 400 || $statusCode > 599) {
            $statusCode = 500;
        }

        $message = ($displayErrorDetails || $statusCode < 500)
            ? $exception->getMessage()
            : 'Внутренняя ошибка сервера';

        $response = $app->getResponseFactory()->createResponse($statusCode);
        $payload = json_encode(['error' => $message], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($payload === false) {
            $payload = '{}';
        }

        $response->getBody()->write($payload);

        return $response->withHeader('Content-Type', 'application/json');
    }
);

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
