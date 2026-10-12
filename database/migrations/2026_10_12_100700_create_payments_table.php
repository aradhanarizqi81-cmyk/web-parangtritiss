<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            // One payment record per transaction. The unique constraint makes a
            // second successful payment impossible at the database level.
            $table->foreignId('transaction_id')->unique()->constrained()->cascadeOnDelete();

            $table->string('method');
            $table->unsignedInteger('amount');
            $table->string('status')->default('pending')->index();
            $table->string('reference')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
