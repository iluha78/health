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

if ($corsRaw === '') {
    $corsRaw = '*';
}
$allowedPatterns = [];
$patternKeys = [];

$addPattern = static function (string $scheme, string $host, ?int $port, bool $wildcardPort) use (&$allowedPatterns, &$patternKeys): void {
    $scheme = strtolower($scheme);
    $host = strtolower($host);
    $key = $scheme . '|' . $host . '|' . ($wildcardPort ? '*' : ($port === null ? '' : (string) $port));

    if (isset($patternKeys[$key])) {
        return;
    }

    $patternKeys[$key] = true;
    $allowedPatterns[] = [
        'scheme' => $scheme,
        'host' => $host,
        'port' => $port,
        'wildcardPort' => $wildcardPort,
    ];
};

foreach (explode(',', $corsRaw) as $item) {
    $trimmed = trim($item);

    if ($trimmed === '') {
        continue;
    }

    if ($trimmed === '*') {
        $allowedPatterns['*'] = true;
        continue;
    }

    $candidate = rtrim($trimmed, '/');
    if (strpos($candidate, '://') === false) {
        $candidate = 'http://' . $candidate;
    }

    $parsed = parse_url($candidate);

    if ($parsed === false || !isset($parsed['host'])) {
        continue;
    }

    $scheme = $parsed['scheme'] ?? 'http';
    $host = $parsed['host'];
    $port = isset($parsed['port']) ? (int) $parsed['port'] : null;
    $wildcardPort = !isset($parsed['port']);

    $addPattern($scheme, $host, $port, $wildcardPort);

    $mirrorHosts = [];
    $lowerHost = strtolower($host);

    if ($lowerHost === 'localhost') {
        $mirrorHosts = ['127.0.0.1', 'host.docker.internal'];
    } elseif ($lowerHost === '127.0.0.1') {
        $mirrorHosts = ['localhost', 'host.docker.internal'];
    } elseif ($lowerHost === 'host.docker.internal') {
        $mirrorHosts = ['localhost', '127.0.0.1'];
    } elseif ($lowerHost === '0.0.0.0') {
        $mirrorHosts = ['localhost', '127.0.0.1', 'host.docker.internal'];
    }

    foreach ($mirrorHosts as $mirror) {
        $addPattern($scheme, $mirror, $port, $wildcardPort);
    }
}

$allowAllOrigins = isset($allowedPatterns['*']);
if ($allowAllOrigins) {
    unset($allowedPatterns['*']);
}

$defaultPort = static function (string $scheme): int {
    return strtolower($scheme) === 'https' ? 443 : 80;
};

$app->add(function (Request $request, RequestHandler $handler) use ($allowedPatterns, $allowAllOrigins, $app, $defaultPort): Response {
    $isPreflight = strtoupper($request->getMethod()) === 'OPTIONS';
    $response = $isPreflight ? $app->getResponseFactory()->createResponse(204) : $handler->handle($request);

    $originHeader = $request->getHeaderLine('Origin');
    $origin = $originHeader !== '' ? rtrim($originHeader, '/') : '';
    $allowOrigin = null;

    if ($allowAllOrigins) {
        $allowOrigin = $origin !== '' ? $origin : '*';
    } elseif ($origin !== '') {
        $parsedOrigin = parse_url($origin);

        if ($parsedOrigin !== false && isset($parsedOrigin['host'])) {
            $originHost = strtolower($parsedOrigin['host']);
            $originScheme = strtolower($parsedOrigin['scheme'] ?? 'http');
            $originPort = $parsedOrigin['port'] ?? $defaultPort($originScheme);

            foreach ($allowedPatterns as $pattern) {
                if ($pattern['host'] !== $originHost) {
                    continue;
                }

                if ($pattern['scheme'] !== $originScheme) {
                    continue;
                }

                if ($pattern['wildcardPort']) {
                    $allowOrigin = $originHeader;
                    break;
                }

                $patternPort = $pattern['port'] ?? $defaultPort($pattern['scheme']);

                if ($patternPort === $originPort) {
                    $allowOrigin = $originHeader;
                    break;
                }
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
