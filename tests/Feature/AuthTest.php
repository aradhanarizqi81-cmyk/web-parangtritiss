<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private function registerPayload(array $overrides = []): array
    {
        return [
            'name' => 'Wisatawan Baru',
            'email' => 'baru@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            ...$overrides,
        ];
    }

    public function test_visitor_can_register(): void
    {
        $response = $this->postJson('/api/v1/auth/register', $this->registerPayload());

        $response->assertCreated()
            ->assertJsonPath('data.role', 'visitor')
            ->assertJsonStructure([
                'message',
                'data' => ['id', 'name', 'email', 'role'],
                'token',
                'token_type',
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'baru@example.com',
            'role' => 'visitor',
        ]);
    }

    public function test_registration_rejects_duplicate_email(): void
    {
        User::factory()->create(['email' => 'baru@example.com']);

        $response = $this->postJson('/api/v1/auth/register', $this->registerPayload());

        $response->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_registration_cannot_assign_privileged_role(): void
    {
        $response = $this->postJson('/api/v1/auth/register', $this->registerPayload([
            'role' => 'admin',
        ]));

        $response->assertCreated()->assertJsonPath('data.role', 'visitor');

        $this->assertDatabaseHas('users', [
            'email' => 'baru@example.com',
            'role' => 'visitor',
        ]);
    }

    public function test_login_succeeds_with_valid_credentials(): void
    {
        User::factory()->create([
            'email' => 'login@example.com',
            'password' => 'password123',
            'role' => Role::Visitor,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'login@example.com',
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.email', 'login@example.com')
            ->assertJsonStructure(['message', 'data', 'token', 'token_type']);
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'login@example.com',
            'password' => 'password123',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'login@example.com',
            'password' => 'salah-sekali',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_login_is_throttled_after_repeated_failures(): void
    {
        User::factory()->create([
            'email' => 'throttle@example.com',
            'password' => 'password123',
        ]);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v1/auth/login', [
                'email' => 'throttle@example.com',
                'password' => 'salah',
            ])->assertStatus(422);
        }

        // Even correct credentials are rejected while throttled.
        $this->postJson('/api/v1/auth/login', [
            'email' => 'throttle@example.com',
            'password' => 'password123',
        ])->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_protected_routes_reject_requests_without_token(): void
    {
        $this->getJson('/api/v1/auth/me')->assertStatus(401);
        $this->getJson('/api/v1/transactions/1')->assertStatus(401);
    }

    public function test_unauthenticated_api_requests_always_receive_json(): void
    {
        // No Accept: application/json header, like a plain browser/HTTP client.
        $response = $this->get('/api/v1/auth/me');

        $response->assertStatus(401)->assertJson(['message' => 'Unauthenticated.']);
    }

    public function test_authenticated_user_can_view_profile(): void
    {
        $user = User::factory()->create(['role' => Role::Visitor]);

        $response = $this->withToken($user->createToken('test')->plainTextToken)
            ->getJson('/api/v1/auth/me');

        $response->assertOk()
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonPath('data.role', 'visitor');
    }

    public function test_logout_revokes_the_current_token(): void
    {
        $user = User::factory()->create();

        $plainToken = $user->createToken('test')->plainTextToken;

        $this->withToken($plainToken)->postJson('/api/v1/auth/logout')->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);

        // Drop the auth guard's cached user so the request re-resolves the token.
        $this->app['auth']->forgetGuards();

        $this->withToken($plainToken)->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    public function test_logout_only_revokes_the_active_token(): void
    {
        $user = User::factory()->create();

        $first = $user->createToken('first')->plainTextToken;
        $second = $user->createToken('second')->plainTextToken;

        $this->withToken($first)->postJson('/api/v1/auth/logout')->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 1);

        $this->app['auth']->forgetGuards();

        $this->withToken($second)->getJson('/api/v1/auth/me')->assertOk();
    }

    public function test_responses_do_not_leak_sensitive_attributes(): void
    {
        $user = User::factory()->create([
            'email' => 'secret@example.com',
            'password' => 'password123',
        ]);

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => 'secret@example.com',
            'password' => 'password123',
        ])->assertOk();

        $storedToken = (string) DB::table('personal_access_tokens')->value('token');

        $profile = $this->withToken($login->json('token'))
            ->getJson('/api/v1/auth/me')
            ->assertOk();

        $this->assertArrayNotHasKey('password', $profile->json('data'));
        $this->assertArrayNotHasKey('remember_token', $profile->json('data'));

        // The stored (hashed) token value must never be exposed in responses.
        $this->assertStringNotContainsString($storedToken, $profile->getContent());
        $this->assertStringNotContainsString('password', $profile->getContent());
    }
}
