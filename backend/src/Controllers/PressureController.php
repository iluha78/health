<?php
namespace App\Controllers;

use App\Models\PressureReading;
use App\Support\Auth;
use App\Support\ResponseHelper;
use DateTimeImmutable;
use Illuminate\Database\Eloquent\Collection;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class PressureController
{
    public function list(Request $request, Response $response): Response
    {
        $user = Auth::user($request);

        /** @var Collection<int, PressureReading> $readings */
        $readings = PressureReading::where('user_id', $user->id)
            ->orderByDesc('measured_at')
            ->orderByDesc('id')
            ->get();

        return ResponseHelper::json($response, $readings->toArray());
    }

    public function create(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        $data = (array) $request->getParsedBody();
        $payload = array_intersect_key($data, array_flip(['measured_at', 'systolic', 'diastolic', 'pulse', 'advice']));

        $errors = [];

        if (empty($payload['measured_at'])) {
            $errors['measured_at'] = 'Не указана дата и время измерения';
        } else {
            $dt = DateTimeImmutable::createFromFormat(DateTimeImmutable::ATOM, (string) $payload['measured_at'])
                ?: DateTimeImmutable::createFromFormat('Y-m-d H:i:s', (string) $payload['measured_at'])
                ?: DateTimeImmutable::createFromFormat('Y-m-d\TH:i:s', (string) $payload['measured_at']);

            if ($dt === false) {
                $errors['measured_at'] = 'Неверный формат даты и времени';
            } else {
                $payload['measured_at'] = $dt->format('Y-m-d H:i:s');
            }
        }

        foreach (['systolic', 'diastolic', 'pulse'] as $key) {
            if (!array_key_exists($key, $payload) || $payload[$key] === '' || $payload[$key] === null) {
                $errors[$key] = 'Поле обязательно для заполнения';
                continue;
            }

            if (!is_numeric($payload[$key])) {
                $errors[$key] = 'Значение должно быть числом';
                continue;
            }

            $payload[$key] = (int) $payload[$key];
        }

        if (!empty($errors)) {
            return ResponseHelper::json($response, ['errors' => $errors], 422);
        }

        $payload['user_id'] = $user->id;

        $reading = PressureReading::create($payload);

        return ResponseHelper::json($response, $reading->toArray(), 201);
    }
}
