<?php

namespace App\Support;

use App\Models\Tariff;
use App\Models\VehicleType;

/**
 * Read-only projection of the currently active price list.
 *
 * Shared by the counter and booking namespaces so both forms are fed the exact
 * same shape. These values are for display only: the server still recomputes
 * every total from the database when a transaction is created.
 */
final class TariffCatalog
{
    /**
     * @return array{
     *     visitor_tariff: array{code: string, name: string, unit_tariff: int}|null,
     *     vehicle_types: array<int, array{id: int, code: string, name: string, unit_tariff: int}>
     * }
     */
    public static function active(): array
    {
        $visitorTariff = Tariff::query()
            ->active()
            ->where('code', Tariff::CODE_VISITOR)
            ->first();

        $vehicleTypes = VehicleType::query()
            ->active()
            ->orderBy('id')
            ->get();

        return [
            'visitor_tariff' => $visitorTariff ? [
                'code' => $visitorTariff->code,
                'name' => $visitorTariff->name,
                'unit_tariff' => $visitorTariff->unit_tariff,
            ] : null,
            'vehicle_types' => $vehicleTypes
                ->map(fn (VehicleType $type): array => [
                    'id' => $type->id,
                    'code' => $type->code,
                    'name' => $type->name,
                    'unit_tariff' => $type->unit_tariff,
                ])
                ->values()
                ->all(),
        ];
    }
}
