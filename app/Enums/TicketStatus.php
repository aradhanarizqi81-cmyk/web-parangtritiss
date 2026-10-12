<?php

namespace App\Enums;

enum TicketStatus: string
{
    case Issued = 'issued';
    case Printed = 'printed';
    case Used = 'used';
    case Void = 'void';

    public function label(): string
    {
        return match ($this) {
            self::Issued => 'Diterbitkan',
            self::Printed => 'Dicetak',
            self::Used => 'Digunakan',
            self::Void => 'Dibatalkan',
        };
    }
}
