<?php
use Slim\App;
use App\Controllers\AuthController;
use App\Controllers\MeController;
use App\Controllers\ProfileController;
use App\Controllers\LipidController;
use App\Controllers\DiaryController;
use App\Controllers\FoodController;
use App\Middleware\JwtMiddleware;

/** @var App $app */
$app->post('/auth/register', [AuthController::class, 'register']);
$app->post('/auth/login',    [AuthController::class, 'login']);

$app->get('/me',        [MeController::class, 'get'])->add(new JwtMiddleware());
$app->get('/targets',   [ProfileController::class, 'targets'])->add(new JwtMiddleware());
$app->put('/profile',   [ProfileController::class, 'upsert'])->add(new JwtMiddleware());

$app->get('/lipids',    [LipidController::class, 'list'])->add(new JwtMiddleware());
$app->post('/lipids',   [LipidController::class, 'create'])->add(new JwtMiddleware());
$app->delete('/lipids/{id}',[LipidController::class,'delete'])->add(new JwtMiddleware());

$app->get('/diary/{date}',              [DiaryController::class, 'getDay'])->add(new JwtMiddleware());
$app->post('/diary/{date}/items',       [DiaryController::class, 'addItem'])->add(new JwtMiddleware());
$app->get('/foods',                     [FoodController::class, 'search'])->add(new JwtMiddleware());
$app->post('/foods',                    [FoodController::class, 'create'])->add(new JwtMiddleware());
