<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssistantInteraction extends Model
{
    protected $table = 'assistant_interactions';
    public $timestamps = false;
    protected $fillable = [
        'user_id', 'user_message', 'assistant_reply',
    ];
}
