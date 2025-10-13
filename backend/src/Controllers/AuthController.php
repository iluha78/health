<?php
namespace App\Controllers;

use App\Models\User;
use App\Support\ResponseHelper;
use Firebase\JWT\JWT;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class AuthController
{
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

        $user = User::create([
            'email'      => $email,
            'pass_hash'  => password_hash($pass, PASSWORD_DEFAULT),
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return ResponseHelper::json($response, [
            'token' => $this->makeToken($user),
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

        return ResponseHelper::json($response, [
            'token' => $this->makeToken($user),
        ]);
    }

    private function makeToken(User $user): string
    {
        $secret = $_ENV['JWT_SECRET'] ?? 'dev-secret';
        $payload = [
            'sub'   => $user->id,
            'email' => $user->email,
            'iat'   => time(),
            'exp'   => time() + 60 * 60 * 24 * 7,
        ];

        return JWT::encode($payload, $secret, 'HS256');
    }
}
