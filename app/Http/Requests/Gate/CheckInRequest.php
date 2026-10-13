<?php

namespace App\Http\Requests\Gate;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Validates a gate check-in request.
 *
 * Only the scanned barcode token is accepted. The transaction, its payment
 * state, the visitor count and the validating officer are all determined by the
 * server from the database and the authenticated session — never trusted from
 * the client, which may not send a transaction id, an amount, a visitor count or
 * a payment status.
 */
class CheckInRequest extends FormRequest
{
    /**
     * Authorization is enforced by TransactionPolicy in the controller.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Normalise the scanned token before validation. A USB barcode reader types
     * the payload like a keyboard, so stray whitespace is trimmed away.
     */
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('barcode_token'))) {
            $this->merge([
                'barcode_token' => trim($this->input('barcode_token')),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'barcode_token' => ['required', 'string', 'min:8', 'max:64'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'barcode_token.required' => 'Barcode wajib dipindai atau diisi.',
        ];
    }
}
