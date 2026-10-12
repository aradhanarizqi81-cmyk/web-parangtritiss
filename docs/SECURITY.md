# Keamanan dan Privasi Data

Dokumen ini merangkum kebijakan yang berlaku untuk pengelolaan data pribadi,
khususnya NIK wisatawan.

## Perlindungan NIK

- NIK disimpan **terenkripsi** menggunakan cast `encrypted` Laravel (AES-256 via `APP_KEY`).
- NIK **tidak boleh** dicantumkan pada barcode, URL, log, pesan error, atau respons API umum.
- Kolom `nik` disembunyikan dari serialisasi model (`#[Hidden]`).
- Untuk laporan umum, tampilkan NIK dalam bentuk tersamarkan melalui `Visitor::maskedNik()`
  (contoh `3201********0123`).
- Akses penuh terhadap NIK dibatasi untuk peran yang berwenang setelah otorisasi backend.

## Kredensial dan token

- Password disimpan dengan mekanisme hashing standar Laravel (`hashed` cast, bcrypt).
- Token Sanctum dan password **tidak boleh** dicatat pada `audit_logs`.

## Audit log

Dicatat untuk perubahan tarif, tindakan administratif, dan pencetakan ulang tiket.
Metadata hanya memuat konteks (mis. tarif lama → baru) tanpa NIK mentah.

## Retensi data

- Data transaksi dan tiket bersifat historis dan tidak dihapus selama masa retensi
  operasional; perubahan tarif tidak mengubah transaksi lama.
- Penghapusan akun pengguna tidak menghapus transaksi (foreign key `nullOnDelete`),
  sehingga integritas laporan keuangan tetap terjaga.
- NIK disimpan hanya selama diperlukan untuk keperluan pendataan kunjungan.

## Kontrol akses

- Otorisasi ditegakkan di backend; menyembunyikan tombol di frontend tidak dianggap cukup.
- Wisatawan tidak dapat membaca atau mengubah transaksi milik pengguna lain.
- Fungsi `cashier`, `gate_staff`, dan `admin` dibatasi sesuai tanggung jawabnya.

## Autentikasi dan otorisasi (Fase 3)

- Autentikasi memakai **Sanctum personal access token** (Bearer); bukan session-cookie.
- Token hanya diterbitkan pada respons `register` dan `login`. Token tersimpan
  di database dalam bentuk hash dan tidak pernah dikembalikan lewat API.
- Registrasi publik selalu menghasilkan peran `visitor`; peran pada body diabaikan.
  Akun `admin`, `cashier`, dan `gate_staff` hanya dibuat lewat seeder/alur administratif.
- Login dibatasi 5 percobaan gagal per kombinasi email + IP.
- `logout` hanya mencabut token yang dipakai pada request tersebut.
- Middleware `role` (alias) membatasi endpoint per peran, dan `TransactionPolicy`
  menegakkan kepemilikan data sehingga wisatawan tidak bisa mengakses transaksi milik
  pengguna lain — middleware peran saja tidak dianggap cukup.
- Permintaan API tanpa autentikasi selalu dijawab JSON `401`, tidak dialihkan ke
  halaman login web.
- Pemeriksaan tambahan: `tests/Feature/AuthTest.php` dan
  `tests/Feature/TransactionAccessTest.php`.

## Penyimpanan token di frontend (Fase 4)

- Frontend Next.js **tidak menyimpan token di `localStorage`/`sessionStorage`**.
  Token hanya hidup di cookie **HttpOnly** yang diset oleh route handler server
  (BFF), sehingga JavaScript di browser tidak dapat membacanya.
- Token tidak dikembalikan ke browser, tidak dimasukkan ke URL, log, atau
  variabel `NEXT_PUBLIC_`. Semua pemanggilan Laravel ber-`Authorization: Bearer`
  dilakukan dari sisi server Next.js.
- Cookie memakai `SameSite=Lax`, `Secure` (aktif saat produksi; dapat ditimpa
  lewat `SESSION_COOKIE_SECURE=false` untuk uji lokal), dan `maxAge` 8 jam.
- Route handler yang mengubah state menolak permintaan lintas situs lewat
  pemeriksaan origin (HTTP 403), sebagai mitigasi CSRF karena cookie terkirim
  otomatis.
- Tampilan berbasis peran hanya untuk pengalaman pengguna; otorisasi tetap
  ditegakkan di backend.
- Detail: [`docs/FRONTEND.md`](FRONTEND.md).

## CORS

- `config/cors.php` hanya mengizinkan origin development yang tercantum pada
  `CORS_ALLOWED_ORIGINS` (default `http://localhost:3000`,
  `http://127.0.0.1:3000`), dengan metode dan header terbatas.
- Karena autentikasi memakai Bearer token (bukan cookie lintas situs),
  `supports_credentials` dibiarkan `false`.
