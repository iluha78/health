<?php
namespace App\Controllers;

use App\Models\DailyFoodPhoto;
use App\Services\OpenAiService;
use App\Services\SubscriptionException;
use App\Services\SubscriptionService;
use App\Support\Auth;
use App\Support\ResponseHelper;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\UploadedFileInterface;

class DailyFoodPhotoController
{
    /**
     * Получить все записи за определенный день
     */
    public function getDay(Request $request, Response $response, array $args): Response
    {
        $user = Auth::user($request);
        $date = $this->sanitizeDate($args['date'] ?? '');
        
        if (!$date) {
            return ResponseHelper::json($response, ['error' => 'Некорректная дата'], 422);
        }

        $photos = DailyFoodPhoto::where('user_id', $user->id)
            ->where('photo_date', $date)
            ->orderBy('photo_time')
            ->get();

        $totalCalories = $photos->sum('estimated_calories');

        return ResponseHelper::json($response, [
            'date' => $date,
            'photos' => $this->serializePhotos($photos->all()),
            'total_calories' => $totalCalories,
        ]);
    }

    /**
     * Создать запись с анализом фото
     */
    public function create(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        
        try {
            SubscriptionService::ensureAdviceAccess($user);
        } catch (SubscriptionException $e) {
            return ResponseHelper::json($response, ['error' => $e->getMessage()], $e->getStatus());
        }

        $data = (array) $request->getParsedBody();
        $files = $request->getUploadedFiles();

        // Дата (обязательная)
        $date = $this->sanitizeDate($data['date'] ?? date('Y-m-d'));
        if (!$date) {
            return ResponseHelper::json($response, ['error' => 'Некорректная дата'], 422);
        }

        // Время (опционально)
        $time = !empty($data['time']) ? $data['time'] : date('H:i:s');

        // Если есть фото - анализируем его
        if (isset($files['photo']) && $files['photo'] instanceof UploadedFileInterface) {
            $photoResult = $this->analyzePhoto($files['photo'], $user);
            
            if (isset($photoResult['error'])) {
                return ResponseHelper::json($response, $photoResult, $photoResult['status'] ?? 500);
            }

            $record = DailyFoodPhoto::create([
                'user_id' => $user->id,
                'photo_date' => $date,
                'photo_time' => $time,
                'title' => $photoResult['title'],
                'description' => $photoResult['description'],
                'estimated_calories' => $photoResult['calories'],
                'note' => !empty($data['note']) ? trim($data['note']) : null,
            ]);
        } else {
            // Ручной ввод без фото
            if (empty($data['title'])) {
                return ResponseHelper::json($response, ['error' => 'Укажите название блюда'], 422);
            }

            $record = DailyFoodPhoto::create([
                'user_id' => $user->id,
                'photo_date' => $date,
                'photo_time' => $time,
                'title' => trim($data['title']),
                'description' => !empty($data['description']) ? trim($data['description']) : null,
                'estimated_calories' => !empty($data['calories']) ? (int)$data['calories'] : null,
                'note' => !empty($data['note']) ? trim($data['note']) : null,
            ]);
        }

        $record->refresh();

        return ResponseHelper::json($response, $this->serializePhoto($record), 201);
    }

    /**
     * Получить историю по дням с суммой калорий
     */
    public function history(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        $params = $request->getQueryParams();
        $limit = min((int)($params['limit'] ?? 30), 90);

        // Группируем по дням и считаем сумму
        $dailySummary = DailyFoodPhoto::selectRaw('
                photo_date,
                COUNT(*) as photos_count,
                SUM(estimated_calories) as total_calories
            ')
            ->where('user_id', $user->id)
            ->groupBy('photo_date')
            ->orderByDesc('photo_date')
            ->limit($limit)
            ->get();

        return ResponseHelper::json($response, array_map(function ($day) {
            return [
                'date' => $day->photo_date,
                'photos_count' => (int)$day->photos_count,
                'total_calories' => $day->total_calories !== null ? (int)$day->total_calories : 0,
            ];
        }, $dailySummary->all()));
    }

    /**
     * Удалить запись
     */
    public function delete(Request $request, Response $response, array $args): Response
    {
        $user = Auth::user($request);
        $id = (int)($args['id'] ?? 0);

        $photo = DailyFoodPhoto::where('user_id', $user->id)
            ->where('id', $id)
            ->first();

        if (!$photo) {
            return ResponseHelper::json($response, ['error' => 'Запись не найдена'], 404);
        }

        $photo->delete();

        return ResponseHelper::json($response, ['status' => 'ok']);
    }

    /**
     * Анализ фото с помощью AI
     */
    private function analyzePhoto(UploadedFileInterface $file, $user): array
    {
        if ($file->getError() !== UPLOAD_ERR_OK) {
            return ['error' => 'Не удалось загрузить фото', 'status' => 422];
        }

        $size = $file->getSize();
        if ($size !== null && $size > 5 * 1024 * 1024) {
            return ['error' => 'Фото должно быть меньше 5 МБ', 'status' => 422];
        }

        $mediaType = strtolower((string)$file->getClientMediaType());
        if ($mediaType !== '' && !preg_match('/^image\/(jpe?g|png|webp|heic|heif)$/', $mediaType)) {
            return ['error' => 'Допустимы только изображения JPG, PNG, WEBP или HEIC', 'status' => 422];
        }

        try {
            $stream = $file->getStream();
            $contents = $stream->getContents();
        } catch (\Throwable $e) {
            return ['error' => 'Не удалось прочитать фото: ' . $e->getMessage(), 'status' => 500];
        }

        if ($contents === '') {
            return ['error' => 'Загруженный файл пустой', 'status' => 422];
        }

        if ($mediaType === '') {
            $mediaType = 'image/jpeg';
        }

        $service = new OpenAiService();
        if (!$service->isConfigured()) {
            return ['error' => 'AI-сервисы не настроены. Укажите ключ OPENAI_API_KEY.', 'status' => 500];
        }

        $dataUrl = 'data:' . $mediaType . ';base64,' . base64_encode($contents);

        $messages = [
            [
                'role' => 'system',
                'content' => 'Ты — нутрициолог. Анализируй фото блюд и давай краткую оценку калорийности порции. Пиши по-русски.',
            ],
            [
                'role' => 'user',
                'content' => [
                    [
                        'type' => 'text',
                        'text' => 'Оцени примерную калорийность блюда на фото. Дай краткое описание. Ответь только JSON.',
                    ],
                    [
                        'type' => 'image_url',
                        'image_url' => ['url' => $dataUrl],
                    ],
                ],
            ],
        ];

        $schema = [
            'name' => 'food_analysis',
            'schema' => [
                'type' => 'object',
                'properties' => [
                    'title' => [
                        'type' => 'string',
                        'description' => 'Название блюда (кратко)',
                    ],
                    'description' => [
                        'type' => 'string',
                        'description' => 'Краткое описание блюда и состава',
                    ],
                    'calories' => [
                        'type' => ['integer', 'null'],
                        'description' => 'Примерная калорийность порции в ккал',
                    ],
                ],
                'required' => ['title', 'description'],
                'additionalProperties' => false,
            ],
        ];

        try {
            $raw = $service->chat($messages, [
                'temperature' => 0.2,
                'max_tokens' => 300,
                'response_format' => [
                    'type' => 'json_schema',
                    'json_schema' => $schema,
                ],
            ]);
        } catch (\Throwable $e) {
            return ['error' => 'Не удалось получить рекомендации: ' . $e->getMessage(), 'status' => 500];
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return ['error' => 'Не удалось обработать ответ модели', 'status' => 500];
        }

        SubscriptionService::recordAdviceUsage($user);

        return [
            'title' => $decoded['title'] ?? 'Блюдо',
            'description' => $decoded['description'] ?? '',
            'calories' => isset($decoded['calories']) && is_numeric($decoded['calories']) 
                ? (int)$decoded['calories'] 
                : null,
        ];
    }

    /**
     * @param array<int, DailyFoodPhoto> $photos
     * @return array<int, array<string, mixed>>
     */
    private function serializePhotos(array $photos): array
    {
        return array_map(fn($photo) => $this->serializePhoto($photo), $photos);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializePhoto(DailyFoodPhoto $photo): array
    {
        return [
            'id' => (int)$photo->id,
            'date' => $photo->photo_date instanceof \DateTimeInterface
                ? $photo->photo_date->format('Y-m-d')
                : $photo->photo_date,
            'time' => $photo->photo_time,
            'title' => $photo->title,
            'description' => $photo->description ?: null,
            'estimated_calories' => $photo->estimated_calories !== null 
                ? (int)$photo->estimated_calories 
                : null,
            'note' => $photo->note ?: null,
            'created_at' => $photo->created_at ?? null,
        ];
    }

    private function sanitizeDate(string $date): ?string
    {
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return $date;
        }
        return null;
    }
}
