<?php

namespace App\Support;

/**
 * Pembentuk CSV sederhana (UTF-8 + BOM) untuk ekspor laporan.
 *
 * Baris dibangun dari hasil query backend dan tidak pernah memuat NIK mentah.
 * BOM ditambahkan agar Excel mengenali berkas sebagai UTF-8.
 */
final class Csv
{
    /**
     * @param  array<int, string>  $header
     * @param  iterable<int, array<int, string|int|float|null>>  $rows
     */
    public static function build(array $header, iterable $rows): string
    {
        $handle = fopen('php://temp', 'r+');

        fputcsv($handle, $header);

        foreach ($rows as $row) {
            fputcsv($handle, $row);
        }

        rewind($handle);
        $content = (string) stream_get_contents($handle);
        fclose($handle);

        return "\xEF\xBB\xBF".$content;
    }
}
