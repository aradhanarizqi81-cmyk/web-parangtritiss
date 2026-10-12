<?php

namespace App\Services;

use App\Models\Tariff;
use App\Models\VehicleType;

/**
 * Single source of truth for turning visitor/vehicle input into money.
 *
 * Both the counter (loket) and the online booking flows price through here, so
 * the two paths can never drift apart. Every amount is read from the currently
 * active tariffs in the database: numbers sent by the client are never used.
 */
class PricingService
{
    /**
     * @param  array<int, array<string, mixed>>  $vehicleLines
     * @return array{
     *     visitor_unit_tariff: int,
     *     visitor_total: int,
     *     vehicle_total: int,
     *     total_amount: int,
     *     vehicles: array<int, array{vehicle_type_id: int, quantity: int, unit_tariff: int, subtotal: int}>
     * }
     */
    public function quote(int $visitorCount, array $vehicleLines): array
    {
        $visitorTariff = Tariff::query()
            ->active()
            ->where('code', Tariff::CODE_VISITOR)
            ->first();

        if ($visitorTariff === null) {
            abort(422, 'Tarif wisatawan aktif belum dikonfigurasi.');
        }

        $visitorCount = max(0, $visitorCount);
        $visitorTotal = $visitorCount * $visitorTariff->unit_tariff;

        // Only active vehicle types may be sold; the Form Request already
        // rejects inactive ids, this is the authoritative re-check.
        $vehicleTypes = VehicleType::query()
            ->active()
            ->whereIn('id', array_column($vehicleLines, 'vehicle_type_id'))
            ->get()
            ->keyBy('id');

        $vehicleTotal = 0;
        $resolvedVehicles = [];

        foreach ($vehicleLines as $line) {
            $type = $vehicleTypes->get($line['vehicle_type_id']);

            if ($type === null) {
                abort(422, 'Jenis kendaraan tidak ditemukan atau tidak aktif.');
            }

            $quantity = (int) $line['quantity'];
            $subtotal = $quantity * $type->unit_tariff;
            $vehicleTotal += $subtotal;

            $resolvedVehicles[] = [
                'vehicle_type_id' => $type->id,
                'quantity' => $quantity,
                'unit_tariff' => $type->unit_tariff,
                'subtotal' => $subtotal,
            ];
        }

        return [
            'visitor_unit_tariff' => $visitorTariff->unit_tariff,
            'visitor_total' => $visitorTotal,
            'vehicle_total' => $vehicleTotal,
            'total_amount' => $visitorTotal + $vehicleTotal,
            'vehicles' => $resolvedVehicles,
        ];
    }
}
