<?php
namespace App\Controllers;

use App\Models\Lipid;
use App\Models\NutritionAdvice;
use App\Models\Profile;
use App\Services\OpenAiService;
use App\Services\SubscriptionException;
use App\Services\SubscriptionService;
use App\Support\Auth;
use App\Support\ResponseHelper;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\UploadedFileInterface;

class AdviceController
{
    public function nutrition(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        $profile = Profile::find($user->id);
        $latestLipid = Lipid::where('user_id', $user->id)
            ->orderByDesc('dt')
            ->first();

        $data = (array) $request->getParsedBody();
        $focus = trim((string) ($data['focus'] ?? ''));

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

        $profileSummary = $profile ? sprintf(
            "Пол: %s, возраст: %s, рост: %s см, вес: %s кг, активность: %s. Цели: калории %s ккал, насыщенные жиры %s г, клетчатка %s г.",
            $profile->sex ?: 'не указан',
            $profile->age ?: 'не указан',
            $profile->height_cm ?: 'не указан',
            $profile->weight_kg ?: 'не указан',
            $this->activityLabel($profile->activity),
            $profile->kcal_goal ?: 'не указано',
            $profile->sfa_limit_g ?: 'не указано',
            $profile->fiber_goal_g ?: 'не указано',
        ) : 'Профиль пользователя отсутствует.';

        $lipidSummary = $latestLipid ? sprintf(
            "Последние липиды от %s: общий холестерин %s ммоль/л, HDL %s, LDL %s, триглицериды %s.",
            $latestLipid->dt,
            $this->formatValue($latestLipid->chol),
            $this->formatValue($latestLipid->hdl),
            $this->formatValue($latestLipid->ldl),
            $this->formatValue($latestLipid->trig)
        ) : 'Нет сохранённых липидных анализов.';

        $userPrompt = $profileSummary . "\n" . $lipidSummary;
        if ($focus !== '') {
            $userPrompt .= "\nДополнительный запрос пользователя: " . $focus;
        }

        try {
            $advice = $service->chat([
                [
                    'role' => 'system',
                    'content' => 'Ты — российский врач-диетолог. Дай практичные советы по снижению холестерина на русском языке. Дай список шагов, пример дневного меню и напомни об ограничениях насыщенных жиров.',
                ],
                [
                    'role' => 'user',
                    'content' => $userPrompt,
                ],
            ], [
                'temperature' => 0.3,
                'max_tokens' => 600,
            ]);
        } catch (\Throwable $e) {
            return ResponseHelper::json($response, [
                'error' => 'Не удалось получить рекомендации: ' . $e->getMessage(),
            ], 500);
        }

        $record = NutritionAdvice::create([
            'user_id' => $user->id,
            'focus'   => $focus !== '' ? $focus : null,
            'advice'  => $advice,
        ]);
        SubscriptionService::recordAdviceUsage($user);
        $record->refresh();

        return ResponseHelper::json($response, [
            'advice'  => $advice,
            'history' => $this->serializeHistory([$record]),
        ]);
    }

    public function nutritionPhoto(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        $variant = $request->getAttribute('variant');
        $variantLabel = is_string($variant) && $variant !== '' ? $variant : 'default';

        $debug = [];
        $log = function (string $message) use (&$debug, $user): void {
            $entry = sprintf('[nutritionPhoto] user_id=%d %s', $user->id, $message);
            $debug[] = $entry;
            error_log($entry);
        };

        if ($variantLabel !== 'default' && $variantLabel !== 'analyze') {
            $log(sprintf('unknown variant=%s', $variantLabel));
            return ResponseHelper::json($response, [
                'error' => 'Not found.',
                'debug' => $debug,
            ], 404);
        }

        $log(sprintf('start request variant=%s', $variantLabel));

        try {
            SubscriptionService::ensureAdviceAccess($user);
        } catch (SubscriptionException $e) {
            $log(sprintf('subscription error: %s', $e->getMessage()));
            return ResponseHelper::json($response, [
                'error' => $e->getMessage(),
                'debug' => $debug,
            ], $e->getStatus());
        }

        $files = $request->getUploadedFiles();
        $photo = $this->extractPhotoFile($files['photo'] ?? null);
        if (isset($photo['error'])) {
            /** @var array{error: string, status: int} $photo */
            $log(sprintf('photo validation failed: %s', $photo['error']));
            return ResponseHelper::json($response, [
                'error' => $photo['error'],
                'debug' => $debug,
            ], $photo['status']);
        }

        /** @var array{contents: string, media_type: string} $photo */
        $imageBinary = $photo['contents'];
        $mediaType = $photo['media_type'];

        $log(sprintf('photo size=%d bytes', strlen($imageBinary)));
        if ($mediaType !== '') {
            $log(sprintf('photo media_type=%s', $mediaType));
        }

        $service = new OpenAiService();
        if (!$service->isConfigured()) {
            $log('openai not configured');
            return ResponseHelper::json($response, [
                'error' => 'AI-сервисы не настроены. Укажите ключ OPENAI_API_KEY.',
                'debug' => $debug,
            ], 500);
        }

        $dataUrl = 'data:' . $mediaType . ';base64,' . base64_encode($imageBinary);

        $messages = [
            [
                'role' => 'system',
                'content' => 'Ты — нутрициолог. Анализируй фото блюд и давай сдержанные оценки ' .
                    'калорийности порции. Пиши по-русски, добавляй дисклеймер об ориентировочности.',
            ],
            [
                'role' => 'user',
                'content' => [
                    [
                        'type' => 'text',
                        'text' => 'Оцени примерную калорийность блюда на фото. ' .
                            'Если блюдо сложно распознать, опиши сомнения. Ответь только JSON.',
                    ],
                    [
                        'type' => 'image_url',
                        'image_url' => ['url' => $dataUrl],
                    ],
                ],
            ],
        ];

        $schema = [
            'name' => 'calorie_estimate',
            'schema' => [
                'type' => 'object',
                'properties' => [
                    'calories' => [
                        'type' => ['number', 'null'],
                        'description' => 'Оценка калорийности порции в килокалориях',
                    ],
                    'confidence' => [
                        'type' => ['string', 'null'],
                        'description' => 'Краткое описание уверенности в оценке',
                    ],
                    'notes' => [
                        'type' => 'string',
                        'description' => 'Комментарий и дисклеймер для пользователя',
                    ],
                    'ingredients' => [
                        'type' => 'array',
                        'items' => ['type' => 'string'],
                        'description' => 'Список предполагаемых ингредиентов',
                    ],
                ],
                'required' => ['notes'],
                'additionalProperties' => false,
            ],
        ];

        try {
            $raw = $service->chat($messages, [
                'temperature' => 0.2,
                'max_tokens' => 400,
                'response_format' => [
                    'type' => 'json_schema',
                    'json_schema' => $schema,
                ],
            ]);
        } catch (\Throwable $e) {
            $log(sprintf('openai error: %s', $e->getMessage()));
            return ResponseHelper::json($response, [
                'error' => 'Не удалось получить рекомендации: ' . $e->getMessage(),
                'debug' => $debug,
            ], 500);
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            $log(sprintf('failed to decode response: %s', substr($raw, 0, 200)));
            return ResponseHelper::json($response, [
                'error' => 'Не удалось обработать ответ модели',
                'debug' => $debug,
            ], 500);
        }

        $calories = null;
        if (isset($decoded['calories']) && is_numeric($decoded['calories'])) {
            $calories = (float) $decoded['calories'];
        }

        $confidence = null;
        if (isset($decoded['confidence']) && is_string($decoded['confidence'])) {
            $confidence = trim($decoded['confidence']);
            if ($confidence === '') {
                $confidence = null;
            }
        }

        $notes = '';
        if (isset($decoded['notes']) && is_string($decoded['notes'])) {
            $notes = trim($decoded['notes']);
        }

        $ingredients = [];
        if (isset($decoded['ingredients']) && is_array($decoded['ingredients'])) {
            foreach ($decoded['ingredients'] as $item) {
                if (is_string($item) && $item !== '') {
                    $ingredients[] = $item;
                }
            }
        }

        SubscriptionService::recordAdviceUsage($user);

        $log(sprintf('success calories=%s confidence=%s ingredients=%d',
            $calories === null ? 'null' : (string) $calories,
            $confidence ?? 'null',
            count($ingredients)
        ));

        return ResponseHelper::json($response, [
            'calories' => $calories,
            'confidence' => $confidence,
            'notes' => $notes,
            'ingredients' => $ingredients,
            'debug' => $debug,
        ]);
    }

    public function general(Request $request, Response $response): Response
    {
        $user = Auth::user($request);

        $data = (array) $request->getParsedBody();
        $prompt = trim((string) ($data['prompt'] ?? ''));
        if ($prompt === '') {
            return ResponseHelper::json($response, ['error' => 'Опишите вопрос для получения совета'], 422);
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

        try {
            $advice = $service->chat([
                [
                    'role' => 'system',
                    'content' => 'Ты — заботливый российский врач. Дай практичные, безопасные и основанные на фактах советы по ' .
                        'здоровью. Всегда напоминай о необходимости обратиться к врачу при тревожных симптомах.',
                ],
                [
                    'role' => 'user',
                    'content' => $prompt,
                ],
            ], [
                'temperature' => 0.4,
                'max_tokens' => 700,
            ]);
        } catch (\Throwable $e) {
            return ResponseHelper::json($response, [
                'error' => 'Не удалось получить рекомендации: ' . $e->getMessage(),
            ], 500);
        }

        SubscriptionService::recordAdviceUsage($user);

        return ResponseHelper::json($response, [
            'advice' => $advice,
        ]);
    }

    public function history(Request $request, Response $response): Response
    {
        $user = Auth::user($request);

        $records = NutritionAdvice::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return ResponseHelper::json($response, $this->serializeHistory($records->all()));
    }

    /**
     * @param array<int, NutritionAdvice> $records
     * @return array<int, array<string, mixed>>
     */
    private function serializeHistory(array $records): array
    {
        return array_map(static function (NutritionAdvice $advice): array {
            return [
                'id'         => (int) $advice->id,
                'focus'      => $advice->focus ?: null,
                'advice'     => $advice->advice,
                'created_at' => $advice->created_at instanceof \DateTimeInterface
                    ? $advice->created_at->format(DATE_ATOM)
                    : ($advice->created_at ?: null),
            ];
        }, $records);
    }

    private function formatValue($value): string
    {
        if ($value === null || $value === '') {
            return '—';
        }
        return rtrim(rtrim(number_format((float) $value, 2, '.', ''), '0'), '.');
    }

    private function activityLabel(?string $activity): string
    {
        return match ($activity) {
            'sed' => 'минимальная',
            'light' => 'лёгкая',
            'mod' => 'средняя',
            'high' => 'высокая',
            'ath' => 'спортивная',
            default => 'не указана',
        };
    }

    /**
     * @return array{contents: string, media_type: string}|array{error: string, status: int}
     */
    private function extractPhotoFile(?UploadedFileInterface $file): array
    {
        if ($file === null) {
            return ['error' => 'Добавьте фото блюда', 'status' => 422];
        }

        if ($file->getError() !== UPLOAD_ERR_OK) {
            return ['error' => 'Не удалось загрузить фото', 'status' => 422];
        }

        $size = $file->getSize();
        if ($size !== null && $size > 5 * 1024 * 1024) {
            return ['error' => 'Фото должно быть меньше 5 МБ', 'status' => 422];
        }

        $mediaType = strtolower((string) $file->getClientMediaType());
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

        return ['contents' => $contents, 'media_type' => $mediaType];
    }
}
