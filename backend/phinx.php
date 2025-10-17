<?php
$host = getenv('DB_HOST') ?: 'db';
$port = getenv('DB_PORT') ?: 3306; // можешь не задавать, MySQL в докере = 3306
$db   = getenv('DB_NAME') ?: 'cholestofit';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASS') ?: 'secret';

return [
    'paths' => [
        'migrations' => 'migrations',
        'seeds'      => 'seeds'
    ],
    'environments' => [
        'default_migration_table' => 'phinxlog',
        'default_environment'     => 'docker',
        'docker' => [
            'adapter' => 'mysql',
            'host'    => $host,
            'name'    => $db,
            'user'    => $user,
            'pass'    => $pass,
            'port'    => $port,
            'charset' => 'utf8mb4',
        ],
    ],
];
