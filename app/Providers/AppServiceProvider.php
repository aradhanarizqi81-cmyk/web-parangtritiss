<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Gate check-in: a scanner can fire quickly, but an authenticated
        // officer still gets a ceiling that makes barcode guessing pointless
        // (a valid token is 40 random characters). Keyed per officer + IP.
        RateLimiter::for('gate-checkin', function (Request $request): Limit {
            $key = 'gate-checkin:'.($request->user()?->id ?? 'guest').'|'.$request->ip();

            return Limit::perMinute(120)->by($key);
        });
    }
}
