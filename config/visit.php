<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Zona waktu kunjungan
    |--------------------------------------------------------------------------
    |
    | Aplikasi berjalan pada UTC, sedangkan gerbang berada di WIB. Pemeriksaan
    | "hari kunjungan" saat validasi check-in memakai zona waktu lokasi ini agar
    | tetap benar di sekitar tengah malam.
    |
    */

    'timezone' => env('VISIT_TIMEZONE', 'Asia/Jakarta'),

];
