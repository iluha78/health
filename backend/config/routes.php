<?php
use Slim\App;
use App\Controllers\AuthController;
use App\Controllers\MeController;
use App\Controllers\ProfileController;
use App\Controllers\LipidController;
use App\Controllers\DiaryController;
use App\Controllers\FoodController;
use App\Controllers\AdviceController;
use App\Controllers\BillingController;
use App\Controllers\AnalysisController;
use App\Controllers\AssistantController;
use App\Controllers\PressureController;
use App\Middleware\JwtMiddleware;
use Slim\Routing\RouteCollectorProxy;

/** @var App $app */
$app->post('/auth/register', [AuthController::class, 'register']);
$app->post('/auth/login',    [AuthController::class, 'login']);
$app->post('/auth/verify',   [AuthController::class, 'verify']);

$app->get('/me',        [MeController::class, 'get'])->add(new JwtMiddleware());
$app->get('/targets',   [ProfileController::class, 'targets'])->add(new JwtMiddleware());
$app->put('/profile',   [ProfileController::class, 'upsert'])->add(new JwtMiddleware());

$app->get('/lipids',    [LipidController::class, 'list'])->add(new JwtMiddleware());
$app->post('/lipids',   [LipidController::class, 'create'])->add(new JwtMiddleware());
$app->delete('/lipids/{id}',[LipidController::class,'delete'])->add(new JwtMiddleware());

$app->group('/pressure', function (RouteCollectorProxy $group): void {
    $group->get('',  [PressureController::class, 'list']);
    $group->get('/', [PressureController::class, 'list']);
    $group->post('', [PressureController::class, 'create']);
    $group->post('/', [PressureController::class, 'create']);
    $group->delete('/{id}', [PressureController::class, 'delete']);
})->add(new JwtMiddleware());

$app->get('/diary/{date}',              [DiaryController::class, 'getDay'])->add(new JwtMiddleware());
$app->post('/diary/{date}/items',       [DiaryController::class, 'addItem'])->add(new JwtMiddleware());
$app->get('/foods',                     [FoodController::class, 'search'])->add(new JwtMiddleware());
$app->post('/foods',                    [FoodController::class, 'create'])->add(new JwtMiddleware());
$app->get('/advice/nutrition/history',  [AdviceController::class, 'history'])->add(new JwtMiddleware());
$app->post('/advice/nutrition',         [AdviceController::class, 'nutrition'])->add(new JwtMiddleware());
$app->get('/advice/nutrition/photo/history', [AdviceController::class, 'nutritionPhotoHistory'])->add(new JwtMiddleware());
$app->delete('/advice/nutrition/photo/{id}', [AdviceController::class, 'deleteNutritionPhoto'])->add(new JwtMiddleware());
$app->post('/advice/nutrition/photo[/{variant:.*}]', [AdviceController::class, 'nutritionPhoto'])->add(new JwtMiddleware());
$app->post('/advice/general',           [AdviceController::class, 'general'])->add(new JwtMiddleware());
$app->get('/analysis/photo/history',    [AnalysisController::class, 'history'])->add(new JwtMiddleware());
$app->post('/analysis/photo',           [AnalysisController::class, 'photo'])->add(new JwtMiddleware());
$app->get('/assistant/history',         [AssistantController::class, 'history'])->add(new JwtMiddleware());
$app->post('/assistant/chat',           [AssistantController::class, 'chat'])->add(new JwtMiddleware());

$app->get('/billing/status',            [BillingController::class, 'status'])->add(new JwtMiddleware());
$app->post('/billing/deposit',          [BillingController::class, 'deposit'])->add(new JwtMiddleware());
$app->post('/billing/plan',             [BillingController::class, 'changePlan'])->add(new JwtMiddleware());

