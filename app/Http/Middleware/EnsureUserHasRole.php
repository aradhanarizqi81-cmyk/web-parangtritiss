<?php

namespace App\Http\Middleware;

use App\Enums\Role;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    /**
     * Allow the request only when the authenticated user holds one of the
     * given roles, e.g. `role:admin,cashier`.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return response()->json([
                'message' => 'Tidak terautentikasi.',
            ], 401);
        }

        $allowed = array_values(array_filter(array_map(
            Role::tryFrom(...),
            $roles,
        )));

        if (! in_array($user->role, $allowed, true)) {
            return response()->json([
                'message' => 'Anda tidak memiliki hak akses untuk tindakan ini.',
            ], 403);
        }

        return $next($request);
    }
}
