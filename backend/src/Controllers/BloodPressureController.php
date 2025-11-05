<?php

namespace App\Controllers;

use App\Models\BloodPressureRecord;
use App\Models\Profile;
use App\Services\OpenAiService;
use App\Services\SubscriptionException;
use App\Services\SubscriptionService;
use App\Support\Auth;
use App\Support\ResponseHelper;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class BloodPressureController
{
    public function history(Request $request, Response $response): Response
    {
        $user = Auth::user($request);

        $records = BloodPressureRecord::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return ResponseHelper::json($response, $this->serializeHistory($records->all()));
    }

    public function create(Request $request, Response $response): Response
    {
        $user = Auth::user($request);

        $payload = $this->validatePayload((array) $request->getParsedBody());
        if (isset($payload['error'])) {
            return ResponseHelper::json($response, ['error' => $payload['error']], 422);
        }

        $record = BloodPressureRecord::create(
            $payload['data'] + ['user_id' => $user->id]
        );
        $record->refresh();

        return ResponseHelper::json($response, [
            'record' => $this->serializeRecord($record),
        ], 201);
    }

    public function advice(Request $request, Response $response): Response
    {
        $user = Auth::user($request);

        $payload = $this->validatePayload((array) $request->getParsedBody());
        if (isset($payload['error'])) {
            return ResponseHelper::json($response, ['error' => $payload['error']], 422);
        }

        try {
            SubscriptionService::ensureAdviceAccess($user);
        } catch (SubscriptionException $e) {
            return ResponseHelper::json($response, ['error' => $e->getMessage()], $e->getStatus());
        }

        $service = new OpenAiService();
        if (!$service->isConfigured()) {
            return ResponseHelper::json($response, [
                'error' => 'AI-сервисы не настроены. Укажите ключ OPENAI_API_KEY.',
            ], 500);
        }

        $profile = Profile::find($user->id);
        $profileSummary = $this->profileSummary($profile);

        $metricsSummary = $this->metricsSummary($payload['data']);
        $question = $payload['data']['question'] ?? null;

        $messages = [
            [
                'role' => 'system',
                'content' => 'Ты — кардиолог, объясняющий понятным языком. Учитывай данные профиля и измерения. '
                    . 'Дай рекомендации по стабилизации давления и пульса безопасными методами. '
                    . 'Всегда напоминай о тревожных симптомах, при которых нужно обратиться к врачу.',
            ],
            [
                'role' => 'system',
                'content' => 'Данные профиля: ' . $profileSummary,
            ],
            [
                'role' => 'user',
                'content' => $metricsSummary . ($question ? "\nДополнительный вопрос: " . $question : ''),
            ],
        ];

        try {
            $advice = $service->chat($messages, [
                'temperature' => 0.4,
                'max_tokens' => 700,
            ]);
        } catch (\Throwable $e) {
            return ResponseHelper::json($response, [
                'error' => 'Не удалось получить рекомендации: ' . $e->getMessage(),
            ], 500);
        }

        $record = BloodPressureRecord::create(
            $payload['data'] + ['user_id' => $user->id, 'advice' => $advice]
        );
        $record->refresh();

        SubscriptionService::recordAdviceUsage($user);

        return ResponseHelper::json($response, [
            'advice' => $advice,
            'record' => $this->serializeRecord($record),
        ]);
    }

    private function validatePayload(array $input): array
    {
        $fields = ['systolic', 'diastolic', 'pulse'];
        $data = [];
        foreach ($fields as $field) {
            if (isset($input[$field]) && $input[$field] !== '') {
                $value = filter_var($input[$field], FILTER_VALIDATE_INT);
                if ($value === false) {
                    return ['error' => 'Поле ' . $field . ' должно быть целым числом'];
                }
                $data[$field] = $value;
            } else {
                $data[$field] = null;
            }
        }

        $textFields = ['question', 'comment'];
        foreach ($textFields as $field) {
            if (isset($input[$field]) && $input[$field] !== '') {
                $data[$field] = trim((string) $input[$field]);
            } else {
                $data[$field] = null;
            }
        }

        $hasMetrics = ($data['systolic'] ?? null) !== null
            || ($data['diastolic'] ?? null) !== null
            || ($data['pulse'] ?? null) !== null;

        if (!$hasMetrics) {
            return ['error' => 'Укажите хотя бы одно значение давления или пульса'];
        }

        $timestamp = $this->resolveMeasurementTimestamp($input);
        if (isset($timestamp['error'])) {
            return ['error' => $timestamp['error']];
        }

        if (isset($timestamp['created_at'])) {
            $data['created_at'] = $timestamp['created_at'];
        }

        return ['data' => $data];
    }

    /**
     * @param array<string, mixed> $input
     * @return array{created_at: string}|array{error: string}
     */
    private function resolveMeasurementTimestamp(array $input): array
    {
        $explicit = $this->firstNonEmptyValue($input, [
            'recorded_at',
            'measured_at',
            'taken_at',
            'datetime',
            'created_at',
        ]);

        if ($explicit !== null) {
            $parsed = $this->parseDateTimeString($explicit);
            if ($parsed === null) {
                return ['error' => 'Некорректная дата и время измерения'];
            }

            return ['created_at' => $parsed];
        }

        $date = $this->firstNonEmptyValue($input, ['date', 'dt']);
        $time = $this->firstNonEmptyValue($input, ['time', 'tm']);

        if ($date !== null || $time !== null) {
            if ($date === null) {
                return ['error' => 'Укажите дату измерения'];
            }
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                return ['error' => 'Дата измерения должна быть в формате ГГГГ-ММ-ДД'];
            }

            $timePart = $time ?? '00:00';
            if (!preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $timePart)) {
                return ['error' => 'Время измерения должно быть в формате ЧЧ:ММ или ЧЧ:ММ:СС'];
            }

            $format = strlen($timePart) === 5 ? 'Y-m-d H:i' : 'Y-m-d H:i:s';
            $combined = $date . ' ' . $timePart;
            $timestamp = \DateTimeImmutable::createFromFormat($format, $combined);
            $errors = \DateTimeImmutable::getLastErrors();
            if ($timestamp === false || $errors === false || $errors['warning_count'] > 0 || $errors['error_count'] > 0) {
                return ['error' => 'Не удалось распознать дату и время измерения'];
            }

            return ['created_at' => $timestamp->format('Y-m-d H:i:s')];
        }

        $now = new \DateTimeImmutable('now');

        return ['created_at' => $now->format('Y-m-d H:i:s')];
    }

    private function firstNonEmptyValue(array $input, array $keys): ?string
    {
        foreach ($keys as $key) {
            if (!array_key_exists($key, $input)) {
                continue;
            }

            $value = $input[$key];
            if ($value === null) {
                continue;
            }

            $value = trim((string) $value);
            if ($value !== '') {
                return $value;
            }
        }

        return null;
    }

    private function parseDateTimeString(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        try {
            $dateTime = new \DateTimeImmutable($value);
        } catch (\Exception $exception) {
            return null;
        }

        return $dateTime->format('Y-m-d H:i:s');
    }

    private function serializeHistory(array $records): array
    {
        return array_map(fn (BloodPressureRecord $record) => $this->serializeRecord($record), $records);
    }

    private function serializeRecord(BloodPressureRecord $record): array
    {
        return [
            'id' => (int) $record->id,
            'systolic' => $record->systolic !== null ? (int) $record->systolic : null,
            'diastolic' => $record->diastolic !== null ? (int) $record->diastolic : null,
            'pulse' => $record->pulse !== null ? (int) $record->pulse : null,
            'question' => $record->question ?: null,
            'comment' => $record->comment ?: null,
            'advice' => $record->advice ?: null,
            'created_at' => $record->created_at instanceof \DateTimeInterface
                ? $record->created_at->format(DATE_ATOM)
                : ($record->created_at ?: null),
        ];
    }

    private function profileSummary(?Profile $profile): string
    {
        if ($profile === null) {
            return 'не заполнен';
        }

        return sprintf(
            'пол: %s; возраст: %s; рост: %s см; вес: %s кг; активность: %s; цель по калориям: %s ккал; лимит насыщенных жиров: %s '
            . 'г; цель по клетчатке: %s г',
            $profile->sex ?: 'не указан',
            $profile->age !== null ? (int) $profile->age : 'не указан',
            $profile->height_cm !== null ? (int) $profile->height_cm : 'не указан',
            $profile->weight_kg !== null ? (float) $profile->weight_kg : 'не указан',
            $this->activityLabel($profile->activity),
            $profile->kcal_goal !== null ? (int) $profile->kcal_goal : 'не указана',
            $profile->sfa_limit_g !== null ? (int) $profile->sfa_limit_g : 'не указан',
            $profile->fiber_goal_g !== null ? (int) $profile->fiber_goal_g : 'не указана',
        );
    }

    private function activityLabel(?string $activity): string
    {
        return match ($activity) {
            'sed' => 'минимальная',
            'light' => 'лёгкая',
            'mod' => 'средняя',
            'high' => 'высокая',
            'ath' => 'спорт',
            default => 'не указана',
        };
    }

    /**
     * @param array<string, mixed> $data
     */
    private function metricsSummary(array $data): string
    {
        $parts = [];
        if ($data['systolic'] !== null) {
            $parts[] = 'систолическое давление ' . $data['systolic'] . ' мм рт. ст.';
        }
        if ($data['diastolic'] !== null) {
            $parts[] = 'диастолическое давление ' . $data['diastolic'] . ' мм рт. ст.';
        }
        if ($data['pulse'] !== null) {
            $parts[] = 'пульс ' . $data['pulse'] . ' уд/мин';
        }

        if (!$parts) {
            $parts[] = 'показатели давления и пульса не указаны';
        }

        if ($data['comment']) {
            $parts[] = 'Комментарий: ' . $data['comment'];
        }

        return implode('; ', $parts);
    }
}
