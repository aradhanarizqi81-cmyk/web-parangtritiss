<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Indeks penunjang laporan admin (Fase 8).
 *
 * Dua jalur query laporan belum punya indeks penopang:
 * - pendapatan  : payments.status = success AND paid_at BETWEEN ...
 * - transaksi    : transactions.created_at BETWEEN ...
 *
 * Laporan kunjungan/kendaraan sudah tercakup indeks `visit_date` (dan
 * `(visit_date, status)`). Tidak ada perubahan tabel atau kolom — hanya indeks.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->index(['status', 'paid_at'], 'payments_status_paid_at_index');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->index('created_at', 'transactions_created_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex('transactions_created_at_index');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex('payments_status_paid_at_index');
        });
    }
};
