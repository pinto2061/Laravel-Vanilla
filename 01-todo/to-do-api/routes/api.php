<?php

use App\Http\Controllers\TasksController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


Route::controller(TasksController::class)->group(function () {
    Route::get('/tasks', 'index');
    Route::post('/task', 'store');
    Route::get('/task/{id}', 'show');
    Route::put('/task/{id}', 'update');
    Route::delete('/task/{id}', 'destroy');
});