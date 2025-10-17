<?php
use App\Support\Env;
use Illuminate\Database\Capsule\Manager as Capsule;

$capsule = new Capsule();
$capsule->addConnection([
    'driver'    => 'mysql',
    'host'      => Env::string('DB_HOST', '127.0.0.1') ?? '127.0.0.1',
    'port'      => Env::int('DB_PORT', 3306),
    'database'  => Env::string('DB_NAME', 'cholestofit') ?? 'cholestofit',
    'username'  => Env::string('DB_USER', 'root') ?? 'root',
    'password'  => Env::string('DB_PASS', '') ?? '',
    'charset'   => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
    'prefix'    => '',
]);
$capsule->setAsGlobal();
$capsule->bootEloquent();
