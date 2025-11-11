<?php
namespace App\Controllers;

use App\Models\User;
use App\Services\EmailService;
use App\Services\SubscriptionService;
use App\Support\Env;
use App\Support\ResponseHelper;
use Firebase\JWT\JWT;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class AuthController
{
    private EmailService $emailService;

    public function __construct()
    {
        $this->emailService = new EmailService();
    }

    public function register(Request $request, Response $response): Response
    {
        $data = (array) $request->getParsedBody();
        $email = strtolower(trim($data['email'] ?? ''));
        $pass = $data['pass'] ?? '';

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ResponseHelper::json($response, ['error' => 'Некорректный email'], 422);
        }

        if (strlen($pass) < 6) {
            return ResponseHelper::json($response, ['error' => 'Пароль должен быть длиной не менее 6 символов'], 422);
        }

        if (User::where('email', $email)->exists()) {
            return ResponseHelper::json($response, ['error' => 'Пользователь уже зарегистрирован'], 409);
        }

        $verificationCode = (string) random_int(100000, 999999);

        $user = User::create([
            'email'      => $email,
            'pass_hash'  => password_hash($pass, PASSWORD_DEFAULT),
            'created_at' => date('Y-m-d H:i:s'),
            'plan'       => SubscriptionService::PLAN_FREE,
            'balance_cents' => 0,
            'ai_cycle_started_at' => SubscriptionService::currentCycleDate(),
            'ai_cycle_requests' => 0,
            'ai_cycle_spent_cents' => 0,
            'ai_cycle_advice_requests' => 0,
            'ai_cycle_assistant_requests' => 0,
            'email_verified_at' => null,
            'email_verification_code_hash' => password_hash($verificationCode, PASSWORD_DEFAULT),
            'email_verification_sent_at' => date('Y-m-d H:i:s'),
        ]);

        try {
            $dispatch = $this->emailService->sendVerificationCode($user->email, $verificationCode);
        } catch (\Throwable $exception) {
            $user->delete();

            return ResponseHelper::json($response, ['error' => 'Не удалось отправить код подтверждения'], 500);
        }

        $verificationMessage = $dispatch['driver'] === 'log'
            ? 'Код подтверждения сохранен в журнале ' . $this->formatLogPathForDisplay($dispatch['log_path'])
            : 'Код подтверждения отправлен на ваш email';

        return ResponseHelper::json($response, [
            'status' => 'verification_required',
            'message' => $verificationMessage,
        ], 201);
    }

    public function login(Request $request, Response $response): Response
    {
        $data = (array) $request->getParsedBody();
        $email = strtolower(trim($data['email'] ?? ''));
        $pass = $data['pass'] ?? '';

        $user = User::where('email', $email)->first();
        if (!$user || !password_verify($pass, $user->pass_hash)) {
            return ResponseHelper::json($response, ['error' => 'Неверный email или пароль'], 401);
        }

        if (!$user->email_verified_at) {
            return ResponseHelper::json($response, ['error' => 'Email не подтвержден'], 403);
        }

        return ResponseHelper::json($response, [
            'token' => $this->makeToken($user),
        ]);
    }

    public function verify(Request $request, Response $response): Response
    {
        $data = (array) $request->getParsedBody();
        $email = strtolower(trim($data['email'] ?? ''));
        $code = trim((string) ($data['code'] ?? ''));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ResponseHelper::json($response, ['error' => 'Некорректный email'], 422);
        }

        if (!preg_match('/^\d{6}$/', $code)) {
            return ResponseHelper::json($response, ['error' => 'Код подтверждения должен состоять из 6 цифр'], 422);
        }

        $user = User::where('email', $email)->first();
        if (!$user) {
            return ResponseHelper::json($response, ['error' => 'Пользователь не найден'], 404);
        }

        if ($user->email_verified_at) {
            return ResponseHelper::json($response, [
                'token' => $this->makeToken($user),
            ]);
        }

        if (!$user->email_verification_code_hash || !password_verify($code, $user->email_verification_code_hash)) {
            return ResponseHelper::json($response, ['error' => 'Неверный код подтверждения'], 422);
        }

        $user->email_verified_at = date('Y-m-d H:i:s');
        $user->email_verification_code_hash = null;
        $user->email_verification_sent_at = null;
        $user->save();

        return ResponseHelper::json($response, [
            'token' => $this->makeToken($user),
        ]);
    }

    public function requestPasswordReset(Request $request, Response $response): Response
    {
        $data = (array) $request->getParsedBody();
        $email = strtolower(trim($data['email'] ?? ''));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ResponseHelper::json($response, ['error' => 'Некорректный email'], 422);
        }

        $user = User::where('email', $email)->first();
        if (!$user) {
            return ResponseHelper::json($response, [
                'status' => 'reset_code_sent',
                'message' => $this->buildResetMessage(null),
            ]);
        }

        $resetCode = (string) random_int(100000, 999999);

        $user->password_reset_code_hash = password_hash($resetCode, PASSWORD_DEFAULT);
        $user->password_reset_sent_at = date('Y-m-d H:i:s');
        $user->save();

        try {
            $dispatch = $this->emailService->sendPasswordResetCode($user->email, $resetCode);
        } catch (\Throwable $exception) {
            return ResponseHelper::json($response, ['error' => 'Не удалось отправить код восстановления'], 500);
        }

        return ResponseHelper::json($response, [
            'status' => 'reset_code_sent',
            'message' => $this->buildResetMessage($dispatch),
        ]);
    }

    public function resetPassword(Request $request, Response $response): Response
    {
        $data = (array) $request->getParsedBody();
        $email = strtolower(trim($data['email'] ?? ''));
        $code = trim((string) ($data['code'] ?? ''));
        $pass = (string) ($data['pass'] ?? '');

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ResponseHelper::json($response, ['error' => 'Некорректный email'], 422);
        }

        if (!preg_match('/^\d{6}$/', $code)) {
            return ResponseHelper::json($response, ['error' => 'Код восстановления должен состоять из 6 цифр'], 422);
        }

        if (strlen($pass) < 6) {
            return ResponseHelper::json($response, ['error' => 'Пароль должен быть длиной не менее 6 символов'], 422);
        }

        $user = User::where('email', $email)->first();
        if (!$user) {
            return ResponseHelper::json($response, ['error' => 'Пользователь не найден'], 404);
        }

        if (!$user->password_reset_code_hash || !password_verify($code, $user->password_reset_code_hash)) {
            return ResponseHelper::json($response, ['error' => 'Неверный код восстановления'], 422);
        }

        if ($user->password_reset_sent_at) {
            $expiresAt = strtotime($user->password_reset_sent_at . ' +1 hour');
            if ($expiresAt !== false && $expiresAt < time()) {
                return ResponseHelper::json($response, ['error' => 'Срок действия кода восстановления истек'], 410);
            }
        }

        $user->pass_hash = password_hash($pass, PASSWORD_DEFAULT);
        $user->password_reset_code_hash = null;
        $user->password_reset_sent_at = null;
        $user->save();

        return ResponseHelper::json($response, [
            'status' => 'password_reset',
            'token' => $this->makeToken($user),
        ]);
    }

    private function makeToken(User $user): string
    {
        $secret = Env::string('JWT_SECRET', 'dev-secret') ?? 'dev-secret';
        $payload = [
            'sub'   => $user->id,
            'email' => $user->email,
            'iat'   => time(),
            'exp'   => time() + 60 * 60 * 24 * 7,
        ];

        return JWT::encode($payload, $secret, 'HS256');
    }

    /**
     * @param array{driver: string, log_path: string|null}|null $dispatch
     */
    private function buildResetMessage(?array $dispatch): string
    {
        if ($dispatch !== null && $dispatch['driver'] !== 'log') {
            return 'Если email зарегистрирован, код восстановления отправлен';
        }

        $logPath = $dispatch['log_path'] ?? null;

        return 'Если email зарегистрирован, код восстановления сохранен в журнале ' . $this->formatLogPathForDisplay($logPath);
    }

    private function formatLogPathForDisplay(?string $absolutePath): string
    {
        if ($absolutePath === null) {
            return 'storage/logs/mail.log';
        }

        $backendRoot = realpath(dirname(__DIR__, 2));
        $normalizedBackendRoot = $backendRoot !== false ? $backendRoot : null;

        if ($normalizedBackendRoot !== null) {
            $prefix = $normalizedBackendRoot . DIRECTORY_SEPARATOR;
            if (strpos($absolutePath, $prefix) === 0) {
                $relative = substr($absolutePath, strlen($prefix));
                if ($relative !== false && $relative !== '') {
                    return $relative;
                }
            }
        }

        return $absolutePath;
    }
}
