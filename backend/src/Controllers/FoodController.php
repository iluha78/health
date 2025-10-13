<?php
namespace App\Controllers;

use App\Models\Food;
use App\Support\ResponseHelper;
use Illuminate\Database\Eloquent\Collection;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class FoodController
{
    public function search(Request $request, Response $response): Response
    {
        $params = $request->getQueryParams();
        $query = trim($params['q'] ?? '');

        $foodsQuery = Food::query();
        if ($query !== '') {
            $foodsQuery->where('name', 'like', "%" . $query . "%");
        }
        /** @var Collection<int, Food> $foods */
        $foods = $foodsQuery->orderBy('name')->limit(20)->get();

        return ResponseHelper::json($response, $foods->toArray());
    }

    public function create(Request $request, Response $response): Response
    {
        $data = (array) $request->getParsedBody();
        $required = ['name', 'kcal'];
        foreach ($required as $field) {
            if (empty($data[$field])) {
                return ResponseHelper::json($response, ['error' => "Поле {$field} обязательно"], 422);
            }
        }

        $payload = array_intersect_key($data, array_flip([
            'source', 'off_id', 'name', 'kcal', 'protein_g', 'fat_g',
            'sfa_g', 'carbs_g', 'fiber_g', 'soluble_fiber_g'
        ]));

        $food = Food::create($payload);

        return ResponseHelper::json($response, $food->toArray(), 201);
    }
}
