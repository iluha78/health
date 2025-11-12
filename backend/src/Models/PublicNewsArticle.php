<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PublicNewsArticle extends Model
{
    protected $table = 'news_articles';
    public $timestamps = false;
    protected $fillable = [
        'slug',
        'locale',
        'title',
        'summary',
        'content',
        'image_key',
        'image_alt',
        'published_at',
    ];
    protected $casts = [
        'published_at' => 'datetime',
    ];
}
