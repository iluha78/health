<?php
namespace App\Controllers;

use App\Models\Lipid;
use App\Models\NutritionAdvice;
use App\Models\NutritionPhotoEstimate;
use App\Models\Profile;
use App\Services\OpenAiService;
use App\Services\SubscriptionException;
use App\Services\SubscriptionService;
use App\Support\Auth;
use App\Support\Localization;
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
        $language = Localization::normalize($data['language'] ?? null);

        $weight = $this->parseFloat($data['weight'] ?? null);
        $height = $this->parseInt($data['height'] ?? null);
        $calories = $this->parseInt($data['calories'] ?? null);
        $activity = $this->sanitizeString($data['activity'] ?? '');
        $question = $this->sanitizeString($data['question'] ?? '', 500);
        $comment = $this->sanitizeString($data['comment'] ?? '', 500);

        $focusParts = [];
        if ($weight !== null) {
            $focusParts[] = sprintf('Вес: %s кг', $this->formatNumber($weight));
        }
        if ($height !== null) {
            $focusParts[] = sprintf('Рост: %d см', $height);
        }
        if ($calories !== null) {
            $focusParts[] = sprintf('Цель по калориям: %d ккал', $calories);
        }
        if ($activity !== '') {
            $focusParts[] = 'Уровень активности: ' . $activity;
        }
        if ($question !== '') {
            $focusParts[] = 'Вопрос пользователя: ' . $question;
        }
        if ($comment !== '') {
            $focusParts[] = 'Комментарий: ' . $comment;
        }

        $focus = implode("\n", $focusParts);

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
                    'content' => $this->nutritionSystemPrompt($language),
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

        NutritionAdvice::create([
            'user_id'       => $user->id,
            'weight_kg'     => $weight,
            'height_cm'     => $height,
            'calories_goal' => $calories,
            'activity'      => $activity !== '' ? $activity : null,
            'focus'         => $focus !== '' ? $focus : null,
            'question'      => $question !== '' ? $question : null,
            'comment'       => $comment !== '' ? $comment : null,
            'advice'        => $advice,
        ]);
        SubscriptionService::recordAdviceUsage($user);

        $history = NutritionAdvice::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return ResponseHelper::json($response, [
            'advice'  => $advice,
            'history' => $this->serializeHistory($history->all()),
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

        $data = (array) $request->getParsedBody();
        $language = Localization::normalize($data['language'] ?? null);
        $description = '';
        if (isset($data['description']) && is_string($data['description'])) {
            $description = trim($data['description']);
        }

        $files = $request->getUploadedFiles();
        $originalName = null;
        if (isset($files['photo']) && $files['photo'] instanceof UploadedFileInterface) {
            $originalName = $files['photo']->getClientFilename();
        }

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

        $prompt = $this->nutritionPhotoUserPrompt($language);
        if ($description !== '') {
            $prompt .= "\n\nДополнительное описание блюда: " . $description;
        }

        $messages = [
            [
                'role' => 'system',
                'content' => $this->nutritionPhotoSystemPrompt($language),
            ],
            [
                'role' => 'user',
                'content' => [
                    [
                        'type' => 'text',
                        'text' => $prompt,
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
            ], 502);
        }

        $decoded = $this->parseNutritionPhotoJson($raw, $debug, $log);
        if ($decoded === null) {
            return ResponseHelper::json($response, [
                'error' => 'Не удалось обработать ответ модели',
                'debug' => $debug,
            ], 422);
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

        try {
            SubscriptionService::recordAdviceUsage($user);

            NutritionPhotoEstimate::create([
                'user_id' => $user->id,
                'calories' => $calories,
                'confidence' => $confidence,
                'notes' => $notes,
                'description' => $description !== '' ? $description : null,
                'ingredients' => $ingredients,
                'original_filename' => $originalName ?: null,
            ]);

            $history = NutritionPhotoEstimate::where('user_id', $user->id)
                ->orderByDesc('created_at')
                ->limit(20)
                ->get();
        } catch (\Throwable $e) {
            $log(sprintf('storage error: %s', $e->getMessage()));
            return ResponseHelper::json($response, [
                'error' => 'Не удалось сохранить результат анализа',
                'debug' => $debug,
            ], 500);
        }

        $log(sprintf('success calories=%s confidence=%s ingredients=%d',
            $calories === null ? 'null' : (string) $calories,
            $confidence ?? 'null',
            count($ingredients)
        ));

        return ResponseHelper::json($response, [
            'calories' => $calories,
            'confidence' => $confidence,
            'notes' => $notes,
            'description' => $description !== '' ? $description : null,
            'ingredients' => $ingredients,
            'debug' => $debug,
            'history' => $this->serializePhotoHistory($history->all()),
        ]);
    }

    public function nutritionPhotoHistory(Request $request, Response $response): Response
    {
        $user = Auth::user($request);

        $records = NutritionPhotoEstimate::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        return ResponseHelper::json($response, $this->serializePhotoHistory($records->all()));
    }

    public function deleteNutritionPhoto(Request $request, Response $response, array $args): Response
    {
        $user = Auth::user($request);
        $id = isset($args['id']) ? (int) $args['id'] : 0;
        if ($id <= 0) {
            return ResponseHelper::json($response, ['error' => 'Запись не найдена'], 404);
        }

        $record = NutritionPhotoEstimate::where('user_id', $user->id)
            ->where('id', $id)
            ->first();

        if ($record === null) {
            return ResponseHelper::json($response, ['error' => 'Запись не найдена'], 404);
        }

        $record->delete();

        return ResponseHelper::json($response, ['status' => 'ok']);
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
        return array_map(function (NutritionAdvice $advice): array {
            return [
                'id'         => (int) $advice->id,
                'weight'     => $advice->weight_kg !== null ? $this->formatNumber($advice->weight_kg) : '',
                'height'     => $advice->height_cm !== null ? (string) $advice->height_cm : '',
                'calories'   => $advice->calories_goal !== null ? (string) $advice->calories_goal : '',
                'activity'   => $advice->activity ?: '',
                'question'   => $advice->question ?: '',
                'comment'    => $advice->comment ?: '',
                'advice'     => $advice->advice,
                'created_at' => $advice->created_at instanceof \DateTimeInterface
                    ? $advice->created_at->format(DATE_ATOM)
                    : ($advice->created_at ?: null),
            ];
        }, $records);
    }

    /**
     * @param array<int, NutritionPhotoEstimate> $records
     * @return array<int, array<string, mixed>>
     */
    private function serializePhotoHistory(array $records): array
    {
        return array_map(static function (NutritionPhotoEstimate $analysis): array {
            return [
                'id' => (int) $analysis->id,
                'calories' => $analysis->calories !== null ? (float) $analysis->calories : null,
                'confidence' => $analysis->confidence ?: null,
                'notes' => $analysis->notes ?: '',
                'description' => $analysis->description ?: '',
                'ingredients' => $analysis->ingredients ?: [],
                'file_name' => $analysis->original_filename ?: null,
                'created_at' => $analysis->created_at instanceof \DateTimeInterface
                    ? $analysis->created_at->format(DATE_ATOM)
                    : ($analysis->created_at ?: null),
            ];
        }, $records);
    }

    private function nutritionSystemPrompt(string $language): string
    {
        $prompts = [
            'ru' => 'Ты — российский врач-диетолог. Дай практичные советы по снижению холестерина на русском языке. Дай список шагов, пример дневного меню и напомни об ограничениях насыщенных жиров.',
            'en' => 'You are a nutritionist. Provide practical tips for lowering cholesterol. Share a step-by-step plan, a sample daily menu, and remind about limits on saturated fats. Respond in English.',
            'de' => 'Du bist Ernährungsberater. Gib praktische Tipps zur Senkung des Cholesterins. Teile einen Maßnahmenplan, ein Beispiel für einen Tagesplan und erinnere an Grenzen für gesättigte Fette. Antworte auf Deutsch.',
            'es' => 'Eres nutricionista. Ofrece consejos prácticos para reducir el colesterol. Incluye pasos concretos, un ejemplo de menú diario y recuerda los límites de grasas saturadas. Responde en español.',
        ];

        return $prompts[$language] ?? $prompts['ru'];
    }

    private function nutritionPhotoSystemPrompt(string $language): string
    {
        $prompts = [
            'ru' => 'Ты — нутрициолог. Анализируй фото блюд и давай сдержанные оценки калорийности порции. Пиши по-русски, добавляй дисклеймер об ориентировочности.',
            'en' => 'You are a nutritionist. Analyze food photos and provide cautious calorie estimates per portion. Respond in English and include a disclaimer about approximate values.',
            'de' => 'Du bist Ernährungsberater. Analysiere Essensfotos und gib vorsichtige Kalorien-Schätzungen pro Portion. Antworte auf Deutsch und füge einen Hinweis auf die Ungefähre hinzu.',
            'es' => 'Eres nutricionista. Analiza fotos de comida y ofrece estimaciones prudentes de calorías por porción. Responde en español e incluye una nota de que los valores son aproximados.',
        ];

        return $prompts[$language] ?? $prompts['ru'];
    }

    private function nutritionPhotoUserPrompt(string $language): string
    {
        $prompts = [
            'ru' => 'Оцени примерную калорийность блюда на фото. Если блюдо сложно распознать, опиши сомнения. Ответь только JSON.',
            'en' => 'Estimate the approximate calories of the dish in the photo. If the dish is hard to recognize, describe the uncertainty. Reply with JSON only.',
            'de' => 'Schätze die ungefähre Kalorienmenge des Gerichts auf dem Foto. Wenn das Gericht schwer zu erkennen ist, beschreibe die Unsicherheit. Antworte nur mit JSON.',
            'es' => 'Estima las calorías aproximadas del plato de la foto. Si es difícil identificar el plato, describe las dudas. Responde solo con JSON.',
        ];

        return $prompts[$language] ?? $prompts['ru'];
    }

    /**
     * @param array<int, string> $debug
     * @param callable(string):void $logger
     * @return array<string, mixed>|null
     */
    private function parseNutritionPhotoJson(string $raw, array &$debug, callable $logger): ?array
    {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $decoded;
        }

        $logger(sprintf('failed to decode response: %s', substr($raw, 0, 200)));

        if (preg_match('/\{.*\}/s', $raw, $matches)) {
            $jsonCandidate = $matches[0];
            $decoded = json_decode($jsonCandidate, true);
            if (is_array($decoded)) {
                $debug[] = '[nutritionPhoto] recovered json from text output';
                return $decoded;
            }
        }

        return null;
    }

    private function formatValue($value): string
    {
        if ($value === null || $value === '') {
            return '—';
        }
        return rtrim(rtrim(number_format((float) $value, 2, '.', ''), '0'), '.');
    }

    private function formatNumber(float $value): string
    {
        return rtrim(rtrim(number_format($value, 2, '.', ''), '0'), '.');
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

    private function parseFloat($value): ?float
    {
        if ($value === null) {
            return null;
        }
        if (is_numeric($value)) {
            return (float) $value;
        }
        if (is_string($value)) {
            $normalized = str_replace(',', '.', trim($value));
            return is_numeric($normalized) ? (float) $normalized : null;
        }
        return null;
    }

    private function parseInt($value): ?int
    {
        if ($value === null) {
            return null;
        }
        if (is_int($value)) {
            return $value;
        }
        if (is_numeric($value)) {
            return (int) round((float) $value);
        }
        if (is_string($value)) {
            $normalized = preg_replace('/[^0-9\-\.]/', '', $value ?? '');
            if ($normalized === '' || !is_numeric($normalized)) {
                return null;
            }
            return (int) round((float) $normalized);
        }
        return null;
    }

    private function sanitizeString($value, int $maxLength = 190): string
    {
        if (!is_string($value)) {
            return '';
        }
        $trimmed = trim($value);
        if ($trimmed === '') {
            return '';
        }
        if (mb_strlen($trimmed) > $maxLength) {
            return mb_substr($trimmed, 0, $maxLength);
        }
        return $trimmed;
    }
}
