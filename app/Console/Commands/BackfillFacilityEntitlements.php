<?php

namespace App\Console\Commands;

use App\Enums\PaymentStatus;
use App\Enums\TransactionStatus;
use App\Models\Transaction;
use App\Services\FacilityEntitlementService;
use DateTimeImmutable;
use Illuminate\Console\Command;

/**
 * Backfill facility grants for transactions that were paid before the
 * facility feature existed.
 *
 * Deliberately manual: it is never called by a migration or seeder, supports a
 * dry run, and refuses to run in production without `--force`. The grant logic
 * is idempotent, so running it twice creates nothing the second time.
 */
class BackfillFacilityEntitlements extends Command
{
    protected $signature = 'facilities:backfill
        {--dry-run : Hitung hak yang akan dibuat tanpa menulis apa pun}
        {--from= : Batas awal tanggal kunjungan (Y-m-d)}
        {--to= : Batas akhir tanggal kunjungan (Y-m-d)}
        {--facility= : Kode fasilitas tertentu (default semua auto-granted)}
        {--chunk=500 : Jumlah transaksi per batch}
        {--force : Izinkan berjalan di production}';

    protected $description = 'Isi hak fasilitas untuk transaksi lunas yang belum memilikinya';

    public function handle(FacilityEntitlementService $service): int
    {
        if (app()->isProduction() && ! $this->option('force')) {
            $this->error('Perintah ini tidak dijalankan otomatis. Gunakan --force setelah dry-run di production.');

            return self::FAILURE;
        }

        $from = $this->option('from');
        $to = $this->option('to');

        if (! $this->isValidDate($from)) {
            $this->error('Opsi --from harus berupa tanggal Y-m-d yang valid.');

            return self::FAILURE;
        }

        if (! $this->isValidDate($to)) {
            $this->error('Opsi --to harus berupa tanggal Y-m-d yang valid.');

            return self::FAILURE;
        }

        if ($from !== null && $to !== null && $from > $to) {
            $this->error('Rentang tanggal terbalik: --from harus sebelum atau sama dengan --to.');

            return self::FAILURE;
        }

        $facilityCode = $this->option('facility');
        $facilityCode = is_string($facilityCode) && $facilityCode !== ''
            ? strtoupper(trim($facilityCode))
            : null;

        $facilities = $service->autoGrantedFacilities($facilityCode);

        if ($facilities->isEmpty()) {
            $this->warn($facilityCode
                ? "Fasilitas aktif dengan kode {$facilityCode} tidak ditemukan."
                : 'Tidak ada fasilitas auto-granted yang aktif.');

            return self::SUCCESS;
        }

        $dryRun = (bool) $this->option('dry-run');
        $chunkSize = max(1, (int) $this->option('chunk'));
        $counted = 0;
        $tickets = 0;
        $created = 0;

        $query = Transaction::query()
            ->with([
                'tickets:id,transaction_id,status',
                'payment:id,transaction_id,status',
            ])
            ->whereIn('status', [
                TransactionStatus::Paid->value,
                TransactionStatus::CheckedIn->value,
            ])
            ->whereHas('payment', fn ($payment) => $payment
                ->where('status', PaymentStatus::Success->value))
            ->orderBy('id');

        if ($from !== null) {
            $query->whereDate('visit_date', '>=', $from);
        }

        if ($to !== null) {
            $query->whereDate('visit_date', '<=', $to);
        }

        $query->chunkById($chunkSize, function ($transactions) use (
            $service,
            $facilities,
            $dryRun,
            &$counted,
            &$tickets,
            &$created,
        ): void {
            foreach ($transactions as $transaction) {
                $counted++;
                $tickets += $transaction->tickets->count();
                $created += $service->grantForTransaction(
                    $transaction,
                    $facilities,
                    $dryRun,
                );
            }
        });

        $verb = $dryRun ? 'akan dibuat' : 'dibuat';

        $this->info(sprintf(
            '%sTransaksi diperiksa: %d; tiket diperiksa: %d; hak fasilitas %s: %d.',
            $dryRun ? 'DRY RUN — ' : '',
            $counted,
            $tickets,
            $verb,
            $created,
        ));

        return self::SUCCESS;
    }

    private function isValidDate(mixed $value): bool
    {
        if ($value === null || $value === '') {
            return true;
        }

        if (! is_string($value)) {
            return false;
        }

        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);

        return $date !== false && $date->format('Y-m-d') === $value;
    }
}
