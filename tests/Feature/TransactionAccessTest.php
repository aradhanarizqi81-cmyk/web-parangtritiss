<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Enums\TransactionSource;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Visitor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class TransactionAccessTest extends TestCase
{
    use RefreshDatabase;

    private function makeTransaction(array $overrides = []): Transaction
    {
        return Transaction::create([
            'source' => TransactionSource::Online,
            'visit_date' => now()->toDateString(),
            'visitor_count' => 1,
            'visitor_unit_tariff' => 15000,
            'visitor_total' => 15000,
            'vehicle_total' => 0,
            'total_amount' => 15000,
            ...$overrides,
        ]);
    }

    public function test_owner_can_view_their_own_transaction(): void
    {
        $owner = User::factory()->create(['role' => Role::Visitor]);
        $transaction = $this->makeTransaction(['user_id' => $owner->id]);

        $this->withToken($owner->createToken('t')->plainTextToken)
            ->getJson("/api/v1/transactions/{$transaction->id}")
            ->assertOk()
            ->assertJsonPath('data.transaction_code', $transaction->transaction_code);
    }

    public function test_visitor_cannot_view_another_users_transaction(): void
    {
        $owner = User::factory()->create(['role' => Role::Visitor]);
        $intruder = User::factory()->create(['role' => Role::Visitor]);
        $transaction = $this->makeTransaction(['user_id' => $owner->id]);

        $this->withToken($intruder->createToken('t')->plainTextToken)
            ->getJson("/api/v1/transactions/{$transaction->id}")
            ->assertStatus(403);
    }

    public function test_admin_can_view_any_transaction(): void
    {
        $owner = User::factory()->create(['role' => Role::Visitor]);
        $admin = User::factory()->create(['role' => Role::Admin]);
        $transaction = $this->makeTransaction(['user_id' => $owner->id]);

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->getJson("/api/v1/transactions/{$transaction->id}")
            ->assertOk();
    }

    public function test_cashier_and_gate_staff_are_denied_visitor_transactions(): void
    {
        $owner = User::factory()->create(['role' => Role::Visitor]);
        $transaction = $this->makeTransaction(['user_id' => $owner->id]);

        foreach ([Role::Cashier, Role::GateStaff] as $role) {
            $staff = User::factory()->create(['role' => $role]);

            $this->withToken($staff->createToken('t')->plainTextToken)
                ->getJson("/api/v1/transactions/{$transaction->id}")
                ->assertStatus(403);
        }
    }

    public function test_role_middleware_rejects_disallowed_role(): void
    {
        Route::middleware(['auth:sanctum', 'role:admin'])
            ->get('/api/v1/testing/admin-only', fn () => response()->json(['ok' => true]));

        $visitor = User::factory()->create(['role' => Role::Visitor]);

        $this->withToken($visitor->createToken('t')->plainTextToken)
            ->getJson('/api/v1/testing/admin-only')
            ->assertStatus(403);

        // Drop the auth guard's cached user so the next request re-resolves the token.
        $this->app['auth']->forgetGuards();

        $admin = User::factory()->create(['role' => Role::Admin]);

        $this->withToken($admin->createToken('t')->plainTextToken)
            ->getJson('/api/v1/testing/admin-only')
            ->assertOk()
            ->assertJsonPath('ok', true);
    }

    public function test_transaction_response_does_not_expose_nik(): void
    {
        $owner = User::factory()->create(['role' => Role::Visitor]);
        $transaction = $this->makeTransaction(['user_id' => $owner->id]);

        $nik = '3201234567890123';
        Visitor::create([
            'transaction_id' => $transaction->id,
            'full_name' => 'Budi',
            'nik' => $nik,
        ]);

        $response = $this->withToken($owner->createToken('t')->plainTextToken)
            ->getJson("/api/v1/transactions/{$transaction->id}")
            ->assertOk();

        $this->assertStringNotContainsString($nik, $response->getContent());
        $this->assertArrayNotHasKey('nik', $response->json('data'));
    }
}
