<?php

use App\Http\Controllers\Api\V1\Admin\DashboardController;
use App\Http\Controllers\Api\V1\Admin\Report\IdentityReportController;
use App\Http\Controllers\Api\V1\Admin\Report\TransactionReportController;
use App\Http\Controllers\Api\V1\Admin\Report\VehicleReportController;
use App\Http\Controllers\Api\V1\Admin\Report\VisitReportController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\Booking\TariffController as BookingTariffController;
use App\Http\Controllers\Api\V1\Booking\TransactionController as BookingController;
use App\Http\Controllers\Api\V1\Counter\FacilityController as CounterFacilityController;
use App\Http\Controllers\Api\V1\Counter\RedemptionController as CounterRedemptionController;
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

        /*
        |--------------------------------------------------------------------------
        | Penukaran booking online (redemption)
        |--------------------------------------------------------------------------
        |
        | A booking is resolved from the scanned redemption code, never from a
        | transaction id. Throttling limits code guessing; the policy limits the
        | desk to cashiers and admins. Lookup is read-only; only confirm records
        | the exchange; printing (and reprinting) is recorded separately.
        |
        */
        Route::middleware('throttle:counter-redemption')
            ->prefix('redemptions')
            ->group(function (): void {
                Route::post('/lookup', [CounterRedemptionController::class, 'lookup']);
                Route::post('/confirm', [CounterRedemptionController::class, 'confirm']);
                Route::post('/print', [CounterRedemptionController::class, 'printTickets']);
            });

        /*
        |--------------------------------------------------------------------------
        | Klaim fasilitas per tiket (facility entitlement)
        |--------------------------------------------------------------------------
        |
        | A ticket is resolved from the individual wristband code, never from the
        | gate barcode or the online redemption code. Throttling limits code
        | guessing; lookup is read-only and only claim writes the redemption.
        |
        */
        Route::middleware('throttle:counter-facility')
            ->prefix('facilities')
            ->group(function (): void {
                Route::post('/lookup', [CounterFacilityController::class, 'lookup']);
                Route::post('/claim', [CounterFacilityController::class, 'claim']);
            });
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

    /*
    |--------------------------------------------------------------------------
    | Admin (dashboard & laporan)
    |--------------------------------------------------------------------------
    |
    | Role middleware gates the namespace to admins; TransactionPolicy adds a
    | second, explicit ability check (viewDashboard/viewReports/
    | viewIdentityReport). Every figure is computed server-side from the
    | database; the client only supplies filters.
    |
    */
    Route::middleware('role:admin')->prefix('admin')->group(function (): void {
        Route::get('/dashboard', [DashboardController::class, 'show']);

        Route::get('/reports/visits', [VisitReportController::class, 'index']);
        Route::get('/reports/visits/export', [VisitReportController::class, 'export']);

        Route::get('/reports/transactions', [TransactionReportController::class, 'index']);
        Route::get('/reports/transactions/export', [TransactionReportController::class, 'export']);

        Route::get('/reports/vehicles', [VehicleReportController::class, 'index']);
        Route::get('/reports/vehicles/export', [VehicleReportController::class, 'export']);

        Route::get('/reports/identities', [IdentityReportController::class, 'index']);
        Route::get('/reports/identities/export', [IdentityReportController::class, 'export']);
    });
});
