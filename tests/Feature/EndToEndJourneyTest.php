<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Enums\TicketStatus;
use App\Enums\TransactionStatus;
use App\Models\Payment;
use App\Models\Ticket;
use App\Models\Transaction;
use App\Models\TransactionCheckin;
use App\Models\User;
use App\Models\VehicleType;
use Database\Seeders\TariffSeeder;
use Database\Seeders\VehicleTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Uji terima end-to-end (Fase 9).
 *
 * Setiap alur ditempuh lewat HTTP API /api/v1 seperti yang dipanggil frontend:
 * registrasi wisatawan, booking, simulasi pembayaran (gagal lalu sukses),
 * pencetakan tiket, dan validasi barcode di gerbang; ditambah jalur loket penuh.
 *
 * Angka harapan ditulis eksplisit agar "backend sebagai sumber kebenaran" ikut
 * dibuktikan: total selalu dihitung server, NIK selalu tersamarkan, dan satu
 * transaksi hanya boleh memiliki satu pembayaran serta satu catatan check-in.
 */
class EndToEndJourneyTest extends TestCase
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
        return $user->createToken('e2e')->plainTextToken;
    }

    /**
     * Kirim permintaan sebagai $user. Guard dibuang lebih dulu agar pergantian
     * identitas antar-langkah tidak pernah diam-diam terabaikan.
     *
     * @param  array<string, mixed>  $body
     */
    private function asUser(User $user, string $method, string $url, array $body = []): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->withToken($this->token($user))->json($method, $url, $body);
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
     * Buat booking online (2 pengunjung, 2 motor + 1 mobil) dan kembalikan
     * transaksinya tanpa membayar.
     *
     * @param  array<string, mixed>  $overrides
     */
    private function book(User $visitor, array $overrides = []): Transaction
    {
        $this->asUser($visitor, 'POST', '/api/v1/bookings', [
            'visit_date' => $this->venueToday(),
            'visitors' => [
                ['full_name' => 'Budi Santoso', 'nik' => '3201234567890123'],
                ['full_name' => 'Siti Aminah', 'nik' => '3201234567890124'],
            ],
            'vehicles' => [
                ['vehicle_type_id' => $this->vehicleTypeId('motorcycle'), 'quantity' => 2],
                ['vehicle_type_id' => $this->vehicleTypeId('car'), 'quantity' => 1],
            ],
            ...$overrides,
        ])->assertCreated();

        return Transaction::query()->latest('id')->firstOrFail();
    }

    /**
     * Booking lunas: 2*15000 + 2*2000 + 1*5000 = 39000.
     */
    private function paidBooking(User $visitor): Transaction
    {
        $transaction = $this->book($visitor);

        // Total dihitung server; klien tidak pernah menentukan nominalnya.
        $this->assertSame(39000, $transaction->total_amount);

        $this->settle($visitor, $transaction, 'success')->assertOk();

        return $transaction->refresh();
    }

    private function settle(User $visitor, Transaction $transaction, string $outcome): TestResponse
    {
        return $this->asUser($visitor, 'POST', "/api/v1/bookings/{$transaction->id}/simulate-payment", [
            'outcome' => $outcome,
            'reference' => (string) $transaction->payment()->value('reference'),
        ]);
    }

    private function checkIn(User $staff, Transaction $transaction): TestResponse
    {
        return $this->asUser($staff, 'POST', '/api/v1/gate/check-in', [
            'barcode_token' => $transaction->barcode_token,
        ]);
    }

    public function test_online_visitor_journey_from_registration_to_gate_check_in(): void
    {
        // 1. Registrasi publik: peran selalu visitor dan token langsung terbit.
        $register = $this->postJson('/api/v1/auth/register', [
            'name' => 'Wisatawan E2E',
            'email' => 'e2e@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated();

        $this->assertSame('visitor', $register->json('data.role'));
        $this->assertNotEmpty($register->json('token'));

        $visitor = User::where('email', 'e2e@example.com')->firstOrFail();

        // 2. Profil dapat dibaca memakai token hasil registrasi.
        $this->app['auth']->forgetGuards();

        $this->withToken((string) $register->json('token'))
            ->getJson('/api/v1/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', 'e2e@example.com');

        // 3. Booking: nominal klien diabaikan, total dihitung dari tarif database.
        $booking = $this->asUser($visitor, 'POST', '/api/v1/bookings', [
            'visit_date' => $this->venueToday(),
            'visitors' => [
                ['full_name' => 'Budi Santoso', 'nik' => '3201234567890123'],
                ['full_name' => 'Siti Aminah', 'nik' => '3201234567890124'],
            ],
            'vehicles' => [
                ['vehicle_type_id' => $this->vehicleTypeId('motorcycle'), 'quantity' => 2],
                ['vehicle_type_id' => $this->vehicleTypeId('car'), 'quantity' => 1],
            ],
            'client_total_amount' => 1,
        ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.total_amount', 39000)
            ->assertJsonCount(0, 'data.tickets');

        $transaction = Transaction::query()->latest('id')->firstOrFail();

        // NIK mentah tidak pernah keluar; hanya bentuk tersamarkan.
        $this->assertStringNotContainsString('3201234567890123', $booking->getContent());
        $this->assertStringContainsString('3201********0123', $booking->getContent());

        // 4. Simulasi gagal: belum lunas dan belum ada tiket.
        $this->settle($visitor, $transaction, 'failure')
            ->assertOk()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonCount(0, 'data.tickets');

        $this->assertSame(0, Ticket::count());
        $this->assertSame(TransactionStatus::Pending, $transaction->fresh()->status);

        // 5. Simulasi sukses: lunas + satu tiket per pengunjung.
        $this->settle($visitor, $transaction, 'success')
            ->assertOk()
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.tickets.0.status', 'issued')
            ->assertJsonCount(2, 'data.tickets');

        $this->assertSame(2, Ticket::count());

        // 6. Cetak tiket.
        $this->asUser($visitor, 'POST', "/api/v1/bookings/{$transaction->id}/print")
            ->assertOk()
            ->assertJsonPath('data.tickets.0.status', 'printed');

        // 7. Validasi barcode grup di gerbang oleh petugas.
        $gate = $this->user(Role::GateStaff);

        $this->checkIn($gate, $transaction)
            ->assertCreated()
            ->assertJsonPath('data.status', 'checked_in')
            ->assertJsonPath('data.visitor_count', 2)
            ->assertJsonPath('data.validated_by.id', $gate->id);

        // 8. Konsistensi akhir seluruh rantai.
        $transaction->refresh();

        $this->assertSame(TransactionStatus::CheckedIn, $transaction->status);
        $this->assertSame(1, Payment::count());
        $this->assertSame(2, Ticket::count());
        $this->assertSame(1, TransactionCheckin::count());

        $transaction->tickets()->get()->each(
            fn (Ticket $ticket) => $this->assertSame(TicketStatus::Used, $ticket->status),
        );
    }

    public function test_resending_a_successful_payment_adds_no_second_payment_or_tickets(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->paidBooking($visitor);

        $this->settle($visitor, $transaction, 'success')->assertStatus(409);

        $transaction->refresh();

        $this->assertSame(1, Payment::count());
        $this->assertSame(2, Ticket::count());
        $this->assertSame(TransactionStatus::Paid, $transaction->status);
    }

    public function test_another_visitor_cannot_read_or_pay_someone_elses_booking(): void
    {
        $owner = $this->user(Role::Visitor);
        $transaction = $this->book($owner);

        $intruder = $this->user(Role::Visitor);

        $this->asUser($intruder, 'GET', "/api/v1/bookings/{$transaction->id}")
            ->assertStatus(403);

        $this->settle($intruder, $transaction, 'success')->assertStatus(403);

        $this->assertSame(TransactionStatus::Pending, $transaction->fresh()->status);
        $this->assertSame(1, Payment::count());
        $this->assertSame(0, Ticket::count());
    }

    public function test_counter_sale_can_be_paid_printed_and_checked_in(): void
    {
        $cashier = $this->user(Role::Cashier);
        $gate = $this->user(Role::GateStaff);

        // 1. Kasir membuat transaksi loket; tiket individual langsung diterbitkan.
        $this->asUser($cashier, 'POST', '/api/v1/counter/transactions', [
            'visit_date' => $this->venueToday(),
            'visitors' => [
                ['full_name' => 'Loket Satu', 'nik' => '3201234567890123'],
                ['full_name' => 'Loket Dua', 'nik' => '3201234567890124'],
            ],
            'vehicles' => [
                ['vehicle_type_id' => $this->vehicleTypeId('motorcycle'), 'quantity' => 2],
            ],
        ])
            ->assertCreated()
            ->assertJsonPath('data.source', 'counter')
            ->assertJsonPath('data.status', 'pending')
            // 2*15000 + 2*2000 = 34000.
            ->assertJsonPath('data.total_amount', 34000)
            ->assertJsonCount(2, 'data.tickets');

        $transaction = Transaction::query()->latest('id')->firstOrFail();

        // 2. Belum dibayar: check-in ditolak tanpa mencatat kehadiran.
        $this->checkIn($gate, $transaction)->assertStatus(422);
        $this->assertSame(0, TransactionCheckin::count());

        // 3. Kasir mengonfirmasi uang tunai diterima.
        $this->asUser($cashier, 'POST', "/api/v1/counter/transactions/{$transaction->id}/confirm-payment")
            ->assertOk()
            ->assertJsonPath('data.status', 'paid')
            ->assertJsonPath('data.payment.status', 'success');

        // 4. Cetak tiket.
        $this->asUser($cashier, 'POST', "/api/v1/counter/transactions/{$transaction->id}/print")
            ->assertOk()
            ->assertJsonPath('data.tickets.0.status', 'printed');

        // 5. Check-in gerbang berhasil setelah lunas.
        $this->checkIn($gate, $transaction->refresh())
            ->assertCreated()
            ->assertJsonPath('data.source', 'counter')
            ->assertJsonPath('data.status', 'checked_in');

        $this->assertSame(1, TransactionCheckin::count());
        $this->assertSame(1, Payment::count());
    }

    public function test_admin_reports_reflect_a_completed_online_journey(): void
    {
        $visitor = $this->user(Role::Visitor);
        $transaction = $this->paidBooking($visitor);

        $this->checkIn($this->user(Role::GateStaff), $transaction)->assertCreated();

        $admin = $this->user(Role::Admin);
        $range = 'date_from='.$this->venueToday().'&date_to='.$this->venueToday();

        $this->asUser($admin, 'GET', "/api/v1/admin/dashboard?{$range}")
            ->assertOk()
            ->assertJsonPath('data.transactions.total', 1)
            ->assertJsonPath('data.visitors.registered', 2)
            ->assertJsonPath('data.visitors.checked_in', 2)
            ->assertJsonPath('data.revenue.total', 39000);

        $this->asUser($admin, 'GET', "/api/v1/admin/reports/visits?{$range}")
            ->assertOk()
            ->assertJsonPath('summary.transactions', 1)
            ->assertJsonPath('summary.registered_visitors', 2)
            ->assertJsonPath('summary.checked_in_visitors', 2);

        // Laporan identitas: NIK tersamarkan, termasuk pada ekspor CSV.
        $identities = $this->asUser($admin, 'GET', "/api/v1/admin/reports/identities?{$range}")
            ->assertOk();

        $this->assertStringNotContainsString('3201234567890123', $identities->getContent());
        $this->assertStringContainsString('3201********0123', $identities->getContent());

        $csv = $this->asUser($admin, 'GET', "/api/v1/admin/reports/identities/export?{$range}")
            ->assertOk();

        $this->assertStringNotContainsString('3201234567890123', $csv->getContent());
    }
}
