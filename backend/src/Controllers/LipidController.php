<?php
namespace App\Controllers;

use App\Models\Lipid;
use App\Support\Auth;
use App\Support\ResponseHelper;
use Illuminate\Database\Eloquent\Collection;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class LipidController
{
    public function list(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        /** @var Collection<int, Lipid> $lipids */
        $lipids = Lipid::where('user_id', $user->id)
            ->orderByDesc('dt')
            ->get();

        return ResponseHelper::json($response, $lipids->toArray());
    }

    public function create(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        $data = (array) $request->getParsedBody();

        $payload = array_intersect_key($data, array_flip(['dt', 'chol', 'hdl', 'ldl', 'trig', 'glucose', 'note']));
        if (empty($payload['dt'])) {
            return ResponseHelper::json($response, ['error' => 'Не указана дата измерения'], 422);
        }

        $payload['user_id'] = $user->id;
        $lipid = Lipid::create($payload);

        return ResponseHelper::json($response, $lipid->toArray(), 201);
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        $user = Auth::user($request);
        $id = (int) ($args['id'] ?? 0);

        $lipid = Lipid::where('user_id', $user->id)->where('id', $id)->first();
        if (!$lipid) {
            return ResponseHelper::json($response, ['error' => 'Запись не найдена'], 404);
        }

        $lipid->delete();

        return ResponseHelper::json($response, ['status' => 'ok']);
    }
}
