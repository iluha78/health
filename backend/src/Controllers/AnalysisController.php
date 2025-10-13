<?php
namespace App\Controllers;

use App\Services\OpenAiService;
use App\Support\Auth;
use App\Support\ResponseHelper;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Psr7\UploadedFile;

class AnalysisController
{
    public function photo(Request $request, Response $response): Response
    {
        Auth::user($request); // доступ требуется, но пользователь не используется явно

        $files = $request->getUploadedFiles();
        /** @var UploadedFile|null $photo */
        $photo = $files['photo'] ?? null;
        if (!$photo) {
            return ResponseHelper::json($response, ['error' => 'Загрузите фото блюда в поле "photo"'], 422);
        }
        if ($photo->getError() !== UPLOAD_ERR_OK) {
            return ResponseHelper::json($response, ['error' => 'Не удалось загрузить файл'], 422);
        }

        $stream = $photo->getStream();
        $content = $stream->getContents();
        if ($content === '' || $content === false) {
            return ResponseHelper::json($response, ['error' => 'Файл пустой'], 422);
        }

        $mime = $photo->getClientMediaType() ?: 'image/jpeg';
        $base64 = base64_encode($content);
        $dataUrl = 'data:' . $mime . ';base64,' . $base64;

        $service = new OpenAiService();
        if (!$service->isConfigured()) {
            return ResponseHelper::json($response, [
                'error' => 'AI-сервисы не настроены. Укажите ключ OPENAI_API_KEY.',
            ], 500);
        }

        $schema = [
            'name' => 'DishAssessment',
            'schema' => [
                'type' => 'object',
                'required' => ['title', 'description', 'estimated_calories', 'healthiness', 'reasoning', 'tips'],
                'properties' => [
                    'title' => ['type' => 'string'],
                    'description' => ['type' => 'string'],
                    'estimated_calories' => ['type' => 'integer'],
                    'healthiness' => ['type' => 'string', 'enum' => ['healthy', 'balanced', 'caution']],
                    'reasoning' => ['type' => 'string'],
                    'tips' => [
                        'type' => 'array',
                        'items' => ['type' => 'string'],
                    ],
                ],
                'additionalProperties' => false,
            ],
        ];

        try {
            $resultJson = $service->respond([
                [
                    'role' => 'system',
                    'content' => [
                        ['type' => 'text', 'text' => 'Ты нутрициолог. Оцени блюдо на фото, ориентируясь на калорийность, насыщенные жиры и клетчатку. Дай ответ в формате JSON по схеме.'],
                    ],
                ],
                [
                    'role' => 'user',
                    'content' => [
                        ['type' => 'text', 'text' => 'Проанализируй блюдо на фото. Оцени примерную калорийность порции и скажи, насколько оно полезно для снижения холестерина.'],
                        ['type' => 'input_image', 'image_url' => ['url' => $dataUrl]],
                    ],
                ],
            ], [
                'response_format' => [
                    'type' => 'json_schema',
                    'json_schema' => $schema,
                ],
                'max_output_tokens' => 900,
            ]);
        } catch (\Throwable $e) {
            return ResponseHelper::json($response, [
                'error' => 'Не удалось проанализировать фото: ' . $e->getMessage(),
            ], 500);
        }

        $parsed = json_decode($resultJson, true);
        if (!is_array($parsed)) {
            return ResponseHelper::json($response, [
                'error' => 'Модель вернула неожиданный формат ответа',
            ], 500);
        }

        return ResponseHelper::json($response, [
            'title' => $parsed['title'] ?? 'Блюдо',
            'description' => $parsed['description'] ?? '',
            'estimated_calories' => $parsed['estimated_calories'] ?? null,
            'healthiness' => $parsed['healthiness'] ?? 'balanced',
            'reasoning' => $parsed['reasoning'] ?? '',
            'tips' => $parsed['tips'] ?? [],
        ]);
    }
}
