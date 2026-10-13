<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Validasi filter laporan (kunjungan, transaksi/pendapatan, kendaraan,
 * identitas). Semua nilai di sini hanya menyaring; perhitungan tetap dilakukan
 * backend dari database.
 */
class ReportFilterRequest extends FormRequest
{
    /**
     * Authorization is enforced by TransactionPolicy in the controller.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Normalisasi boolean agar "true"/"false" dari query string ikut diterima.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('checked_in')) {
            $this->merge(['checked_in' => $this->boolean('checked_in')]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d'],
            'source' => ['nullable', Rule::in(['online', 'counter'])],
            'status' => ['nullable', Rule::in(['pending', 'paid', 'checked_in', 'cancelled'])],
            'payment_status' => ['nullable', Rule::in(['pending', 'success', 'failed'])],
            'checked_in' => ['nullable', 'boolean'],
            'date_basis' => ['nullable', Rule::in(['created_at', 'visit_date', 'paid_at'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.config('report.max_per_page')],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            ReportFilterRules::validateRange($validator, $this->input('date_from'), $this->input('date_to'));
        });
    }
}
