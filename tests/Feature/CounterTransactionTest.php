<?php

namespace Tests\Feature;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\Role;
use App\Enums\TicketStatus;
use App\Enums\TransactionSource;
use App\Enums\TransactionStatus;
use App\Models\AuditLog;
use App\Models\Payment;
use App\Models\Tariff;
use App\Models\Ticket;
use App\Models\Transaction;
use App\Models\User;
use App\Models\VehicleType;
use Database\Seeders\TariffSeeder;
use Database\Seeders\VehicleTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CounterTransactionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(TariffSeeder::class);
        $this->seed(VehicleTypeSeeder::class);
    }

    private function user(Role $role): User
    {
        return User::factory()->create(['role' => $role]);
    }

    private function token(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

    private function vehicleTypeId(string $code): int
    {
        return (int) VehicleType::where('code', $code)->value('id');
    }

    /**
     * 2 visitors + 2 motorcycles + 1 car
     * = 2*15000 + 2*2000 + 1*5000 = 30000 + 9000 = 39000.
     *
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'visit_date' => now()->toDateString(),
            'visitors' => [
                ['full_name' => 'Budi Santoso', 'nik' => '3201234567890123'],
                ['full_name' => 'Siti Aminah', 'nik' => '3201234567890124'],
            ],
            'vehicles' => [
                ['vehicle_type_id' => $this->vehicleTypeId('motorcycle'), 'quantity' => 2],
                ['vehicle_type_id' => $this->vehicleTypeId('car'), 'quantity' => 1],
            ],
            ...$overrides,
        ];
    }

    public function test_cashier_can_create_counter_transaction_with_database_totals(): void
    {
        $cashier = $this->user(Role::Cashier);

        $response = $this->withToken($this->token($cashier))
            ->postJson('/api/v1/counter/transactions', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.source', 'counter')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.visitor_count', 2)
            ->assertJsonPath('data.visitor_unit_tariff', 15000)
            ->assertJsonPath('data.visitor_total', 30000)
            ->assertJsonPath('data.vehicle_total', 9000)
            ->assertJsonPath('data.total_amount', 39000)
            ->assertJsonCount(2, 'data.visitors')
            ->assertJsonCount(2, 'data.tickets')
            ->assertJsonPath('data.payment.status', 'pending')
            ->assertJsonPath('data.payment.method', 'cash')
            ->assertJsonPath('data.payment.amount', 39000);

        $transaction = Transaction::firstOrFail();

        $this->assertSame(TransactionSource::Counter, $transaction->source);
        $this->assertSame(TransactionStatus::Pending, $transaction->status);
        $this->assertSame($cashier->id, $transaction->cashier_user_id);
        $this->assertNull($transaction->user_id);

        // One ticket per visitor, all consistent.
        $this->assertSame(2, $transaction->visitors()->count());
        $this->assertSame(2, $transaction->tickets()->count());
        $this->assertSame($transaction->visitor_count, $transaction->tickets()->count());
        $this->assertSame(1, $transaction->payment()->count());

        $this->assertSame(1, $response->json('data.cashier.id') === $cashier->id ? 1 : 0);
    }

    public function test_client_supplied_total_is_ignored(): void
    {
        $cashier = $this->user(Role::Cashier);

        $this->withToken($this->token($cashier))
            ->postJson('/api/v1/counter/transactions', $this->payload([
                'client_total_amount' => 1,
            ]))
            ->assertCreated()
            ->assertJsonPath('data.total_amount', 39000);

        $this->assertSame(39000, Transaction::firstOrFail()->total_amount);
    }

    public function test_unauthenticated_user_cannot_create_counter_transaction(): void
    {
        $this->postJson('/api/v1/counter/transactions', $this->payload())
            ->assertUnauthorized();

        $this->assertSame(0, Transaction::count());
    }

    public function test_visitor_and_gate_staff_are_denied_counter_operations(): void
    {
        foreach ([Role::Visitor, Role::GateStaff] as $role) {
            $user = $this->user($role);

            $this->withToken($this->token($user))
                ->postJson('/api/v1/counter/transactions', $this->payload())
                ->assertStatus(403);

            $this->app['auth']->forgetGuards();
        }

        $this->assertSame(0, Transaction::count());
    }

    public function test_admin_can_create_counter_transaction(): void
    {
        $admin = $this->user(Role::Admin);

        $this->withToken($this->token($admin))
            ->postJson('/api/v1/counter/transactions', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.total_amount', 39000);
    }

    public function test_pricing_follows_the_current_database_tariff(): void
    {
        Tariff::query()->where('code', 'visitor')->update(['unit_tariff' => 20000]);
        VehicleType::query()->where('code', 'car')->update(['unit_tariff' => 7000]);

        $cashier = $this->user(Role::Cashier);

        $this->withToken($this->token($cashier))
            ->postJson('/api/v1/counter/transactions', [
                'visit_date' => now()->toDateString(),
                'visitors' => [['full_name' => 'Wawan', 'nik' => '3201234567890999']],
                'vehicles' => [['vehicle_type_id' => $this->vehicleTypeId('car'), 'quantity' => 1]],
            ])
            ->assertCreated()
            ->assertJsonPath('data.visitor_unit_tariff', 20000)
            ->assertJsonPath('data.visitor_total', 20000)
            ->assertJsonPath('data.vehicle_total', 7000)
            ->assertJsonPath('data.total_amount', 27000);
    }

    public function test_tariff_snapshot_is_immutable_after_tariff_change(): void
    {
        $cashier = $this->user(Role::Cashier);

        $this->withToken($this->token($cashier))
            ->postJson('/api/v1/counter/transactions', $this->payload())
            ->assertCreated();

        Tariff::query()->update(['unit_tariff' => 99999]);
        VehicleType::query()->update(['unit_tariff' => 88888]);

        $transaction = Transaction::firstOrFail()->fresh();

        $this->assertSame(15000, $transaction->visitor_unit_tariff);
        $this->assertSame(30000, $transaction->visitor_total);
        $this->assertSame(9000, $transaction->vehicle_total);
        $this->assertSame(39000, $transaction->total_amount);

        $this->assertSame(
            [2000, 5000],
            $transaction->transactionVehicles()->orderBy('vehicle_type_id')->pluck('unit_tariff')->all(),
        );
    }

    public function test_invalid_visitor_data_rolls_back_without_partial_rows(): void
    {
        $cashier = $this->user(Role::Cashier);

        $payload = $this->payload();
        $payload['visitors'][1]['nik'] = '123';

        $this->withToken($this->token($cashier))
            ->postJson('/api/v1/counter/transactions', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['visitors.1.nik']);

        $this->assertSame(0, Transaction::count());
        $this->assertSame(0, Ticket::count());
        $this->assertSame(0, Payment::count());
        $this->assertDatabaseCount('visitors', 0);
        $this->assertDatabaseCount('transaction_vehicles', 0);
    }

    public function test_inactive_vehicle_type_is_rejected(): void
    {
        VehicleType::query()->where('code', 'car')->update(['active' => false]);
        $cashier = $this->user(Role::Cashier);

        $this->withToken($this->token($cashier))
            ->postJson('/api/v1/counter/transactions', $this->payload())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['vehicles.1.vehicle_type_id']);

        $this->assertSame(0, Transaction::count());
    }

    public function test_duplicate_vehicle_type_lines_are_rejected(): void
    {
        $cashier = $this->user(Role::Cashier);
        $car = $this->vehicleTypeId('car');

        $this->withToken($this->token($cashier))
            ->postJson('/api/v1/counter/transactions', $this->payload([
                'vehicles' => [
                    ['vehicle_type_id' => $car, 'quantity' => 1],
                    ['vehicle_type_id' => $car, 'quantity' => 2],
                ],
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['vehicles.1.vehicle_type_id']);
    }

    public function test_visit_date_outside_allowed_window_is_rejected(): void
    {
        $cashier = $this->user(Role::Cashier);

        $this->withToken($this->token($cashier))
            ->postJson('/api/v1/counter/transactions', $this->payload([
                'visit_date' => now()->subDay()->toDateString(),
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['visit_date']);

        $this->withToken($this->token($cashier))
            ->postJson('/api/v1/counter/transactions', $this->payload([
                'visit_date' => now()->addDays(31)->toDateString(),
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['visit_date']);
    }

    public function test_confirm_payment_marks_cash_as_received(): void
    {
        $cashier = $this->user(Role::Cashier);
        $transaction = $this->createTransaction($cashier);

        $this->withToken($this->token($cashier))
            ->postJson("/api/v1/counter/transactions/{$transaction->id}/confirm-payment")
            ->assertOk()
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.payment.status', 'success')
            ->assertJsonPath('data.payment.received_by.id', $cashier->id);

        $payment = Payment::firstOrFail();

        $this->assertSame(PaymentStatus::Success, $payment->status);
        $this->assertSame(PaymentMethod::Cash, $payment->method);
        $this->assertSame($cashier->id, $payment->received_by_user_id);
        $this->assertNotNull($payment->paid_at);
        $this->assertSame(TransactionStatus::Paid, $transaction->fresh()->status);
    }

    public function test_payment_cannot_be_confirmed_twice(): void
    {
        $cashier = $this->user(Role::Cashier);
        $transaction = $this->createTransaction($cashier);
        $token = $this->token($cashier);

        $this->withToken($token)
            ->postJson("/api/v1/counter/transactions/{$transaction->id}/confirm-payment")
            ->assertOk();

        $this->app['auth']->forgetGuards();

        $this->withToken($token)
            ->postJson("/api/v1/counter/transactions/{$transaction->id}/confirm-payment")
            ->assertStatus(409);

        $this->assertSame(1, Payment::count());
        $this->assertSame(PaymentStatus::Success, Payment::firstOrFail()->status);
    }

    public function test_visitor_and_gate_staff_cannot_confirm_payment(): void
    {
        $cashier = $this->user(Role::Cashier);
        $transaction = $this->createTransaction($cashier);

        $this->app['auth']->forgetGuards();

        foreach ([Role::Visitor, Role::GateStaff] as $role) {
            $user = $this->user($role);

            $this->withToken($this->token($user))
                ->postJson("/api/v1/counter/transactions/{$transaction->id}/confirm-payment")
                ->assertStatus(403);

            $this->app['auth']->forgetGuards();
        }

        $this->assertSame(TransactionStatus::Pending, $transaction->fresh()->status);
    }

    public function test_any_cashier_may_view_a_counter_transaction_but_not_an_online_one(): void
    {
        $creator = $this->user(Role::Cashier);
        $colleague = $this->user(Role::Cashier);
        $transaction = $this->createTransaction($creator);

        $this->app['auth']->forgetGuards();

        // Counter shared-shift policy: a colleague cashier may read it.
        $this->withToken($this->token($colleague))
            ->getJson("/api/v1/counter/transactions/{$transaction->id}")
            ->assertOk()
            ->assertJsonPath('data.transaction_code', $transaction->transaction_code);

        $this->app['auth']->forgetGuards();

        // An online transaction must not be reachable through the counter namespace.
        $owner = $this->user(Role::Visitor);
        $online = Transaction::create([
            'user_id' => $owner->id,
            'source' => TransactionSource::Online,
            'visit_date' => now()->toDateString(),
            'visitor_count' => 1,
            'visitor_unit_tariff' => 15000,
            'visitor_total' => 15000,
            'vehicle_total' => 0,
            'total_amount' => 15000,
        ]);

        $this->withToken($this->token($colleague))
            ->getJson("/api/v1/counter/transactions/{$online->id}")
            ->assertStatus(403);
    }

    public function test_visitor_cannot_reach_counter_details(): void
    {
        $cashier = $this->user(Role::Cashier);
        $transaction = $this->createTransaction($cashier);
        $visitor = $this->user(Role::Visitor);

        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($visitor))
            ->getJson("/api/v1/counter/transactions/{$transaction->id}")
            ->assertStatus(403);
    }

    public function test_nik_is_never_exposed_in_response_or_audit_log(): void
    {
        $cashier = $this->user(Role::Cashier);
        $nik = '3201234567890123';

        $response = $this->withToken($this->token($cashier))
            ->postJson('/api/v1/counter/transactions', $this->payload())
            ->assertCreated();

        $content = $response->getContent();

        $this->assertStringNotContainsString($nik, $content);
        $this->assertStringContainsString('3201********0123', $content);
        $this->assertArrayNotHasKey('nik', $response->json('data.visitors.0'));

        foreach (AuditLog::all() as $log) {
            $this->assertStringNotContainsString($nik, (string) json_encode($log->metadata));
        }
    }

    public function test_ticket_codes_are_unique_and_generated(): void
    {
        $cashier = $this->user(Role::Cashier);
        $transaction = $this->createTransaction($cashier, visitorCount: 3);

        $codes = $transaction->tickets()->pluck('ticket_code')->all();

        $this->assertCount(3, $codes);
        $this->assertCount(3, array_unique($codes));

        foreach ($codes as $code) {
            $this->assertStringStartsWith('TKT-', $code);
        }
    }

    public function test_printing_requires_payment_and_never_duplicates_tickets(): void
    {
        $cashier = $this->user(Role::Cashier);
        $transaction = $this->createTransaction($cashier);
        $token = $this->token($cashier);

        // Unpaid: printing is refused.
        $this->withToken($token)
            ->postJson("/api/v1/counter/transactions/{$transaction->id}/print")
            ->assertStatus(422);

        $this->withToken($token)
            ->postJson("/api/v1/counter/transactions/{$transaction->id}/confirm-payment")
            ->assertOk();

        $this->withToken($token)
            ->postJson("/api/v1/counter/transactions/{$transaction->id}/print")
            ->assertOk()
            ->assertJsonPath('data.tickets.0.status', 'printed');

        $firstPrintedAt = $transaction->tickets()->first()->printed_at;
        $this->assertNotNull($firstPrintedAt);

        // Reprint: still no new ticket / transaction rows.
        $this->withToken($token)
            ->postJson("/api/v1/counter/transactions/{$transaction->id}/print")
            ->assertOk();

        $this->assertSame(1, Transaction::count());
        $this->assertSame(2, Ticket::count());
        $this->assertSame($firstPrintedAt->timestamp, $transaction->tickets()->first()->printed_at->timestamp);
        $this->assertSame(TicketStatus::Printed, $transaction->tickets()->first()->status);

        $this->assertTrue(AuditLog::where('action', 'counter_transaction.tickets_printed')->exists());
        $this->assertTrue(AuditLog::where('action', 'counter_transaction.tickets_reprinted')->exists());
    }

    public function test_visitor_and_gate_staff_cannot_print_tickets(): void
    {
        $cashier = $this->user(Role::Cashier);
        $transaction = $this->createTransaction($cashier);
        $this->confirm($cashier, $transaction);

        $this->app['auth']->forgetGuards();

        foreach ([Role::Visitor, Role::GateStaff] as $role) {
            $user = $this->user($role);

            $this->withToken($this->token($user))
                ->postJson("/api/v1/counter/transactions/{$transaction->id}/print")
                ->assertStatus(403);

            $this->app['auth']->forgetGuards();
        }
    }

    public function test_audit_log_records_the_key_actions(): void
    {
        $cashier = $this->user(Role::Cashier);
        $transaction = $this->createTransaction($cashier);
        $this->confirm($cashier, $transaction);

        $this->withToken($this->token($cashier))
            ->postJson("/api/v1/counter/transactions/{$transaction->id}/print")
            ->assertOk();

        foreach (['counter_transaction.created', 'counter_transaction.payment_confirmed', 'counter_transaction.tickets_printed'] as $action) {
            $this->assertDatabaseHas('audit_logs', [
                'action' => $action,
                'user_id' => $cashier->id,
                'entity_type' => Transaction::class,
                'entity_id' => $transaction->id,
            ]);
        }
    }

    public function test_counter_tariffs_require_counter_role_and_return_active_tariffs(): void
    {
        $visitor = $this->user(Role::Visitor);

        $this->withToken($this->token($visitor))
            ->getJson('/api/v1/counter/tariffs')
            ->assertStatus(403);

        $this->app['auth']->forgetGuards();

        $cashier = $this->user(Role::Cashier);

        $this->withToken($this->token($cashier))
            ->getJson('/api/v1/counter/tariffs')
            ->assertOk()
            ->assertJsonPath('data.visitor_tariff.unit_tariff', 15000)
            ->assertJsonCount(3, 'data.vehicle_types');
    }

    private function createTransaction(User $cashier, int $visitorCount = 2): Transaction
    {
        $visitors = [];

        for ($i = 1; $i <= $visitorCount; $i++) {
            $visitors[] = ['full_name' => "Pengunjung {$i}", 'nik' => '3201234567890'.str_pad((string) $i, 3, '0', STR_PAD_LEFT)];
        }

        $this->withToken($this->token($cashier))
            ->postJson('/api/v1/counter/transactions', [
                'visit_date' => now()->toDateString(),
                'visitors' => $visitors,
                'vehicles' => [
                    ['vehicle_type_id' => $this->vehicleTypeId('motorcycle'), 'quantity' => 2],
                    ['vehicle_type_id' => $this->vehicleTypeId('car'), 'quantity' => 1],
                ],
            ])
            ->assertCreated();

        return Transaction::query()->latest('id')->firstOrFail();
    }

    private function confirm(User $cashier, Transaction $transaction): void
    {
        $this->withToken($this->token($cashier))
            ->postJson("/api/v1/counter/transactions/{$transaction->id}/confirm-payment")
            ->assertOk();
    }
}
