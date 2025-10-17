<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PhotoAnalysis extends Model
{
    protected $table = 'photo_analyses';
    public $timestamps = false;
    protected $casts = [
        'tips' => 'array',
    ];
    protected $fillable = [
        'user_id', 'title', 'description', 'estimated_calories', 'healthiness', 'reasoning', 'tips', 'original_filename',
    ];
}
