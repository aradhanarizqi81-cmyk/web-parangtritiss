<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['transaction_id', 'validated_by', 'checked_in_at', 'visitor_count_checked_in'])]
class TransactionCheckin extends Model
{
    protected function casts(): array
    {
        return [
            'checked_in_at' => 'datetime',
            'visitor_count_checked_in' => 'integer',
        ];
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function validator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }
}
