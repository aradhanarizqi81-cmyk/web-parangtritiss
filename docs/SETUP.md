# Konfigurasi Development

Panduan ini mereproduksi lingkungan pengembangan dari nol. Semua langkah dapat
dijalankan ulang dan tidak menyimpan rahasia di source control.

## 1. Prasyarat

- PHP 8.3+ (proyek diuji pada PHP 8.5 NTS). Ekstensi wajib: `pdo_mysql`, `pdo_sqlite`, `sqlite3`.
- Composer 2.
- MySQL 8 / MariaDB (port default 3306).
- Node.js 20+ dan npm (frontend Next.js di `frontend/`).

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

Backend:

```bash
php artisan serve --host=127.0.0.1 --port=8000
```

Endpoint API berada di bawah `/api/v1`. Origin frontend development yang boleh
memanggil API diatur lewat `CORS_ALLOWED_ORIGINS` (lihat `.env.example`).

Frontend (terminal terpisah):

```bash
cd frontend
npm install
copy .env.example .env.local     # Linux/macOS: cp .env.example .env.local
npm run dev                      # http://localhost:3000
```

`frontend/.env.local` mengatur `API_BASE_URL` (default `http://127.0.0.1:8000`).
Token tidak disimpan di variabel `NEXT_PUBLIC_`; lihat [`docs/FRONTEND.md`](FRONTEND.md)
untuk keputusan penyimpanan token.

## 5. Pengujian

Backend:

```bash
php artisan test
```

`phpunit.xml` mengeset `DB_CONNECTION=sqlite` dan `DB_DATABASE=:memory:` sehingga
pengujian tidak menyentuh database MySQL pengembangan.

Frontend (dari direktori `frontend/`):

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

### Uji terima terhadap MySQL (smoke)

`scripts/smoke/smoke-mysql.ps1` menempuh alur lengkap di atas MySQL lokal yang
sedang berjalan: registrasi wisatawan, booking, simulasi pembayaran gagal dan
sukses, pencetakan tiket, check-in gerbang, transaksi loket, hak akses, serta
dashboard dan seluruh laporan beserta ekspor CSV-nya.

```bash
php artisan serve --host=127.0.0.1 --port=8000
# terminal lain:
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/smoke/smoke-mysql.ps1
```

Skrip bersifat menambah-saja: hanya membuat data uji baru dan tidak pernah
menghapus, mereset, atau menimpa data yang sudah ada. Pemeriksaan konkurensi
check-in dapat dijalankan benar-benar paralel dengan menyalakan server kedua di
port lain dan mengarahkannya lewat `-ConcurrentBaseUrl` (lihat komentar di kepala
skrip).

## 6. Reset data awal

```bash
php artisan migrate:fresh --seed
```

Menghapus seluruh tabel lalu membuat ulang schema dan data seeder (tarif, tipe
kendaraan, dan akun demo per peran).
