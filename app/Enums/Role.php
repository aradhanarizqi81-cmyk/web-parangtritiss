<?php

namespace App\Enums;

enum Role: string
{
    case Visitor = 'visitor';
    case Admin = 'admin';
    case Cashier = 'cashier';
    case GateStaff = 'gate_staff';

    public function label(): string
    {
        return match ($this) {
            self::Visitor => 'Wisatawan',
            self::Admin => 'Administrator',
            self::Cashier => 'Petugas Loket',
            self::GateStaff => 'Petugas Gerbang',
        };
    }
}
