<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PublicPage extends Model
{
    protected $table = 'public_pages';
    public $timestamps = false;
    protected $fillable = [
        'slug',
        'locale',
        'payload',
    ];
}
