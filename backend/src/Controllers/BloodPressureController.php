<?php
namespace App\Controllers;

use App\Models\BloodPressure;
use App\Support\Auth;
use App\Support\ResponseHelper;
use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Database\Eloquent\Collection;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class BloodPressureController
{
    public function list(Request $request, Response $response): Response
    {
        $user = Auth::user($request);

        if (!$this->tableExists()) {
            return ResponseHelper::json($response, []);
        }

        /** @var Collection<int, BloodPressure> $entries */
        $entries = BloodPressure::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        return ResponseHelper::json($response, $entries->map(fn (BloodPressure $entry) => $this->serialize($entry))->all());
    }

    public function create(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        $data = (array) $request->getParsedBody();

        if (!$this->tableExists()) {
            return ResponseHelper::json(
                $response,
                ['error' => 'Хранилище показателей ещё не готово. Запустите миграции.'],
                503
            );
        }

        $payload = $this->buildPayload($data);
        if ($payload === null) {
            return ResponseHelper::json($response, ['error' => 'Укажите показатели давления или пульса'], 422);
        }

        $payload['user_id'] = $user->id;

        try {
            $entry = BloodPressure::create($payload);
            $entry->refresh();
        } catch (\Throwable $e) {
            error_log('[blood_pressures] failed to persist record: ' . $e->getMessage());

            return ResponseHelper::json(
                $response,
                ['error' => 'Не удалось сохранить запись. Убедитесь, что база данных обновлена.'],
                500
            );
        }

        return ResponseHelper::json($response, $this->serialize($entry), 201);
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        $user = Auth::user($request);
        $id = (int) ($args['id'] ?? 0);

        if (!$this->tableExists()) {
            return ResponseHelper::json($response, ['error' => 'Запись не найдена'], 404);
        }

        $entry = BloodPressure::where('user_id', $user->id)->where('id', $id)->first();
        if (!$entry) {
            return ResponseHelper::json($response, ['error' => 'Запись не найдена'], 404);
        }

        $entry->delete();

        return ResponseHelper::json($response, ['status' => 'ok']);
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>|null
     */
    private function buildPayload(array $data): ?array
    {
        $systolic = $this->toInt($data['systolic'] ?? null);
        $diastolic = $this->toInt($data['diastolic'] ?? null);
        $pulse = $this->toInt($data['pulse'] ?? null);
        $question = $this->trimString($data['question'] ?? null);
        $comment = $this->trimString($data['comment'] ?? null);
        $advice = $this->trimString($data['advice'] ?? null);

        $hasData = $systolic !== null
            || $diastolic !== null
            || $pulse !== null
            || $question !== null
            || $comment !== null
            || $advice !== null;

        if (!$hasData) {
            return null;
        }

        return array_filter([
            'systolic' => $systolic,
            'diastolic' => $diastolic,
            'pulse' => $pulse,
            'question' => $question,
            'comment' => $comment,
            'advice' => $advice,
        ], static fn ($value) => $value !== null);
    }

    private function toInt(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_numeric($value)) {
            return (int) $value;
        }

        return null;
    }

    private function trimString(mixed $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }

        $trimmed = trim($value);
        return $trimmed === '' ? null : $trimmed;
    }

    private function serialize(BloodPressure $entry): array
    {
        return [
            'id' => $entry->id,
            'systolic' => $entry->systolic,
            'diastolic' => $entry->diastolic,
            'pulse' => $entry->pulse,
            'question' => $entry->question,
            'comment' => $entry->comment,
            'advice' => $entry->advice,
            'created_at' => $entry->created_at,
        ];
    }

    private function tableExists(): bool
    {
        static $cached = null;

        if ($cached === true) {
            return true;
        }

        try {
            $exists = Capsule::schema()->hasTable('blood_pressures');
        } catch (\Throwable $e) {
            error_log('[blood_pressures] failed to inspect schema: ' . $e->getMessage());
            $exists = false;
        }

        if ($exists) {
            $cached = true;
        }

        return $exists;
    }
}
