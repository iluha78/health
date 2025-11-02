<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BloodPressure extends Model
{
    protected $table = 'blood_pressures';
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'systolic',
        'diastolic',
        'pulse',
        'question',
        'comment',
        'advice',
    ];
}
