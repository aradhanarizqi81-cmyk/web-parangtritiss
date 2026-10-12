<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    /**
     * Register a visitor account and issue a personal access token.
     *
     * The role is forced to visitor; it is never taken from request input.
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'password' => $request->validated('password'),
            'phone' => $request->validated('phone'),
            'role' => Role::Visitor,
        ]);

        $token = $user->createToken($this->deviceName($request))->plainTextToken;

        return response()->json([
            'message' => 'Registrasi berhasil.',
            'data' => new UserResource($user),
            'token' => $token,
            'token_type' => 'Bearer',
        ], 201);
    }

    /**
     * Authenticate a user and issue a personal access token.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = $request->authenticate();

        $token = $user->createToken($this->deviceName($request))->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil.',
            'data' => new UserResource($user),
            'token' => $token,
            'token_type' => 'Bearer',
        ]);
    }

    /**
     * The authenticated user's profile.
     */
    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => new UserResource($request->user()),
        ]);
    }

    /**
     * Revoke the token used for the current request only.
     */
    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        return response()->json([
            'message' => 'Logout berhasil.',
        ]);
    }

    private function deviceName(Request $request): string
    {
        $name = trim((string) $request->input('device_name', ''));

        return $name !== '' ? $name : 'api';
    }
}
