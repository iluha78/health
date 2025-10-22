<?php
namespace App\Controllers;

use App\Models\AssistantInteraction;
use App\Services\OpenAiService;
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

        $service = new OpenAiService();
        if (!$service->isConfigured()) {
            return ResponseHelper::json($response, [
                'error' => 'AI-сервисы не настроены. Укажите ключ OPENAI_API_KEY.',
            ], 500);
        }

        $messages = array_merge([
            [
                'role' => 'system',
                'content' => 'Ты — заботливый русскоязычный ассистент по здоровью сердца. Отвечай конкретно, опираясь на доказательную медицину. Если вопрос вне компетенции, предложи обратиться к врачу.',
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
            $payload = [
                'error' => 'Ассистент недоступен: ' . $e->getMessage(),
            ];

            $logs = $service->releaseLogs();
            if ($logs !== []) {
                $payload['logs'] = $logs;
            }

            return ResponseHelper::json($response, $payload, 500);
        }

        $record = AssistantInteraction::create([
            'user_id' => $user->id,
            'user_message' => $message,
            'assistant_reply' => $answer,
        ]);
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
}
