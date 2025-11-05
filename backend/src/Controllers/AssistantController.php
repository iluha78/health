<?php
namespace App\Controllers;

use App\Models\AssistantInteraction;
use App\Models\Lipid;
use App\Models\Profile;
use App\Services\OpenAiService;
use App\Services\SubscriptionException;
use App\Services\SubscriptionService;
use App\Support\Auth;
use App\Support\ResponseHelper;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class AssistantController
{
    public function chat(Request $request, Response $response): Response
    {
        $user = Auth::user($request); // проверка авторизации
        $data = (array) $request->getParsedBody();

        $message = trim((string) ($data['message'] ?? ''));
        if ($message === '') {
            return ResponseHelper::json($response, ['error' => 'Сообщение не должно быть пустым'], 422);
        }

        $history = [];
        if (isset($data['history']) && is_array($data['history'])) {
            foreach ($data['history'] as $entry) {
                if (!is_array($entry)) {
                    continue;
                }
                $role = $entry['role'] ?? '';
                $content = trim((string) ($entry['content'] ?? ''));
                if ($content === '') {
                    continue;
                }
                if (!in_array($role, ['user', 'assistant'], true)) {
                    continue;
                }
                $history[] = [
                    'role' => $role,
                    'content' => $content,
                ];
            }
        }

        try {
            SubscriptionService::ensureAssistantAccess($user);
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
        $latestLipid = Lipid::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->orderByDesc('dt')
            ->first();
        $lipidSummary = $this->lipidSummary($latestLipid);

        $messages = array_merge([
            [
                'role' => 'system',
                'content' => 'Ты — заботливый русскоязычный ассистент по здоровью сердца. Отвечай конкретно, опираясь на доказательную медицину. Если вопрос вне компетенции, предложи обратиться к врачу.',
            ],
            [
                'role' => 'system',
                'content' => 'Данные профиля пользователя: ' . $profileSummary,
            ],
            [
                'role' => 'system',
                'content' => 'Последний липидный профиль и глюкоза: ' . $lipidSummary,
            ],
        ], $history, [
            [
                'role' => 'user',
                'content' => $message,
            ],
        ]);

        try {
            $answer = $service->chat($messages, [
                'temperature' => 0.5,
                'max_tokens' => 700,
            ]);
        } catch (\Throwable $e) {
            return ResponseHelper::json($response, [
                'error' => 'Ассистент недоступен: ' . $e->getMessage(),
            ], 500);
        }

        $record = AssistantInteraction::create([
            'user_id' => $user->id,
            'user_message' => $message,
            'assistant_reply' => $answer,
        ]);
        SubscriptionService::recordAssistantUsage($user);
        $record->refresh();

        return ResponseHelper::json($response, [
            'reply' => $answer,
            'history' => $this->serializeHistory([$record]),
        ]);
    }

    public function history(Request $request, Response $response): Response
    {
        $user = Auth::user($request);

        $records = AssistantInteraction::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return ResponseHelper::json($response, $this->serializeHistory($records->all()));
    }

    /**
     * @param array<int, AssistantInteraction> $records
     * @return array<int, array<string, mixed>>
     */
    private function serializeHistory(array $records): array
    {
        return array_map(static function (AssistantInteraction $interaction): array {
            return [
                'id' => (int) $interaction->id,
                'user_message' => $interaction->user_message,
                'assistant_reply' => $interaction->assistant_reply,
                'created_at' => $interaction->created_at instanceof \DateTimeInterface
                    ? $interaction->created_at->format(DATE_ATOM)
                    : ($interaction->created_at ?: null),
            ];
        }, $records);
    }

    private function profileSummary(?Profile $profile): string
    {
        if ($profile === null) {
            return 'не заполнены';
        }

        return sprintf(
            'пол: %s; возраст: %s; рост: %s см; вес: %s кг; активность: %s; цель по калориям: %s ккал; лимит насыщенных жиров: %s г; цель по клетчатке: %s г',
            $profile->sex ?: 'не указан',
            $profile->age !== null ? (int) $profile->age : 'не указан',
            $profile->height_cm !== null ? (int) $profile->height_cm : 'не указан',
            $profile->weight_kg !== null ? (float) $profile->weight_kg : 'не указан',
            $this->activityLabel($profile->activity),
            $profile->kcal_goal !== null ? (int) $profile->kcal_goal : 'не указана',
            $profile->sfa_limit_g !== null ? (int) $profile->sfa_limit_g : 'не указан',
            $profile->fiber_goal_g !== null ? (int) $profile->fiber_goal_g : 'не указана'
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

    private function lipidSummary(?Lipid $lipid): string
    {
        if ($lipid === null) {
            return 'данные не найдены';
        }

        $parts = [];
        $parts[] = $lipid->dt instanceof \DateTimeInterface
            ? 'дата анализа ' . $lipid->dt->format('Y-m-d')
            : 'дата анализа ' . ($lipid->dt ?: 'не указана');

        $metrics = [
            'общий холестерин' => $lipid->chol,
            'ЛПВП' => $lipid->hdl,
            'ЛПНП' => $lipid->ldl,
            'триглицериды' => $lipid->trig,
            'глюкоза' => $lipid->glucose,
        ];

        foreach ($metrics as $label => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            $parts[] = sprintf('%s %s ммоль/л', $label, rtrim(rtrim((string) $value, '0'), '.'));
        }

        if ($lipid->note) {
            $parts[] = 'комментарий: ' . $lipid->note;
        }

        if ($lipid->question) {
            $parts[] = 'вопрос пациента: ' . $lipid->question;
        }

        return implode(', ', $parts);
    }
}
