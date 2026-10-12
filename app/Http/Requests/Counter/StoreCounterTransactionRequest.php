<?php

namespace App\Http\Requests\Counter;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validates a counter (loket) sale.
 *
 * No monetary field is trusted from the client: the server recomputes every
 * total from the currently active tariffs in the database. `client_total_amount`
 * is accepted only as an informational echo and is never used for pricing.
 */
class StoreCounterTransactionRequest extends FormRequest
{
    /**
     * Authorization is enforced by TransactionPolicy in the controller.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Normalise free-text input before validation.
     */
    protected function prepareForValidation(): void
    {
        $visitors = $this->input('visitors');

        if (is_array($visitors)) {
            $this->merge([
                'visitors' => array_map(static function ($visitor) {
                    if (! is_array($visitor)) {
                        return $visitor;
                    }

                    foreach (['full_name', 'nik'] as $key) {
                        if (isset($visitor[$key]) && is_string($visitor[$key])) {
                            $visitor[$key] = trim($visitor[$key]);
                        }
                    }

                    return $visitor;
                }, $visitors),
            ]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // A counter sale is for today up to 30 days ahead; past dates are
            // rejected to prevent wrong sale dates on a printed ticket.
            'visit_date' => [
                'required',
                'date',
                'after_or_equal:today',
                'before_or_equal:'.now()->addDays(30)->toDateString(),
            ],

            'visitors' => ['required', 'array', 'min:1', 'max:500'],
            'visitors.*.full_name' => ['required', 'string', 'max:255'],
            'visitors.*.nik' => ['required', 'string', 'digits:16'],

            'vehicles' => ['sometimes', 'array', 'max:20'],
            'vehicles.*.vehicle_type_id' => [
                'required',
                'integer',
                'distinct',
                Rule::exists('vehicle_types', 'id')->where('active', true),
            ],
            'vehicles.*.quantity' => ['required', 'integer', 'min:1', 'max:65535'],

            // Informational only; ignored by the pricing logic.
            'client_total_amount' => ['sometimes', 'nullable', 'integer', 'min:0'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'visitors.required' => 'Minimal satu pengunjung wajib diisi.',
            'visitors.*.full_name.required' => 'Nama lengkap pengunjung wajib diisi.',
            'visitors.*.nik.required' => 'NIK pengunjung wajib diisi.',
            'visitors.*.nik.digits' => 'NIK harus terdiri dari 16 angka.',
            'vehicles.*.vehicle_type_id.exists' => 'Jenis kendaraan tidak ditemukan atau tidak aktif.',
            'vehicles.*.vehicle_type_id.distinct' => 'Jenis kendaraan tidak boleh diduplikasi.',
            'vehicles.*.quantity.min' => 'Jumlah kendaraan minimal 1.',
        ];
    }
}
