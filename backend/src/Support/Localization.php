<?php

namespace App\Support;

class Localization
{
    public const DEFAULT_LANGUAGE = 'ru';

    /**
     * @var array<string, array<string, mixed>>
     */
    private const TRANSLATIONS = [
        'ru' => [
            'emails' => [
                'verification_subject' => 'Код подтверждения регистрации',
                'verification_body' => "Ваш код подтверждения: {{code}}\n\nВведите его в приложении, чтобы завершить регистрацию.",
                'reset_subject' => 'Восстановление пароля CholestoFit',
                'reset_body' => "Вы запросили восстановление пароля. Код: {{code}}\n\nЕсли вы не запрашивали восстановление, просто проигнорируйте это письмо.",
            ],
            'messages' => [
                'auth.register.log_message' => 'Код подтверждения: {{code}}. Также сохранен в журнале {{logPath}}',
                'auth.register.sent_message' => 'Код подтверждения отправлен на ваш email',
                'auth.reset.sent_message' => 'Если email зарегистрирован, код восстановления отправлен',
                'auth.reset.logged_message' => 'Если email зарегистрирован, код восстановления сохранен в журнале {{logPath}}',
                'auth.reset.logged_message_with_code' => 'Код восстановления: {{code}}. Если email зарегистрирован, код сохранен в журнале {{logPath}}',
            ],
        ],
        'en' => [
            'emails' => [
                'verification_subject' => 'Registration verification code',
                'verification_body' => "Your verification code: {{code}}\n\nEnter it in the app to finish registration.",
                'reset_subject' => 'CholestoFit password reset',
                'reset_body' => "You requested a password reset. Code: {{code}}\n\nIf you didn\'t request it, simply ignore this email.",
            ],
            'messages' => [
                'auth.register.log_message' => 'Verification code: {{code}}. It is also saved to the log at {{logPath}}',
                'auth.register.sent_message' => 'The verification code has been sent to your email',
                'auth.reset.sent_message' => 'If the email is registered, a reset code has been sent',
                'auth.reset.logged_message' => 'If the email is registered, the reset code is saved to the log at {{logPath}}',
                'auth.reset.logged_message_with_code' => 'Reset code: {{code}}. If the email is registered, it is saved to the log at {{logPath}}',
            ],
        ],
        'de' => [
            'emails' => [
                'verification_subject' => 'Bestätigungscode für die Registrierung',
                'verification_body' => "Ihr Bestätigungscode: {{code}}\n\nGeben Sie ihn in der App ein, um die Registrierung abzuschließen.",
                'reset_subject' => 'CholestoFit Passwort zurücksetzen',
                'reset_body' => "Sie haben das Zurücksetzen des Passworts angefordert. Code: {{code}}\n\nWenn Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail.",
            ],
            'messages' => [
                'auth.register.log_message' => 'Bestätigungscode: {{code}}. Er wurde außerdem im Protokoll unter {{logPath}} gespeichert',
                'auth.register.sent_message' => 'Der Bestätigungscode wurde an Ihre E-Mail gesendet',
                'auth.reset.sent_message' => 'Falls die E-Mail registriert ist, wurde ein Reset-Code gesendet',
                'auth.reset.logged_message' => 'Falls die E-Mail registriert ist, wurde der Reset-Code im Protokoll unter {{logPath}} gespeichert',
                'auth.reset.logged_message_with_code' => 'Reset-Code: {{code}}. Falls die E-Mail registriert ist, wurde er im Protokoll unter {{logPath}} gespeichert',
            ],
        ],
        'es' => [
            'emails' => [
                'verification_subject' => 'Código de verificación de registro',
                'verification_body' => "Tu código de verificación: {{code}}\n\nIntrodúcelo en la aplicación para completar el registro.",
                'reset_subject' => 'Restablecimiento de contraseña de CholestoFit',
                'reset_body' => "Solicitaste restablecer la contraseña. Código: {{code}}\n\nSi no lo solicitaste, ignora este correo.",
            ],
            'messages' => [
                'auth.register.log_message' => 'Código de verificación: {{code}}. También se guardó en el registro en {{logPath}}',
                'auth.register.sent_message' => 'El código de verificación se envió a tu correo electrónico',
                'auth.reset.sent_message' => 'Si el correo está registrado, se envió un código de restablecimiento',
                'auth.reset.logged_message' => 'Si el correo está registrado, el código de restablecimiento se guardó en el registro en {{logPath}}',
                'auth.reset.logged_message_with_code' => 'Código de restablecimiento: {{code}}. Si el correo está registrado, se guardó en el registro en {{logPath}}',
            ],
        ],
    ];

    public static function normalize(?string $language): string
    {
        if ($language === null) {
            return self::DEFAULT_LANGUAGE;
        }

        $normalized = strtolower(trim($language));
        if ($normalized === '') {
            return self::DEFAULT_LANGUAGE;
        }

        $shortCode = explode('-', $normalized)[0];
        if (isset(self::TRANSLATIONS[$shortCode])) {
            return $shortCode;
        }

        return self::DEFAULT_LANGUAGE;
    }

    public static function email(string $language, string $key, array $params = []): string
    {
        $lang = self::normalize($language);
        $template = self::TRANSLATIONS[$lang]['emails'][$key] ?? self::TRANSLATIONS[self::DEFAULT_LANGUAGE]['emails'][$key] ?? '';

        return self::format($template, $params);
    }

    public static function message(string $language, string $key, array $params = []): string
    {
        $lang = self::normalize($language);
        $template = self::TRANSLATIONS[$lang]['messages'][$key] ?? self::TRANSLATIONS[self::DEFAULT_LANGUAGE]['messages'][$key] ?? '';

        return self::format($template, $params);
    }

    /**
     * @param array<string, string|null> $params
     */
    private static function format(string $template, array $params): string
    {
        return preg_replace_callback('/{{\s*([^}\s]+)\s*}}/', function ($matches) use ($params) {
            $key = $matches[1];
            $value = $params[$key] ?? '';

            return $value === null ? '' : (string) $value;
        }, $template) ?? $template;
    }
}
