<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DiaryItem extends Model
{
    protected $table = 'diary_items';
    public $timestamps = false;
    protected $fillable = ['day_id', 'food_id', 'grams', 'note'];

    public function day(): BelongsTo
    {
        return $this->belongsTo(DiaryDay::class, 'day_id');
    }

    public function food(): BelongsTo
    {
        return $this->belongsTo(Food::class, 'food_id');
    }
}
