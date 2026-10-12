<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Pending = 'pending';
    case Success = 'success';
    case Failed = 'failed';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu',
            self::Success => 'Berhasil',
            self::Failed => 'Gagal',
        };
    }
}
