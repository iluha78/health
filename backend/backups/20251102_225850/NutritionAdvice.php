<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NutritionAdvice extends Model
{
    protected $table = 'nutrition_advices';
    public $timestamps = false;
    
    protected $fillable = [
        'user_id',
        'advice_date',
        'focus',
        'advice',
    ];

    protected $casts = [
        'advice_date' => 'date',
    ];
}
