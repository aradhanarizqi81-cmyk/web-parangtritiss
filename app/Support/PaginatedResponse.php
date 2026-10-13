<?php

namespace App\Support;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;

/**
 * Metadata paginasi yang konsisten untuk seluruh tabel laporan.
 */
final class PaginatedResponse
{
    /**
     * @return array{current_page: int, per_page: int, total: int, last_page: int, from: int|null, to: int|null}
     */
    public static function meta(LengthAwarePaginator $paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'last_page' => $paginator->lastPage(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
        ];
    }
}
