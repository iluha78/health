<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DiaryDay extends Model
{
    protected $table = 'diary_days';
    public $timestamps = false;
    protected $fillable = ['user_id', 'd'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(DiaryItem::class, 'day_id');
    }
}
