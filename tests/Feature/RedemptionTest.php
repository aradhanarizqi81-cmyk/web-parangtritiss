<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Enums\TicketStatus;
use App\Enums\TransactionSource;
use App\Enums\TransactionStatus;
use App\Models\AuditLog;
use App\Models\Ticket;
use App\Models\Transaction;
use App\Models\TransactionCheckin;
use App\Models\User;
use App\Models\VehicleType;
use Database\Seeders\TariffSeeder;
use Database\Seeders\VehicleTypeSeeder;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Penukaran tiket fisik booking online di loket (Fase A–G).
 *
 * Menguji alur lewat HTTP API /api/v1 seperti yang dipanggil frontend: kode
 * penukaran hanya untuk booking online yang sudah lunas, tidak dapat ditebak,
 * tidak dapat dipakai ulang, tidak membuat check-in gerbang, dan aman untuk
 * dicetak ulang. NIK mentah dan token rahasia tidak pernah bocor.
 */
class RedemptionTest extends TestCase
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
     * @return array<string, mixed>
     */
    private function bookingPayload(array $overrides = []): array
    {
        return [
            'visit_date' => now()->toDateString(),
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
     * Create an online booking owned by $visitor, leaving it unpaid.
     */
    private function booking(User $visitor, array $overrides = []): Transaction
    {
        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($visitor))
            ->postJson('/api/v1/bookings', $this->bookingPayload($overrides))
            ->assertCreated();

        return Transaction::query()->latest('id')->firstOrFail();
    }

    /**
     * Create an online booking and settle its simulated payment.
     */
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

    private function lookup(User $officer, string $token): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($this->token($officer))
            ->postJson('/api/v1/counter/redemptions/lookup', [
                'redemption_token' => $token,
            ]);
    }

    private function confirm(User $officer, string $token): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($this->token($officer))
            ->postJson('/api/v1/counter/redemptions/confirm', [
                'redemption_token' => $token,
            ]);
    }

    private function printWristbands(User $officer, string $token): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($this->token($officer))
            ->postJson('/api/v1/counter/redemptions/print', [
                'redemption_token' => $token,
            ]);
    }

    public function test_redemption_token_is_opaque_and_only_for_online_bookings(): void
    {
        $visitor = $this->user(Role::Visitor);
        $first = $this->booking($visitor);
        $second = $this->booking($visitor);

        $this->assertNotSame($first->redemption_token, $second->redemption_token);
        $this->assertNotSame($first->barcode_token, $first->redemption_token);

        // Fixed-shape opaque token, never derived from the sequential id.
        $this->assertMatchesRegularExpression(
            '/^RDM-[A-Z0-9]{24}$/',
            (string) $first->redemption_token,
        );

        // A counter sale never gets a redemption token.
        $cashier = $this->user(Role::Cashier);

        $this->app['auth']->forgetGuards();
        $this->withToken($this->token($cashier))
            ->postJson('/api/v1/counter/transactions', [
                'visit_date' => now()->toDateString(),
                'visitors' => [
                    ['full_name' => 'Loket Satu', 'nik' => '3201234567890123'],
                ],
            ])
            ->assertCreated();

        $counter = Transaction::query()->latest('id')->firstOrFail();

        $this->assertSame(TransactionSource::Counter, $counter->source);
        $this->assertNull($counter->redemption_token);
    }

    public function test_booking_detail_only_exposes_the_code_after_payment(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->booking($visitor);

        $this->app['auth']->forgetGuards();
        $before = $this->withToken($this->token($visitor))
            ->getJson("/api/v1/bookings/{$transaction->id}")
            ->assertOk();

        // No redemption QR before payment succeeds.
        $before->assertJsonPath('data.redemption.redeemed', false);
        $before->assertJsonPath('data.redemption.status', 'pending');
        $before->assertJsonPath('data.redemption.status_label', 'Belum Ditukarkan');
        $this->assertNull($before->json('data.redemption.token'));

        // Settle the payment.
        $this->app['auth']->forgetGuards();
        $this->withToken($this->token($visitor))
            ->postJson("/api/v1/bookings/{$transaction->id}/simulate-payment", [
                'outcome' => 'success',
                'reference' => (string) $transaction->payment()->value('reference'),
            ])
            ->assertOk();

        $this->app['auth']->forgetGuards();
        $after = $this->withToken($this->token($visitor))
            ->getJson("/api/v1/bookings/{$transaction->id}")
            ->assertOk();

        $after->assertJsonPath('data.redemption.token', $transaction->redemption_token);
    }

    public function test_a_visitor_cannot_read_another_visitors_booking_or_code(): void
    {
        $owner = $this->user(Role::Visitor);
        $other = $this->user(Role::Visitor);
        $transaction = $this->paidBooking($owner);

        $this->app['auth']->forgetGuards();
        $response = $this->withToken($this->token($other))
            ->getJson("/api/v1/bookings/{$transaction->id}");

        $response->assertForbidden();

        // The other visitor's own detail call can never contain this code.
        $body = (string) $response->getContent();
        $this->assertStringNotContainsString((string) $transaction->redemption_token, $body);
    }

    public function test_lookup_is_read_only_and_reports_the_booking_summary(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->paidBooking($visitor);
        $cashier = $this->user(Role::Cashier);

        $response = $this->lookup($cashier, (string) $transaction->redemption_token);

        $response
            ->assertOk()
            ->assertJsonPath('data.transaction_code', $transaction->transaction_code)
            ->assertJsonPath('data.owner.name', $visitor->name)
            ->assertJsonPath('data.visit_date', $transaction->visit_date?->toDateString())
            ->assertJsonPath('data.visitor_count', 2)
            ->assertJsonPath('data.payment.status', 'success')
            ->assertJsonPath('data.redemption.redeemed', false)
            ->assertJsonPath('data.redemption.can_redeem', true)
            ->assertJsonPath('data.redemption.can_reprint', false)
            ->assertJsonCount(2, 'data.tickets')
            ->assertJsonCount(2, 'data.visitors')
            ->assertJsonCount(1, 'data.vehicles');

        // A lookup never changes state.
        $this->assertNull($transaction->fresh()->redeemed_at);
        $this->assertSame(0, AuditLog::where('action', 'counter_redemption.completed')->count());
    }

    public function test_an_unpaid_booking_is_rejected(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->booking($visitor);
        $cashier = $this->user(Role::Cashier);

        $this->lookup($cashier, (string) $transaction->redemption_token)
            ->assertOk()
            ->assertJsonPath('data.redemption.can_redeem', false)
            ->assertJsonPath('data.redemption.block_reason', 'Pembayaran booking ini belum berhasil.');

        $this->confirm($cashier, (string) $transaction->redemption_token)
            ->assertStatus(422);

        $this->assertNull($transaction->fresh()->redeemed_at);
        $this->assertSame(0, AuditLog::where('action', 'counter_redemption.completed')->count());
    }

    public function test_a_cancelled_booking_can_never_be_redeemed(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->paidBooking($visitor);
        $cashier = $this->user(Role::Cashier);

        // A booking cancelled after payment must not be handed over at the desk.
        $transaction->forceFill(['status' => TransactionStatus::Cancelled])->save();

        $this->lookup($cashier, (string) $transaction->redemption_token)
            ->assertOk()
            ->assertJsonPath('data.redemption.redeemed', false)
            ->assertJsonPath('data.redemption.can_redeem', false)
            ->assertJsonPath('data.redemption.block_reason', 'Pembayaran booking ini belum berhasil.');

        $this->confirm($cashier, (string) $transaction->redemption_token)
            ->assertStatus(422);

        $this->printWristbands($cashier, (string) $transaction->redemption_token)
            ->assertStatus(422);

        $this->assertNull($transaction->fresh()->redeemed_at);
        $this->assertSame(0, TransactionCheckin::count());
        $this->assertSame(0, AuditLog::where('action', 'counter_redemption.completed')->count());
        $transaction->refresh()->tickets()->get()->each(
            fn (Ticket $ticket) => $this->assertNull($ticket->printed_at),
        );
    }

    public function test_a_paid_booking_can_be_redeemed(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->paidBooking($visitor);
        $cashier = $this->user(Role::Cashier);

        $response = $this->confirm($cashier, (string) $transaction->redemption_token);

        $response
            ->assertOk()
            ->assertJsonPath('data.redemption.redeemed', true)
            ->assertJsonPath('data.redemption.status', 'redeemed')
            ->assertJsonPath('data.redemption.status_label', 'Sudah Ditukarkan')
            ->assertJsonPath('data.redemption.redeemed_by.id', $cashier->id)
            ->assertJsonPath('data.redemption.can_redeem', false)
            ->assertJsonPath('data.redemption.can_reprint', true);

        $fresh = $transaction->fresh();
        $this->assertNotNull($fresh->redeemed_at);
        $this->assertSame($cashier->id, $fresh->redeemed_by_user_id);

        // Payment/attendance state is untouched: no status flip, no check-in,
        // and the tickets are not consumed.
        $this->assertSame(TransactionStatus::Paid, $fresh->status);
        $this->assertSame(0, TransactionCheckin::count());

        AuditLog::where('action', 'counter_redemption.completed')->firstOrFail();
    }

    public function test_unknown_and_non_redemption_codes_are_rejected(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->paidBooking($visitor);
        $cashier = $this->user(Role::Cashier);

        $unknown = $this->lookup($cashier, 'RDM-UNKNOWN000000000000000000');
        $unknown->assertNotFound();
        $this->assertArrayNotHasKey('data', $unknown->json());

        // The gate barcode is not a redemption code.
        $this->lookup($cashier, (string) $transaction->barcode_token)->assertNotFound();
        $this->confirm($cashier, (string) $transaction->barcode_token)->assertNotFound();
        $this->printWristbands($cashier, (string) $transaction->barcode_token)->assertNotFound();
    }

    public function test_missing_code_is_a_validation_error(): void
    {
        $cashier = $this->user(Role::Cashier);

        $this->app['auth']->forgetGuards();
        $this->withToken($this->token($cashier))
            ->postJson('/api/v1/counter/redemptions/lookup', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('redemption_token');
    }

    public function test_only_cashiers_and_admins_can_work_the_desk(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $code = (string) $transaction->redemption_token;

        // Anonymous.
        $this->app['auth']->forgetGuards();
        $this->flushHeaders();
        $this->postJson('/api/v1/counter/redemptions/lookup', [
            'redemption_token' => $code,
        ])->assertUnauthorized();

        // Wrong roles.
        foreach ([Role::Visitor, Role::GateStaff] as $role) {
            $this->lookup($this->user($role), $code)->assertForbidden();
            $this->confirm($this->user($role), $code)->assertForbidden();
            $this->printWristbands($this->user($role), $code)->assertForbidden();
        }

        $this->assertNull($transaction->fresh()->redeemed_at);
        $this->assertSame(0, AuditLog::where('action', 'counter_redemption.completed')->count());
    }

    public function test_admin_can_redeem(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $admin = $this->user(Role::Admin);

        $this->confirm($admin, (string) $transaction->redemption_token)
            ->assertOk()
            ->assertJsonPath('data.redemption.redeemed_by.id', $admin->id);
    }

    public function test_a_booking_can_only_be_redeemed_once(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $cashier = $this->user(Role::Cashier);
        $code = (string) $transaction->redemption_token;

        $this->confirm($cashier, $code)->assertOk();

        $firstRedeemedAt = $transaction->fresh()->redeemed_at;

        $this->confirm($cashier, $code)->assertStatus(409);

        $this->assertSame(
            $firstRedeemedAt?->toDateTimeString(),
            $transaction->fresh()->redeemed_at?->toDateTimeString(),
        );
        $this->assertSame(1, AuditLog::where('action', 'counter_redemption.completed')->count());
    }

    public function test_the_atomic_guard_allows_only_one_writer(): void
    {
        // True parallel requests are not reproducible inside a single test
        // process, so the database-level guard that serializes them is exercised
        // directly: the conditional UPDATE only ever affects a still-unredeemed
        // row, so a racing second writer (or a stale read) meets zero rows.
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $cashier = $this->user(Role::Cashier);

        $update = fn () => Transaction::query()
            ->whereKey($transaction->getKey())
            ->whereNull('redeemed_at')
            ->update([
                'redeemed_at' => now(),
                'redeemed_by_user_id' => $cashier->id,
            ]);

        $this->assertSame(1, $update());
        $this->assertSame(0, $update());
    }

    public function test_redeeming_never_creates_a_gate_check_in(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $cashier = $this->user(Role::Cashier);
        $code = (string) $transaction->redemption_token;

        $this->confirm($cashier, $code)->assertOk();
        $this->printWristbands($cashier, $code)->assertOk();

        $this->assertSame(0, TransactionCheckin::count());
        $this->assertSame(TransactionStatus::Paid, $transaction->fresh()->status);
        $transaction->refresh()->tickets()->get()->each(
            fn (Ticket $ticket) => $this->assertSame(TicketStatus::Printed, $ticket->status),
        );
    }

    public function test_printing_before_redemption_is_rejected(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $cashier = $this->user(Role::Cashier);

        $this->printWristbands($cashier, (string) $transaction->redemption_token)
            ->assertStatus(422);

        $transaction->refresh()->tickets()->get()->each(
            fn (Ticket $ticket) => $this->assertNull($ticket->printed_at),
        );
    }

    public function test_reprint_does_not_duplicate_tickets_or_check_ins(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $cashier = $this->user(Role::Cashier);
        $code = (string) $transaction->redemption_token;

        $this->confirm($cashier, $code)->assertOk();

        $ticketCount = $transaction->tickets()->count();

        $this->printWristbands($cashier, $code)->assertOk();
        $firstPrintedAt = $transaction->tickets()->orderBy('id')->firstOrFail()->printed_at;

        // Reprint.
        $this->printWristbands($cashier, $code)->assertOk();

        $this->assertSame($ticketCount, $transaction->tickets()->count());
        $this->assertSame(0, TransactionCheckin::count());
        $this->assertSame(
            $firstPrintedAt?->toDateTimeString(),
            $transaction->tickets()->orderBy('id')->firstOrFail()->printed_at?->toDateTimeString(),
        );

        $this->assertSame(1, AuditLog::where('action', 'counter_redemption.tickets_printed')->count());
        $this->assertSame(1, AuditLog::where('action', 'counter_redemption.tickets_reprinted')->count());
        $this->assertSame(1, AuditLog::where('action', 'counter_redemption.completed')->count());
    }

    public function test_reprint_keeps_the_same_individual_ticket_codes(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $cashier = $this->user(Role::Cashier);
        $code = (string) $transaction->redemption_token;

        $this->confirm($cashier, $code)->assertOk();

        $first = $this->printWristbands($cashier, $code)->assertOk()->json('data.tickets');
        $second = $this->printWristbands($cashier, $code)->assertOk()->json('data.tickets');

        $codes = fn (array $tickets): array => collect($tickets)
            ->pluck('ticket_code')
            ->sort()
            ->values()
            ->all();
        $stored = $transaction->tickets()->orderBy('ticket_code')->pluck('ticket_code')->all();

        $this->assertNotSame([], $first);
        $this->assertSame($stored, $codes($first));
        $this->assertSame($stored, $codes($second));
        $this->assertSame($transaction->tickets()->count(), count($second));
        $this->assertSame(0, TransactionCheckin::count());
    }

    public function test_responses_and_audit_never_expose_nik_or_secrets(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->paidBooking($visitor);
        $cashier = $this->user(Role::Cashier);
        $code = (string) $transaction->redemption_token;
        $simulationReference = (string) $transaction->payment()->value('reference');

        $lookupBody = (string) $this->lookup($cashier, $code)->assertOk()->getContent();
        $confirmBody = (string) $this->confirm($cashier, $code)->assertOk()->getContent();
        $printBody = (string) $this->printWristbands($cashier, $code)->assertOk()->getContent();

        foreach ([$lookupBody, $confirmBody, $printBody] as $body) {
            $this->assertStringNotContainsString('3201234567890123', $body);
            $this->assertStringNotContainsString($simulationReference, $body);
            $this->assertStringNotContainsString($code, $body);
            // Masked NIK is present instead.
            $this->assertStringContainsString('masked_nik', $body);
        }

        foreach (AuditLog::all() as $audit) {
            $metadata = (string) json_encode($audit->metadata);
            $this->assertStringNotContainsString($code, $metadata);
            $this->assertStringNotContainsString('3201234567890123', $metadata);
        }
    }

    public function test_counter_redemption_limiter_ceiling_is_configured(): void
    {
        $resolver = RateLimiter::limiter('counter-redemption');

        $this->assertNotNull($resolver);

        $limit = $resolver(Request::create('/api/v1/counter/redemptions/lookup', 'POST'));

        $this->assertInstanceOf(Limit::class, $limit);
        $this->assertSame(120, $limit->maxAttempts);
        $this->assertSame(60, $limit->decaySeconds);
    }

    public function test_counter_redemption_is_rate_limited(): void
    {
        RateLimiter::for('counter-redemption', fn () => Limit::perMinute(1));

        $cashier = $this->user(Role::Cashier);
        $unknown = 'RDM-UNKNOWN000000000000000000';

        $this->lookup($cashier, $unknown)->assertNotFound();
        $this->lookup($cashier, $unknown)->assertStatus(429);
    }
}
