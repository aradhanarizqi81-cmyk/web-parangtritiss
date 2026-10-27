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

        // Counter redemption: same idea for the redemption code. The token is
        // random too, and an authenticated officer keeps a per-minute ceiling so
        // brute-forcing a code is pointless. Keyed per officer + IP.
        RateLimiter::for('counter-redemption', function (Request $request): Limit {
            $key = 'counter-redemption:'.($request->user()?->id ?? 'guest').'|'.$request->ip();

            return Limit::perMinute(120)->by($key);
        });

        // Counter facility claim: the wristband ticket code is a credential,
        // so the same per-officer + IP ceiling applies. A valid code is not
        // guessable, but the limiter keeps brute force pointless.
        RateLimiter::for('counter-facility', function (Request $request): Limit {
            $key = 'counter-facility:'.($request->user()?->id ?? 'guest').'|'.$request->ip();

            return Limit::perMinute(120)->by($key);
        });
    }
}
