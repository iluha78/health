<?php
use App\Support\MigrationRunner;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Slim\Factory\AppFactory;
use Throwable;

require __DIR__ . '/../vendor/autoload.php';
(Dotenv\Dotenv::createImmutable(dirname(__DIR__)))->safeLoad();

$app = AppFactory::create();
$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();

$corsRaw = $_ENV['CORS_ALLOWED_ORIGINS'] ?? '*';
$allowedOrigins = array_values(array_filter(array_map('trim', explode(',', $corsRaw))));

$app->add(function (Request $request, RequestHandler $handler) use ($allowedOrigins, $app): Response {
    $isPreflight = strtoupper($request->getMethod()) === 'OPTIONS';
    $response = $isPreflight ? $app->getResponseFactory()->createResponse(204) : $handler->handle($request);

    $origin = $request->getHeaderLine('Origin');
    $allowOrigin = null;

    if (count($allowedOrigins) === 0 || ($allowedOrigins[0] === '*' && count($allowedOrigins) === 1)) {
        $allowOrigin = '*';
    } elseif ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
        $allowOrigin = $origin;
    }

    if ($allowOrigin !== null) {
        $response = $response
            ->withHeader('Access-Control-Allow-Origin', $allowOrigin)
            ->withHeader('Vary', 'Origin');

        if ($allowOrigin !== '*') {
            $response = $response->withHeader('Access-Control-Allow-Credentials', 'true');
        }
    }

    return $response
        ->withHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With')
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
        ->withHeader('Access-Control-Max-Age', '86400');
});

require __DIR__ . '/../config/db.php';

$autoMigrateRaw = $_ENV['AUTO_RUN_MIGRATIONS'] ?? 'true';
$shouldAutoMigrate = filter_var($autoMigrateRaw, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);

if ($shouldAutoMigrate === null) {
    $shouldAutoMigrate = strtolower((string) $autoMigrateRaw) !== 'false';
}

if ($shouldAutoMigrate) {
    try {
        $runner = new MigrationRunner();
        $applied = $runner->run();

        if ($applied > 0) {
            error_log("Применены {$applied} миграции(й) при старте приложения.");
        }
    } catch (Throwable $e) {
        error_log('Не удалось применить миграции: ' . $e->getMessage());
        http_response_code(500);
        echo 'Сервер не готов к обработке запросов (ошибка миграции).';
        exit(1);
    }
}

require __DIR__ . '/../config/routes.php';

$app->run();
