<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case Cash = 'cash';
    case Simulation = 'simulation';

    public function label(): string
    {
        return match ($this) {
            self::Cash => 'Tunai (Loket)',
            self::Simulation => 'Simulasi Pembayaran',
        };
    }
}
