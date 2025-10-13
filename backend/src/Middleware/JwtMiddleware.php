<?php
namespace App\Middleware;

use App\Models\User;
use App\Support\Auth;
use App\Support\ResponseHelper;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface as RequestHandler;
use Slim\Psr7\Response as SlimResponse;

class JwtMiddleware implements MiddlewareInterface
{
    public function process(Request $request, RequestHandler $handler): Response
    {
        $authHeader = $request->getHeaderLine('Authorization');
        if (!str_starts_with($authHeader, 'Bearer ')) {
            return $this->unauthorized('Требуется авторизация');
        }

        $token = trim(substr($authHeader, 7));
        if ($token === '') {
            return $this->unauthorized('Пустой токен');
        }

        try {
            $secret = $_ENV['JWT_SECRET'] ?? 'dev-secret';
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
        } catch (\Throwable $e) {
            return $this->unauthorized('Невалидный токен');
        }

        $userId = (int) ($decoded->sub ?? 0);
        $user = $userId ? User::find($userId) : null;
        if (!$user) {
            return $this->unauthorized('Пользователь не найден');
        }

        $request = $request->withAttribute(Auth::ATTR_USER, $user);

        return $handler->handle($request);
    }

    private function unauthorized(string $message): Response
    {
        $response = new SlimResponse();
        return ResponseHelper::json($response, ['error' => $message], 401);
    }
}
