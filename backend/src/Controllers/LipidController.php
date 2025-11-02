<?php
namespace App\Controllers;

use App\Models\Lipid;
use App\Support\Auth;
use App\Support\ResponseHelper;
use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Database\Eloquent\Collection;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class LipidController
{
    public function list(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        $query = Lipid::where('user_id', $user->id);

        if ($this->hasCreatedAtColumn()) {
            $query->orderByDesc('created_at');
        }

        /** @var Collection<int, Lipid> $lipids */
        $lipids = $query
            ->orderByDesc('id')
            ->get();

        return ResponseHelper::json($response, $lipids->map(fn (Lipid $lipid) => $this->serialize($lipid))->all());
    }

    public function create(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        $data = (array) $request->getParsedBody();

        $payload = $this->buildPayload($data);
        if ($payload === null) {
            return ResponseHelper::json($response, ['error' => 'Укажите хотя бы один показатель'], 422);
        }

        $payload['user_id'] = $user->id;

        try {
            $lipid = Lipid::create($payload);
            $lipid->refresh();
        } catch (\Throwable $e) {
            error_log('[lipids] failed to persist record: ' . $e->getMessage());

            return ResponseHelper::json(
                $response,
                ['error' => 'Не удалось сохранить запись. Убедитесь, что база данных обновлена.'],
                500
            );
        }

        return ResponseHelper::json($response, $this->serialize($lipid), 201);
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

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>|null
     */
    private function buildPayload(array $data): ?array
    {
        $date = $this->trimString($data['dt'] ?? null);
        $chol = $this->toFloat($data['chol'] ?? null);
        $hdl = $this->toFloat($data['hdl'] ?? null);
        $ldl = $this->toFloat($data['ldl'] ?? null);
        $trig = $this->toFloat($data['trig'] ?? null);
        $glucose = $this->toFloat($data['glucose'] ?? null);
        $note = $this->trimString($data['note'] ?? null);
        $question = $this->trimString($data['question'] ?? null);
        $advice = $this->trimString($data['advice'] ?? null);

        $hasMetrics = $date !== null
            || $chol !== null
            || $hdl !== null
            || $ldl !== null
            || $trig !== null
            || $glucose !== null
            || $note !== null
            || $question !== null
            || $advice !== null;

        if (!$hasMetrics) {
            return null;
        }

        return array_filter([
            'dt' => $date,
            'chol' => $chol,
            'hdl' => $hdl,
            'ldl' => $ldl,
            'trig' => $trig,
            'glucose' => $glucose,
            'note' => $note,
            'question' => $question,
            'advice' => $advice,
        ], static fn ($value) => $value !== null);
    }

    private function trimString(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);
        return $trimmed === '' ? null : $trimmed;
    }

    private function toFloat(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_numeric($value)) {
            return (float) $value;
        }

        return null;
    }

    private function serialize(Lipid $lipid): array
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
            'question' => $lipid->question,
            'advice' => $lipid->advice,
            'created_at' => $lipid->created_at,
        ];
    }

    private function hasCreatedAtColumn(): bool
    {
        static $cached = null;

        if ($cached === true) {
            return true;
        }

        try {
            $exists = Capsule::schema()->hasColumn('lipids', 'created_at');
        } catch (\Throwable $e) {
            error_log('[lipids] failed to inspect schema: ' . $e->getMessage());
            $exists = false;
        }

        if ($exists) {
            $cached = true;
        }

        return $exists;
    }
}
