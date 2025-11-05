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

class NutritionAdviceController
{
    /**
     * Получить консультации за определенный день
     */
    public function getDay(Request $request, Response $response, array $args): Response
    {
        $user = Auth::user($request);
        $date = $this->sanitizeDate($args['date'] ?? '');
        
        if (!$date) {
            return ResponseHelper::json($response, ['error' => 'Некорректная дата'], 422);
        }

        $advices = NutritionAdvice::where('user_id', $user->id)
            ->where('advice_date', $date)
            ->orderByDesc('created_at')
            ->get();

        return ResponseHelper::json($response, [
            'date' => $date,
            'advices' => $this->serializeAdvices($advices->all()),
            'count' => $advices->count(),
        ]);
    }

    /**
     * Создать консультацию
     */
    public function create(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        $profile = Profile::find($user->id);
        $latestLipid = Lipid::where('user_id', $user->id)
            ->orderByDesc('dt')
            ->first();

        $data = (array) $request->getParsedBody();
        $focus = trim((string) ($data['focus'] ?? ''));
        $date = $this->sanitizeDate($data['date'] ?? date('Y-m-d'));

        if (!$date) {
            return ResponseHelper::json($response, ['error' => 'Некорректная дата'], 422);
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
            'advice_date' => $date,
            'focus' => $focus !== '' ? $focus : null,
            'advice' => $advice,
        ]);
        
        SubscriptionService::recordAdviceUsage($user);
        $record->refresh();

        return ResponseHelper::json($response, [
            'advice' => $advice,
            'record' => $this->serializeAdvice($record),
        ], 201);
    }

    /**
     * Получить историю консультаций (по дням)
     */
    public function history(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        $params = $request->getQueryParams();
        $limit = min((int)($params['limit'] ?? 30), 90);

        // Группируем по дням
        $dailySummary = NutritionAdvice::selectRaw('
                advice_date,
                COUNT(*) as advices_count
            ')
            ->where('user_id', $user->id)
            ->groupBy('advice_date')
            ->orderByDesc('advice_date')
            ->limit($limit)
            ->get();

        return ResponseHelper::json($response, array_map(function ($day) {
            return [
                'date' => $day->advice_date,
                'advices_count' => (int)$day->advices_count,
            ];
        }, $dailySummary->all()));
    }

    /**
     * Удалить консультацию
     */
    public function delete(Request $request, Response $response, array $args): Response
    {
        $user = Auth::user($request);
        $id = (int)($args['id'] ?? 0);

        $advice = NutritionAdvice::where('user_id', $user->id)
            ->where('id', $id)
            ->first();

        if (!$advice) {
            return ResponseHelper::json($response, ['error' => 'Запись не найдена'], 404);
        }

        $advice->delete();

        return ResponseHelper::json($response, ['status' => 'ok']);
    }

    /**
     * @param array<int, NutritionAdvice> $advices
     * @return array<int, array<string, mixed>>
     */
    private function serializeAdvices(array $advices): array
    {
        return array_map(fn($advice) => $this->serializeAdvice($advice), $advices);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeAdvice(NutritionAdvice $advice): array
    {
        return [
            'id' => (int) $advice->id,
            'date' => $advice->advice_date instanceof \DateTimeInterface
                ? $advice->advice_date->format('Y-m-d')
                : $advice->advice_date,
            'focus' => $advice->focus ?: null,
            'advice' => $advice->advice,
            'created_at' => $advice->created_at instanceof \DateTimeInterface
                ? $advice->created_at->format(DATE_ATOM)
                : ($advice->created_at ?: null),
        ];
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

    private function sanitizeDate(string $date): ?string
    {
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return $date;
        }
        return null;
    }
}
