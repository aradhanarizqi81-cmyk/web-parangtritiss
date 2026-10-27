<?php

namespace App\Models;

use App\Enums\TransactionSource;
use App\Enums\TransactionStatus;
use App\Services\FacilityEntitlementService;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;

#[Fillable([
    'user_id',
    'cashier_user_id',
    'source',
    'visit_date',
    'visitor_count',
    'visitor_unit_tariff',
    'visitor_total',
    'vehicle_total',
    'total_amount',
    'status',
])]
class Transaction extends Model
{
    protected function casts(): array
    {
        return [
            'source' => TransactionSource::class,
            'status' => TransactionStatus::class,
            'visit_date' => 'date',
            'redeemed_at' => 'datetime',
            'visitor_count' => 'integer',
            'visitor_unit_tariff' => 'integer',
            'visitor_total' => 'integer',
            'vehicle_total' => 'integer',
            'total_amount' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Transaction $transaction): void {
            $transaction->transaction_code ??= static::generateTransactionCode();
            $transaction->barcode_token ??= static::generateBarcodeToken();

            // A redemption token exists only for online bookings: counter sales
            // are paid and printed at the counter, never redeemed from a QR.
            if ($transaction->source === TransactionSource::Online) {
                $transaction->redemption_token ??= static::generateRedemptionToken();
            }
        });

        static::updated(function (Transaction $transaction): void {
            if (! $transaction->wasChanged('status')) {
                return;
            }

            if ($transaction->status !== TransactionStatus::Cancelled) {
                return;
            }

            // Cancellation has no dedicated endpoint yet, but when a developer
            // or a future flow flips the status, any unredeemed facility grant
            // must stop being claimable. Already redeemed grants stay as
            // historical records of what was actually handed over.
            app(FacilityEntitlementService::class)->voidForTransaction(
                $transaction,
                auth()->user(),
            );
        });
    }

    public static function generateTransactionCode(): string
    {
        return 'TRX-'.now()->format('Ymd').'-'.Str::upper(Str::random(6));
    }

    /**
     * Opaque group barcode payload. Contains no personal data.
     */
    public static function generateBarcodeToken(): string
    {
        return Str::random(40);
    }

    /**
     * Opaque redemption payload shown to the visitor and scanned at the counter.
     *
     * Deliberately different from `barcode_token`: it is used only to collect an
     * online order at the counter. It is random (never derived from the
     * sequential id) and carries no personal data. The short prefix makes it
     * easy to tell apart from a gate barcode by eye.
     */
    public static function generateRedemptionToken(): string
    {
        return 'RDM-'.Str::upper(Str::random(24));
    }

    public function redeemer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'redeemed_by_user_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_user_id');
    }

    public function visitors(): HasMany
    {
        return $this->hasMany(Visitor::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function transactionVehicles(): HasMany
    {
        return $this->hasMany(TransactionVehicle::class);
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }

    public function checkin(): HasOne
    {
        return $this->hasOne(TransactionCheckin::class);
    }

    public function isPaid(): bool
    {
        return $this->status === TransactionStatus::Paid
            || $this->status === TransactionStatus::CheckedIn;
    }

    public function isCheckedIn(): bool
    {
        return $this->status === TransactionStatus::CheckedIn;
    }

    /**
     * An online booking is "redeemed" once its physical wristbands have been
     * collected at the counter. This is tracked separately from `status`, which
     * only describes payment and gate attendance.
     */
    public function isRedeemed(): bool
    {
        return $this->redeemed_at !== null;
    }
}
