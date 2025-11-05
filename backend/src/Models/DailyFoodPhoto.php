<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailyFoodPhoto extends Model
{
    protected $table = 'daily_food_photos';
    public $timestamps = false;
    
    protected $fillable = [
        'user_id',
        'photo_date',
        'title',
        'description',
        'estimated_calories',
        'photo_time',
        'note',
    ];

    protected $casts = [
        'photo_date' => 'date',
    ];
}
