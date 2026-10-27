<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Hak fasilitas per tiket individual.
     *
     * Satu tiket hanya boleh memiliki satu hak untuk fasilitas yang sama
     * (unique `ticket_id` + `facility_id`). `status` menyimpan granted/redeemed/
     * void, sedangkan `redeemed_at` tetap NULL sampai petugas loket benar-benar
     * mengklaim. Kombinasi `status=granted` + `redeemed_at IS NULL` adalah
     * definisi "masih tersedia" yang dipakai klaim atomik.
     */
    public function up(): void
    {
        Schema::create('ticket_facility_entitlements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained()->cascadeOnDelete();
            $table->foreignId('facility_id')->constrained()->restrictOnDelete();

            $table->string('status', 32)->default('granted');
            $table->timestamp('granted_at');
            $table->timestamp('redeemed_at')->nullable();
            $table->foreignId('redeemed_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamp('voided_at')->nullable();
            $table->foreignId('voided_by_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();

            $table->unique(['ticket_id', 'facility_id']);
            $table->index(['facility_id', 'status']);
            $table->index(['status', 'redeemed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_facility_entitlements');
    }
};
