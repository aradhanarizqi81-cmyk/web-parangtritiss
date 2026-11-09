<?php

namespace App\Http\Requests\Gate;

use Illuminate\Foundation\Http\FormRequest;

class PrintRequest extends FormRequest
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
        if (is_string($this->input('code'))) {
            $this->merge([
                'code' => trim($this->input('code')),
            ]);
        } elseif (is_string($this->input('redemption_token'))) {
            $this->merge([
                'code' => trim($this->input('redemption_token')),
                'redemption_token' => trim($this->input('redemption_token')),
            ]);
        } elseif (is_string($this->input('barcode_token'))) {
            $this->merge([
                'code' => trim($this->input('barcode_token')),
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
            'code' => ['required_without_all:redemption_token,barcode_token', 'string', 'min:8', 'max:64'],
            'redemption_token' => ['required_without:code', 'string', 'min:8', 'max:64'],
            'barcode_token' => ['prohibited'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.required_without_all' => 'Kode penukaran wajib dipindai atau diisi.',
            'redemption_token.required_without' => 'Kode penukaran wajib dipindai atau diisi.',
            'barcode_token.prohibited' => 'Kode barcode gerbang tidak dapat digunakan untuk pencetakan tiket fisik.',
        ];
    }
}
