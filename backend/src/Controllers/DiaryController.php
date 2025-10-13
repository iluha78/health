<?php
namespace App\Controllers;

use App\Models\DiaryDay;
use App\Models\DiaryItem;
use App\Models\Food;
use App\Support\Auth;
use App\Support\ResponseHelper;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class DiaryController
{
    public function getDay(Request $request, Response $response, array $args): Response
    {
        $user = Auth::user($request);
        $date = $this->sanitizeDate($args['date'] ?? '');
        if (!$date) {
            return ResponseHelper::json($response, ['error' => 'Некорректная дата'], 422);
        }

        $day = DiaryDay::firstOrCreate(
            ['user_id' => $user->id, 'd' => $date]
        );
        $day->load('items.food');

        $items = $day->items->map(function (DiaryItem $item) {
            return [
                'id'    => $item->id,
                'grams' => $item->grams,
                'note'  => $item->note,
                'food'  => $item->food ? $item->food->toArray() : null,
            ];
        });

        return ResponseHelper::json($response, [
            'date'  => $day->d,
            'items' => $items,
        ]);
    }

    public function addItem(Request $request, Response $response, array $args): Response
    {
        $user = Auth::user($request);
        $date = $this->sanitizeDate($args['date'] ?? '');
        if (!$date) {
            return ResponseHelper::json($response, ['error' => 'Некорректная дата'], 422);
        }

        $data = (array) $request->getParsedBody();
        $foodId = (int) ($data['food_id'] ?? 0);
        $grams = (int) ($data['grams'] ?? 0);
        $note = $data['note'] ?? null;

        if (!$foodId || $grams <= 0) {
            return ResponseHelper::json($response, ['error' => 'Укажите продукт и массу'], 422);
        }

        $food = Food::find($foodId);
        if (!$food) {
            return ResponseHelper::json($response, ['error' => 'Продукт не найден'], 404);
        }

        $day = DiaryDay::firstOrCreate(
            ['user_id' => $user->id, 'd' => $date]
        );

        $item = DiaryItem::create([
            'day_id'  => $day->id,
            'food_id' => $food->id,
            'grams'   => $grams,
            'note'    => $note,
        ]);
        $item->load('food');

        return ResponseHelper::json($response, [
            'id'    => $item->id,
            'grams' => $item->grams,
            'note'  => $item->note,
            'food'  => $item->food ? $item->food->toArray() : null,
        ], 201);
    }

    private function sanitizeDate(string $date): ?string
    {
        if (preg_match('/^\\d{4}-\\d{2}-\\d{2}$/', $date)) {
            return $date;
        }

        return null;
    }
}
