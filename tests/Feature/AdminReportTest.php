<?php

namespace Tests\Feature;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\Role;
use App\Enums\TransactionSource;
use App\Enums\TransactionStatus;
use App\Models\Payment;
use App\Models\Transaction;
use App\Models\TransactionCheckin;
use App\Models\TransactionVehicle;
use App\Models\User;
use App\Models\VehicleType;
use App\Models\Visitor;
use Database\Seeders\TariffSeeder;
use Database\Seeders\VehicleTypeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Dashboard & laporan admin (Fase 8).
 *
 * Data dibangun langsung lewat model agar angka yang diharapkan eksplisit, dan
 * setiap endpoint diperiksa dari sisi akses maupun isi.
 */
class AdminReportTest extends TestCase
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

    private function venueToday(): string
    {
        return now(config('visit.timezone'))->toDateString();
    }

    private function vehicleType(string $code): VehicleType
    {
        return VehicleType::query()->where('code', $code)->firstOrFail();
    }

    /**
     * Build a transaction with optional visitors, vehicles, payment and check-in.
     *
     * @param  array{
     *     source?: TransactionSource,
     *     visit_date?: string,
     *     status?: TransactionStatus,
     *     visitors?: int,
     *     vehicles?: array<string, int>,
     *     payment_status?: PaymentStatus,
     *     paid_at?: Carbon|null,
     *     checked_in_visitors?: int,
     *     created_at?: Carbon|null
     * }  $options
     */
    private function makeTransaction(array $options = []): Transaction
    {
        $source = $options['source'] ?? TransactionSource::Online;
        $registered = $options['visitors'] ?? 1;

        $transaction = Transaction::create([
            'source' => $source,
            'user_id' => null,
            'visit_date' => $options['visit_date'] ?? $this->venueToday(),
            'visitor_count' => $registered,
            'visitor_unit_tariff' => 15000,
            'visitor_total' => 15000 * $registered,
            'vehicle_total' => 0,
            'total_amount' => 15000 * $registered,
            'status' => $options['status'] ?? TransactionStatus::Pending,
        ]);

        for ($i = 1; $i <= $registered; $i++) {
            Visitor::create([
                'transaction_id' => $transaction->id,
                'full_name' => 'Pendaftar '.$i,
                'nik' => '3201'.str_pad((string) ($transaction->id * 10 + $i), 12, '0', STR_PAD_LEFT),
            ]);
        }

        $vehicleTotal = 0;

        foreach ($options['vehicles'] ?? [] as $code => $quantity) {
            $type = $this->vehicleType($code);
            $subtotal = $type->unit_tariff * $quantity;
            $vehicleTotal += $subtotal;

            TransactionVehicle::create([
                'transaction_id' => $transaction->id,
                'vehicle_type_id' => $type->id,
                'quantity' => $quantity,
                'unit_tariff' => $type->unit_tariff,
                'subtotal' => $subtotal,
            ]);
        }

        if ($vehicleTotal > 0) {
            $transaction->forceFill([
                'vehicle_total' => $vehicleTotal,
                'total_amount' => $transaction->visitor_total + $vehicleTotal,
            ])->save();
        }

        if (isset($options['payment_status'])) {
            Payment::create([
                'transaction_id' => $transaction->id,
                'method' => PaymentMethod::Simulation,
                'amount' => $transaction->total_amount,
                'status' => $options['payment_status'],
                'paid_at' => $options['paid_at']
                    ?? ($options['payment_status'] === PaymentStatus::Success ? now() : null),
            ]);
        }

        if (isset($options['checked_in_visitors'])) {
            TransactionCheckin::create([
                'transaction_id' => $transaction->id,
                'validated_by' => $this->user(Role::GateStaff)->id,
                'checked_in_at' => now(),
                'visitor_count_checked_in' => $options['checked_in_visitors'],
            ]);

            $transaction->forceFill(['status' => TransactionStatus::CheckedIn])->save();
        }

        if (isset($options['created_at'])) {
            $transaction->forceFill(['created_at' => $options['created_at']])->save();
        }

        return $transaction->refresh();
    }

    private function asAdmin(string $url): TestResponse
    {
        $admin = $this->user(Role::Admin);
        $this->app['auth']->forgetGuards();

        return $this->withToken($this->token($admin))->getJson($url);
    }

    private function todayRange(): string
    {
        $today = $this->venueToday();

        return "date_from={$today}&date_to={$today}";
    }

    /*
    |--------------------------------------------------------------------------
    | Access control
    |--------------------------------------------------------------------------
    */

    public function test_admin_can_open_every_report_endpoint(): void
    {
        $this->makeTransaction();

        foreach ([
            '/api/v1/admin/dashboard',
            '/api/v1/admin/reports/visits',
            '/api/v1/admin/reports/transactions',
            '/api/v1/admin/reports/vehicles',
            '/api/v1/admin/reports/identities',
        ] as $url) {
            $this->asAdmin($url.'?'.$this->todayRange())->assertOk();
        }
    }

    public function test_non_admin_roles_and_anonymous_are_denied(): void
    {
        $this->makeTransaction();

        $endpoints = [
            '/api/v1/admin/dashboard',
            '/api/v1/admin/reports/visits',
            '/api/v1/admin/reports/transactions',
            '/api/v1/admin/reports/vehicles',
            '/api/v1/admin/reports/identities',
            '/api/v1/admin/reports/visits/export',
        ];

        // Anonymous.
        $this->app['auth']->forgetGuards();
        $this->flushHeaders();

        foreach ($endpoints as $url) {
            $this->getJson($url.'?'.$this->todayRange())->assertUnauthorized();
        }

        // Authenticated but disallowed roles.
        foreach ([Role::Visitor, Role::Cashier, Role::GateStaff] as $role) {
            $staff = $this->user($role);

            foreach ($endpoints as $url) {
                $this->app['auth']->forgetGuards();

                $this->withToken($this->token($staff))
                    ->getJson($url.'?'.$this->todayRange())
                    ->assertStatus(403);
            }
        }
    }

    /*
    |--------------------------------------------------------------------------
    | Dashboard
    |--------------------------------------------------------------------------
    */

    public function test_dashboard_uses_the_right_date_basis_for_each_metric(): void
    {
        // Created today, visited today, paid: counts everywhere.
        $this->makeTransaction([
            'visit_date' => $this->venueToday(),
            'visitors' => 2,
            'vehicles' => ['motorcycle' => 1],
            'payment_status' => PaymentStatus::Success,
        ]);

        // Created today but visited tomorrow: counts as a transaction only.
        $this->makeTransaction([
            'visit_date' => now(config('visit.timezone'))->addDay()->toDateString(),
            'visitors' => 3,
            'payment_status' => null,
        ]);

        $response = $this->asAdmin('/api/v1/admin/dashboard?'.$this->todayRange())
            ->assertOk();

        // Transactions are counted by created_at, so both appear.
        $response->assertJsonPath('data.transactions.total', 2);
        // Registered/checked-in visitors follow visit_date, so only the first.
        $response->assertJsonPath('data.visitors.registered', 2);
        $response->assertJsonPath('data.visitors.checked_in', 0);
        // Revenue = 2 * 15000 + 2000 from the successful payment only.
        $response->assertJsonPath('data.revenue.total', 32000);

        $motorcycle = collect($response->json('data.vehicles'))
            ->firstWhere('code', 'motorcycle');
        $car = collect($response->json('data.vehicles'))->firstWhere('code', 'car');

        $this->assertSame(1, $motorcycle['quantity']);
        $this->assertSame(0, $car['quantity']);
    }

    public function test_dashboard_defaults_to_the_current_month(): void
    {
        $response = $this->asAdmin('/api/v1/admin/dashboard')->assertOk();

        $expectedFrom = now(config('visit.timezone'))->startOfMonth()->toDateString();

        $response
            ->assertJsonPath('data.period.date_from', $expectedFrom)
            ->assertJsonPath('data.period.date_to', $this->venueToday());
    }

    public function test_dashboard_separates_registered_from_checked_in(): void
    {
        $this->makeTransaction([
            'visitors' => 4,
            'checked_in_visitors' => 3,
            'payment_status' => PaymentStatus::Success,
        ]);

        $this->asAdmin('/api/v1/admin/dashboard?'.$this->todayRange())
            ->assertOk()
            ->assertJsonPath('data.visitors.registered', 4)
            ->assertJsonPath('data.visitors.checked_in', 3)
            ->assertJsonPath('data.visitors.checked_in_transactions', 1);
    }

    /*
    |--------------------------------------------------------------------------
    | Visit report
    |--------------------------------------------------------------------------
    */

    public function test_visit_report_summary_and_rows(): void
    {
        $checkedIn = $this->makeTransaction([
            'source' => TransactionSource::Online,
            'visitors' => 3,
            'checked_in_visitors' => 2,
        ]);

        $notYet = $this->makeTransaction([
            'source' => TransactionSource::Counter,
            'visitors' => 2,
        ]);

        $response = $this->asAdmin('/api/v1/admin/reports/visits?'.$this->todayRange())
            ->assertOk();

        $response
            ->assertJsonPath('summary.transactions', 2)
            ->assertJsonPath('summary.registered_visitors', 5)
            ->assertJsonPath('summary.checked_in_visitors', 2)
            ->assertJsonPath('meta.total', 2);

        $rows = collect($response->json('data'));
        $row = $rows->firstWhere('transaction_code', $checkedIn->transaction_code);

        $this->assertSame(3, $row['registered_visitor_count']);
        $this->assertTrue($row['checked_in']);
        $this->assertSame(2, $row['checked_in_visitor_count']);

        $otherRow = $rows->firstWhere('transaction_code', $notYet->transaction_code);
        $this->assertFalse($otherRow['checked_in']);
    }

    public function test_visit_report_can_filter_checked_in_state_and_source(): void
    {
        $this->makeTransaction(['source' => TransactionSource::Online, 'visitors' => 3, 'checked_in_visitors' => 3]);
        $this->makeTransaction(['source' => TransactionSource::Counter, 'visitors' => 2]);

        $this->asAdmin('/api/v1/admin/reports/visits?'.$this->todayRange().'&checked_in=true')
            ->assertOk()
            ->assertJsonPath('summary.transactions', 1)
            ->assertJsonPath('summary.checked_in_visitors', 3);

        $this->asAdmin('/api/v1/admin/reports/visits?'.$this->todayRange().'&source=counter')
            ->assertOk()
            ->assertJsonPath('summary.transactions', 1)
            ->assertJsonPath('summary.registered_visitors', 2);
    }

    /*
    |--------------------------------------------------------------------------
    | Transaction & revenue report
    |--------------------------------------------------------------------------
    */

    public function test_transaction_report_revenue_and_filters(): void
    {
        $paid = $this->makeTransaction([
            'visitors' => 2,
            'vehicles' => ['car' => 1],
            'payment_status' => PaymentStatus::Success,
        ]);

        $this->makeTransaction([
            'source' => TransactionSource::Counter,
            'visitors' => 1,
        ]);

        $response = $this->asAdmin('/api/v1/admin/reports/transactions?'.$this->todayRange())
            ->assertOk();

        $response
            ->assertJsonPath('summary.transactions', 2)
            ->assertJsonPath('summary.revenue.total', 2 * 15000 + 5000)
            ->assertJsonPath('summary.revenue.basis', 'paid_at');

        $row = collect($response->json('data'))
            ->firstWhere('transaction_code', $paid->transaction_code);

        $this->assertSame(2, $row['visitor_count']);
        $this->assertSame(1, $row['vehicle_count']);
        $this->assertSame('success', $row['payment']['status']);

        // Filter to only successful payments.
        $this->asAdmin('/api/v1/admin/reports/transactions?'.$this->todayRange().'&payment_status=success')
            ->assertOk()
            ->assertJsonPath('summary.transactions', 1);

        // paid_at basis excludes the transaction that was never paid.
        $this->asAdmin('/api/v1/admin/reports/transactions?'.$this->todayRange().'&date_basis=paid_at')
            ->assertOk()
            ->assertJsonPath('summary.transactions', 1);
    }

    /*
    |--------------------------------------------------------------------------
    | Vehicle report
    |--------------------------------------------------------------------------
    */

    public function test_vehicle_report_lists_every_type_including_zero(): void
    {
        $this->makeTransaction([
            'visitors' => 2,
            'vehicles' => ['motorcycle' => 2, 'car' => 1],
        ]);

        $response = $this->asAdmin('/api/v1/admin/reports/vehicles?'.$this->todayRange())
            ->assertOk();

        $rows = collect($response->json('data'));

        $this->assertCount(3, $rows);
        $this->assertSame(2, $rows->firstWhere('code', 'motorcycle')['quantity']);
        $this->assertSame(1, $rows->firstWhere('code', 'car')['quantity']);
        $this->assertSame(0, $rows->firstWhere('code', 'bus_truck')['quantity']);

        $response
            ->assertJsonPath('summary.quantity', 3)
            ->assertJsonPath('summary.subtotal', 2 * 2000 + 5000);
    }

    /*
    |--------------------------------------------------------------------------
    | Identity report
    |--------------------------------------------------------------------------
    */

    public function test_identity_report_masks_nik_and_never_leaks_raw_nik(): void
    {
        $transaction = $this->makeTransaction(['visitors' => 1]);

        $visitor = Visitor::query()->where('transaction_id', $transaction->id)->firstOrFail();
        $rawNik = (string) $visitor->nik;

        $response = $this->asAdmin('/api/v1/admin/reports/identities?'.$this->todayRange())
            ->assertOk();

        $row = collect($response->json('data'))
            ->firstWhere('transaction_code', $transaction->transaction_code);

        $this->assertSame($visitor->maskedNik(), $row['masked_nik']);
        $this->assertStringNotContainsString($rawNik, $response->getContent());
        $this->assertStringNotContainsString('"nik"', $response->getContent());
    }

    /*
    |--------------------------------------------------------------------------
    | CSV export
    |--------------------------------------------------------------------------
    */

    public function test_visit_report_export_streams_csv(): void
    {
        $transaction = $this->makeTransaction(['visitors' => 2]);

        $response = $this->asAdmin('/api/v1/admin/reports/visits/export?'.$this->todayRange())
            ->assertOk();

        $this->assertStringContainsString('text/csv', (string) $response->headers->get('Content-Type'));
        $this->assertStringContainsString('attachment', (string) $response->headers->get('Content-Disposition'));
        $this->assertStringContainsString($transaction->transaction_code, $response->getContent());
        $this->assertStringContainsString('Kode Transaksi', $response->getContent());
    }

    public function test_identity_report_export_contains_masked_nik_only(): void
    {
        $transaction = $this->makeTransaction(['visitors' => 1]);
        $visitor = Visitor::query()->where('transaction_id', $transaction->id)->firstOrFail();
        $rawNik = (string) $visitor->nik;

        $response = $this->asAdmin('/api/v1/admin/reports/identities/export?'.$this->todayRange())
            ->assertOk();

        $body = $response->getContent();

        $this->assertStringContainsString($visitor->maskedNik(), $body);
        $this->assertStringNotContainsString($rawNik, $body);
    }

    public function test_export_is_rejected_when_it_exceeds_the_row_cap(): void
    {
        config(['report.max_export_rows' => 0]);

        $this->makeTransaction();

        $this->asAdmin('/api/v1/admin/reports/visits/export?'.$this->todayRange())
            ->assertStatus(422);
    }

    /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

    public function test_reversed_date_range_is_rejected(): void
    {
        $today = $this->venueToday();

        $this->asAdmin("/api/v1/admin/reports/visits?date_from={$today}&date_to="
            .now(config('visit.timezone'))->subDay()->toDateString())
            ->assertStatus(422)
            ->assertJsonValidationErrors('date_to');
    }

    public function test_overlong_date_range_is_rejected(): void
    {
        config(['report.max_span_days' => 5]);

        $today = $this->venueToday();

        $this->asAdmin('/api/v1/admin/reports/visits?date_from='
            .now(config('visit.timezone'))->subDays(10)->toDateString()
            ."&date_to={$today}")
            ->assertStatus(422)
            ->assertJsonValidationErrors('date_to');
    }

    public function test_per_page_above_the_cap_is_rejected(): void
    {
        $this->asAdmin('/api/v1/admin/reports/visits?'.$this->todayRange().'&per_page=101')
            ->assertStatus(422)
            ->assertJsonValidationErrors('per_page');
    }

    public function test_per_page_at_the_cap_is_accepted(): void
    {
        $this->asAdmin('/api/v1/admin/reports/visits?'.$this->todayRange().'&per_page=100')
            ->assertOk()
            ->assertJsonPath('meta.per_page', 100);
    }

    public function test_default_pagination_uses_the_configured_per_page(): void
    {
        $this->asAdmin('/api/v1/admin/reports/visits?'.$this->todayRange())
            ->assertOk()
            ->assertJsonPath('meta.per_page', 25);
    }

    public function test_report_pagination_walks_every_page(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->makeTransaction(['visitors' => 1]);
        }

        $range = $this->todayRange();

        $this->asAdmin("/api/v1/admin/reports/visits?{$range}&per_page=2&page=1")
            ->assertOk()
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonPath('meta.per_page', 2)
            ->assertJsonPath('meta.total', 5)
            ->assertJsonPath('meta.last_page', 3)
            ->assertJsonPath('meta.from', 1)
            ->assertJsonCount(2, 'data');

        $this->asAdmin("/api/v1/admin/reports/visits?{$range}&per_page=2&page=3")
            ->assertOk()
            ->assertJsonPath('meta.current_page', 3)
            ->assertJsonPath('meta.to', 5)
            ->assertJsonCount(1, 'data');

        // Melewati halaman terakhir tetap balasan sah, hanya tanpa baris.
        $this->asAdmin("/api/v1/admin/reports/visits?{$range}&per_page=2&page=9")
            ->assertOk()
            ->assertJsonPath('meta.total', 5)
            ->assertJsonPath('meta.from', null)
            ->assertJsonCount(0, 'data');
    }

    public function test_reports_handle_an_empty_dataset(): void
    {
        $range = $this->todayRange();

        $this->asAdmin("/api/v1/admin/reports/visits?{$range}")
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.total', 0)
            ->assertJsonPath('meta.from', null)
            ->assertJsonPath('meta.to', null)
            ->assertJsonPath('summary.transactions', 0)
            ->assertJsonPath('summary.registered_visitors', 0)
            ->assertJsonPath('summary.checked_in_visitors', 0);

        $this->asAdmin("/api/v1/admin/reports/transactions?{$range}")
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('summary.transactions', 0)
            ->assertJsonPath('summary.revenue.total', 0);

        // Laporan kendaraan tetap menampilkan seluruh tipe dengan jumlah 0.
        $this->asAdmin("/api/v1/admin/reports/vehicles?{$range}")
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('summary.quantity', 0)
            ->assertJsonPath('summary.subtotal', 0);

        $this->asAdmin("/api/v1/admin/reports/identities?{$range}")
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }
}
