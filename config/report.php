<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Batas laporan
    |--------------------------------------------------------------------------
    |
    | Laporan admin membaca riwayat transaksi dalam jumlah besar. Batas berikut
    | melindungi database dari query yang terlalu berat: rentang tanggal yang
    | terlalu panjang ditolak, dan ekspor CSV dibatasi jumlah barisnya.
    |
    */

    'max_span_days' => (int) env('REPORT_MAX_SPAN_DAYS', 366),

    'max_export_rows' => (int) env('REPORT_MAX_EXPORT_ROWS', 10000),

    /*
    |--------------------------------------------------------------------------
    | Paginasi server-side
    |--------------------------------------------------------------------------
    |
    | Jumlah baris per halaman untuk tabel laporan. Klien boleh meminta lebih
    | sedikit atau lebih banyak selama tidak melewati `max_per_page`.
    |
    */

    'per_page' => (int) env('REPORT_PER_PAGE', 25),

    'max_per_page' => (int) env('REPORT_MAX_PER_PAGE', 100),

];
