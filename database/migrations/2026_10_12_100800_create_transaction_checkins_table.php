<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transaction_checkins', function (Blueprint $table) {
            $table->id();

            // A transaction can only ever have a single check-in record.
            $table->foreignId('transaction_id')->unique()->constrained()->cascadeOnDelete();

            $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('checked_in_at');
            $table->unsignedSmallInteger('visitor_count_checked_in');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_checkins');
    }
};
