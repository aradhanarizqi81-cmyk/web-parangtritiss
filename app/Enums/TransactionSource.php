<?php

namespace App\Enums;

enum TransactionSource: string
{
    case Online = 'online';
    case Counter = 'counter';

    public function label(): string
    {
        return match ($this) {
            self::Online => 'Daring',
            self::Counter => 'Loket',
        };
    }
}
