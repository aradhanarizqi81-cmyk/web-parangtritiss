<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Rentang tanggal validasi untuk ringkasan dashboard.
 *
 * Kedua batas bersifat opsional: bila kosong, backend memakai default (awal
 * bulan berjalan sampai hari ini pada zona venue). Batas maksimum rentang
 * ditegakkan agar query tetap ringan.
 */
class DashboardFilterRequest extends FormRequest
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
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            ReportFilterRules::validateRange($validator, $this->input('date_from'), $this->input('date_to'));
        });
    }
}
