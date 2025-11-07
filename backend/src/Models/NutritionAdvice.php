<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NutritionAdvice extends Model
{
    protected $table = 'nutrition_advices';
    public $timestamps = false;
    protected $fillable = [
        'user_id',
        'weight_kg',
        'height_cm',
        'calories_goal',
        'activity',
        'focus',
        'question',
        'comment',
        'advice',
    ];

    protected $casts = [
        'weight_kg' => 'float',
        'height_cm' => 'int',
        'calories_goal' => 'int',
    ];
}
