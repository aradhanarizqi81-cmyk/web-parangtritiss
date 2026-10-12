# Pantai Parangtritis — Sistem Tiket & Kunjungan

Aplikasi pendaftaran dan pengelolaan data kunjungan wisatawan Pantai Parangtritis.
Backend REST API (Laravel) menjadi sumber kebenaran untuk perhitungan biaya, status
transaksi, pembayaran, hak akses, penerbitan tiket, dan check-in.

## Stack

| Lapisan | Teknologi |
| --- | --- |
| Backend | Laravel 13 (PHP 8.5) |
| API | REST JSON, prefix `/api/v1`, autentikasi Sanctum (personal access token) |
| Database | MySQL 8 |
| Frontend | Next.js + Tailwind CSS (folder `frontend/`, dikerjakan pada fase lanjutan) |
| Testing | PHPUnit, database SQLite in-memory |

## Peran pengguna

- `visitor` — wisatawan (pendaftaran online).
- `admin` — pengelola pengguna, tarif, dashboard, dan laporan.
- `cashier` — petugas loket.
- `gate_staff` — petugas gerbang (validasi & check-in barcode).

## Autentikasi

Endpoint `/api/v1/auth/*` (register, login, me, logout) memakai Sanctum personal
access token dengan header `Authorization: Bearer <token>`. Detail lengkap ada di
[`docs/API.md`](docs/API.md).

## Prasyarat

- PHP 8.3+ dengan ekstensi `pdo_mysql`, `pdo_sqlite`, dan `sqlite3` aktif.
- Composer 2.
- MySQL 8 (atau MariaDB).
- Node.js 20+ (untuk frontend, fase lanjutan).

## Setup pengembangan

```bash
composer install
cp .env.example .env          # Windows: copy .env.example .env
php artisan key:generate
```

Sesuaikan kredensial database pada `.env`:

```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=parangtritis
DB_USERNAME=root
DB_PASSWORD=
```

Buat database lalu jalankan migrasi dan seeder:

```bash
mysql -u root -e "CREATE DATABASE parangtritis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
php artisan migrate --seed
php artisan serve
```

Perintah umum:

```bash
php artisan migrate:fresh --seed   # reset schema + data awal
php artisan test                   # jalankan seluruh pengujian
```

## Akun demo hasil seeder

Seeder `RoleUserSeeder` membuat satu akun per peran. **Semua akun memakai password
`password` dan hanya untuk pengembangan lokal — wajib diganti sebelum deploy.**

| Peran | Email |
| --- | --- |
| admin | admin@parangtritis.test |
| cashier | cashier@parangtritis.test |
| gate_staff | gate@parangtritis.test |
| visitor | visitor@parangtritis.test |

## Tarif awal

Nilai berikut adalah konfigurasi awal proyek, bukan klaim tarif resmi yang telah diverifikasi.

| Item | Tarif |
| --- | --- |
| Wisatawan | Rp15.000 / orang |
| Motor | Rp2.000 / kendaraan |
| Mobil | Rp5.000 / kendaraan |
| Bus / Truk | Rp10.000 / kendaraan |

Tarif dikelola admin dan disimpan sebagai snapshot pada setiap transaksi sehingga
perubahan tarif tidak mengubah transaksi historis.

## Dokumentasi

- [`docs/API.md`](docs/API.md) — endpoint `/api/v1`, autentikasi, dan matriks akses.
- [`docs/SETUP.md`](docs/SETUP.md) — konfigurasi development yang dapat dijalankan ulang.
- [`docs/DATABASE.md`](docs/DATABASE.md) — skema database, relasi, dan batasan.
- [`docs/SECURITY.md`](docs/SECURITY.md) — kebijakan privasi NIK dan retensi data.

## Status pengembangan

Dikerjakan bertahap per fase (audit → database → autentikasi → API & frontend →
loket → pendaftaran online → barcode & check-in → dashboard & laporan → pengujian akhir).
