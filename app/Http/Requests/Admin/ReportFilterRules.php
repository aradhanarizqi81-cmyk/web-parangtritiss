<?php

namespace App\Http\Requests\Admin;

use Carbon\CarbonImmutable;
use Illuminate\Contracts\Validation\Validator;

/**
 * Validasi rentang tanggal yang dipakai bersama oleh dashboard dan laporan.
 *
 * Rentang yang terbalik atau terlalu panjang ditolak di level validasi (422)
 * sebelum menyentuh database.
 */
final class ReportFilterRules
{
    public static function validateRange(Validator $validator, mixed $dateFrom, mixed $dateTo): void
    {
        if (! is_string($dateFrom) || ! is_string($dateTo)) {
            return;
        }

        $timezone = (string) config('visit.timezone');

        $from = CarbonImmutable::createFromFormat('Y-m-d', $dateFrom, $timezone);
        $to = CarbonImmutable::createFromFormat('Y-m-d', $dateTo, $timezone);

        if ($from === false || $to === false) {
            return;
        }

        $from = $from->startOfDay();
        $to = $to->startOfDay();

        if ($to->lt($from)) {
            $validator->errors()->add(
                'date_to',
                'Tanggal akhir harus sama dengan atau setelah tanggal mulai.',
            );

            return;
        }

        $days = (int) $from->diffInDays($to) + 1;

        if ($days > (int) config('report.max_span_days')) {
            $validator->errors()->add(
                'date_to',
                'Rentang tanggal melebihi batas maksimum '.config('report.max_span_days').' hari.',
            );
        }
    }
}
