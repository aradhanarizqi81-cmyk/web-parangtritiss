<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Penukaran tiket fisik untuk booking online.
     *
     * - `redemption_token`: token publik penukaran (acak, tanpa data pribadi),
     *   terpisah dari `barcode_token` gerbang. Unik; dibiarkan NULL untuk
     *   transaksi loket (MySQL/SQLite mengizinkan banyak NULL pada indeks unik).
     * - `redeemed_at`: status "Sudah Ditukarkan". NULL berarti belum ditukarkan.
     * - `redeemed_by_user_id`: petugas loket yang menukarkan (jejak audit).
     *
     * Tidak ada tabel maupun nilai `status` baru: status penukaran cukup
     * diturunkan dari `redeemed_at`, sehingga laporan dan alur lain tidak ikut
     * berubah.
     */
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('redemption_token', 64)->nullable()->unique();
            $table->timestamp('redeemed_at')->nullable();
            $table->foreignId('redeemed_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropUnique(['redemption_token']);
            $table->dropForeign(['redeemed_by_user_id']);
            $table->dropColumn([
                'redemption_token',
                'redeemed_at',
                'redeemed_by_user_id',
            ]);
        });
    }
};
