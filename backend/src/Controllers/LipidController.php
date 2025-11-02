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
            ->orderByDesc('created_at')
            ->orderByDesc('dt')
            ->limit(100)
            ->get();

        return ResponseHelper::json($response, $this->serializeHistory($lipids->all()));
    }

    public function create(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        $payload = $this->validatePayload((array) $request->getParsedBody());
        if (isset($payload['error'])) {
            return ResponseHelper::json($response, ['error' => $payload['error']], 422);
        }

        $lipid = Lipid::create($payload['data'] + ['user_id' => $user->id]);
        $lipid->refresh();

        return ResponseHelper::json($response, [
            'record' => $this->serializeRecord($lipid),
        ], 201);
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
     * @param array<string, mixed> $input
     * @return array{data: array<string, mixed>}|array{error: string}
     */
    private function validatePayload(array $input): array
    {
        $date = trim((string) ($input['dt'] ?? ''));
        if ($date === '') {
            return ['error' => 'Не указана дата измерения'];
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return ['error' => 'Дата должна быть в формате ГГГГ-ММ-ДД'];
        }

        $data = ['dt' => $date];
        foreach (['chol', 'hdl', 'ldl', 'trig', 'glucose'] as $field) {
            if (!isset($input[$field]) || $input[$field] === '' || $input[$field] === null) {
                $data[$field] = null;
                continue;
            }
            $value = filter_var($input[$field], FILTER_VALIDATE_FLOAT);
            if ($value === false) {
                return ['error' => 'Поле ' . $field . ' должно быть числом'];
            }
            $data[$field] = round($value, 2);
        }

        $noteSource = $input['comment'] ?? $input['note'] ?? null;
        $note = isset($noteSource) ? trim((string) $noteSource) : '';
        $data['note'] = $note !== '' ? $note : null;

        $question = isset($input['question']) ? trim((string) $input['question']) : '';
        $data['question'] = $question !== '' ? $question : null;

        $advice = isset($input['advice']) ? trim((string) $input['advice']) : '';
        $data['advice'] = $advice !== '' ? $advice : null;

        return ['data' => $data];
    }

    /**
     * @param array<int, Lipid> $records
     * @return array<int, array<string, mixed>>
     */
    private function serializeHistory(array $records): array
    {
        return array_map(fn (Lipid $lipid) => $this->serializeRecord($lipid), $records);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeRecord(Lipid $lipid): array
    {
        return [
            'id' => (int) $lipid->id,
            'dt' => $lipid->dt instanceof \DateTimeInterface
                ? $lipid->dt->format('Y-m-d')
                : ($lipid->dt ?: null),
            'chol' => $this->toNumber($lipid->chol),
            'hdl' => $this->toNumber($lipid->hdl),
            'ldl' => $this->toNumber($lipid->ldl),
            'trig' => $this->toNumber($lipid->trig),
            'glucose' => $this->toNumber($lipid->glucose),
            'note' => $lipid->note ?: null,
            'question' => $lipid->question ?: null,
            'advice' => $lipid->advice ?: null,
            'created_at' => $lipid->created_at instanceof \DateTimeInterface
                ? $lipid->created_at->format(DATE_ATOM)
                : ($lipid->created_at ?: null),
        ];
    }

    private function toNumber($value): ?float
    {
        if ($value === null) {
            return null;
        }
        if (is_numeric($value)) {
            return (float) $value;
        }

        return null;
    }
}
