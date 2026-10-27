<?php

namespace App\Http\Requests\Counter;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates a counter redemption request.
 *
 * Only the scanned redemption code is accepted. The booking, its payment state,
 * the visitor count and the officer are all determined by the server from the
 * database and the authenticated session — never trusted from the client, which
 * may not send a transaction id, an amount, a visitor count or a status.
 */
class RedemptionRequest extends FormRequest
{
    /**
     * Authorization is enforced by TransactionPolicy in the controller.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Normalise the scanned code before validation. A USB barcode reader types
     * the payload like a keyboard, so stray whitespace is trimmed away.
     */
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('redemption_token'))) {
            $this->merge([
                'redemption_token' => trim($this->input('redemption_token')),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'redemption_token' => ['required', 'string', 'min:8', 'max:64'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'redemption_token.required' => 'Kode penukaran wajib dipindai atau diisi.',
        ];
    }
}
