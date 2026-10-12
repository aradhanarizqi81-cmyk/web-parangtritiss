<?php

namespace App\Http\Requests\Booking;

use App\Enums\PaymentSimulationOutcome;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates a payment-simulation request.
 *
 * The only decisions the client may express are the mock scenario
 * (`outcome`) and the server-issued reference it received at booking time.
 * Amounts, statuses and timestamps are never read from the request.
 */
class SimulateBookingPaymentRequest extends FormRequest
{
    /**
     * Authorization is enforced by TransactionPolicy in the controller.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'outcome' => ['required', Rule::enum(PaymentSimulationOutcome::class)],
            'reference' => ['required', 'string', 'max:64'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'outcome.required' => 'Skenario simulasi pembayaran wajib diisi.',
            'outcome.enum' => 'Skenario simulasi pembayaran tidak dikenali.',
            'reference.required' => 'Referensi simulasi pembayaran wajib diisi.',
        ];
    }

    public function outcome(): PaymentSimulationOutcome
    {
        return PaymentSimulationOutcome::from((string) $this->validated('outcome'));
    }
}
