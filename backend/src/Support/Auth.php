<?php
namespace App\Support;

use App\Models\User;
use Psr\Http\Message\ServerRequestInterface;

class Auth
{
    public const ATTR_USER = 'auth_user';

    public static function user(ServerRequestInterface $request): User
    {
        /** @var User|null $user */
        $user = $request->getAttribute(self::ATTR_USER);
        if (!$user) {
            throw new \RuntimeException('Authenticated user not attached to request.');
        }

        return $user;
    }
}
