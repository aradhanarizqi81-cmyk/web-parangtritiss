<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transaction_vehicles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained()->cascadeOnDelete();
            $table->foreignId('vehicle_type_id')->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('quantity');

            // Tariff snapshot for this vehicle line.
            $table->unsignedInteger('unit_tariff');
            $table->unsignedInteger('subtotal');

            $table->timestamps();

            $table->unique(['transaction_id', 'vehicle_type_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_vehicles');
    }
};
