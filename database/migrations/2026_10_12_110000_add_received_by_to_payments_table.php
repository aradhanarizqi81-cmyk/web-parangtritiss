<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            // Officer who received and confirmed the cash payment. Nullable so
            // existing/simulated payments stay valid; nullOnDelete keeps the
            // financial record when a user account is removed.
            $table->foreignId('received_by_user_id')
                ->nullable()
                ->after('status')
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('received_by_user_id');
        });
    }
};
