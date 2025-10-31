<?php
namespace App\Controllers;

use App\Models\PhotoAnalysis;
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
        $user = Auth::user($request);

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
                        ['type' => 'input_text', 'text' => 'Ты нутрициолог. Оцени блюдо на фото, ориентируясь на калорийность, насыщенные жиры и клетчатку. Дай ответ в формате JSON по схеме.'],
                    ],
                ],
                [
                    'role' => 'user',
                    'content' => [
                        ['type' => 'input_text', 'text' => 'Проанализируй блюдо на фото. Оцени примерную калорийность порции и скажи, насколько оно полезно для снижения холестерина.'],
                        ['type' => 'input_image', 'image_url' => ['url' => $dataUrl]],
                    ],
                ],
            ], [
                'text' => [
                    'format' => 'json_schema',
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

        $tips = [];
        if (isset($parsed['tips']) && is_array($parsed['tips'])) {
            $tips = array_values(array_filter(array_map(static function ($tip): string {
                return trim((string) $tip);
            }, $parsed['tips']), static function (string $tip): bool {
                return $tip !== '';
            }));
        }

        $result = [
            'title' => $parsed['title'] ?? 'Блюдо',
            'description' => $parsed['description'] ?? '',
            'estimated_calories' => $parsed['estimated_calories'] ?? null,
            'healthiness' => $parsed['healthiness'] ?? 'balanced',
            'reasoning' => $parsed['reasoning'] ?? '',
            'tips' => $tips,
        ];

        $record = PhotoAnalysis::create([
            'user_id' => $user->id,
            'title' => $result['title'],
            'description' => $result['description'],
            'estimated_calories' => $result['estimated_calories'],
            'healthiness' => $result['healthiness'],
            'reasoning' => $result['reasoning'],
            'tips' => $result['tips'],
            'original_filename' => $photo->getClientFilename() ?: null,
        ]);
        $record->refresh();

        return ResponseHelper::json($response, $result + [
            'history' => $this->serializeHistory([$record]),
        ]);
    }

    public function history(Request $request, Response $response): Response
    {
        $user = Auth::user($request);

        $records = PhotoAnalysis::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return ResponseHelper::json($response, $this->serializeHistory($records->all()));
    }

    /**
     * @param array<int, PhotoAnalysis> $records
     * @return array<int, array<string, mixed>>
     */
    private function serializeHistory(array $records): array
    {
        return array_map(static function (PhotoAnalysis $analysis): array {
            return [
                'id' => (int) $analysis->id,
                'title' => $analysis->title,
                'description' => $analysis->description,
                'estimated_calories' => $analysis->estimated_calories !== null ? (int) $analysis->estimated_calories : null,
                'healthiness' => $analysis->healthiness,
                'reasoning' => $analysis->reasoning,
                'tips' => $analysis->tips ?: [],
                'original_filename' => $analysis->original_filename ?: null,
                'created_at' => $analysis->created_at instanceof \DateTimeInterface
                    ? $analysis->created_at->format(DATE_ATOM)
                    : ($analysis->created_at ?: null),
            ];
        }, $records);
    }
}
