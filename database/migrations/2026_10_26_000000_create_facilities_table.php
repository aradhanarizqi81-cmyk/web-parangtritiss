<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Katalog fasilitas yang dapat melekat pada tiket individual.
     *
     * Tabel ini sengaja generik: `code`/`name` menjadi identitas fasilitas,
     * sedangkan `is_auto_granted` menandai fasilitas yang diberikan otomatis
     * setelah pembayaran berhasil. Fasilitas tambahan di masa depan cukup
     * ditambahkan sebagai baris baru tanpa mengubah kode transaksi.
     */
    public function up(): void
    {
        Schema::create('facilities', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('name');
            $table->boolean('is_auto_granted')->default(false);
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->index(['active', 'is_auto_granted']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facilities');
    }
};
