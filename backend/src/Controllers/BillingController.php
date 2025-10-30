<?php
namespace App\Controllers;

use App\Services\SubscriptionException;
use App\Services\SubscriptionService;
use App\Support\Auth;
use App\Support\ResponseHelper;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class BillingController
{
    public function status(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        $status = SubscriptionService::billingStatus($user);

        return ResponseHelper::json($response, $status);
    }

    public function deposit(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        $data = (array) $request->getParsedBody();

        $amountCents = $this->parseAmountCents($data['amount'] ?? null);
        if ($amountCents === null) {
            return ResponseHelper::json($response, ['error' => 'Укажите сумму пополнения'], 422);
        }

        try {
            SubscriptionService::deposit($user, $amountCents);
        } catch (SubscriptionException $e) {
            return ResponseHelper::json($response, ['error' => $e->getMessage()], $e->getStatus());
        }

        $status = SubscriptionService::billingStatus($user);
        return ResponseHelper::json($response, $status, 201);
    }

    public function changePlan(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        $data = (array) $request->getParsedBody();

        $plan = strtolower(trim((string) ($data['plan'] ?? '')));
        if ($plan === '') {
            return ResponseHelper::json($response, ['error' => 'Выберите тариф'], 422);
        }

        try {
            SubscriptionService::changePlan($user, $plan);
        } catch (SubscriptionException $e) {
            return ResponseHelper::json($response, ['error' => $e->getMessage()], $e->getStatus());
        }

        $status = SubscriptionService::billingStatus($user);
        return ResponseHelper::json($response, $status);
    }

    private function parseAmountCents(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_string($value)) {
            $normalized = str_replace([' ', ','], ['', '.'], $value);
        } elseif (is_numeric($value)) {
            $normalized = (string) $value;
        } else {
            return null;
        }

        if (!is_numeric($normalized)) {
            return null;
        }

        $floatAmount = (float) $normalized;
        if ($floatAmount <= 0) {
            return null;
        }

        $cents = (int) round($floatAmount * 100);
        return $cents > 0 ? $cents : null;
    }
}
