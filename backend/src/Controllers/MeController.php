<?php
namespace App\Controllers;

use App\Support\Auth;
use App\Support\ResponseHelper;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class MeController
{
    public function get(Request $request, Response $response): Response
    {
        $user = Auth::user($request);

        return ResponseHelper::json($response, [
            'id'         => $user->id,
            'email'      => $user->email,
            'created_at' => $user->created_at,
        ]);
    }
}
