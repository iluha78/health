<?php
namespace App\Controllers;

use App\Models\PhotoAnalysis;
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

        $apiKey = getenv('OPENAI_API_KEY');
        if (!$apiKey) {
            return ResponseHelper::json($response, [
                'error' => 'AI-сервисы не настроены. Укажите ключ OPENAI_API_KEY.',
            ], 500);
        }

        // Прямой запрос к OpenAI Chat Completions API
        $payload = [
            'model' => 'gpt-4o-mini',
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'Ты нутрициолог. Оцени блюдо на фото, ориентируясь на калорийность, насыщенные жиры и клетчатку. Ответь строго в JSON формате с полями: title, description, estimated_calories, healthiness (healthy/balanced/caution), reasoning, tips (массив строк).'
                ],
                [
                    'role' => 'user',
                    'content' => [
                        [
                            'type' => 'text',
                            'text' => 'Проанализируй блюдо на фото. Оцени примерную калорийность порции и скажи, насколько оно полезно для снижения холестерина.'
                        ],
                        [
                            'type' => 'image_url',
                            'image_url' => ['url' => $dataUrl]
                        ],
                    ],
                ],
            ],
            'temperature' => 0.7,
        ];

        try {
            $ch = curl_init('https://api.openai.com/v1/chat/completions');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . $apiKey,
                ],
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode($payload),
                CURLOPT_TIMEOUT => 60,
            ]);

            $raw = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($curlError) {
                throw new \Exception('cURL Error: ' . $curlError);
            }

            $apiResponse = json_decode($raw, true);

            if ($httpCode >= 400) {
                $errorMsg = $apiResponse['error']['message'] ?? $raw;
                throw new \Exception('OpenAI Error: ' . $errorMsg);
            }

            $resultText = $apiResponse['choices'][0]['message']['content'] ?? null;
            if (!$resultText) {
                throw new \Exception('Пустой ответ от OpenAI');
            }

            // Убираем markdown обертку если есть
            $resultText = preg_replace('/^```json\s*|\s*```$/m', '', trim($resultText));
            $parsed = json_decode($resultText, true);

            if (!is_array($parsed)) {
                throw new \Exception('Не удалось распарсить JSON: ' . $resultText);
            }

        } catch (\Throwable $e) {
            return ResponseHelper::json($response, [
                'error' => 'Не удалось проанализировать фото: ' . $e->getMessage(),
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