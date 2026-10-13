<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Enums\TicketStatus;
use App\Enums\TransactionStatus;
use App\Models\AuditLog;
use App\Models\Transaction;
use App\Models\TransactionCheckin;
use App\Models\User;
use App\Models\VehicleType;
use Database\Seeders\TariffSeeder;
use Database\Seeders\VehicleTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class GateCheckinTest extends TestCase
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

    /**
     * The visit date is validated in the venue timezone, which may differ from
     * the application (UTC) around midnight. Tests therefore pin both the
     * booking and the expected "today" to the venue timezone.
     */
    private function venueToday(): string
    {
        return now(config('visit.timezone'))->toDateString();
    }

    private function vehicleTypeId(string $code): int
    {
        return (int) VehicleType::where('code', $code)->value('id');
    }

    /**
     * @return array<string, mixed>
     */
    private function bookingPayload(array $overrides = []): array
    {
        return [
            'visit_date' => $this->venueToday(),
            'visitors' => [
                ['full_name' => 'Budi Santoso', 'nik' => '3201234567890123'],
                ['full_name' => 'Siti Aminah', 'nik' => '3201234567890124'],
            ],
            'vehicles' => [
                ['vehicle_type_id' => $this->vehicleTypeId('motorcycle'), 'quantity' => 2],
            ],
            ...$overrides,
        ];
    }

    /**
     * Create an online booking owned by $visitor and settle its simulated
     * payment, leaving the transaction in the `paid` state.
     */
    private function paidBooking(User $visitor, array $overrides = []): Transaction
    {
        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($visitor))
            ->postJson('/api/v1/bookings', $this->bookingPayload($overrides))
            ->assertCreated();

        $transaction = Transaction::query()->latest('id')->firstOrFail();

        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($visitor))
            ->postJson("/api/v1/bookings/{$transaction->id}/simulate-payment", [
                'outcome' => 'success',
                'reference' => (string) $transaction->payment()->value('reference'),
            ])
            ->assertOk();

        return $transaction->refresh();
    }

    /**
     * Create a counter sale and confirm its cash payment, leaving the
     * transaction in the `paid` state.
     */
    private function paidCounter(): Transaction
    {
        $cashier = $this->user(Role::Cashier);

        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($cashier))
            ->postJson('/api/v1/counter/transactions', [
                'visit_date' => $this->venueToday(),
                'visitors' => [
                    ['full_name' => 'Loket Satu', 'nik' => '3201234567890123'],
                    ['full_name' => 'Loket Dua', 'nik' => '3201234567890124'],
                ],
            ])
            ->assertCreated();

        $transaction = Transaction::query()->latest('id')->firstOrFail();

        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($cashier))
            ->postJson("/api/v1/counter/transactions/{$transaction->id}/confirm-payment")
            ->assertOk();

        return $transaction->refresh();
    }

    private function checkIn(User $staff, string $barcodeToken): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($this->token($staff))
            ->postJson('/api/v1/gate/check-in', ['barcode_token' => $barcodeToken]);
    }

    public function test_gate_staff_can_check_in_a_paid_online_booking(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->paidBooking($visitor);
        $gate = $this->user(Role::GateStaff);

        $response = $this->checkIn($gate, $transaction->barcode_token);

        $response
            ->assertCreated()
            ->assertJsonPath('data.transaction_code', $transaction->transaction_code)
            ->assertJsonPath('data.source', 'online')
            ->assertJsonPath('data.status', 'checked_in')
            ->assertJsonPath('data.status_label', 'Sudah Check-in')
            ->assertJsonPath('data.visitor_count', 2)
            ->assertJsonPath('data.validated_by.id', $gate->id);

        $this->assertSame(1, TransactionCheckin::count());

        $checkin = TransactionCheckin::firstOrFail();
        $this->assertSame($transaction->id, $checkin->transaction_id);
        $this->assertSame($gate->id, $checkin->validated_by);
        $this->assertSame(2, $checkin->visitor_count_checked_in);
        $this->assertNotNull($checkin->checked_in_at);

        $this->assertSame(TransactionStatus::CheckedIn, $transaction->fresh()->status);

        AuditLog::where('action', 'gate.checked_in')->firstOrFail();
    }

    public function test_gate_staff_can_check_in_a_paid_counter_transaction(): void
    {
        $transaction = $this->paidCounter();
        $gate = $this->user(Role::GateStaff);

        $this->checkIn($gate, $transaction->barcode_token)
            ->assertCreated()
            ->assertJsonPath('data.source', 'counter')
            ->assertJsonPath('data.status', 'checked_in')
            ->assertJsonPath('data.visitor_count', 2);

        $this->assertSame(
            TransactionStatus::CheckedIn,
            $transaction->fresh()->status,
        );
        $this->assertSame(1, TransactionCheckin::count());
    }

    public function test_check_in_marks_the_tickets_as_used(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->paidBooking($visitor);
        $gate = $this->user(Role::GateStaff);

        $this->checkIn($gate, $transaction->barcode_token)->assertCreated();

        $transaction->refresh()->tickets()->get()->each(
            fn ($ticket) => $this->assertSame(TicketStatus::Used, $ticket->status),
        );
    }

    public function test_unpaid_transaction_is_rejected(): void
    {
        $visitor = $this->user(Role::Visitor);

        $this->app['auth']->forgetGuards();
        $this->withToken($this->token($visitor))
            ->postJson('/api/v1/bookings', $this->bookingPayload())
            ->assertCreated();

        $transaction = Transaction::query()->latest('id')->firstOrFail();
        $gate = $this->user(Role::GateStaff);

        $this->checkIn($gate, $transaction->barcode_token)->assertStatus(422);

        $this->assertSame(0, TransactionCheckin::count());
        $this->assertSame(TransactionStatus::Pending, $transaction->fresh()->status);
    }

    public function test_failed_payment_is_rejected(): void
    {
        $visitor = $this->user(Role::Visitor);

        $this->app['auth']->forgetGuards();
        $this->withToken($this->token($visitor))
            ->postJson('/api/v1/bookings', $this->bookingPayload())
            ->assertCreated();

        $transaction = Transaction::query()->latest('id')->firstOrFail();

        $this->app['auth']->forgetGuards();
        $this->withToken($this->token($visitor))
            ->postJson("/api/v1/bookings/{$transaction->id}/simulate-payment", [
                'outcome' => 'failure',
                'reference' => (string) $transaction->payment()->value('reference'),
            ])
            ->assertOk();

        $gate = $this->user(Role::GateStaff);

        $this->checkIn($gate, $transaction->barcode_token)->assertStatus(422);

        $this->assertSame(0, TransactionCheckin::count());
        $this->assertSame(TransactionStatus::Pending, $transaction->fresh()->status);
    }

    public function test_unknown_barcode_is_rejected_without_leaking_details(): void
    {
        $this->paidBooking($this->user(Role::Visitor));
        $gate = $this->user(Role::GateStaff);

        $response = $this->checkIn($gate, 'not-a-real-barcode-token-000000000000');

        $response->assertNotFound();

        // A bare message only: no transaction payload is disclosed.
        $this->assertArrayNotHasKey('data', $response->json());
        $this->assertSame(0, TransactionCheckin::count());
    }

    public function test_a_transaction_can_only_be_checked_in_once(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $gate = $this->user(Role::GateStaff);

        $this->checkIn($gate, $transaction->barcode_token)->assertCreated();
        $this->checkIn($gate, $transaction->barcode_token)->assertStatus(409);

        $this->assertSame(1, TransactionCheckin::count());
        $this->assertSame(
            TransactionStatus::CheckedIn,
            $transaction->fresh()->status,
        );
    }

    public function test_visitors_cashiers_and_anonymous_cannot_check_in(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));

        // Drop the Bearer token left over from the helper above so this request
        // is genuinely anonymous.
        $this->app['auth']->forgetGuards();
        $this->flushHeaders();

        $this->postJson('/api/v1/gate/check-in', [
            'barcode_token' => $transaction->barcode_token,
        ])->assertUnauthorized();

        foreach ([Role::Visitor, Role::Cashier] as $role) {
            $this->checkIn(
                $this->user($role),
                $transaction->barcode_token,
            )->assertStatus(403);
        }

        $this->assertSame(0, TransactionCheckin::count());
    }

    public function test_admin_can_check_in(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $admin = $this->user(Role::Admin);

        $this->checkIn($admin, $transaction->barcode_token)
            ->assertCreated()
            ->assertJsonPath('data.validated_by.id', $admin->id);
    }

    public function test_missing_barcode_token_is_a_validation_error(): void
    {
        $gate = $this->user(Role::GateStaff);

        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($gate))
            ->postJson('/api/v1/gate/check-in', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('barcode_token');
    }

    public function test_check_in_is_only_valid_on_the_visit_date(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->paidBooking($visitor);

        // Move the visit to another day, leaving the payment intact.
        $transaction->forceFill([
            'visit_date' => now(config('visit.timezone'))->addDays(2)->toDateString(),
        ])->save();

        $gate = $this->user(Role::GateStaff);

        $this->checkIn($gate, $transaction->barcode_token)
            ->assertStatus(422);

        $this->assertSame(0, TransactionCheckin::count());
        $this->assertSame(TransactionStatus::Paid, $transaction->fresh()->status);
    }

    public function test_response_and_audit_never_expose_nik_or_the_barcode_token(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $gate = $this->user(Role::GateStaff);

        $response = $this->checkIn($gate, $transaction->barcode_token);
        $response->assertCreated();

        $body = (string) $response->getContent();
        $this->assertStringNotContainsString($transaction->barcode_token, $body);
        $this->assertStringNotContainsString('nik', $body);

        $audit = AuditLog::where('action', 'gate.checked_in')->firstOrFail();
        $metadata = (string) json_encode($audit->metadata);

        $this->assertStringNotContainsString($transaction->barcode_token, $metadata);
        $this->assertStringNotContainsString('nik', $metadata);
    }

    public function test_a_failed_write_leaves_no_check_in_and_no_status_change(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $gate = $this->user(Role::GateStaff);

        // Force the check-in row creation to blow up mid-transaction.
        TransactionCheckin::creating(function (): void {
            throw new \RuntimeException('forced failure');
        });

        try {
            $this->checkIn($gate, $transaction->barcode_token)->assertStatus(500);
        } finally {
            TransactionCheckin::flushEventListeners();
        }

        // The whole unit of work rolled back: no record, no status flip, no
        // audit entry, and the tickets stay unconsumed.
        $this->assertSame(0, TransactionCheckin::count());
        $this->assertSame(TransactionStatus::Paid, $transaction->fresh()->status);
        $this->assertSame(0, AuditLog::where('action', 'gate.checked_in')->count());
        $transaction->refresh()->tickets()->get()->each(
            fn ($ticket) => $this->assertNotSame(TicketStatus::Used, $ticket->status),
        );
    }
}
