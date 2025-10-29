<?php
namespace App\Services;

use App\Models\User;

class SubscriptionService
{
    public const PLAN_FREE = 'free';
    public const PLAN_ADVISOR = 'advisor';
    public const PLAN_PREMIUM = 'premium';

    public const MONTHLY_BUDGET_CENTS = 500; // $5
    public const COST_ADVICE_CENTS = 100; // $1 per advice request
    public const COST_ASSISTANT_CENTS = 150; // $1.50 per assistant chat

    /**
     * @var array<string, array<string, mixed>>
     */
    private const PLANS = [
        self::PLAN_FREE => [
            'label' => 'Бесплатный',
            'monthly_fee_cents' => 0,
            'allows_advice' => false,
            'allows_assistant' => false,
        ],
        self::PLAN_ADVISOR => [
            'label' => 'Советы',
            'monthly_fee_cents' => 1000,
            'allows_advice' => true,
            'allows_assistant' => false,
        ],
        self::PLAN_PREMIUM => [
            'label' => 'Премиум',
            'monthly_fee_cents' => 2000,
            'allows_advice' => true,
            'allows_assistant' => true,
        ],
    ];

    public static function currentCycleDate(): string
    {
        return (new \DateTimeImmutable('first day of this month midnight'))->format('Y-m-01');
    }

    public static function prepareCycle(User $user): void
    {
        $current = self::currentCycleDate();
        $storedValue = $user->ai_cycle_started_at;
        if ($storedValue instanceof \DateTimeInterface) {
            $stored = $storedValue->format('Y-m-01');
        } elseif ($storedValue) {
            $stored = (new \DateTimeImmutable((string) $storedValue))->format('Y-m-01');
        } else {
            $stored = null;
        }
        if ($stored === $current) {
            return;
        }

        $user->ai_cycle_started_at = $current;
        $user->ai_cycle_requests = 0;
        $user->ai_cycle_spent_cents = 0;
        $user->ai_cycle_advice_requests = 0;
        $user->ai_cycle_assistant_requests = 0;
        $user->save();
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public static function plans(): array
    {
        return self::PLANS;
    }

    /**
     * @return array<string, mixed>
     */
    public static function planInfo(string $plan): array
    {
        return self::PLANS[$plan] ?? self::PLANS[self::PLAN_FREE];
    }

    public static function ensureAdviceAccess(User $user): void
    {
        self::prepareCycle($user);
        $plan = self::planInfo($user->plan ?? self::PLAN_FREE);
        if (empty($plan['allows_advice'])) {
            throw new SubscriptionException('Ваш тариф не включает AI-советы. Обновите тариф, чтобы продолжить.', 403);
        }

        $cost = self::COST_ADVICE_CENTS;
        if ($user->balance_cents < $cost) {
            throw new SubscriptionException('Недостаточно средств на балансе. Пополните счёт, чтобы получить совет.', 402);
        }

        if ($user->ai_cycle_spent_cents + $cost > self::MONTHLY_BUDGET_CENTS) {
            throw new SubscriptionException('Достигнут месячный лимит расходов на AI. Попробуйте в следующем месяце.', 429);
        }
    }

    public static function recordAdviceUsage(User $user): void
    {
        self::prepareCycle($user);
        $cost = self::COST_ADVICE_CENTS;
        $user->balance_cents -= $cost;
        $user->ai_cycle_spent_cents += $cost;
        $user->ai_cycle_requests += 1;
        $user->ai_cycle_advice_requests += 1;
        $user->save();
    }

    public static function ensureAssistantAccess(User $user): void
    {
        self::prepareCycle($user);
        $plan = self::planInfo($user->plan ?? self::PLAN_FREE);
        if (empty($plan['allows_assistant'])) {
            throw new SubscriptionException('Ваш тариф не включает AI-ассистента. Обновите тариф, чтобы продолжить.', 403);
        }

        $cost = self::COST_ASSISTANT_CENTS;
        if ($user->balance_cents < $cost) {
            throw new SubscriptionException('Недостаточно средств на балансе для запроса к ассистенту.', 402);
        }

        if ($user->ai_cycle_spent_cents + $cost > self::MONTHLY_BUDGET_CENTS) {
            throw new SubscriptionException('Достигнут месячный лимит расходов на AI. Попробуйте в следующем месяце.', 429);
        }
    }

    public static function recordAssistantUsage(User $user): void
    {
        self::prepareCycle($user);
        $cost = self::COST_ASSISTANT_CENTS;
        $user->balance_cents -= $cost;
        $user->ai_cycle_spent_cents += $cost;
        $user->ai_cycle_requests += 1;
        $user->ai_cycle_assistant_requests += 1;
        $user->save();
    }

    public static function deposit(User $user, int $amountCents): void
    {
        if ($amountCents <= 0) {
            throw new SubscriptionException('Сумма пополнения должна быть положительной.', 422);
        }

        if ($amountCents > 1_000_000) {
            throw new SubscriptionException('Сумма пополнения превышает допустимый предел.', 422);
        }

        $user->balance_cents += $amountCents;
        $user->save();
    }

    public static function changePlan(User $user, string $plan): void
    {
        $plan = strtolower($plan);
        if (!isset(self::PLANS[$plan])) {
            throw new SubscriptionException('Неизвестный тариф. Выберите один из предложенных планов.', 422);
        }

        if ($user->plan === $plan) {
            return;
        }

        $info = self::PLANS[$plan];
        $fee = (int) ($info['monthly_fee_cents'] ?? 0);
        if ($fee > 0 && $user->balance_cents < $fee) {
            throw new SubscriptionException('Недостаточно средств для подключения выбранного тарифа.', 402);
        }

        if ($fee > 0) {
            $user->balance_cents -= $fee;
        }

        $user->plan = $plan;
        self::prepareCycle($user);
        $user->save();
    }

    /**
     * @return array<string, mixed>
     */
    public static function billingStatus(User $user): array
    {
        self::prepareCycle($user);
        $plan = self::planInfo($user->plan ?? self::PLAN_FREE);
        $balanceCents = (int) $user->balance_cents;
        $spent = (int) $user->ai_cycle_spent_cents;
        $remaining = self::MONTHLY_BUDGET_CENTS - $spent;

        $availablePlans = [];
        foreach (self::PLANS as $code => $data) {
            $availablePlans[] = [
                'code' => $code,
                'label' => $data['label'],
                'monthly_fee_cents' => (int) ($data['monthly_fee_cents'] ?? 0),
                'features' => [
                    'advice' => (bool) ($data['allows_advice'] ?? false),
                    'assistant' => (bool) ($data['allows_assistant'] ?? false),
                ],
            ];
        }

        return [
            'plan' => $user->plan ?? self::PLAN_FREE,
            'plan_label' => (string) ($plan['label'] ?? ''),
            'monthly_fee_cents' => (int) ($plan['monthly_fee_cents'] ?? 0),
            'balance_cents' => $balanceCents,
            'balance' => self::formatCents($balanceCents),
            'currency' => 'USD',
            'features' => [
                'advice' => (bool) ($plan['allows_advice'] ?? false),
                'assistant' => (bool) ($plan['allows_assistant'] ?? false),
            ],
            'ai_usage' => [
                'month_started_at' => $user->ai_cycle_started_at instanceof \DateTimeInterface
                    ? $user->ai_cycle_started_at->format('Y-m-01')
                    : ($user->ai_cycle_started_at ? (new \DateTimeImmutable((string) $user->ai_cycle_started_at))->format('Y-m-01') : null),
                'budget_cents' => self::MONTHLY_BUDGET_CENTS,
                'spent_cents' => $spent,
                'remaining_cents' => max(0, $remaining),
                'requests' => (int) $user->ai_cycle_requests,
                'advice_requests' => (int) $user->ai_cycle_advice_requests,
                'assistant_requests' => (int) $user->ai_cycle_assistant_requests,
            ],
            'costs' => [
                'advice_cents' => self::COST_ADVICE_CENTS,
                'assistant_cents' => self::COST_ASSISTANT_CENTS,
            ],
            'plans' => $availablePlans,
        ];
    }

    private static function formatCents(int $cents): string
    {
        return number_format($cents / 100, 2, '.', '');
    }
}
