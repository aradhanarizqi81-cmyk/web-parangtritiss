<?php

namespace App\Http\Requests\Counter;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates a read-only facility lookup.
 *
 * Only the individual ticket code printed on the wristband is accepted. The
 * gate barcode token and the online redemption token are different credentials
 * and are rejected by the service.
 */
class FacilityLookupRequest extends FormRequest
{
    /**
     * Authorization is enforced by TransactionPolicy in the controller.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Barcode readers type the payload like a keyboard, so trim whitespace and
     * normalise the case of the generated ticket code before validation.
     */
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('ticket_code'))) {
            $this->merge([
                'ticket_code' => strtoupper(trim($this->input('ticket_code'))),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'ticket_code' => ['required', 'string', 'regex:/^TKT-\d{8}-[A-Z0-9]{8}$/'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'ticket_code.required' => 'Kode tiket wajib dipindai atau diisi.',
            'ticket_code.regex' => 'Format kode tiket tidak valid.',
        ];
    }
}
