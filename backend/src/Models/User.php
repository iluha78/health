<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

class User extends Model
{
    protected $table = 'users';
    public $timestamps = false;
    protected $fillable = [
        'email',
        'pass_hash',
        'created_at',
        'plan',
        'balance_cents',
        'ai_cycle_started_at',
        'ai_cycle_requests',
        'ai_cycle_spent_cents',
        'ai_cycle_advice_requests',
        'ai_cycle_assistant_requests',
    ];

    protected $casts = [
        'ai_cycle_started_at' => 'date',
    ];

    public function profile(): HasOne
    {
        return $this->hasOne(Profile::class, 'user_id');
    }
}
