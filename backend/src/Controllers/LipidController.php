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

        $payload = $lipids
            ->map(fn (Lipid $lipid) => $this->formatLipid($lipid))
            ->values()
            ->all();

        return ResponseHelper::json($response, $payload);
    }

    public function create(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        $data = (array) $request->getParsedBody();

        $payload = array_intersect_key($data, array_flip(['dt', 'chol', 'hdl', 'ldl', 'trig', 'glucose', 'note', 'advice']));
        if (empty($payload['dt'])) {
            return ResponseHelper::json($response, ['error' => 'Не указана дата измерения'], 422);
        }

        foreach (['note', 'advice'] as $textKey) {
            if (array_key_exists($textKey, $payload) && $payload[$textKey] === '') {
                $payload[$textKey] = null;
            }
        }

        $payload['user_id'] = $user->id;
        $lipid = Lipid::create($payload);

        return ResponseHelper::json($response, $this->formatLipid($lipid), 201);
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

    private function formatLipid(Lipid $lipid): array
    {
        return [
            'id' => $lipid->id,
            'dt' => $lipid->dt,
            'chol' => $lipid->chol,
            'hdl' => $lipid->hdl,
            'ldl' => $lipid->ldl,
            'trig' => $lipid->trig,
            'glucose' => $lipid->glucose,
            'note' => $lipid->note,
            'advice' => $lipid->advice,
            'user_id' => $lipid->user_id,
        ];
    }
}
