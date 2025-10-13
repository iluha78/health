<?php
namespace App\Controllers;

use App\Models\Profile;
use App\Support\Auth;
use App\Support\ResponseHelper;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ProfileController
{
    public function targets(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        $profile = Profile::find($user->id);

        return ResponseHelper::json($response, $profile ? $profile->toArray() : [
            'user_id'      => $user->id,
            'sex'          => null,
            'age'          => null,
            'height_cm'    => null,
            'weight_kg'    => null,
            'activity'     => null,
            'kcal_goal'    => null,
            'sfa_limit_g'  => null,
            'fiber_goal_g' => null,
        ]);
    }

    public function upsert(Request $request, Response $response): Response
    {
        $user = Auth::user($request);
        $data = (array) $request->getParsedBody();

        $payload = array_intersect_key($data, array_flip([
            'sex', 'age', 'height_cm', 'weight_kg', 'activity',
            'kcal_goal', 'sfa_limit_g', 'fiber_goal_g',
        ]));
        $payload['user_id'] = $user->id;

        $profile = Profile::updateOrCreate(['user_id' => $user->id], $payload);

        return ResponseHelper::json($response, $profile->toArray());
    }
}
