<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PressureReading extends Model
{
    protected $table = 'pressure_readings';
    public $timestamps = false;
    protected $fillable = [
        'user_id',
        'measured_at',
        'systolic',
        'diastolic',
        'pulse',
        'advice',
    ];
}
