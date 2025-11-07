<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NutritionPhotoEstimate extends Model
{
    protected $table = 'nutrition_photo_estimates';
    public $timestamps = false;
    protected $casts = [
        'ingredients' => 'array',
        'calories' => 'float',
    ];
    protected $fillable = [
        'user_id',
        'calories',
        'confidence',
        'notes',
        'ingredients',
        'original_filename',
    ];
}
