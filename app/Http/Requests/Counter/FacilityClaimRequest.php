<?php

namespace App\Http\Requests\Counter;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates a facility claim.
 *
 * The client only names the wristband ticket and the facility. The status,
 * entitlement id, transaction id, officer and every eligibility decision are
 * derived by the backend from the database and the authenticated session.
 */
class FacilityClaimRequest extends FormRequest
{
    /**
     * Authorization is enforced by TransactionPolicy in the controller.
     */
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('ticket_code'))) {
            $this->merge([
                'ticket_code' => strtoupper(trim($this->input('ticket_code'))),
            ]);
        }

        if (is_string($this->input('facility_code'))) {
            $this->merge([
                'facility_code' => strtoupper(trim($this->input('facility_code'))),
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
            'facility_code' => ['required', 'string', 'regex:/^[A-Z0-9_]{2,32}$/'],
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
            'facility_code.required' => 'Kode fasilitas wajib dipilih.',
            'facility_code.regex' => 'Format kode fasilitas tidak valid.',
        ];
    }
}
