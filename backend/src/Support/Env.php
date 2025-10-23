<?php

namespace App\Support;

use Dotenv\Dotenv;

final class Env
{
    /** @var array<string, bool> */
    private static array $loadedPaths = [];

    /**
     * @param array<int, string>|null $paths
     */
    public static function bootstrap(?array $paths = null): void
    {
        $defaults = [
            dirname(__DIR__, 2),
            dirname(__DIR__, 3),
        ];

        $paths = $paths === null ? $defaults : array_merge($paths, $defaults);
        $normalized = [];

        foreach ($paths as $path) {
            if ($path === null) {
                continue;
            }

            $trimmed = rtrim($path, DIRECTORY_SEPARATOR);
            if ($trimmed === '' || !is_dir($trimmed)) {
                continue;
            }

            $normalized[$trimmed] = true;
        }

        foreach (array_keys($normalized) as $directory) {
            if (isset(self::$loadedPaths[$directory])) {
                continue;
            }

            $envFile = $directory . DIRECTORY_SEPARATOR . '.env';
            if (is_file($envFile)) {
                Dotenv::createImmutable($directory)->safeLoad();
            }

            self::$loadedPaths[$directory] = true;
        }
    }

    /**
     * @param mixed $default
     * @return mixed
     */
    public static function get(string $key, $default = null)
    {
        self::bootstrap();

        if (array_key_exists($key, $_ENV ?? [])) {
            return $_ENV[$key];
        }

        if (array_key_exists($key, $_SERVER ?? [])) {
            return $_SERVER[$key];
        }

        $value = getenv($key);
        if ($value === false) {
            return $default;
        }

        return $value;
    }

    public static function string(string $key, ?string $default = null): ?string
    {
        $value = self::get($key, $default);
        if ($value === null) {
            return null;
        }

        return trim((string) $value);
    }

    public static function int(string $key, int $default): int
    {
        $value = self::get($key);
        if ($value === null || $value === '') {
            return $default;
        }

        if (is_int($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return (int) $value;
        }

        return $default;
    }

    public static function bool(string $key, bool $default = false): bool
    {
        $value = self::get($key);
        if ($value === null) {
            return $default;
        }

        if (is_bool($value)) {
            return $value;
        }

        $normalized = strtolower((string) $value);
        if (in_array($normalized, ['1', 'true', 'yes', 'on'], true)) {
            return true;
        }

        if (in_array($normalized, ['0', 'false', 'no', 'off'], true)) {
            return false;
        }

        return $default;
    }
}
