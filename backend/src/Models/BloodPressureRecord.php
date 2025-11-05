<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BloodPressureRecord extends Model
{
    protected $table = 'blood_pressure_records';
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'systolic',
        'diastolic',
        'pulse',
        'question',
        'comment',
        'advice',
        'created_at',
    ];
}
