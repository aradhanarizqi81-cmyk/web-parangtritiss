<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_code')->unique();
            $table->string('barcode_token')->unique();

            // Ownership: online booking owner and the counter officer who recorded it.
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('cashier_user_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('source')->index();
            $table->date('visit_date')->index();

            // Tariff snapshot so historical transactions never change when tariffs change.
            $table->unsignedSmallInteger('visitor_count');
            $table->unsignedInteger('visitor_unit_tariff');
            $table->unsignedInteger('visitor_total');
            $table->unsignedInteger('vehicle_total')->default(0);
            $table->unsignedInteger('total_amount');

            $table->string('status')->default('pending')->index();
            $table->timestamps();

            $table->index(['visit_date', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
