<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Food extends Model
{
    protected $table = 'foods';
    public $timestamps = false;
    protected $fillable = [
        'source', 'off_id', 'name', 'kcal', 'protein_g', 'fat_g',
        'sfa_g', 'carbs_g', 'fiber_g', 'soluble_fiber_g'
    ];
}
