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
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class BookingTest extends TestCase
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
            'visit_date' => now()->addDay()->toDateString(),
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

    private function createBooking(User $visitor, array $overrides = []): Transaction
    {
        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($visitor))
            ->postJson('/api/v1/bookings', $this->payload($overrides))
            ->assertCreated();

        return Transaction::query()->latest('id')->firstOrFail();
    }

    private function simulate(User $user, Transaction $transaction, string $outcome): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($this->token($user))
            ->postJson("/api/v1/bookings/{$transaction->id}/simulate-payment", [
                'outcome' => $outcome,
                'reference' => (string) $transaction->payment()->value('reference'),
            ]);
    }

    public function test_only_visitors_may_create_bookings(): void
    {
        $visitor = $this->user(Role::Visitor);

        $this->withToken($this->token($visitor))
            ->postJson('/api/v1/bookings', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.source', 'online')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.visitor_count', 2)
            ->assertJsonPath('data.total_amount', 39000)
            ->assertJsonCount(0, 'data.tickets')
            ->assertJsonPath('data.payment.method', 'simulation')
            ->assertJsonPath('data.payment.status', 'pending');

        $this->assertSame(1, Transaction::count());
    }

    public function test_staff_and_anonymous_cannot_create_bookings(): void
    {
        $this->postJson('/api/v1/bookings', $this->payload())->assertUnauthorized();

        foreach ([Role::Admin, Role::Cashier, Role::GateStaff] as $role) {
            $this->app['auth']->forgetGuards();
            $user = $this->user($role);

            $this->withToken($this->token($user))
                ->postJson('/api/v1/bookings', $this->payload())
                ->assertStatus(403);
        }

        $this->assertSame(0, Transaction::count());
    }

    public function test_booking_owner_comes_from_the_authenticated_session(): void
    {
        $visitor = $this->user(Role::Visitor);
        $other = $this->user(Role::Visitor);

        $this->withToken($this->token($visitor))
            ->postJson('/api/v1/bookings', $this->payload([
                'user_id' => $other->id,
                'source' => 'counter',
                'status' => 'paid',
            ]))
            ->assertCreated();

        $transaction = Transaction::firstOrFail();

        // Client-supplied ownership/source/status are ignored entirely.
        $this->assertSame($visitor->id, $transaction->user_id);
        $this->assertSame(TransactionSource::Online, $transaction->source);
        $this->assertSame(TransactionStatus::Pending, $transaction->status);
        $this->assertNull($transaction->cashier_user_id);
    }

    public function test_totals_are_computed_by_the_backend(): void
    {
        $visitor = $this->user(Role::Visitor);

        $this->withToken($this->token($visitor))
            ->postJson('/api/v1/bookings', $this->payload(['client_total_amount' => 1]))
            ->assertCreated()
            ->assertJsonPath('data.visitor_unit_tariff', 15000)
            ->assertJsonPath('data.visitor_total', 30000)
            ->assertJsonPath('data.vehicle_total', 9000)
            ->assertJsonPath('data.total_amount', 39000);

        $this->assertSame(39000, Transaction::firstOrFail()->total_amount);
    }

    public function test_pricing_follows_the_current_database_tariff(): void
    {
        Tariff::query()->where('code', 'visitor')->update(['unit_tariff' => 20000]);
        VehicleType::query()->where('code', 'car')->update(['unit_tariff' => 7000]);

        $visitor = $this->user(Role::Visitor);

        // 2*20000 + 2*2000 + 1*7000 = 51000.
        $this->withToken($this->token($visitor))
            ->postJson('/api/v1/bookings', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.visitor_total', 40000)
            ->assertJsonPath('data.vehicle_total', 11000)
            ->assertJsonPath('data.total_amount', 51000);
    }

    public function test_tariff_snapshot_is_immutable_after_tariff_change(): void
    {
        $visitor = $this->user(Role::Visitor);
        $this->createBooking($visitor);

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

    public function test_booking_records_visitors_vehicles_and_payment_but_no_tickets(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->createBooking($visitor);

        $this->assertSame(2, $transaction->visitors()->count());
        $this->assertSame(2, $transaction->transactionVehicles()->count());
        $this->assertSame(1, $transaction->payment()->count());

        // Tickets are only issued once payment succeeds.
        $this->assertSame(0, $transaction->tickets()->count());
        $this->assertSame(0, Ticket::count());

        $payment = $transaction->payment()->firstOrFail();
        $this->assertSame(PaymentMethod::Simulation, $payment->method);
        $this->assertSame(PaymentStatus::Pending, $payment->status);
        $this->assertNotNull($payment->reference);
        $this->assertStringStartsWith('SIM-', (string) $payment->reference);
    }

    public function test_a_visitor_cannot_read_another_users_booking(): void
    {
        $owner = $this->user(Role::Visitor);
        $intruder = $this->user(Role::Visitor);
        $transaction = $this->createBooking($owner);

        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($intruder))
            ->getJson("/api/v1/bookings/{$transaction->id}")
            ->assertStatus(403);
    }

    public function test_staff_cannot_read_bookings_but_admin_can(): void
    {
        $owner = $this->user(Role::Visitor);
        $transaction = $this->createBooking($owner);

        $this->app['auth']->forgetGuards();
        $admin = $this->user(Role::Admin);
        $this->withToken($this->token($admin))
            ->getJson("/api/v1/bookings/{$transaction->id}")
            ->assertOk()
            ->assertJsonPath('data.transaction_code', $transaction->transaction_code);

        foreach ([Role::Cashier, Role::GateStaff] as $role) {
            $this->app['auth']->forgetGuards();
            $staff = $this->user($role);

            $this->withToken($this->token($staff))
                ->getJson("/api/v1/bookings/{$transaction->id}")
                ->assertStatus(403);
        }
    }

    public function test_a_simulated_success_settles_payment_and_issues_one_ticket_per_visitor(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->createBooking($visitor);

        $this->simulate($visitor, $transaction, 'success')
            ->assertOk()
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.payment.status', 'success')
            ->assertJsonCount(2, 'data.tickets')
            ->assertJsonPath('data.tickets.0.status', 'issued');

        $transaction->refresh();
        $payment = $transaction->payment()->firstOrFail();

        $this->assertSame(TransactionStatus::Paid, $transaction->status);
        $this->assertSame(PaymentStatus::Success, $payment->status);
        $this->assertNotNull($payment->paid_at);
        $this->assertSame($transaction->visitor_count, $transaction->tickets()->count());
        $this->assertCount(2, $transaction->tickets()->pluck('ticket_code')->unique());

        // A successful payment must never record an arrival.
        $this->assertFalse($transaction->isCheckedIn());
        $this->assertSame(0, $transaction->checkin()->count());
        $this->assertDatabaseCount('transaction_checkins', 0);

        $this->assertTrue(AuditLog::where('action', 'booking.payment_simulated_success')->exists());
    }

    public function test_a_simulated_failure_does_not_mark_the_booking_paid(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->createBooking($visitor);

        $this->simulate($visitor, $transaction, 'failure')
            ->assertOk()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.payment.status', 'failed')
            ->assertJsonCount(0, 'data.tickets');

        $transaction->refresh();
        $payment = $transaction->payment()->firstOrFail();

        $this->assertSame(TransactionStatus::Pending, $transaction->status);
        $this->assertSame(PaymentStatus::Failed, $payment->status);
        $this->assertNull($payment->paid_at);
        $this->assertSame(0, $transaction->tickets()->count());
        $this->assertTrue(AuditLog::where('action', 'booking.payment_simulated_failed')->exists());
    }

    public function test_a_failed_simulation_can_be_retried_until_it_succeeds(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->createBooking($visitor);

        $this->simulate($visitor, $transaction, 'failure')->assertOk();
        $this->assertSame(TransactionStatus::Pending, $transaction->fresh()->status);

        $this->simulate($visitor, $transaction, 'success')->assertOk();

        $transaction->refresh();
        $this->assertSame(TransactionStatus::Paid, $transaction->status);
        $this->assertSame(PaymentStatus::Success, $transaction->payment()->value('status'));
        $this->assertSame(2, $transaction->tickets()->count());
        // Still a single payment row throughout.
        $this->assertSame(1, Payment::count());
    }

    public function test_a_second_successful_simulation_is_rejected(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->createBooking($visitor);

        $this->simulate($visitor, $transaction, 'success')->assertOk();

        $this->simulate($visitor, $transaction, 'success')->assertStatus(409);

        // No second payment, no duplicate tickets.
        $this->assertSame(1, Payment::count());
        $this->assertSame(PaymentStatus::Success, Payment::firstOrFail()->status);
        $this->assertSame(2, Ticket::count());
    }

    public function test_a_failure_after_success_is_rejected(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->createBooking($visitor);

        $this->simulate($visitor, $transaction, 'success')->assertOk();

        $this->simulate($visitor, $transaction, 'failure')->assertStatus(409);

        $this->assertSame(TransactionStatus::Paid, $transaction->fresh()->status);
        $this->assertSame(PaymentStatus::Success, Payment::firstOrFail()->status);
    }

    public function test_only_the_owner_may_simulate_payment(): void
    {
        $owner = $this->user(Role::Visitor);
        $transaction = $this->createBooking($owner);
        $reference = (string) $transaction->payment()->value('reference');

        $others = [
            $this->user(Role::Visitor),
            $this->user(Role::Admin),
            $this->user(Role::Cashier),
            $this->user(Role::GateStaff),
        ];

        foreach ($others as $other) {
            $this->app['auth']->forgetGuards();

            $this->withToken($this->token($other))
                ->postJson("/api/v1/bookings/{$transaction->id}/simulate-payment", [
                    'outcome' => 'success',
                    'reference' => $reference,
                ])
                ->assertStatus(403);
        }

        $this->assertSame(TransactionStatus::Pending, $transaction->fresh()->status);
        $this->assertSame(0, Ticket::count());
        $this->assertSame(PaymentStatus::Pending, Payment::firstOrFail()->status);
    }

    public function test_a_wrong_simulation_reference_is_rejected(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->createBooking($visitor);

        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($visitor))
            ->postJson("/api/v1/bookings/{$transaction->id}/simulate-payment", [
                'outcome' => 'success',
                'reference' => 'SIM-NOT-THE-ISSUED-REFERENCE',
            ])
            ->assertStatus(422);

        $this->assertSame(TransactionStatus::Pending, $transaction->fresh()->status);
        $this->assertSame(0, Ticket::count());
        $this->assertSame(PaymentStatus::Pending, Payment::firstOrFail()->status);
    }

    public function test_an_unknown_simulation_outcome_is_rejected(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->createBooking($visitor);

        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($visitor))
            ->postJson("/api/v1/bookings/{$transaction->id}/simulate-payment", [
                'outcome' => 'refunded',
                'reference' => (string) $transaction->payment()->value('reference'),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['outcome']);
    }

    public function test_tickets_can_only_be_printed_after_payment(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->createBooking($visitor);

        $this->app['auth']->forgetGuards();

        // Unpaid: printing is refused.
        $this->withToken($this->token($visitor))
            ->postJson("/api/v1/bookings/{$transaction->id}/print")
            ->assertStatus(422);

        $this->simulate($visitor, $transaction, 'success')->assertOk();

        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($visitor))
            ->postJson("/api/v1/bookings/{$transaction->id}/print")
            ->assertOk()
            ->assertJsonPath('data.tickets.0.status', 'printed');

        $firstPrintedAt = $transaction->tickets()->first()->printed_at;
        $this->assertNotNull($firstPrintedAt);

        // Reprint: no new ticket or transaction rows.
        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($visitor))
            ->postJson("/api/v1/bookings/{$transaction->id}/print")
            ->assertOk();

        $this->assertSame(1, Transaction::count());
        $this->assertSame(2, Ticket::count());
        $this->assertSame(
            $firstPrintedAt->timestamp,
            $transaction->tickets()->first()->printed_at->timestamp,
        );
        $this->assertSame(TicketStatus::Printed, $transaction->tickets()->first()->status);
        $this->assertTrue(AuditLog::where('action', 'booking.tickets_printed')->exists());
        $this->assertTrue(AuditLog::where('action', 'booking.tickets_reprinted')->exists());
    }

    public function test_a_visitor_cannot_print_another_users_booking_tickets(): void
    {
        $owner = $this->user(Role::Visitor);
        $intruder = $this->user(Role::Visitor);
        $transaction = $this->createBooking($owner);
        $this->simulate($owner, $transaction, 'success')->assertOk();

        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($intruder))
            ->postJson("/api/v1/bookings/{$transaction->id}/print")
            ->assertStatus(403);
    }

    public function test_booking_history_shows_only_the_visitors_own_bookings(): void
    {
        $first = $this->user(Role::Visitor);
        $second = $this->user(Role::Visitor);

        $this->createBooking($first);
        $this->createBooking($first);
        $this->createBooking($second);

        $this->app['auth']->forgetGuards();
        $this->withToken($this->token($first))
            ->getJson('/api/v1/bookings')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->app['auth']->forgetGuards();
        $this->withToken($this->token($second))
            ->getJson('/api/v1/bookings')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        // An admin sees every online booking administratively.
        $admin = $this->user(Role::Admin);
        $this->app['auth']->forgetGuards();
        $this->withToken($this->token($admin))
            ->getJson('/api/v1/bookings')
            ->assertOk()
            ->assertJsonCount(3, 'data');
    }

    public function test_counter_transactions_are_not_reachable_through_the_booking_api(): void
    {
        $counter = Transaction::create([
            'source' => TransactionSource::Counter,
            'visit_date' => now()->toDateString(),
            'visitor_count' => 1,
            'visitor_unit_tariff' => 15000,
            'visitor_total' => 15000,
            'vehicle_total' => 0,
            'total_amount' => 15000,
        ]);

        $visitor = $this->user(Role::Visitor);

        $this->withToken($this->token($visitor))
            ->getJson("/api/v1/bookings/{$counter->id}")
            ->assertStatus(403);

        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($visitor))
            ->postJson("/api/v1/bookings/{$counter->id}/simulate-payment", [
                'outcome' => 'success',
                'reference' => 'SIM-anything',
            ])
            ->assertStatus(403);
    }

    public function test_invalid_booking_data_rolls_back_without_partial_rows(): void
    {
        $visitor = $this->user(Role::Visitor);

        $payload = $this->payload();
        $payload['visitors'][1]['nik'] = '123';

        $this->withToken($this->token($visitor))
            ->postJson('/api/v1/bookings', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['visitors.1.nik']);

        $this->assertSame(0, Transaction::count());
        $this->assertSame(0, Ticket::count());
        $this->assertSame(0, Payment::count());
        $this->assertDatabaseCount('visitors', 0);
        $this->assertDatabaseCount('transaction_vehicles', 0);
    }

    public function test_visit_date_outside_allowed_window_is_rejected(): void
    {
        $visitor = $this->user(Role::Visitor);

        $this->withToken($this->token($visitor))
            ->postJson('/api/v1/bookings', $this->payload([
                'visit_date' => now()->subDay()->toDateString(),
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['visit_date']);

        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($visitor))
            ->postJson('/api/v1/bookings', $this->payload([
                'visit_date' => now()->addDays(31)->toDateString(),
            ]))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['visit_date']);
    }

    public function test_booking_tariffs_follow_the_booking_role(): void
    {
        $cashier = $this->user(Role::Cashier);

        $this->withToken($this->token($cashier))
            ->getJson('/api/v1/booking/tariffs')
            ->assertStatus(403);

        $this->app['auth']->forgetGuards();
        $visitor = $this->user(Role::Visitor);

        $this->withToken($this->token($visitor))
            ->getJson('/api/v1/booking/tariffs')
            ->assertOk()
            ->assertJsonPath('data.visitor_tariff.unit_tariff', 15000)
            ->assertJsonCount(3, 'data.vehicle_types');
    }

    public function test_nik_is_never_exposed_in_response_or_audit_log(): void
    {
        $visitor = $this->user(Role::Visitor);
        $nik = '3201234567890123';

        $response = $this->withToken($this->token($visitor))
            ->postJson('/api/v1/bookings', $this->payload())
            ->assertCreated();

        $content = $response->getContent();

        $this->assertStringNotContainsString($nik, $content);
        $this->assertStringContainsString('3201********0123', $content);
        $this->assertArrayNotHasKey('nik', $response->json('data.visitors.0'));

        $transaction = Transaction::firstOrFail();
        $this->simulate($visitor, $transaction, 'success')->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withToken($this->token($visitor))
            ->postJson("/api/v1/bookings/{$transaction->id}/print")
            ->assertOk();

        foreach (AuditLog::all() as $log) {
            $this->assertStringNotContainsString($nik, (string) json_encode($log->metadata));
        }
    }
}
