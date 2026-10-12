# Konfigurasi Development

Panduan ini mereproduksi lingkungan pengembangan dari nol. Semua langkah dapat
dijalankan ulang dan tidak menyimpan rahasia di source control.

## 1. Prasyarat

- PHP 8.3+ (proyek diuji pada PHP 8.5 NTS). Ekstensi wajib: `pdo_mysql`, `pdo_sqlite`, `sqlite3`.
- Composer 2.
- MySQL 8 / MariaDB (port default 3306).
- Node.js 20+ (dipakai frontend pada fase lanjutan).

Verifikasi ekstensi:

```bash
php -m | findstr /I "pdo_mysql pdo_sqlite sqlite3"   # Windows
php -m | grep -Ei "pdo_mysql|pdo_sqlite|sqlite3"      # Linux/macOS
```

## 2. Variabel lingkungan

Salin `.env.example` menjadi `.env`, lalu isi `APP_KEY` dan kredensial database.

```bash
cp .env.example .env
php artisan key:generate
```

Nilai development yang dipakai:

```
APP_NAME="Pantai Parangtritis"
APP_ENV=local
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=parangtritis
DB_USERNAME=root
DB_PASSWORD=
```

`.env` diabaikan oleh Git. Jangan pernah menambahkan kredensial ke `.env.example`.

## 3. Database

```bash
mysql -u root -e "CREATE DATABASE parangtritis CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
php artisan migrate --seed
```

Database terpisah `parangtritis_test` tidak wajib untuk pengujian karena test suite
memakai SQLite in-memory (lihat `phpunit.xml`).

## 4. Menjalankan aplikasi

```bash
php artisan serve            # http://127.0.0.1:8000
```

Endpoint API berada di bawah `/api/v1`.

## 5. Pengujian

```bash
php artisan test
```

`phpunit.xml` mengeset `DB_CONNECTION=sqlite` dan `DB_DATABASE=:memory:` sehingga
pengujian tidak menyentuh database MySQL pengembangan.

## 6. Reset data awal

```bash
php artisan migrate:fresh --seed
```

Menghapus seluruh tabel lalu membuat ulang schema dan data seeder (tarif, tipe
kendaraan, dan akun demo per peran).
