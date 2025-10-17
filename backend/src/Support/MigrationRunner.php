<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Database\Capsule\Manager as Capsule;
use PDO;
use RuntimeException;
use Throwable;

class MigrationRunner
{
    /**
     * @var string
     */
    private $migrationsPath;

    public function __construct(?string $migrationsPath = null)
    {
        $this->migrationsPath = $migrationsPath ?? dirname(__DIR__, 2) . '/migrations';
    }

    /**
     * Выполняет все неприменённые SQL-миграции.
     *
     * @param callable|null $logger Функция для логирования сообщений вида function(string $level, string $message): void
     *
     * @return int Количество применённых миграций
     */
    public function run(?callable $logger = null): int
    {
        if (!is_dir($this->migrationsPath)) {
            throw new RuntimeException("Каталог с миграциями не найден: {$this->migrationsPath}");
        }

        $connection = Capsule::connection();
        $pdo = $connection->getPdo();
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $pdo->exec('CREATE TABLE IF NOT EXISTS schema_migrations (filename VARCHAR(255) PRIMARY KEY, executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');

        $files = glob($this->migrationsPath . '/*.sql');
        sort($files, SORT_NATURAL);

        if (empty($files)) {
            return 0;
        }

        $applied = 0;

        foreach ($files as $file) {
            $filename = basename($file);

            if ($this->hasMigrationRun($pdo, $filename)) {
                continue;
            }

            $statements = $this->parseSqlFile($file);

            if (empty($statements)) {
                $this->markMigration($pdo, $filename);
                continue;
            }

            $pdo->beginTransaction();

            try {
                foreach ($statements as $statement) {
                    $pdo->exec($statement);
                }

                $this->markMigration($pdo, $filename);
                $pdo->commit();

                $applied++;

                if ($logger !== null) {
                    $logger('info', "✔ Применена миграция {$filename}");
                }
            } catch (Throwable $e) {
                $pdo->rollBack();

                if ($logger !== null) {
                    $logger('error', "✘ Ошибка при выполнении {$filename}: {$e->getMessage()}");
                }

                throw $e;
            }
        }

        return $applied;
    }

    private function hasMigrationRun(PDO $pdo, string $filename): bool
    {
        $stmt = $pdo->prepare('SELECT 1 FROM schema_migrations WHERE filename = ? LIMIT 1');
        $stmt->execute([$filename]);

        return (bool) $stmt->fetchColumn();
    }

    /**
     * @return array<int, string>
     */
    private function parseSqlFile(string $file): array
    {
        $sql = file_get_contents($file);

        if ($sql === false) {
            throw new RuntimeException("Не удалось прочитать файл {$file}");
        }

        $parts = preg_split('/;\s*(?:\r?\n|$)/', $sql);
        if ($parts === false) {
            return [];
        }

        $statements = [];

        foreach ($parts as $part) {
            $trimmed = trim($part);
            if ($trimmed !== '') {
                $statements[] = $trimmed;
            }
        }

        return $statements;
    }

    private function markMigration(PDO $pdo, string $filename): void
    {
        $stmt = $pdo->prepare('INSERT INTO schema_migrations (filename) VALUES (?)');
        $stmt->execute([$filename]);
    }
}
