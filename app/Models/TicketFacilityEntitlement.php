<?php

namespace App\Models;

use App\Enums\FacilityEntitlementStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'ticket_id',
    'facility_id',
    'status',
    'granted_at',
    'redeemed_at',
    'redeemed_by_user_id',
    'voided_at',
    'voided_by_user_id',
])]
class TicketFacilityEntitlement extends Model
{
    protected function casts(): array
    {
        return [
            'status' => FacilityEntitlementStatus::class,
            'granted_at' => 'datetime',
            'redeemed_at' => 'datetime',
            'voided_at' => 'datetime',
        ];
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function facility(): BelongsTo
    {
        return $this->belongsTo(Facility::class);
    }

    public function redeemer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'redeemed_by_user_id');
    }

    public function voider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by_user_id');
    }

    /**
     * A grant is only available while it has not been redeemed or voided.
     */
    public function isAvailable(): bool
    {
        return $this->status === FacilityEntitlementStatus::Granted
            && $this->redeemed_at === null;
    }
}
