<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

class User extends Model
{
    protected $table = 'users';
    public $timestamps = false;
    protected $fillable = ['email', 'pass_hash', 'created_at'];

    public function profile(): HasOne
    {
        return $this->hasOne(Profile::class, 'user_id');
    }
}
