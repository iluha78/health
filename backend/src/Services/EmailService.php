<?php

namespace App\Services;

use App\Support\Env;
use RuntimeException;

class EmailService
{
    /**
     * @return array{driver: string, log_path: string|null}
     */
    public function sendVerificationCode(string $email, string $code, string $language): array
    {
        $subject = $this->localizeEmail($language, 'verification_subject');
        $message = $this->localizeEmail($language, 'verification_body', ['code' => $code]);

        return $this->sendEmail($email, $subject, $message, 'Unable to send verification email');
    }

    /**
     * @return array{driver: string, log_path: string|null}
     */
    public function sendPasswordResetCode(string $email, string $code, string $language): array
    {
        $subject = $this->localizeEmail($language, 'reset_subject');
        $message = $this->localizeEmail($language, 'reset_body', ['code' => $code]);

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

        if ($driver === 'smtp') {
            return $this->sendSmtp($email, $subject, $message, $errorMessage);
        }

        return $this->sendNativeMail($email, $subject, $message, $errorMessage);
    }

    /**
     * @return array{driver: string, log_path: string|null}
     */
    private function sendSmtp(string $email, string $subject, string $message, string $errorMessage): array
    {
        $fromAddress = Env::string('MAIL_FROM_ADDRESS', 'no-reply@example.com');
        $fromName = Env::string('MAIL_FROM_NAME', 'CholestoFit');
        $host = Env::string('MAIL_SMTP_HOST');

        if ($host === null || $host === '') {
            throw new RuntimeException('MAIL_SMTP_HOST is not configured');
        }

        if ($fromAddress === null || $fromAddress === '') {
            throw new RuntimeException('MAIL_FROM_ADDRESS is required for SMTP driver');
        }

        $port = Env::int('MAIL_SMTP_PORT', 587);
        $encryption = strtolower(Env::string('MAIL_SMTP_ENCRYPTION', 'tls') ?? '');
        $username = Env::string('MAIL_SMTP_USERNAME');
        $password = Env::string('MAIL_SMTP_PASSWORD');
        $smtpAuth = Env::bool('MAIL_SMTP_AUTH', true);
        $timeout = Env::int('MAIL_SMTP_TIMEOUT', 30);
        $ehloDomain = Env::string('MAIL_SMTP_EHLO_DOMAIN', gethostname() ?: 'localhost') ?? 'localhost';

        $allowedEncryption = ['', 'none', 'ssl', 'smtps', 'tls', 'starttls'];
        if (!in_array($encryption, $allowedEncryption, true)) {
            throw new RuntimeException('Unsupported MAIL_SMTP_ENCRYPTION value');
        }

        if ($smtpAuth && (($username === null || $username === '') || ($password === null || $password === ''))) {
            throw new RuntimeException('SMTP authentication requires MAIL_SMTP_USERNAME and MAIL_SMTP_PASSWORD');
        }

        $verifyPeer = Env::bool('MAIL_SMTP_TLS_VERIFY_PEER', true);
        $verifyPeerName = Env::bool('MAIL_SMTP_TLS_VERIFY_PEER_NAME', true);
        $allowSelfSigned = Env::bool('MAIL_SMTP_TLS_ALLOW_SELF_SIGNED', false);
        $caFile = Env::string('MAIL_SMTP_TLS_CAFILE');
        $caPath = Env::string('MAIL_SMTP_TLS_CAPATH');

        $tlsOptions = [];
        $tlsOptions['verify_peer'] = $verifyPeer;
        $tlsOptions['verify_peer_name'] = $verifyPeerName;
        $tlsOptions['allow_self_signed'] = $allowSelfSigned;

        if ($caFile !== null && $caFile !== '') {
            $tlsOptions['cafile'] = $caFile;
        }

        if ($caPath !== null && $caPath !== '') {
            $tlsOptions['capath'] = $caPath;
        }

        $stream = $this->openSmtpStream($host, $port, $encryption, $timeout, $tlsOptions);

        try {
            $this->expectResponse($stream, [220], 'SMTP greeting');

            $this->sendCommand($stream, sprintf('EHLO %s', $ehloDomain));
            $ehloResponse = $this->expectResponse($stream, [250], 'EHLO command');

            if (in_array($encryption, ['tls', 'starttls'], true)) {
                if (stripos($ehloResponse, 'STARTTLS') === false) {
                    throw new RuntimeException('SMTP server does not support STARTTLS');
                }

                $this->sendCommand($stream, 'STARTTLS');
                $this->expectResponse($stream, [220], 'STARTTLS negotiation');

                if (defined('STREAM_CRYPTO_METHOD_TLS_CLIENT')) {
                    $cryptoMethod = STREAM_CRYPTO_METHOD_TLS_CLIENT;
                } else {
                    $cryptoMethod = 0;
                    foreach ([
                        'STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT',
                        'STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT',
                        'STREAM_CRYPTO_METHOD_TLSv1_1_CLIENT',
                        'STREAM_CRYPTO_METHOD_TLSv1_0_CLIENT',
                    ] as $methodConstant) {
                        if (defined($methodConstant)) {
                            $cryptoMethod |= (int) constant($methodConstant);
                        }
                    }

                    if ($cryptoMethod === 0) {
                        throw new RuntimeException('No supported TLS crypto method available for STARTTLS');
                    }
                }

                error_clear_last();
                $cryptoEnabled = @stream_socket_enable_crypto($stream, true, $cryptoMethod);
                if ($cryptoEnabled !== true) {
                    $error = error_get_last();
                    $details = '';
                    if (is_array($error) && isset($error['message']) && $error['message'] !== '') {
                        $details = ': ' . $error['message'];
                    }

                    throw new RuntimeException('Unable to establish TLS encryption' . $details);
                }

                $this->sendCommand($stream, sprintf('EHLO %s', $ehloDomain));
                $this->expectResponse($stream, [250], 'EHLO after STARTTLS');
            }

            if ($smtpAuth) {
                $this->sendCommand($stream, 'AUTH LOGIN');
                $this->expectResponse($stream, [334], 'AUTH LOGIN command');

                $this->sendCommand($stream, base64_encode((string) $username));
                $this->expectResponse($stream, [334], 'SMTP username acceptance');

                $this->sendCommand($stream, base64_encode((string) $password));
                $this->expectResponse($stream, [235], 'SMTP authentication');
            }

            $this->sendCommand($stream, sprintf('MAIL FROM:<%s>', $fromAddress));
            $this->expectResponse($stream, [250], 'MAIL FROM command');

            $this->sendCommand($stream, sprintf('RCPT TO:<%s>', $email));
            $this->expectResponse($stream, [250, 251], 'RCPT TO command');

            $this->sendCommand($stream, 'DATA');
            $this->expectResponse($stream, [354], 'DATA command');

            $this->sendData($stream, $email, $fromName, $fromAddress, $subject, $message);
            $this->expectResponse($stream, [250], 'Message transmission');

            $this->sendCommand($stream, 'QUIT');
            $this->expectResponse($stream, [221], 'QUIT command');
        } catch (RuntimeException $exception) {
            throw new RuntimeException($errorMessage . ': ' . $exception->getMessage(), 0, $exception);
        } finally {
            fclose($stream);
        }

        return [
            'driver' => 'smtp',
            'log_path' => null,
        ];
    }

    /**
     * @return array{driver: string, log_path: string|null}
     */
    private function sendNativeMail(string $email, string $subject, string $message, string $errorMessage): array
    {
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

        $result = mail($email, $encodedSubject, $message, implode("\r\n", $headers));
        if ($result === false) {
            throw new RuntimeException($errorMessage);
        }

        return [
            'driver' => 'mail',
            'log_path' => null,
        ];
    }

    private function logEmail(string $email, string $subject, string $message): string
    {
        $timestamp = date('Y-m-d H:i:s');
        $logDir = dirname(__DIR__, 2) . '/storage/logs';
        if (!is_dir($logDir) && !mkdir($logDir, 0775, true) && !is_dir($logDir)) {
            throw new RuntimeException('Unable to create mail log directory');
        }

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

    private function formatAddress(?string $name, string $address): string
    {
        if ($name === null || $name === '') {
            return $address;
        }

        $escapedName = addcslashes($name, "\"\\");

        return sprintf('"%s" <%s>', $escapedName, $address);
    }

    /**
     * @param resource $stream
     */
    private function openSmtpStream(string $host, int $port, string $encryption, int $timeout, array $tlsOptions)
    {
        $remote = sprintf('%s:%d', $host, $port);
        if (in_array($encryption, ['ssl', 'smtps'], true)) {
            $remote = sprintf('ssl://%s:%d', $host, $port);
        }

        $context = stream_context_create();
        foreach ($tlsOptions as $option => $value) {
            if ($value === null) {
                continue;
            }

            stream_context_set_option($context, 'ssl', $option, $value);
        }

        $stream = @stream_socket_client($remote, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $context);
        if ($stream === false) {
            throw new RuntimeException(sprintf('Unable to connect to SMTP server: %s (%d)', $errstr ?: 'unknown error', $errno));
        }

        stream_set_timeout($stream, $timeout);

        foreach ($tlsOptions as $option => $value) {
            if ($value === null) {
                continue;
            }

            stream_context_set_option($stream, 'ssl', $option, $value);
        }

        return $stream;
    }

    /**
     * @param resource $stream
     */
    private function sendCommand($stream, string $command): void
    {
        $this->writeToStream($stream, $command . "\r\n");
    }

    /**
     * @param resource $stream
     * @param array<int, int> $expectedCodes
     */
    private function expectResponse($stream, array $expectedCodes, string $context): string
    {
        $response = $this->readResponse($stream);

        if ($response === null) {
            throw new RuntimeException(sprintf('%s: empty response from server', $context));
        }

        [$code, $message] = $response;

        if (!in_array($code, $expectedCodes, true)) {
            throw new RuntimeException(sprintf('%s: unexpected response %d %s', $context, $code, $message));
        }

        return $message;
    }

    /**
     * @param resource $stream
     * @return array{int, string}|null
     */
    private function readResponse($stream): ?array
    {
        $lines = [];

        while (($line = fgets($stream)) !== false) {
            $line = rtrim($line, "\r\n");
            if ($line === '') {
                continue;
            }

            $lines[] = $line;

            if (strlen($line) >= 4 && $line[3] === ' ') {
                break;
            }
        }

        if ($lines === []) {
            return null;
        }

        $firstLine = $lines[0];
        $code = (int) substr($firstLine, 0, 3);
        $message = implode("\n", $lines);

        return [$code, $message];
    }

    /**
     * @param resource $stream
     */
    private function sendData($stream, string $recipient, ?string $fromName, string $fromAddress, string $subject, string $message): void
    {
        $encodedSubject = $subject;
        if (function_exists('mb_encode_mimeheader')) {
            $encodedSubject = mb_encode_mimeheader($subject, 'UTF-8', 'B', "\r\n");
        }

        $headers = [
            'Date: ' . date(DATE_RFC2822),
            'From: ' . $this->formatAddress($fromName, $fromAddress),
            'To: <' . $recipient . '>',
            'Subject: ' . $encodedSubject,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ];

        $body = implode("\r\n", $headers) . "\r\n\r\n";
        $normalized = preg_replace('/\r\n|\r|\n/', "\r\n", $message);
        if ($normalized === null) {
            $normalized = '';
        }

        $lines = $normalized === '' ? [] : explode("\r\n", $normalized);
        if ($lines === []) {
            $lines = [''];
        }

        foreach ($lines as $line) {
            if (isset($line[0]) && $line[0] === '.') {
                $line = '.' . $line;
            }

            $body .= $line . "\r\n";
        }

        $body .= ".\r\n";

        $this->writeToStream($stream, $body);
    }

    /**
     * @param resource $stream
     */
    private function writeToStream($stream, string $data): void
    {
        $length = strlen($data);
        $written = 0;

        while ($written < $length) {
            $chunk = @fwrite($stream, substr($data, $written));
            if ($chunk === false) {
                throw new RuntimeException('Failed to write to SMTP stream');
            }

            if ($chunk === 0) {
                throw new RuntimeException('SMTP stream write returned zero bytes');
            }

            $written += $chunk;
        }
    }

    private function localizeEmail(string $language, string $key, array $params = []): string
    {
        $lang = $this->normalizeLanguage($language);
        $template = self::EMAIL_TEMPLATES[$lang][$key] ?? self::EMAIL_TEMPLATES['ru'][$key] ?? '';

        return preg_replace_callback('/{{\s*([^}\s]+)\s*}}/', function ($matches) use ($params) {
            $name = $matches[1];
            $value = $params[$name] ?? '';

            return $value === null ? '' : (string) $value;
        }, $template) ?? $template;
    }

    private function normalizeLanguage(?string $language): string
    {
        if ($language === null) {
            return 'ru';
        }

        $normalized = strtolower(trim($language));
        if ($normalized === '') {
            return 'ru';
        }

        $shortCode = explode('-', $normalized)[0];
        if (in_array($shortCode, ['ru', 'en', 'de', 'es'], true)) {
            return $shortCode;
        }

        return 'ru';
    }

    private const EMAIL_TEMPLATES = [
        'ru' => [
            'verification_subject' => 'Код подтверждения регистрации',
            'verification_body' => "Ваш код подтверждения: {{code}}\n\nВведите его в приложении, чтобы завершить регистрацию.",
            'reset_subject' => 'Восстановление пароля CholestoFit',
            'reset_body' => "Вы запросили восстановление пароля. Код: {{code}}\n\nЕсли вы не запрашивали восстановление, просто проигнорируйте это письмо.",
        ],
        'en' => [
            'verification_subject' => 'Registration verification code',
            'verification_body' => "Your verification code: {{code}}\n\nEnter it in the app to finish registration.",
            'reset_subject' => 'CholestoFit password reset',
            'reset_body' => "You requested a password reset. Code: {{code}}\n\nIf you didn't request it, simply ignore this email.",
        ],
        'de' => [
            'verification_subject' => 'Bestätigungscode für die Registrierung',
            'verification_body' => "Ihr Bestätigungscode: {{code}}\n\nGeben Sie ihn in der App ein, um die Registrierung abzuschließen.",
            'reset_subject' => 'CholestoFit Passwort zurücksetzen',
            'reset_body' => "Sie haben das Zurücksetzen des Passworts angefordert. Code: {{code}}\n\nWenn Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail.",
        ],
        'es' => [
            'verification_subject' => 'Código de verificación de registro',
            'verification_body' => "Tu código de verificación: {{code}}\n\nIntrodúcelo en la aplicación para completar el registro.",
            'reset_subject' => 'Restablecimiento de contraseña de CholestoFit',
            'reset_body' => "Solicitaste restablecer la contraseña. Código: {{code}}\n\nSi no lo solicitaste, ignora este correo.",
        ],
    ];
}
