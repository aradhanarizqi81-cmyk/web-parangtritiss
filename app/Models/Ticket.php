<?php

namespace App\Models;

use App\Enums\TicketStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

#[Fillable(['transaction_id', 'visitor_id', 'ticket_code', 'status', 'printed_at'])]
class Ticket extends Model
{
    protected function casts(): array
    {
        return [
            'status' => TicketStatus::class,
            'printed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Ticket $ticket): void {
            $ticket->ticket_code ??= static::generateTicketCode();
        });
    }

    /**
     * Unique, hard-to-guess individual ticket code. Contains no personal data.
     */
    public static function generateTicketCode(): string
    {
        return 'TKT-'.now()->format('Ymd').'-'.Str::upper(Str::random(8));
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function visitor(): BelongsTo
    {
        return $this->belongsTo(Visitor::class);
    }

    public function facilityEntitlements(): HasMany
    {
        return $this->hasMany(TicketFacilityEntitlement::class);
    }
}
