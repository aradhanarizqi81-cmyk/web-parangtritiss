<?php

namespace App\Models;

use App\Enums\TransactionSource;
use App\Enums\TransactionStatus;
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
}
