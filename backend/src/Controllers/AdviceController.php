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
}
