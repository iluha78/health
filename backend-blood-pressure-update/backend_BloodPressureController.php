<?php
namespace App\Controllers;

use App\Models\BloodPressureRecord;
use App\Support\Auth;
use App\Support\ResponseHelper;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class BloodPressureController
{
    public function list(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        
        $records = BloodPressureRecord::where('user_id', $user->id)
            ->orderByDesc('measured_at')
            ->limit(100)
            ->get();

        return ResponseHelper::json($response, $this->serializeRecords($records->all()));
    }

    public function create(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        $data = (array) $request->getParsedBody();

        // Валидация
        if (empty($data['measured_at'])) {
            return ResponseHelper::json($response, ['error' => 'Не указана дата и время измерения'], 422);
        }

        // Проверяем, что хотя бы одно поле заполнено
        $hasData = !empty($data['systolic']) || 
                   !empty($data['diastolic']) || 
                   !empty($data['pulse']) || 
                   !empty($data['glucose']);
        
        if (!$hasData) {
            return ResponseHelper::json($response, [
                'error' => 'Укажите хотя бы один показатель (давление, пульс или сахар)'
            ], 422);
        }

        $payload = [
            'user_id' => $user->id,
            'measured_at' => $data['measured_at'],
            'systolic' => !empty($data['systolic']) ? (int)$data['systolic'] : null,
            'diastolic' => !empty($data['diastolic']) ? (int)$data['diastolic'] : null,
            'pulse' => !empty($data['pulse']) ? (int)$data['pulse'] : null,
            'glucose' => !empty($data['glucose']) ? (float)$data['glucose'] : null,
            'note' => !empty($data['note']) ? trim($data['note']) : null,
        ];

        $record = BloodPressureRecord::create($payload);
        $record->refresh();

        return ResponseHelper::json($response, $this->serializeRecord($record), 201);
    }

    public function delete(Request $request, Response $response, array $args): Response
    {
        $user = Auth::user($request);
        $id = (int) ($args['id'] ?? 0);

        $record = BloodPressureRecord::where('user_id', $user->id)
            ->where('id', $id)
            ->first();
        
        if (!$record) {
            return ResponseHelper::json($response, ['error' => 'Запись не найдена'], 404);
        }

        $record->delete();

        return ResponseHelper::json($response, ['status' => 'ok']);
    }

    /**
     * @param array<int, BloodPressureRecord> $records
     * @return array<int, array<string, mixed>>
     */
    private function serializeRecords(array $records): array
    {
        return array_map(fn($record) => $this->serializeRecord($record), $records);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeRecord(BloodPressureRecord $record): array
    {
        return [
            'id' => (int) $record->id,
            'measured_at' => $record->measured_at instanceof \DateTimeInterface
                ? $record->measured_at->format(DATE_ATOM)
                : $record->measured_at,
            'systolic' => $record->systolic !== null ? (int) $record->systolic : null,
            'diastolic' => $record->diastolic !== null ? (int) $record->diastolic : null,
            'pulse' => $record->pulse !== null ? (int) $record->pulse : null,
            'glucose' => $record->glucose !== null ? (float) $record->glucose : null,
            'note' => $record->note ?: null,
            'created_at' => $record->created_at ?? null,
        ];
    }
}
