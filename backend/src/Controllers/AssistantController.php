<?php
namespace App\Controllers;

use App\Models\AssistantInteraction;
use App\Services\OpenAiService;
use App\Services\SubscriptionException;
use App\Services\SubscriptionService;
use App\Support\Auth;
use App\Support\ResponseHelper;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\UploadedFileInterface;

class AssistantController
{
    private const MAX_IMAGE_SIZE = 5242880; // 5 MiB

    /**
     * @var array<string, string>
     */
    private const ALLOWED_IMAGE_TYPES = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    public function chat(Request $request, Response $response): Response
    {
        $user = Auth::user($request); // проверка авторизации
        $data = (array) $request->getParsedBody();

        $message = trim((string) ($data['message'] ?? ''));
        if ($message === '') {
            return ResponseHelper::json($response, ['error' => 'Сообщение не должно быть пустым'], 422);
        }

        $rawHistory = $data['history'] ?? [];
        if (is_string($rawHistory) && $rawHistory !== '') {
            $decodedHistory = json_decode($rawHistory, true);
            if (is_array($decodedHistory)) {
                $rawHistory = $decodedHistory;
            } else {
                $rawHistory = [];
            }
        }

        $history = [];
        if (is_array($rawHistory)) {
            foreach ($rawHistory as $entry) {
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

        $uploadedFiles = $request->getUploadedFiles();
        $imageFile = $uploadedFiles['image'] ?? null;
        if (is_array($imageFile)) {
            $imageFile = $imageFile[0] ?? null;
        }

        $imagePath = null;
        $imageName = null;
        $imageData = null;
        if ($imageFile instanceof UploadedFileInterface) {
            if ($imageFile->getError() !== UPLOAD_ERR_OK) {
                return ResponseHelper::json($response, ['error' => 'Не удалось загрузить изображение'], 422);
            }

            $size = $imageFile->getSize() ?? 0;
            if ($size <= 0) {
                return ResponseHelper::json($response, ['error' => 'Файл изображения повреждён'], 422);
            }

            if ($size > self::MAX_IMAGE_SIZE) {
                return ResponseHelper::json($response, ['error' => 'Изображение слишком большое (максимум 5 МБ).'], 422);
            }

            $mime = (string) $imageFile->getClientMediaType();
            if (!isset(self::ALLOWED_IMAGE_TYPES[$mime])) {
                return ResponseHelper::json($response, ['error' => 'Поддерживаются только изображения JPG, PNG или WebP.'], 422);
            }

            $stream = $imageFile->getStream();
            $contents = $stream->getContents();
            if ($contents === '') {
                return ResponseHelper::json($response, ['error' => 'Не удалось прочитать изображение'], 422);
            }

            $directory = dirname(__DIR__, 2) . '/public/uploads/assistant';
            if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
                return ResponseHelper::json($response, ['error' => 'Не удалось подготовить хранилище изображений'], 500);
            }

            try {
                $filename = date('Ymd_His') . '_' . bin2hex(random_bytes(6)) . '.' . self::ALLOWED_IMAGE_TYPES[$mime];
            } catch (\Throwable $e) {
                return ResponseHelper::json($response, ['error' => 'Не удалось сохранить изображение'], 500);
            }

            if (file_put_contents($directory . '/' . $filename, $contents) === false) {
                return ResponseHelper::json($response, ['error' => 'Не удалось сохранить изображение'], 500);
            }

            $clientFilename = $imageFile->getClientFilename();
            $imageName = $clientFilename !== null && $clientFilename !== '' ? basename($clientFilename) : $filename;
            $imagePath = '/uploads/assistant/' . $filename;
            $imageData = 'data:' . $mime . ';base64,' . base64_encode($contents);
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

        $messages = [[
            'role' => 'system',
            'content' => [[
                'type' => 'text',
                'text' => 'Ты — заботливый русскоязычный ассистент по здоровью сердца. Отвечай конкретно, опираясь на доказательную медицину. Если вопрос вне компетенции, предложи обратиться к врачу.',
            ]],
        ]];

        foreach ($history as $entry) {
            $messages[] = [
                'role' => $entry['role'],
                'content' => [[
                    'type' => 'text',
                    'text' => $entry['content'],
                ]],
            ];
        }

        $userContent = [[
            'type' => 'text',
            'text' => $message,
        ]];
        if ($imageData !== null) {
            $userContent[] = [
                'type' => 'image_url',
                'image_url' => [
                    'url' => $imageData,
                ],
            ];
        }

        $messages[] = [
            'role' => 'user',
            'content' => $userContent,
        ];

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
            'user_image_path' => $imagePath,
            'user_image_name' => $imageName,
            'assistant_reply' => $answer,
        ]);
        SubscriptionService::recordAssistantUsage($user);
        $record->refresh();

        return ResponseHelper::json($response, [
            'reply' => $answer,
            'history' => $this->serializeHistory([$record], $request),
        ]);
    }

    public function history(Request $request, Response $response): Response
    {
        $user = Auth::user($request);

        $records = AssistantInteraction::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return ResponseHelper::json($response, $this->serializeHistory($records->all(), $request));
    }

    /**
     * @param array<int, AssistantInteraction> $records
     * @return array<int, array<string, mixed>>
     */
    private function serializeHistory(array $records, Request $request): array
    {
        return array_map(function (AssistantInteraction $interaction) use ($request): array {
            $imagePath = $interaction->user_image_path;
            return [
                'id' => (int) $interaction->id,
                'user_message' => $interaction->user_message,
                'assistant_reply' => $interaction->assistant_reply,
                'created_at' => $interaction->created_at instanceof \DateTimeInterface
                    ? $interaction->created_at->format(DATE_ATOM)
                    : ($interaction->created_at ?: null),
                'user_image_url' => $imagePath ? $this->buildPublicUrl($request, $imagePath) : null,
                'user_image_name' => $interaction->user_image_name,
            ];
        }, $records);
    }

    private function buildPublicUrl(Request $request, string $path): string
    {
        $normalizedPath = '/' . ltrim($path, '/');
        $uri = $request->getUri();
        $authority = $uri->getAuthority();
        if ($authority === '') {
            return $normalizedPath;
        }

        $scheme = $uri->getScheme();
        if ($scheme === '') {
            $scheme = 'http';
        }

        $basePath = '';
        if (method_exists($uri, 'getBasePath')) {
            /** @var string $basePath */
            $basePath = $uri->getBasePath();
        }

        $basePath = rtrim($basePath, '/');
        $base = rtrim($scheme . '://' . $authority . $basePath, '/');

        return $base . $normalizedPath;
    }
}
