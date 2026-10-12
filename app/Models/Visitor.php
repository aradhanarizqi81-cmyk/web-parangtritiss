<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['transaction_id', 'full_name', 'nik'])]
#[Hidden(['nik'])]
class Visitor extends Model
{
    protected function casts(): array
    {
        return [
            'nik' => 'encrypted',
        ];
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function ticket(): HasOne
    {
        return $this->hasOne(Ticket::class);
    }

    /**
     * Partially masked NIK for general reports (e.g. 3201********1234).
     */
    public function maskedNik(): string
    {
        $nik = (string) $this->nik;

        if (strlen($nik) <= 8) {
            return str_repeat('*', strlen($nik));
        }

        return substr($nik, 0, 4).str_repeat('*', strlen($nik) - 8).substr($nik, -4);
    }
}
