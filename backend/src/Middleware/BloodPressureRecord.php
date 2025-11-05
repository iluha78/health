<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BloodPressureRecord extends Model
{
    protected $table = 'blood_pressure_records';
    public $timestamps = false;
    protected $fillable = [
        'user_id',
        'measured_at',
        'systolic',
        'diastolic',
        'pulse',
        'glucose',
        'note',
    ];

    protected $casts = [
        'measured_at' => 'datetime',
    ];
}
