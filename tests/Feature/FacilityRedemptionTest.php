<?php

namespace Tests\Feature;

use App\Enums\FacilityEntitlementStatus;
use App\Enums\Role;
use App\Enums\TicketStatus;
use App\Enums\TransactionStatus;
use App\Models\AuditLog;
use App\Models\Facility;
use App\Models\Ticket;
use App\Models\TicketFacilityEntitlement;
use App\Models\Transaction;
use App\Models\TransactionCheckin;
use App\Models\User;
use App\Models\VehicleType;
use App\Services\FacilityEntitlementService;
use Database\Seeders\FacilitySeeder;
use Database\Seeders\TariffSeeder;
use Database\Seeders\VehicleTypeSeeder;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Klaim fasilitas per tiket individual di loket (Fase 10).
 *
 * Hak fasilitas hanya diberikan setelah pembayaran benar-benar berhasil, dan
 * hanya dapat diklaim pada tanggal kunjungan setelah tiket memiliki catatan
 * check-in gerbang. Kode tiket wristband adalah satu-satunya kunci; kode
 * penukaran online dan barcode gerbang sengaja ditolak.
 */
class FacilityRedemptionTest extends TestCase
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

    /**
     * Create a counter sale and confirm its cash payment.
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

    private function checkIn(User $staff, Transaction $transaction): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($this->token($staff))
            ->postJson('/api/v1/gate/check-in', [
                'barcode_token' => $transaction->barcode_token,
            ]);
    }

    private function paidAndCheckedIn(): Transaction
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));

        $this->checkIn($this->user(Role::GateStaff), $transaction)
            ->assertCreated();

        return $transaction->refresh();
    }

    private function ticket(Transaction $transaction, int $offset = 0): Ticket
    {
        return $transaction->tickets()->orderBy('id')->skip($offset)->firstOrFail();
    }

    private function lookup(User $officer, string $ticketCode): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($this->token($officer))
            ->postJson('/api/v1/counter/facilities/lookup', [
                'ticket_code' => $ticketCode,
            ]);
    }

    private function claim(
        User $officer,
        string $ticketCode,
        string $facilityCode = self::FACILITY,
    ): TestResponse {
        $this->app['auth']->forgetGuards();

        return $this->withToken($this->token($officer))
            ->postJson('/api/v1/counter/facilities/claim', [
                'ticket_code' => $ticketCode,
                'facility_code' => $facilityCode,
            ]);
    }

    private function entitlement(Transaction $transaction, int $offset = 0): TicketFacilityEntitlement
    {
        return TicketFacilityEntitlement::query()
            ->where('ticket_id', $this->ticket($transaction, $offset)->id)
            ->whereHas('facility', fn ($query) => $query->where('code', self::FACILITY))
            ->firstOrFail();
    }

    public function test_online_payment_grants_one_entitlement_per_ticket_only_after_success(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->booking($visitor);

        // Before payment there are no tickets (and therefore no grants).
        $this->assertSame(0, $transaction->tickets()->count());
        $this->assertSame(0, TicketFacilityEntitlement::count());

        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($visitor))
            ->postJson("/api/v1/bookings/{$transaction->id}/simulate-payment", [
                'outcome' => 'success',
                'reference' => (string) $transaction->payment()->value('reference'),
            ])
            ->assertOk();

        $transaction->refresh();

        $this->assertSame(2, $transaction->tickets()->count());
        $this->assertSame(2, TicketFacilityEntitlement::count());

        TicketFacilityEntitlement::query()->get()->each(function (
            TicketFacilityEntitlement $entitlement,
        ): void {
            $this->assertSame(FacilityEntitlementStatus::Granted, $entitlement->status);
            $this->assertNotNull($entitlement->granted_at);
            $this->assertNull($entitlement->redeemed_at);
            $this->assertNull($entitlement->voided_at);
            $this->assertTrue($entitlement->isAvailable());
        });
    }

    public function test_grants_are_idempotent_when_the_same_payment_is_processed_again(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));

        $service = app(FacilityEntitlementService::class);

        $this->assertSame(0, $service->grantForTransaction($transaction));
        $this->assertSame(2, TicketFacilityEntitlement::count());
    }

    public function test_counter_payment_confirmation_grants_entitlements(): void
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

        // Tickets exist while the sale is still pending, but no grant is made
        // until the cash is actually received.
        $this->assertSame(TransactionStatus::Pending, $transaction->status);
        $this->assertSame(2, $transaction->tickets()->count());
        $this->assertSame(0, TicketFacilityEntitlement::count());

        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($cashier))
            ->postJson("/api/v1/counter/transactions/{$transaction->id}/confirm-payment")
            ->assertOk();

        $this->assertSame(2, TicketFacilityEntitlement::count());
    }

    public function test_a_void_ticket_does_not_receive_a_grant(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));

        TicketFacilityEntitlement::query()->delete();

        $voided = $this->ticket($transaction);
        $voided->forceFill(['status' => TicketStatus::Void])->save();

        $service = app(FacilityEntitlementService::class);

        $this->assertSame(1, $service->grantForTransaction($transaction->fresh()));
        $this->assertSame(1, TicketFacilityEntitlement::count());
        $this->assertSame(
            $this->ticket($transaction, 1)->id,
            TicketFacilityEntitlement::firstOrFail()->ticket_id,
        );
    }

    public function test_lookup_is_read_only_and_returns_masked_ticket_context(): void
    {
        $transaction = $this->paidAndCheckedIn();
        $cashier = $this->user(Role::Cashier);
        $ticket = $this->ticket($transaction);

        $response = $this->lookup($cashier, $ticket->ticket_code);

        $response
            ->assertOk()
            ->assertJsonPath('data.ticket_code', $ticket->ticket_code)
            ->assertJsonPath('data.visitor.full_name', 'Budi Santoso')
            ->assertJsonPath('data.visitor.masked_nik', '3201********0123')
            ->assertJsonPath('data.transaction.transaction_code', $transaction->transaction_code)
            ->assertJsonPath('data.transaction.visit_date', $this->venueToday())
            ->assertJsonPath('data.payment.status', 'success')
            ->assertJsonPath('data.checkin.checked_in', true)
            ->assertJsonCount(1, 'data.facilities')
            ->assertJsonPath('data.facilities.0.code', self::FACILITY)
            ->assertJsonPath('data.facilities.0.name', 'Minuman Gratis')
            ->assertJsonPath('data.facilities.0.status', 'granted')
            ->assertJsonPath('data.facilities.0.can_claim', true)
            ->assertJsonPath('data.facilities.0.block_reason', null);

        // A lookup never changes state.
        $this->assertSame(
            FacilityEntitlementStatus::Granted,
            $this->entitlement($transaction)->fresh()->status,
        );
        $this->assertSame(0, AuditLog::where('action', 'counter_facility.redeemed')->count());
        $this->assertSame(1, TransactionCheckin::count());
    }

    public function test_a_ticket_without_a_real_check_in_cannot_be_claimed(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $cashier = $this->user(Role::Cashier);
        $ticket = $this->ticket($transaction);

        $this->lookup($cashier, $ticket->ticket_code)
            ->assertOk()
            ->assertJsonPath('data.checkin.checked_in', false)
            ->assertJsonPath('data.facilities.0.can_claim', false)
            ->assertJsonPath(
                'data.facilities.0.block_reason',
                'Tiket belum check-in di gerbang.',
            );

        $this->claim($cashier, $ticket->ticket_code)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Tiket belum check-in di gerbang.');

        $this->assertSame(0, TransactionCheckin::count());
        $this->assertSame(
            FacilityEntitlementStatus::Granted,
            $this->entitlement($transaction)->fresh()->status,
        );
    }

    public function test_an_unpaid_counter_sale_cannot_be_claimed(): void
    {
        $cashier = $this->user(Role::Cashier);

        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($cashier))
            ->postJson('/api/v1/counter/transactions', [
                'visit_date' => $this->venueToday(),
                'visitors' => [
                    ['full_name' => 'Belum Bayar', 'nik' => '3201234567890123'],
                ],
            ])
            ->assertCreated();

        $transaction = Transaction::query()->latest('id')->firstOrFail();
        $ticket = $this->ticket($transaction);

        $this->claim($cashier, $ticket->ticket_code)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Pembayaran transaksi ini belum berhasil.');

        $this->assertSame(0, TicketFacilityEntitlement::count());
        $this->assertSame(0, TransactionCheckin::count());
    }

    public function test_a_claim_is_only_allowed_on_the_visit_date(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));

        // Move the paid booking to a previous visit date. The facility desk
        // must reject it even when a check-in row exists.
        $transaction->forceFill([
            'visit_date' => now(config('visit.timezone'))->subDay()->toDateString(),
        ])->save();

        TransactionCheckin::create([
            'transaction_id' => $transaction->id,
            'checked_in_at' => now(),
            'visitor_count_checked_in' => 2,
        ]);

        $transaction->forceFill(['status' => TransactionStatus::CheckedIn])->save();

        $cashier = $this->user(Role::Cashier);
        $ticket = $this->ticket($transaction);

        $this->lookup($cashier, $ticket->ticket_code)
            ->assertOk()
            ->assertJsonPath('data.facilities.0.can_claim', false)
            ->assertJsonPath(
                'data.facilities.0.block_reason',
                'Klaim fasilitas hanya dapat dilakukan pada tanggal kunjungan.',
            );

        $this->claim($cashier, $ticket->ticket_code)->assertStatus(422);

        $this->assertSame(
            FacilityEntitlementStatus::Granted,
            $this->entitlement($transaction)->fresh()->status,
        );
    }

    public function test_a_checked_in_ticket_can_claim_its_facility_once(): void
    {
        $transaction = $this->paidAndCheckedIn();
        $cashier = $this->user(Role::Cashier);
        $ticket = $this->ticket($transaction);

        $response = $this->claim($cashier, $ticket->ticket_code);

        $response
            ->assertOk()
            ->assertJsonPath('message', 'Klaim fasilitas berhasil dicatat.')
            ->assertJsonPath('data.facilities.0.status', 'redeemed')
            ->assertJsonPath('data.facilities.0.status_label', 'Sudah Diklaim')
            ->assertJsonPath('data.facilities.0.redeemed_by.id', $cashier->id)
            ->assertJsonPath('data.facilities.0.can_claim', false);

        $entitlement = $this->entitlement($transaction)->fresh();

        $this->assertSame(FacilityEntitlementStatus::Redeemed, $entitlement->status);
        $this->assertNotNull($entitlement->redeemed_at);
        $this->assertSame($cashier->id, $entitlement->redeemed_by_user_id);
        $this->assertNull($entitlement->voided_at);

        // The desk records a redemption only; attendance and ticket lifecycle
        // are untouched.
        $this->assertSame(1, TransactionCheckin::count());
        $this->assertSame(
            TransactionStatus::CheckedIn,
            $transaction->fresh()->status,
        );
        $this->assertSame(
            TicketStatus::Used,
            $this->ticket($transaction)->fresh()->status,
        );

        AuditLog::where('action', 'counter_facility.redeemed')->firstOrFail();
    }

    public function test_a_facility_can_only_be_claimed_once_per_ticket(): void
    {
        $transaction = $this->paidAndCheckedIn();
        $cashier = $this->user(Role::Cashier);
        $ticket = $this->ticket($transaction);

        $this->claim($cashier, $ticket->ticket_code)->assertOk();

        $firstRedeemedAt = $this->entitlement($transaction)->fresh()->redeemed_at;

        $this->claim($cashier, $ticket->ticket_code)
            ->assertStatus(409)
            ->assertJsonPath('message', 'Hak fasilitas ini sudah diklaim.');

        $entitlement = $this->entitlement($transaction)->fresh();

        $this->assertSame(
            $firstRedeemedAt?->toDateTimeString(),
            $entitlement->redeemed_at?->toDateTimeString(),
        );
        $this->assertSame(1, AuditLog::where('action', 'counter_facility.redeemed')->count());
    }

    public function test_the_atomic_guard_allows_only_one_writer(): void
    {
        // True parallel requests are not reproducible inside a single test
        // process, so the database-level guard is exercised directly: the
        // conditional UPDATE only ever touches a still-granted, unredeemed row.
        $transaction = $this->paidAndCheckedIn();
        $cashier = $this->user(Role::Cashier);
        $entitlement = $this->entitlement($transaction);

        $update = fn () => TicketFacilityEntitlement::query()
            ->whereKey($entitlement->getKey())
            ->where('status', FacilityEntitlementStatus::Granted->value)
            ->whereNull('redeemed_at')
            ->update([
                'status' => FacilityEntitlementStatus::Redeemed->value,
                'redeemed_at' => now(),
                'redeemed_by_user_id' => $cashier->id,
            ]);

        $this->assertSame(1, $update());
        $this->assertSame(0, $update());
    }

    public function test_unknown_codes_are_rejected_and_gate_or_redemption_tokens_are_not_accepted(): void
    {
        $transaction = $this->paidAndCheckedIn();
        $cashier = $this->user(Role::Cashier);

        $unknown = $this->lookup($cashier, 'TKT-20260101-ABCDEFGH');
        $unknown->assertNotFound();
        $this->assertArrayNotHasKey('data', $unknown->json());

        $this->claim($cashier, 'TKT-20260101-ABCDEFGH')
            ->assertNotFound()
            ->assertJsonMissingPath('data');

        // The gate barcode and online redemption token are different
        // credentials; neither is a valid ticket code.
        foreach ([
            (string) $transaction->barcode_token,
            (string) $transaction->redemption_token,
        ] as $credential) {
            $this->lookup($cashier, $credential)
                ->assertStatus(422)
                ->assertJsonValidationErrors('ticket_code');
            $this->claim($cashier, $credential)
                ->assertStatus(422)
                ->assertJsonValidationErrors('ticket_code');
        }

        $this->assertSame(
            FacilityEntitlementStatus::Granted,
            $this->entitlement($transaction)->fresh()->status,
        );
    }

    public function test_an_unknown_facility_or_missing_entitlement_is_rejected(): void
    {
        $transaction = $this->paidAndCheckedIn();
        $cashier = $this->user(Role::Cashier);
        $ticket = $this->ticket($transaction);

        $this->claim($cashier, $ticket->ticket_code, 'NOT_A_FACILITY')
            ->assertNotFound()
            ->assertJsonPath('message', 'Fasilitas tidak dikenali.');

        // A real, active facility the ticket was never granted is not claimable.
        Facility::create([
            'code' => 'MANUAL',
            'name' => 'Fasilitas Manual',
            'is_auto_granted' => false,
            'active' => true,
        ]);

        $this->claim($cashier, $ticket->ticket_code, 'MANUAL')
            ->assertStatus(422)
            ->assertJsonPath('message', 'Tiket ini tidak memiliki hak fasilitas tersebut.');

        $this->assertSame(
            FacilityEntitlementStatus::Granted,
            $this->entitlement($transaction)->fresh()->status,
        );
    }

    public function test_an_inactive_facility_cannot_be_claimed(): void
    {
        $transaction = $this->paidAndCheckedIn();
        $cashier = $this->user(Role::Cashier);
        $ticket = $this->ticket($transaction);

        Facility::where('code', self::FACILITY)->update(['active' => false]);

        $this->lookup($cashier, $ticket->ticket_code)
            ->assertOk()
            ->assertJsonPath('data.facilities.0.can_claim', false)
            ->assertJsonPath(
                'data.facilities.0.block_reason',
                'Fasilitas ini sedang tidak aktif.',
            );

        $this->claim($cashier, $ticket->ticket_code)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Fasilitas ini sedang tidak aktif.');

        $this->assertSame(
            FacilityEntitlementStatus::Granted,
            $this->entitlement($transaction)->fresh()->status,
        );
    }

    public function test_cancelling_a_transaction_voids_unredeemed_grants(): void
    {
        $transaction = $this->paidAndCheckedIn();
        $ticket = $this->ticket($transaction);

        $transaction->forceFill(['status' => TransactionStatus::Cancelled])->save();

        $entitlement = $this->entitlement($transaction)->fresh();

        $this->assertSame(FacilityEntitlementStatus::Void, $entitlement->status);
        $this->assertNotNull($entitlement->voided_at);
        $this->assertNull($entitlement->redeemed_at);

        $cashier = $this->user(Role::Cashier);

        $this->lookup($cashier, $ticket->ticket_code)
            ->assertOk()
            ->assertJsonPath('data.facilities.0.can_claim', false)
            ->assertJsonPath('data.facilities.0.block_reason', 'Transaksi ini sudah dibatalkan.');

        $this->claim($cashier, $ticket->ticket_code)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Transaksi ini sudah dibatalkan.');
    }

    public function test_cancellation_preserves_grants_that_were_already_redeemed(): void
    {
        $transaction = $this->paidAndCheckedIn();
        $cashier = $this->user(Role::Cashier);
        $ticket = $this->ticket($transaction);

        $this->claim($cashier, $ticket->ticket_code)->assertOk();

        $transaction->forceFill(['status' => TransactionStatus::Cancelled])->save();

        $entitlement = $this->entitlement($transaction)->fresh();

        // What was actually handed over stays in history.
        $this->assertSame(FacilityEntitlementStatus::Redeemed, $entitlement->status);
        $this->assertNotNull($entitlement->redeemed_at);
        $this->assertNull($entitlement->voided_at);
        $this->assertSame($cashier->id, $entitlement->redeemed_by_user_id);
    }

    public function test_only_cashiers_and_admins_can_work_the_facility_desk(): void
    {
        $transaction = $this->paidAndCheckedIn();
        $ticket = $this->ticket($transaction);

        $this->app['auth']->forgetGuards();
        $this->flushHeaders();

        $this->postJson('/api/v1/counter/facilities/lookup', [
            'ticket_code' => $ticket->ticket_code,
        ])->assertUnauthorized();

        $this->postJson('/api/v1/counter/facilities/claim', [
            'ticket_code' => $ticket->ticket_code,
            'facility_code' => self::FACILITY,
        ])->assertUnauthorized();

        foreach ([Role::Visitor, Role::GateStaff] as $role) {
            $this->lookup($this->user($role), $ticket->ticket_code)->assertForbidden();
            $this->claim($this->user($role), $ticket->ticket_code)->assertForbidden();
        }

        $this->assertSame(
            FacilityEntitlementStatus::Granted,
            $this->entitlement($transaction)->fresh()->status,
        );
        $this->assertSame(0, AuditLog::where('action', 'counter_facility.redeemed')->count());
    }

    public function test_an_admin_can_claim(): void
    {
        $transaction = $this->paidAndCheckedIn();
        $admin = $this->user(Role::Admin);

        $this->claim($admin, $this->ticket($transaction)->ticket_code)
            ->assertOk()
            ->assertJsonPath('data.facilities.0.redeemed_by.id', $admin->id);
    }

    public function test_missing_or_malformed_codes_are_validation_errors(): void
    {
        $cashier = $this->user(Role::Cashier);

        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($cashier))
            ->postJson('/api/v1/counter/facilities/lookup', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors('ticket_code');

        $this->withToken($this->token($cashier))
            ->postJson('/api/v1/counter/facilities/claim', [
                'ticket_code' => 'TKT-1',
                'facility_code' => 'free tea',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['ticket_code', 'facility_code']);
    }

    public function test_client_supplied_state_is_ignored(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));
        $cashier = $this->user(Role::Cashier);
        $ticket = $this->ticket($transaction);

        // The backend ignores client status/entitlement/id hints and still
        // rejects a claim because there is no check-in row.
        $this->app['auth']->forgetGuards();

        $this->withToken($this->token($cashier))
            ->postJson('/api/v1/counter/facilities/claim', [
                'ticket_code' => $ticket->ticket_code,
                'facility_code' => self::FACILITY,
                'entitlement_id' => $this->entitlement($transaction)->id,
                'transaction_id' => $transaction->id,
                'status' => 'redeemed',
                'can_claim' => true,
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Tiket belum check-in di gerbang.');

        $this->assertSame(
            FacilityEntitlementStatus::Granted,
            $this->entitlement($transaction)->fresh()->status,
        );
    }

    public function test_responses_and_audit_never_expose_nik_tokens_or_barcode(): void
    {
        $transaction = $this->paidAndCheckedIn();
        $cashier = $this->user(Role::Cashier);
        $ticket = $this->ticket($transaction);
        $simulationReference = (string) $transaction->payment()->value('reference');

        $lookupBody = (string) $this->lookup($cashier, $ticket->ticket_code)
            ->assertOk()
            ->getContent();
        $claimBody = (string) $this->claim($cashier, $ticket->ticket_code)
            ->assertOk()
            ->getContent();

        foreach ([$lookupBody, $claimBody] as $body) {
            $this->assertStringNotContainsString('3201234567890123', $body);
            $this->assertStringNotContainsString((string) $transaction->barcode_token, $body);
            $this->assertStringNotContainsString((string) $transaction->redemption_token, $body);
            $this->assertStringNotContainsString($simulationReference, $body);
            $this->assertStringContainsString('masked_nik', $body);
        }

        $audit = AuditLog::where('action', 'counter_facility.redeemed')->firstOrFail();
        $metadata = (string) json_encode($audit->metadata);

        $this->assertStringNotContainsString('3201234567890123', $metadata);
        $this->assertStringNotContainsString((string) $transaction->barcode_token, $metadata);
        $this->assertStringNotContainsString((string) $transaction->redemption_token, $metadata);
        $this->assertStringNotContainsString($simulationReference, $metadata);
    }

    public function test_counter_facility_limiter_ceiling_is_configured(): void
    {
        $resolver = RateLimiter::limiter('counter-facility');

        $this->assertNotNull($resolver);

        $limit = $resolver(Request::create('/api/v1/counter/facilities/lookup', 'POST'));

        $this->assertInstanceOf(Limit::class, $limit);
        $this->assertSame(120, $limit->maxAttempts);
        $this->assertSame(60, $limit->decaySeconds);
    }

    public function test_counter_facility_is_rate_limited(): void
    {
        RateLimiter::for('counter-facility', fn () => Limit::perMinute(1));

        $cashier = $this->user(Role::Cashier);
        $unknown = 'TKT-20260101-ABCDEFGH';

        $this->lookup($cashier, $unknown)->assertNotFound();
        $this->lookup($cashier, $unknown)->assertStatus(429);
    }

    public function test_backfill_is_dry_runnable_idempotent_and_manual(): void
    {
        $transaction = $this->paidBooking($this->user(Role::Visitor));

        // Simulate paid history from before the facility feature.
        TicketFacilityEntitlement::query()->delete();
        $this->assertSame(0, TicketFacilityEntitlement::count());

        $this->artisan('facilities:backfill', ['--dry-run' => true])
            ->expectsOutputToContain('DRY RUN')
            ->assertSuccessful();

        $this->assertSame(0, TicketFacilityEntitlement::count());

        $this->artisan('facilities:backfill')
            ->expectsOutputToContain('dibuat: 2')
            ->assertSuccessful();

        $this->assertSame(2, TicketFacilityEntitlement::count());

        // Running it again must create nothing.
        $this->artisan('facilities:backfill')->assertSuccessful();

        $this->assertSame(2, TicketFacilityEntitlement::count());
        $transaction->fresh()->tickets()->get()->each(
            fn (Ticket $ticket) => $this->assertSame(
                1,
                $ticket->facilityEntitlements()->count(),
            ),
        );
    }

    public function test_backfill_rejects_invalid_date_ranges(): void
    {
        $this->artisan('facilities:backfill', ['--from' => '2026-13-01'])
            ->assertExitCode(1);

        $this->artisan('facilities:backfill', [
            '--from' => '2026-10-20',
            '--to' => '2026-10-01',
        ])->assertExitCode(1);
    }
}
