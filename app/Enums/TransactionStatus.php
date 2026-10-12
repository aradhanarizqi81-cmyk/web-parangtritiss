<?php

namespace App\Enums;

enum TransactionStatus: string
{
    case Pending = 'pending';
    case Paid = 'paid';
    case CheckedIn = 'checked_in';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu Pembayaran',
            self::Paid => 'Terbayar',
            self::CheckedIn => 'Sudah Check-in',
            self::Cancelled => 'Dibatalkan',
        };
    }

    /**
     * A transaction may only be checked in when it is paid.
     */
    public function isCheckinEligible(): bool
    {
        return $this === self::Paid;
    }
}
