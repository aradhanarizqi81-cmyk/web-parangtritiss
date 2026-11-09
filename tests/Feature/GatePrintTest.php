<?php

namespace Tests\Feature;

use App\Enums\FacilityEntitlementStatus;
use App\Enums\Role;
use App\Enums\TicketStatus;
use App\Enums\TransactionSource;
use App\Enums\TransactionStatus;
use App\Models\AuditLog;
use App\Models\Ticket;
use App\Models\TicketFacilityEntitlement;
use App\Models\Transaction;
use App\Models\TransactionCheckin;
use App\Models\User;
use App\Models\VehicleType;
use Database\Seeders\FacilitySeeder;
use Database\Seeders\TariffSeeder;
use Database\Seeders\VehicleTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Pencetakan tiket fisik booking online di gerbang.
 *
 * Alur: pindai QR penukaran (`RDM-`) → lookup read-only → cetak eksplisit.
 * Hanya aksi cetak yang mengonsumsi token, dan konsumsi itu atomik. Pengujian
 * ini juga memastikan pencetakan bukan check-in gerbang, bukan klaim fasilitas,
 * dan tidak merusak penjualan loket.
 */
class GatePrintTest extends TestCase
{
    use RefreshDatabase;

    private const FACILITY = 'FREE_TEA';

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(TariffSeeder::class);
        $this->seed(VehicleTypeSeeder::class);
        $this->seed(FacilitySeeder::class);
    }

    private function user(Role $role): User
    {
        return User::factory()->create(['role' => $role]);
    }

    private function token(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

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

    private function booking(User $visitor, array $overrides = []): Transaction
    {
        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($visitor))
            ->postJson('/api/v1/bookings', $this->bookingPayload($overrides))
            ->assertCreated();

        return Transaction::query()->latest('id')->firstOrFail();
    }

    private function paidBooking(User $visitor, array $overrides = []): Transaction
    {
        $transaction = $this->booking($visitor, $overrides);

        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($visitor))
            ->postJson("/api/v1/bookings/{$transaction->id}/simulate-payment", [
                'outcome' => 'success',
                'reference' => (string) $transaction->payment()->value('reference'),
            ])
            ->assertOk();

        return $transaction->refresh();
    }

    private function paidCounter(User $cashier): Transaction
    {
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

    private function lookup(User $officer, string $code): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($this->token($officer))
            ->postJson('/api/v1/gate/print/lookup', ['code' => $code]);
    }

    private function printTickets(User $officer, string $code): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($this->token($officer))
            ->postJson('/api/v1/gate/print', ['code' => $code]);
    }

    private function checkIn(User $staff, Transaction $transaction): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($this->token($staff))
            ->postJson('/api/v1/gate/check-in', [
                'barcode_token' => $transaction->barcode_token,
            ]);
    }

    private function verify(User $officer, string $token): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($this->token($officer))
            ->postJson('/api/v1/counter/redemptions/verify', [
                'redemption_token' => $token,
            ]);
    }

    private function claim(User $officer, Ticket $ticket): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($this->token($officer))
            ->postJson('/api/v1/counter/facilities/claim', [
                'ticket_code' => $ticket->ticket_code,
                'facility_code' => self::FACILITY,
            ]);
    }

    private function ticket(Transaction $transaction, int $offset = 0): Ticket
    {
        return $transaction->tickets()->orderBy('id')->skip($offset)->firstOrFail();
    }

    public function test_lookup_returns_the_paid_booking_without_consuming_the_token(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->paidBooking($visitor);
        $gate = $this->user(Role::GateStaff);

        $response = $this->lookup($gate, (string) $transaction->redemption_token);

        $response
            ->assertOk()
            ->assertJsonPath('data.transaction_code', $transaction->transaction_code)
            ->assertJsonPath('data.owner.name', $visitor->name)
            ->assertJsonPath('data.visit_date', $transaction->visit_date?->toDateString())
            ->assertJsonPath('data.visitor_count', 2)
            ->assertJsonPath('data.payment.status', 'success')
            ->assertJsonPath('data.redemption.redeemed', false)
            ->assertJsonPath('data.redemption.can_redeem', true)
            ->assertJsonPath('data.tickets.0.printed_at', null)
            ->assertJsonCount(2, 'data.tickets');

        // Lookup is read-only: no consumption, no print, no audit of printing.
        $this->assertNull($transaction->fresh()->redeemed_at);
        $this->assertNull($this->ticket($transaction)->fresh()->printed_at);
        $this->assertSame(0, AuditLog::whereIn('action', [
            'gate.tickets_printed',
            'gate.tickets_reprinted',
        ])->count());
    }

    public function test_lookup_rejects_an_unpaid_booking(): void
    {
        $transaction = $this->booking($this->user(Role::Visitor));

        $this->lookup($this->user(Role::GateStaff), (string) $transaction->redemption_token)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Pembayaran booking ini belum berhasil.');

        $this->assertNull($transaction->fresh()->redeemed_at);
    }

    public function test_lookup_rejects_a_booking_cancelled_after_payment(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $transaction->forceFill(['status' => TransactionStatus::Cancelled])->save();

        $this->lookup($this->user(Role::GateStaff), (string) $transaction->redemption_token)
            ->assertStatus(422);

        $this->assertNull($transaction->fresh()->redeemed_at);
    }

    public function test_lookup_rejects_an_already_used_token(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $gate = $this->user(Role::GateStaff);
        $code = (string) $transaction->redemption_token;

        $first = $this->printTickets($gate, $code)->assertOk();
        $first->assertJsonPath('message', 'Tiket fisik berhasil dicetak.');

        $this->lookup($gate, $code)
            ->assertStatus(409)
            ->assertJsonPath('message', 'Booking ini sudah ditukarkan.');

        $this->assertNotNull($transaction->fresh()->redeemed_at);
    }

    public function test_unknown_ticket_codes_and_gate_barcodes_are_rejected(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $gate = $this->user(Role::GateStaff);

        $this->lookup($gate, 'RDM-UNKNOWN000000000000000000')->assertNotFound();
        $this->lookup($gate, (string) $transaction->barcode_token)->assertNotFound();
        $this->lookup($gate, (string) $transaction->tickets()->value('ticket_code'))->assertNotFound();

        $this->printTickets($gate, (string) $transaction->barcode_token)->assertNotFound();
        $this->printTickets($gate, (string) $transaction->tickets()->value('ticket_code'))->assertNotFound();

        $this->assertNull($transaction->fresh()->redeemed_at);
    }

    public function test_a_gate_barcode_field_is_rejected_by_validation(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $gate = $this->user(Role::GateStaff);

        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($gate))
            ->postJson('/api/v1/gate/print', [
                'barcode_token' => $transaction->barcode_token,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('barcode_token');

        $this->assertNull($transaction->fresh()->redeemed_at);
    }

    public function test_missing_code_is_a_validation_error(): void
    {
        $gate = $this->user(Role::GateStaff);

        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($gate))
            ->postJson('/api/v1/gate/print/lookup', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('code');
    }

    public function test_printing_consumes_the_token_and_prints_every_ticket_once(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $gate = $this->user(Role::GateStaff);

        $response = $this->printTickets($gate, (string) $transaction->redemption_token);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Tiket fisik berhasil dicetak.')
            ->assertJsonPath('data.redemption.redeemed', true)
            ->assertJsonPath('data.redemption.redeemed_by.id', $gate->id)
            ->assertJsonCount(2, 'data.tickets');

        $fresh = $transaction->fresh();

        $this->assertNotNull($fresh->redeemed_at);
        $this->assertSame($gate->id, $fresh->redeemed_by_user_id);
        $this->assertSame(2, $fresh->tickets()->count());

        $fresh->tickets()->get()->each(function (Ticket $ticket): void {
            $this->assertSame(TicketStatus::Printed, $ticket->status);
            $this->assertNotNull($ticket->printed_at);
        });

        $this->assertSame(1, AuditLog::where('action', 'gate.tickets_printed')->count());
        $this->assertSame(0, AuditLog::where('action', 'gate.tickets_reprinted')->count());
    }

    public function test_a_second_print_is_rejected_without_touching_the_first_consumption(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $gate = $this->user(Role::GateStaff);
        $code = (string) $transaction->redemption_token;

        $this->printTickets($gate, $code)->assertOk();

        $firstRedeemedAt = $transaction->fresh()->redeemed_at;
        $firstPrintedAt = $this->ticket($transaction)->fresh()->printed_at;

        $this->printTickets($gate, $code)
            ->assertStatus(409)
            ->assertJsonPath('message', 'Booking ini sudah ditukarkan.');

        $fresh = $transaction->fresh();

        $this->assertSame(
            $firstRedeemedAt?->toDateTimeString(),
            $fresh->redeemed_at?->toDateTimeString(),
        );
        $this->assertSame(
            $firstPrintedAt?->toDateTimeString(),
            $this->ticket($transaction)->fresh()->printed_at?->toDateTimeString(),
        );
        $this->assertSame(1, AuditLog::where('action', 'gate.tickets_printed')->count());
        $this->assertSame(0, AuditLog::where('action', 'gate.tickets_reprinted')->count());
    }

    public function test_the_atomic_guard_allows_only_one_consumption_writer(): void
    {
        // Parallel requests are not reproducible in a single process, so the
        // database-level guard itself is exercised: the conditional UPDATE only
        // affects a still-unredeemed row, so a racing second writer meets zero.
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $gate = $this->user(Role::GateStaff);

        $consume = fn () => Transaction::query()
            ->whereKey($transaction->getKey())
            ->whereNull('redeemed_at')
            ->update([
                'redeemed_at' => now(),
                'redeemed_by_user_id' => $gate->id,
            ]);

        $this->assertSame(1, $consume());
        $this->assertSame(0, $consume());
    }

    public function test_printing_is_not_a_gate_check_in(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $gate = $this->user(Role::GateStaff);

        $this->printTickets($gate, (string) $transaction->redemption_token)->assertOk();

        $this->assertSame(0, TransactionCheckin::count());
        $this->assertSame(TransactionStatus::Paid, $transaction->fresh()->status);
        $this->assertSame(0, AuditLog::where('action', 'gate.checked_in')->count());
    }

    public function test_check_in_still_works_after_printing_and_still_rejects_redemption_codes(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $gate = $this->user(Role::GateStaff);

        $this->printTickets($gate, (string) $transaction->redemption_token)->assertOk();

        // The RDM- guard remains: a redemption code is not a gate barcode.
        $this->app['auth']->forgetGuards();
        $this->withToken($this->token($gate))
            ->postJson('/api/v1/gate/check-in', [
                'barcode_token' => (string) $transaction->redemption_token,
            ])
            ->assertNotFound();

        $this->checkIn($gate, $transaction)
            ->assertCreated()
            ->assertJsonPath('data.validated_by.id', $gate->id);

        $this->assertSame(1, TransactionCheckin::count());
        $this->assertSame(TransactionStatus::CheckedIn, $transaction->fresh()->status);
    }

    public function test_printing_never_claims_facility_entitlements(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $gate = $this->user(Role::GateStaff);

        $this->assertSame(2, TicketFacilityEntitlement::count());

        $this->printTickets($gate, (string) $transaction->redemption_token)->assertOk();

        TicketFacilityEntitlement::query()->get()->each(function (
            TicketFacilityEntitlement $entitlement,
        ): void {
            $this->assertSame(FacilityEntitlementStatus::Granted, $entitlement->status);
            $this->assertNull($entitlement->redeemed_at);
            $this->assertNull($entitlement->redeemed_by_user_id);
        });

        // The normal facility flow is untouched afterwards: check in, then claim.
        $this->checkIn($gate, $transaction)->assertCreated();

        $this->claim($this->user(Role::Cashier), $this->ticket($transaction))
            ->assertOk();
    }

    public function test_a_booking_printed_elsewhere_can_still_be_printed_at_the_gate_as_a_reprint(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->paidBooking($visitor);

        // The visitor prints the wristband from the booking page: tickets get
        // printed_at, but the redemption token is still unused.
        $this->app['auth']->forgetGuards();
        $this->withToken($this->token($visitor))
            ->postJson("/api/v1/bookings/{$transaction->id}/print")
            ->assertOk();

        $this->assertNull($transaction->fresh()->redeemed_at);

        $this->printTickets(
            $this->user(Role::GateStaff),
            (string) $transaction->redemption_token,
        )
            ->assertOk()
            ->assertJsonPath('data.redemption.redeemed', true);

        $this->assertSame(1, AuditLog::where('action', 'gate.tickets_reprinted')->count());
        $this->assertSame(0, AuditLog::where('action', 'gate.tickets_printed')->count());
    }

    public function test_loket_two_verification_is_read_only_and_the_booking_remains_printable(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $cashier = $this->user(Role::Cashier);

        $this->verify($cashier, (string) $transaction->redemption_token)
            ->assertOk()
            ->assertJsonPath(
                'message',
                'Booking terverifikasi. Silakan menuju gate untuk pencetakan tiket fisik.',
            )
            ->assertJsonPath('data.redemption.redeemed', false);

        $fresh = $transaction->fresh();

        $this->assertNull($fresh->redeemed_at);
        $this->assertNull($fresh->redeemed_by_user_id);
        $this->assertNull($this->ticket($transaction)->fresh()->printed_at);
        $this->assertSame(0, TransactionCheckin::count());
        $this->assertSame(1, AuditLog::where('action', 'counter_redemption.verified')->count());

        // Verification must not burn the token: the gate can still print.
        $this->printTickets(
            $this->user(Role::GateStaff),
            (string) $transaction->redemption_token,
        )->assertOk();

        $this->assertNotNull($transaction->fresh()->redeemed_at);
    }

    public function test_a_paid_offline_sale_is_unaffected_and_never_printable_at_the_gate(): void
    {
        $cashier = $this->user(Role::Cashier);
        $transaction = $this->paidCounter($cashier);

        $this->assertSame(TransactionSource::Counter, $transaction->source);
        $this->assertNull($transaction->redemption_token);

        // Its gate barcode is not a redemption code, so gate printing rejects it.
        $this->lookup($this->user(Role::GateStaff), (string) $transaction->barcode_token)
            ->assertNotFound();
        $this->printTickets($this->user(Role::GateStaff), (string) $transaction->barcode_token)
            ->assertNotFound();

        // The offline sale still checks in normally at the gate.
        $this->checkIn($this->user(Role::GateStaff), $transaction)
            ->assertCreated();

        $this->assertSame(1, TransactionCheckin::count());
        $this->assertNull($transaction->fresh()->redeemed_at);
    }

    public function test_only_gate_staff_and_admins_may_print(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $code = (string) $transaction->redemption_token;

        // Anonymous.
        $this->app['auth']->forgetGuards();
        $this->flushHeaders();
        $this->postJson('/api/v1/gate/print/lookup', ['code' => $code])
            ->assertUnauthorized();

        // Wrong roles.
        foreach ([Role::Visitor, Role::Cashier] as $role) {
            $this->lookup($this->user($role), $code)->assertForbidden();
            $this->printTickets($this->user($role), $code)->assertForbidden();
        }

        $this->assertNull($transaction->fresh()->redeemed_at);

        // Admin is allowed, mirroring the gate policy.
        $this->lookup($this->user(Role::Admin), $code)->assertOk();
        $this->printTickets($this->user(Role::Admin), $code)
            ->assertOk()
            ->assertJsonPath('data.redemption.redeemed', true);
    }

    public function test_responses_and_audit_never_expose_nik_or_the_redemption_token(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->paidBooking($visitor);
        $gate = $this->user(Role::GateStaff);
        $code = (string) $transaction->redemption_token;
        $reference = (string) $transaction->payment()->value('reference');

        $lookupBody = (string) $this->lookup($gate, $code)->assertOk()->getContent();
        $printBody = (string) $this->printTickets($gate, $code)->assertOk()->getContent();

        foreach ([$lookupBody, $printBody] as $body) {
            $this->assertStringNotContainsString($code, $body);
            $this->assertStringNotContainsString('3201234567890123', $body);
            $this->assertStringNotContainsString($reference, $body);
        }

        AuditLog::query()->get()->each(function (AuditLog $log): void {
            $metadata = json_encode($log->metadata ?? []);

            $this->assertStringNotContainsString('3201234567890123', (string) $metadata);
            $this->assertStringNotContainsString('RDM-', (string) $metadata);
        });
    }
}
