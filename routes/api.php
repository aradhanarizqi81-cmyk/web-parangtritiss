<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\TransactionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1
|--------------------------------------------------------------------------
|
| Loaded under the /api/v1 prefix (see bootstrap/app.php apiPrefix).
| Authentication uses Sanctum personal access tokens (Bearer).
|
*/

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Ownership enforced by TransactionPolicy.
    Route::get('/transactions/{transaction}', [TransactionController::class, 'show']);
});
