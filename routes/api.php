<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\Booking\TariffController as BookingTariffController;
use App\Http\Controllers\Api\V1\Booking\TransactionController as BookingController;
use App\Http\Controllers\Api\V1\Counter\TariffController as CounterTariffController;
use App\Http\Controllers\Api\V1\Counter\TransactionController as CounterTransactionController;
use App\Http\Controllers\Api\V1\Gate\CheckInController as GateCheckInController;
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

    /*
    |--------------------------------------------------------------------------
    | Counter (loket)
    |--------------------------------------------------------------------------
    |
    | Role middleware gates the namespace; TransactionPolicy additionally
    | restricts every object to counter-source transactions.
    |
    */
    Route::middleware('role:cashier,admin')->prefix('counter')->group(function (): void {
        Route::get('/tariffs', [CounterTariffController::class, 'index']);

        Route::post('/transactions', [CounterTransactionController::class, 'store']);
        Route::get('/transactions/{transaction}', [CounterTransactionController::class, 'show']);
        Route::post('/transactions/{transaction}/confirm-payment', [CounterTransactionController::class, 'confirmPayment']);
        Route::post('/transactions/{transaction}/print', [CounterTransactionController::class, 'printTickets']);
    });

    /*
    |--------------------------------------------------------------------------
    | Online booking (wisatawan)
    |--------------------------------------------------------------------------
    |
    | Role middleware gates the namespace to visitors and admins; the policy
    | additionally restricts object access to the owner (and admin reads) and
    | makes the payment simulation owner-only.
    |
    */
    Route::middleware('role:visitor,admin')->group(function (): void {
        Route::get('/booking/tariffs', [BookingTariffController::class, 'index']);

        Route::get('/bookings', [BookingController::class, 'index']);
        Route::post('/bookings', [BookingController::class, 'store']);
        Route::get('/bookings/{transaction}', [BookingController::class, 'show']);
        Route::post('/bookings/{transaction}/simulate-payment', [BookingController::class, 'simulatePayment']);
        Route::post('/bookings/{transaction}/print', [BookingController::class, 'printTickets']);
    });

    /*
    |--------------------------------------------------------------------------
    | Gate (gerbang)
    |--------------------------------------------------------------------------
    |
    | Role middleware gates the namespace to gate staff and admins. The scanned
    | barcode token is resolved server-side; the client never sends a
    | transaction id or any payment figure. Throttling limits barcode guessing.
    |
    */
    Route::middleware(['role:gate_staff,admin', 'throttle:gate-checkin'])
        ->prefix('gate')
        ->group(function (): void {
            Route::post('/check-in', [GateCheckInController::class, 'store']);
        });
});
