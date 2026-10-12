<?php

namespace App\Http\Controllers\Api\V1\Counter;

use App\Http\Controllers\Controller;
use App\Models\Tariff;
use App\Models\VehicleType;
use Illuminate\Http\JsonResponse;

class TariffController extends Controller
{
    /**
     * Active tariffs for the counter form.
     *
     * Read-only, so it carries no audit entry. The frontend only uses these
     * values for a live estimate; the server recomputes every total on sale.
     */
    public function index(): JsonResponse
    {
        $visitorTariff = Tariff::query()
            ->active()
            ->where('code', Tariff::CODE_VISITOR)
            ->first();

        $vehicleTypes = VehicleType::query()
            ->active()
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => [
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
                    ->values(),
            ],
        ]);
    }
}
