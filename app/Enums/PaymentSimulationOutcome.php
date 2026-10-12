<?php

namespace App\Enums;

/**
 * Outcome selector for the academic payment simulation.
 *
 * This is a mock scenario chosen by the visitor in the demo UI, NOT a payment
 * result received from a gateway. The backend never trusts it as a payment
 * decision on its own: ownership, source, state and the server-issued reference
 * are all re-validated before any money row changes.
 */
enum PaymentSimulationOutcome: string
{
    case Success = 'success';
    case Failure = 'failure';

    public function label(): string
    {
        return match ($this) {
            self::Success => 'Berhasil (simulasi)',
            self::Failure => 'Gagal (simulasi)',
        };
    }
}
