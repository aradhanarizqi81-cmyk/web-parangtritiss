<?php

namespace App\Enums;

enum FacilityEntitlementStatus: string
{
    case Granted = 'granted';
    case Redeemed = 'redeemed';
    case Void = 'void';

    public function label(): string
    {
        return match ($this) {
            self::Granted => 'Tersedia',
            self::Redeemed => 'Sudah Diklaim',
            self::Void => 'Dibatalkan',
        };
    }
}
