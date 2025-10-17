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
        $profile = Profile::where('user_id', $user->id)->first();

        if ($profile) {
            return ResponseHelper::json($response, $this->serializeProfile($profile));
        }

        return ResponseHelper::json($response, [
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
        $payload = $this->sanitizePayload($payload);

        $profile = Profile::updateOrCreate(['user_id' => $user->id], $payload);
        $profile->refresh();

        return ResponseHelper::json($response, $this->serializeProfile($profile));
    }

    private function sanitizePayload(array $payload): array
    {
        foreach ($payload as $key => $value) {
            if ($value === '' || $value === null) {
                $payload[$key] = null;
                continue;
            }

            if (in_array($key, ['age', 'height_cm', 'kcal_goal', 'sfa_limit_g', 'fiber_goal_g'], true)) {
                $payload[$key] = (int) $value;
                continue;
            }

            if ($key === 'weight_kg') {
                $payload[$key] = (float) $value;
            }
        }

        return $payload;
    }

    private function serializeProfile(Profile $profile): array
    {
        return [
            'user_id'      => (int) $profile->user_id,
            'sex'          => $profile->sex ?: null,
            'age'          => $profile->age !== null ? (int) $profile->age : null,
            'height_cm'    => $profile->height_cm !== null ? (int) $profile->height_cm : null,
            'weight_kg'    => $profile->weight_kg !== null ? (float) $profile->weight_kg : null,
            'activity'     => $profile->activity ?: null,
            'kcal_goal'    => $profile->kcal_goal !== null ? (int) $profile->kcal_goal : null,
            'sfa_limit_g'  => $profile->sfa_limit_g !== null ? (int) $profile->sfa_limit_g : null,
            'fiber_goal_g' => $profile->fiber_goal_g !== null ? (int) $profile->fiber_goal_g : null,
        ];
    }
}
