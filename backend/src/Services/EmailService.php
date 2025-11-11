<?php

namespace App\Services;

use App\Support\Env;
use RuntimeException;

class EmailService
{
    /**
     * @return array{driver: string, log_path: string|null}
     */
    public function sendVerificationCode(string $email, string $code): array
    {
        $subject = 'Код подтверждения регистрации';
        $message = "Ваш код подтверждения: {$code}\n\nВведите его в приложении, чтобы завершить регистрацию.";

        return $this->sendEmail($email, $subject, $message, 'Unable to send verification email');
    }

    /**
     * @return array{driver: string, log_path: string|null}
     */
    public function sendPasswordResetCode(string $email, string $code): array
    {
        $subject = 'Восстановление пароля CholestoFit';
        $message = "Вы запросили восстановление пароля. Код: {$code}\n\nЕсли вы не запрашивали восстановление, просто проигнорируйте это письмо.";

        return $this->sendEmail($email, $subject, $message, 'Unable to send password reset email');
    }

    /**
     * @return array{driver: string, log_path: string|null}
     */
    private function sendEmail(string $email, string $subject, string $message, string $errorMessage): array
    {
        $driver = strtolower(Env::string('MAIL_DRIVER', 'log') ?? 'log');

        if ($driver === 'log') {
            $logPath = $this->logEmail($email, $subject, $message);

            return [
                'driver' => 'log',
                'log_path' => $logPath,
            ];
        }

        $fromAddress = Env::string('MAIL_FROM_ADDRESS', 'no-reply@example.com');
        $fromName = Env::string('MAIL_FROM_NAME', 'CholestoFit');

        if (function_exists('mb_internal_encoding')) {
            mb_internal_encoding('UTF-8');
        }

        $encodedSubject = $subject;
        if (function_exists('mb_encode_mimeheader')) {
            $encodedSubject = mb_encode_mimeheader($subject, 'UTF-8', 'B', "\r\n");
        }

        $headers = [];
        if ($fromAddress !== null && $fromAddress !== '') {
            $headers[] = 'From: ' . $this->formatAddress($fromName, $fromAddress);
        }
        $headers[] = 'Content-Type: text/plain; charset=UTF-8';
        $headers[] = 'Content-Transfer-Encoding: 8bit';

        $normalizedMessage = str_replace(["\r\n", "\r"], "\n", $message);
        $normalizedMessage = str_replace("\n", "\r\n", $normalizedMessage);

        $headersString = implode("\r\n", $headers);
        $additionalParameters = $this->buildAdditionalParameters($fromAddress);

        $result = $additionalParameters === null
            ? mail($email, $encodedSubject, $normalizedMessage, $headersString)
            : mail($email, $encodedSubject, $normalizedMessage, $headersString, $additionalParameters);

        if ($result === false) {
            $phpMailError = error_get_last();
            $reason = $phpMailError['message'] ?? 'unknown error';

            throw new RuntimeException($errorMessage . ': ' . $reason);
        }

        return [
            'driver' => 'mail',
            'log_path' => null,
        ];
    }

    private function buildAdditionalParameters(?string $fromAddress): ?string
    {
        if ($fromAddress === null || $fromAddress === '') {
            return null;
        }

        if (!filter_var($fromAddress, FILTER_VALIDATE_EMAIL)) {
            return null;
        }

        $sanitizedAddress = preg_replace('/[^A-Za-z0-9@._+-]/', '', $fromAddress);
        if ($sanitizedAddress === null || $sanitizedAddress === '') {
            return null;
        }

        return '-f' . $sanitizedAddress;
    }

    private function logEmail(string $email, string $subject, string $message): string
    {
        $timestamp = date('Y-m-d H:i:s');
        $logDir = $this->resolveLogDirectory();

        $entry = <<<LOG
[{$timestamp}] To: {$email}
Subject: {$subject}
{$message}

LOG;

        $logFile = $logDir . '/mail.log';
        if (file_put_contents($logFile, $entry, FILE_APPEND) === false) {
            throw new RuntimeException('Unable to write mail log');
        }

        $realPath = realpath($logFile);

        return $realPath !== false ? $realPath : $logFile;
    }

    private function resolveLogDirectory(): string
    {
        $primaryDir = dirname(__DIR__, 2) . '/storage/logs';
        if ($this->ensureWritableDirectory($primaryDir)) {
            return $primaryDir;
        }

        $fallbackDir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'cholestofit-mail-logs';
        if ($this->ensureWritableDirectory($fallbackDir)) {
            return $fallbackDir;
        }

        throw new RuntimeException('Unable to create mail log directory');
    }

    private function ensureWritableDirectory(string $directory): bool
    {
        if (!is_dir($directory)) {
            if (!mkdir($directory, 0775, true) && !is_dir($directory)) {
                return false;
            }
        }

        if (is_writable($directory)) {
            return true;
        }

        @chmod($directory, 0775);

        return is_writable($directory);
    }

    private function formatAddress(?string $name, string $address): string
    {
        if ($name === null || $name === '') {
            return $address;
        }

        $escapedName = addcslashes($name, "\"\\");

        return sprintf('"%s" <%s>', $escapedName, $address);
    }
}
