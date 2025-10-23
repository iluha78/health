<?php

namespace App\Middleware;

use App\Support\Env;
use Psr\Http\Message\ResponseFactoryInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

class CorsMiddleware implements MiddlewareInterface
{
    private bool $allowAll;

    /**
     * @var list<array{scheme:string, host:string, port:?int, anyPort:bool}>
     */
    private array $patterns;

    private ResponseFactoryInterface $responseFactory;

    private function __construct(ResponseFactoryInterface $responseFactory, bool $allowAll, array $patterns)
    {
        $this->responseFactory = $responseFactory;
        $this->allowAll = $allowAll;
        $this->patterns = $patterns;
    }

    public static function fromEnv(ResponseFactoryInterface $responseFactory): self
    {
        $raw = Env::string('CORS_ALLOWED_ORIGINS', '*') ?? '*';
        if ($raw === '') {
            $raw = '*';
        }

        $entries = array_filter(array_map('trim', explode(',', $raw)), static fn (string $value): bool => $value !== '');

        $allowAll = false;
        $patterns = [];
        $keys = [];

        foreach ($entries as $entry) {
            if ($entry === '*') {
                $allowAll = true;
                continue;
            }

            $normalized = rtrim($entry, '/');
            if ($normalized === '') {
                continue;
            }

            if (strpos($normalized, '://') === false) {
                $normalized = 'http://' . $normalized;
            }

            $parsed = parse_url($normalized);
            if ($parsed === false || !isset($parsed['host'])) {
                continue;
            }

            $host = strtolower($parsed['host']);
            $scheme = isset($parsed['scheme']) ? strtolower($parsed['scheme']) : null;
            $port = isset($parsed['port']) ? (int) $parsed['port'] : null;

            $schemes = $scheme !== null ? [$scheme] : ['http', 'https'];

            if ($scheme !== null && self::isLocalHost($host)) {
                $mirrorScheme = $scheme === 'https' ? 'http' : 'https';
                if (!in_array($mirrorScheme, $schemes, true)) {
                    $schemes[] = $mirrorScheme;
                }
            }

            $hosts = array_merge([$host], self::mirrorHosts($host));

            foreach ($hosts as $candidateHost) {
                foreach ($schemes as $candidateScheme) {
                    $key = $candidateScheme . '|' . $candidateHost . '|' . ($port === null ? '*' : (string) $port);
                    if (isset($keys[$key])) {
                        continue;
                    }

                    $keys[$key] = true;
                    $patterns[] = [
                        'scheme' => $candidateScheme,
                        'host' => $candidateHost,
                        'port' => $port,
                        'anyPort' => $port === null,
                    ];
                }
            }
        }

        return new self($responseFactory, $allowAll, $patterns);
    }

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $isPreflight = strtoupper($request->getMethod()) === 'OPTIONS';
        $response = $isPreflight
            ? $this->responseFactory->createResponse(204)
            : $handler->handle($request);

        $originHeader = $request->getHeaderLine('Origin');
        $allowOrigin = null;

        if ($this->allowAll) {
            if ($originHeader !== '') {
                $allowOrigin = rtrim($originHeader, '/');
            } else {
                $allowOrigin = '*';
            }
        } elseif ($originHeader !== '') {
            $allowOrigin = $this->matchOrigin($originHeader);
        }

        if ($allowOrigin === null && $originHeader !== '') {
            $parsed = parse_url($originHeader);
            if ($parsed !== false && isset($parsed['host'])) {
                $host = strtolower($parsed['host']);
                if (self::isLocalHost($host)) {
                    $allowOrigin = $originHeader;
                }
            }
        }

        if ($allowOrigin !== null) {
            $response = $response
                ->withHeader('Access-Control-Allow-Origin', $allowOrigin)
                ->withAddedHeader('Vary', 'Origin');

            if ($allowOrigin !== '*' && $allowOrigin !== '') {
                $response = $response->withHeader('Access-Control-Allow-Credentials', 'true');
            }
        }

        $requestedHeaders = $request->getHeaderLine('Access-Control-Request-Headers');
        $allowHeaders = $requestedHeaders !== ''
            ? $requestedHeaders
            : 'Content-Type, Authorization, Accept, X-Requested-With, Origin';

        return $response
            ->withHeader('Access-Control-Allow-Headers', $allowHeaders)
            ->withHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            ->withHeader('Access-Control-Max-Age', '86400');
    }

    private function matchOrigin(string $originHeader): ?string
    {
        $origin = parse_url($originHeader);
        if ($origin === false || !isset($origin['host'])) {
            return null;
        }

        $scheme = strtolower($origin['scheme'] ?? 'http');
        $host = strtolower($origin['host']);
        $port = $origin['port'] ?? $this->defaultPort($scheme);

        foreach ($this->patterns as $pattern) {
            if ($pattern['host'] !== $host) {
                continue;
            }

            if ($pattern['scheme'] !== $scheme) {
                continue;
            }

            if ($pattern['anyPort']) {
                return $originHeader;
            }

            $patternPort = $pattern['port'] ?? $this->defaultPort($pattern['scheme']);
            if ($patternPort === $port) {
                return $originHeader;
            }
        }

        return null;
    }

    private function defaultPort(string $scheme): int
    {
        return $scheme === 'https' ? 443 : 80;
    }

    /**
     * @return list<string>
     */
    private static function mirrorHosts(string $host): array
    {
        $lower = strtolower($host);
        return match ($lower) {
            'localhost' => ['127.0.0.1', 'host.docker.internal'],
            '127.0.0.1' => ['localhost', 'host.docker.internal'],
            '0.0.0.0' => ['localhost', '127.0.0.1', 'host.docker.internal'],
            'host.docker.internal' => ['localhost', '127.0.0.1'],
            default => [],
        };
    }

    private static function isLocalHost(string $host): bool
    {
        $lower = strtolower($host);
        if (in_array($lower, ['localhost', 'host.docker.internal', '0.0.0.0'], true)) {
            return true;
        }

        if ($lower === '127.0.0.1' || str_starts_with($lower, '127.')) {
            return true;
        }

        if ($lower === '::1') {
            return true;
        }

        return false;
    }
}
