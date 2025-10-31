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

        if ($variantLabel !== 'default' && $variantLabel !== 'analyze') {
            error_log(sprintf('[nutritionPhoto] user_id=%d unknown variant=%s', $user->id, $variantLabel));
            return ResponseHelper::json($response, ['error' => 'Not found.'], 404);
        }

        error_log(sprintf('[nutritionPhoto] user_id=%d start request variant=%s', $user->id, $variantLabel));

        try {
            SubscriptionService::ensureAdviceAccess($user);
        } catch (SubscriptionException $e) {
            error_log(sprintf('[nutritionPhoto] user_id=%d subscription error: %s', $user->id, $e->getMessage()));
            return ResponseHelper::json($response, ['error' => $e->getMessage()], $e->getStatus());
        }

        $files = $request->getUploadedFiles();
        $photo = $this->extractPhotoFile($files['photo'] ?? null);
        if (isset($photo['error'])) {
            /** @var array{error: string, status: int} $photo */
            error_log(sprintf('[nutritionPhoto] user_id=%d photo validation failed: %s', $user->id, $photo['error']));
            return ResponseHelper::json($response, ['error' => $photo['error']], $photo['status']);
        }

        /** @var array{contents: string} $photo */
        $imageBinary = $photo['contents'];

        error_log(sprintf('[nutritionPhoto] user_id=%d photo size=%d bytes', $user->id, strlen($imageBinary)));

        $service = new OpenAiService();
        if (!$service->isConfigured()) {
            error_log(sprintf('[nutritionPhoto] user_id=%d openai not configured', $user->id));
            return ResponseHelper::json($response, [
                'error' => 'AI-сервисы не настроены. Укажите ключ OPENAI_API_KEY.',
            ], 500);
        }

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
                        'type' => 'input_text',
                        'text' => 'Оцени примерную калорийность блюда на фото. ' .
                            'Если блюдо сложно распознать, опиши сомнения. Ответь только JSON.',
                    ],
                    [
                        'type' => 'input_image',
                        'image_base64' => base64_encode($imageBinary),
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
            error_log(sprintf('[nutritionPhoto] user_id=%d openai error: %s', $user->id, $e->getMessage()));
            return ResponseHelper::json($response, [
                'error' => 'Не удалось получить рекомендации: ' . $e->getMessage(),
            ], 500);
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            error_log(sprintf('[nutritionPhoto] user_id=%d failed to decode response: %s', $user->id, substr($raw, 0, 200)));
            return ResponseHelper::json($response, [
                'error' => 'Не удалось обработать ответ модели',
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

        error_log(sprintf('[nutritionPhoto] user_id=%d success calories=%s confidence=%s ingredients=%d',
            $user->id,
            $calories === null ? 'null' : (string) $calories,
            $confidence ?? 'null',
            count($ingredients)
        ));

        return ResponseHelper::json($response, [
            'calories' => $calories,
            'confidence' => $confidence,
            'notes' => $notes,
            'ingredients' => $ingredients,
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
     * @return array{contents: string}|array{error: string, status: int}
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

        return ['contents' => $contents];
    }
}
