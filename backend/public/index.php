<?php
use App\Support\Env;
use App\Support\MigrationRunner;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Slim\Factory\AppFactory;
use Throwable;

require __DIR__ . '/../vendor/autoload.php';
Env::bootstrap([dirname(__DIR__), dirname(__DIR__, 2)]);

$app = AppFactory::create();
$app->addBodyParsingMiddleware();
$app->addRoutingMiddleware();

$corsRaw = Env::string('CORS_ALLOWED_ORIGINS', '*') ?? '*';
$allowedOrigins = [];

foreach (explode(',', $corsRaw) as $item) {
    $trimmed = trim($item);

    if ($trimmed === '') {
        continue;
    }

    if ($trimmed === '*') {
        $allowedOrigins['*'] = true;
        continue;
    }

    $allowedOrigins[rtrim($trimmed, '/')] = true;
}

$allowAllOrigins = isset($allowedOrigins['*']);
if ($allowAllOrigins) {
    unset($allowedOrigins['*']);
}

$normalizedOrigins = [];

foreach (array_keys(array_filter($allowedOrigins)) as $origin) {
    $normalizedOrigins[] = $origin;

    $parsed = parse_url($origin);

    if ($parsed === false || !isset($parsed['host'])) {
        continue;
    }

    $scheme = $parsed['scheme'] ?? 'http';
    $port = isset($parsed['port']) ? ':' . $parsed['port'] : '';

    if (strcasecmp($parsed['host'], 'localhost') === 0) {
        $normalizedOrigins[] = sprintf('%s://127.0.0.1%s', $scheme, $port);
    }

    if ($parsed['host'] === '127.0.0.1') {
        $normalizedOrigins[] = sprintf('%s://localhost%s', $scheme, $port);
    }
}

$normalizedOrigins = array_values(array_unique($normalizedOrigins, SORT_STRING));

$app->add(function (Request $request, RequestHandler $handler) use ($normalizedOrigins, $allowAllOrigins, $app): Response {
    $isPreflight = strtoupper($request->getMethod()) === 'OPTIONS';
    $response = $isPreflight ? $app->getResponseFactory()->createResponse(204) : $handler->handle($request);

    $originHeader = $request->getHeaderLine('Origin');
    $origin = $originHeader !== '' ? rtrim($originHeader, '/') : '';
    $allowOrigin = null;

    if ($allowAllOrigins) {
        $allowOrigin = $origin !== '' ? $origin : '*';
    } elseif ($origin !== '') {
        foreach ($normalizedOrigins as $candidate) {
            if (strcasecmp($candidate, $origin) === 0) {
                $allowOrigin = $originHeader; // сохраняем оригинальное значение для заголовка
                break;
            }
        }
    }

    if ($allowOrigin !== null) {
        $response = $response
            ->withHeader('Access-Control-Allow-Origin', $allowOrigin)
            ->withHeader('Vary', 'Origin');

        if ($allowOrigin !== '*' && $allowOrigin !== '') {
            $response = $response->withHeader('Access-Control-Allow-Credentials', 'true');
        }
    }

    $requestedHeaders = $request->getHeaderLine('Access-Control-Request-Headers');
    $allowHeaders = $requestedHeaders !== '' ? $requestedHeaders : 'Content-Type, Authorization, Accept, X-Requested-With, Origin';

    return $response
        ->withHeader('Access-Control-Allow-Headers', $allowHeaders)
        ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
        ->withHeader('Access-Control-Max-Age', '86400');
});

require __DIR__ . '/../config/db.php';

$shouldAutoMigrate = Env::bool('AUTO_RUN_MIGRATIONS', true);

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
