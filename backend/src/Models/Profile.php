<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Profile extends Model
{
    protected $table = 'profiles';
    public $timestamps = false;
    protected $primaryKey = 'user_id';
    public $incrementing = false;
    protected $fillable = [
        'user_id', 'sex', 'age', 'height_cm', 'weight_kg', 'activity',
        'kcal_goal', 'sfa_limit_g', 'fiber_goal_g'
    ];
}
