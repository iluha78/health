<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lipid extends Model
{
    protected $table = 'lipids';
    public $timestamps = false;
    protected $fillable = [
        'user_id', 'dt', 'chol', 'hdl', 'ldl', 'trig', 'note'
    ];
}
