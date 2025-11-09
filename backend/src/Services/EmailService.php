<?php

namespace App\Services;

use App\Support\Env;
use RuntimeException;

class EmailService
{
    public function sendVerificationCode(string $email, string $code): void
    {
        $subject = 'Код подтверждения регистрации';
        $message = "Ваш код подтверждения: {$code}\n\nВведите его в приложении, чтобы завершить регистрацию.";

        $this->sendEmail($email, $subject, $message, 'Unable to send verification email');
    }

    public function sendPasswordResetCode(string $email, string $code): void
    {
        $subject = 'Восстановление пароля CholestoFit';
        $message = "Вы запросили восстановление пароля. Код: {$code}\n\nЕсли вы не запрашивали восстановление, просто проигнорируйте это письмо.";

        $this->sendEmail($email, $subject, $message, 'Unable to send password reset email');
    }

    private function sendEmail(string $email, string $subject, string $message, string $errorMessage): void
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
