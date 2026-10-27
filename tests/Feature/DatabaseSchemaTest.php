<?php

namespace Tests\Feature;

use App\Enums\FacilityEntitlementStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\TransactionSource;
use App\Models\Facility;
use App\Models\Payment;
use App\Models\Ticket;
use App\Models\TicketFacilityEntitlement;
use App\Models\Transaction;
use App\Models\TransactionCheckin;
use App\Models\TransactionVehicle;
use App\Models\VehicleType;
use App\Models\Visitor;
use Database\Seeders\FacilitySeeder;
use Database\Seeders\TariffSeeder;
use Database\Seeders\VehicleTypeSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DatabaseSchemaTest extends TestCase
{
    use RefreshDatabase;

    private function makeTransaction(array $overrides = []): Transaction
    {
        return Transaction::create([
            'source' => TransactionSource::Online,
            'visit_date' => now()->toDateString(),
            'visitor_count' => 2,
            'visitor_unit_tariff' => 15000,
            'visitor_total' => 30000,
            'vehicle_total' => 0,
            'total_amount' => 30000,
            ...$overrides,
        ]);
    }

    public function test_transaction_generates_code_and_opaque_barcode_token(): void
    {
        $transaction = $this->makeTransaction();

        $this->assertNotEmpty($transaction->transaction_code);
        $this->assertStringStartsWith('TRX-', $transaction->transaction_code);
        $this->assertNotEmpty($transaction->barcode_token);
        $this->assertNull($transaction->fresh()->user_id);
    }

    public function test_tariff_snapshot_is_persisted_on_transaction(): void
    {
        $transaction = $this->makeTransaction(['visitor_unit_tariff' => 15000]);

        // Changing the active tariff later must not alter historical records.
        DB::table('tariffs')->update(['unit_tariff' => 99999]);

        $this->assertSame(15000, $transaction->fresh()->visitor_unit_tariff);
    }

    public function test_nik_is_encrypted_at_rest_and_masked_when_exposed(): void
    {
        $transaction = $this->makeTransaction();
        $plainNik = '3201234567890123';

        $visitor = Visitor::create([
            'transaction_id' => $transaction->id,
            'full_name' => 'Budi Santoso',
            'nik' => $plainNik,
        ]);

        $raw = DB::table('visitors')->where('id', $visitor->id)->value('nik');

        $this->assertNotSame($plainNik, $raw);
        $this->assertStringNotContainsString($plainNik, (string) $raw);
        $this->assertSame($plainNik, $visitor->fresh()->nik);
        $this->assertSame('3201********0123', $visitor->maskedNik());
    }

    public function test_a_visitor_can_only_have_one_ticket(): void
    {
        $transaction = $this->makeTransaction();
        $visitor = Visitor::create([
            'transaction_id' => $transaction->id,
            'full_name' => 'Siti',
            'nik' => '3201234567890124',
        ]);

        Ticket::create([
            'transaction_id' => $transaction->id,
            'visitor_id' => $visitor->id,
            'ticket_code' => 'TKT-0001',
        ]);

        $this->expectException(QueryException::class);

        Ticket::create([
            'transaction_id' => $transaction->id,
            'visitor_id' => $visitor->id,
            'ticket_code' => 'TKT-0002',
        ]);
    }

    public function test_transaction_vehicle_type_pair_is_unique(): void
    {
        $this->seed(VehicleTypeSeeder::class);
        $transaction = $this->makeTransaction();
        $vehicleType = VehicleType::where('code', 'car')->firstOrFail();

        TransactionVehicle::create([
            'transaction_id' => $transaction->id,
            'vehicle_type_id' => $vehicleType->id,
            'quantity' => 1,
            'unit_tariff' => 5000,
            'subtotal' => 5000,
        ]);

        $this->expectException(QueryException::class);

        TransactionVehicle::create([
            'transaction_id' => $transaction->id,
            'vehicle_type_id' => $vehicleType->id,
            'quantity' => 1,
            'unit_tariff' => 5000,
            'subtotal' => 5000,
        ]);
    }

    public function test_a_transaction_can_only_have_one_payment(): void
    {
        $transaction = $this->makeTransaction();

        Payment::create([
            'transaction_id' => $transaction->id,
            'method' => PaymentMethod::Simulation,
            'amount' => 30000,
            'status' => PaymentStatus::Success,
        ]);

        $this->expectException(QueryException::class);

        Payment::create([
            'transaction_id' => $transaction->id,
            'method' => PaymentMethod::Simulation,
            'amount' => 30000,
            'status' => PaymentStatus::Success,
        ]);
    }

    public function test_a_transaction_can_only_have_one_checkin(): void
    {
        $transaction = $this->makeTransaction();

        TransactionCheckin::create([
            'transaction_id' => $transaction->id,
            'checked_in_at' => now(),
            'visitor_count_checked_in' => 2,
        ]);

        $this->expectException(QueryException::class);

        TransactionCheckin::create([
            'transaction_id' => $transaction->id,
            'checked_in_at' => now(),
            'visitor_count_checked_in' => 2,
        ]);
    }

    public function test_seeders_create_expected_initial_tariffs(): void
    {
        $this->seed(TariffSeeder::class);
        $this->seed(VehicleTypeSeeder::class);

        $this->assertSame(15000, (int) DB::table('tariffs')->where('code', 'visitor')->value('unit_tariff'));
        $this->assertSame(2000, (int) DB::table('vehicle_types')->where('code', 'motorcycle')->value('unit_tariff'));
        $this->assertSame(5000, (int) DB::table('vehicle_types')->where('code', 'car')->value('unit_tariff'));
        $this->assertSame(10000, (int) DB::table('vehicle_types')->where('code', 'bus_truck')->value('unit_tariff'));
    }

    public function test_facility_seeder_is_idempotent_and_keeps_one_initial_facility(): void
    {
        $this->seed(FacilitySeeder::class);
        $this->seed(FacilitySeeder::class);

        $this->assertSame(1, Facility::count());

        $facility = Facility::where('code', 'FREE_TEA')->firstOrFail();

        $this->assertSame('Minuman Gratis', $facility->name);
        $this->assertTrue($facility->is_auto_granted);
        $this->assertTrue($facility->active);
    }

    public function test_a_ticket_can_only_have_one_entitlement_per_facility(): void
    {
        $this->seed(FacilitySeeder::class);

        $transaction = $this->makeTransaction();
        $visitor = Visitor::create([
            'transaction_id' => $transaction->id,
            'full_name' => 'Budi Santoso',
            'nik' => '3201234567890123',
        ]);
        $ticket = Ticket::create([
            'transaction_id' => $transaction->id,
            'visitor_id' => $visitor->id,
        ]);
        $facility = Facility::where('code', 'FREE_TEA')->firstOrFail();

        TicketFacilityEntitlement::create([
            'ticket_id' => $ticket->id,
            'facility_id' => $facility->id,
            'status' => FacilityEntitlementStatus::Granted,
            'granted_at' => now(),
        ]);

        $this->expectException(QueryException::class);

        TicketFacilityEntitlement::create([
            'ticket_id' => $ticket->id,
            'facility_id' => $facility->id,
            'status' => FacilityEntitlementStatus::Granted,
            'granted_at' => now(),
        ]);
    }
}
