<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * Rentang tanggal laporan.
 *
 * Rentang diterima sebagai tanggal kalender pada zona waktu venue
 * (config('visit.timezone')), sedangkan kolom TIMESTAMP pada database disimpan
 * dalam UTC. Kelas ini menyediakan kedua representasi sekaligus sehingga setiap
 * laporan memakai batas yang sama, di sekitar tengah malam sekalipun.
 */
final class ReportPeriod
{
    private function __construct(
        public readonly CarbonImmutable $from,
        public readonly CarbonImmutable $to,
        public readonly string $timezone,
    ) {}

    /**
     * Bangun rentang dari input tanggal (Y-m-d). Bila tidak diberikan, default
     * adalah awal bulan berjalan sampai hari ini pada zona venue.
     */
    public static function fromInput(?string $dateFrom, ?string $dateTo): self
    {
        $timezone = (string) config('visit.timezone');
        $now = CarbonImmutable::now($timezone);

        $from = self::parse($dateFrom, $timezone) ?? $now->startOfMonth();
        $to = self::parse($dateTo, $timezone) ?? $now;

        return new self($from->startOfDay(), $to->startOfDay(), $timezone);
    }

    private static function parse(?string $date, string $timezone): ?CarbonImmutable
    {
        if ($date === null || $date === '') {
            return null;
        }

        return CarbonImmutable::createFromFormat('Y-m-d', $date, $timezone)->startOfDay();
    }

    public function fromDate(): string
    {
        return $this->from->toDateString();
    }

    public function toDate(): string
    {
        return $this->to->toDateString();
    }

    /**
     * Batas atas eksklusif untuk kolom tanggal (DATE) = tanggal akhir + 1 hari.
     *
     * Kolom `date` ditulis Eloquent sebagai "Y-m-d H:i:s" pada SQLite dan
     * dipotong menjadi "Y-m-d" oleh MySQL. Interval setengah terbuka
     * [mulai, akhir+1) memberi hasil yang sama di kedua driver sekaligus tetap
     * memakai indeks kolom (tanpa fungsi pada kolom).
     */
    public function endDateExclusive(): string
    {
        return $this->to->addDay()->toDateString();
    }

    /**
     * Batas bawah (inklusif) untuk kolom TIMESTAMP, dalam UTC.
     */
    public function fromUtc(): CarbonImmutable
    {
        return $this->from->startOfDay()->setTimezone('UTC');
    }

    /**
     * Batas atas (inklusif) untuk kolom TIMESTAMP, dalam UTC.
     */
    public function toUtc(): CarbonImmutable
    {
        return $this->to->endOfDay()->setTimezone('UTC');
    }

    /**
     * Jumlah hari kalender yang dicakup, inklusif.
     */
    public function spanDays(): int
    {
        return (int) $this->from->diffInDays($this->to) + 1;
    }
}
