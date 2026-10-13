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

## Transaksi loket, pembayaran tunai, dan tiket (Fase 5)

- Semua endpoint loket memerlukan autentikasi **dan** peran `cashier`/`admin`
  (middleware `role`), lalu diotorisasi ulang per objek oleh `TransactionPolicy`
  yang hanya menerima transaksi `source=counter`. `gate_staff` dan `visitor`
  ditolak `403` walau sudah login.
- **Total tidak dipercaya dari browser.** `client_total_amount` hanya
  informasional; backend selalu menghitung ulang total dari tarif aktif di
  database dan menyimpan snapshot tarif pada transaksi serta tiap baris kendaraan.
- Transaksi, pengunjung, tiket, kendaraan, dan pembayaran disimpan dalam **satu
  transaksi database** sehingga kegagalan tidak meninggalkan data parsial.
- Konfirmasi tunai dijalankan dengan **row lock**; pembayaran sukses tidak dapat
  dikonfirmasi dua kali (respons `409`), dan `payments.transaction_id` unik
  menjadi jaring pengaman di level database.
- Transaksi baru **tidak** dianggap lunas; status berpindah `pending → paid`
  hanya setelah kasir mengonfirmasi uang benar-benar diterima.
- NIK tetap terenkripsi; respons dan halaman hanya menampilkan `masked_nik`.
  NIK tidak pernah masuk URL, barcode, log, atau metadata `audit_logs`.
- Tiket individual memakai kode acak `TKT-YYYYMMDD-XXXXXXXX` (unik) tanpa data
  pribadi. Pencetakan ulang tidak membuat tiket/transaksi baru dan dicatat di
  `audit_logs`. Cetak hanya diizinkan setelah transaksi `paid`.
- Pencatatan penting pada `audit_logs`: `counter_transaction.created`,
  `payment_confirmed`, `tickets_printed`, dan `tickets_reprinted` (tanpa NIK).
- Pemeriksaan tambahan: `tests/Feature/CounterTransactionTest.php`.

## Booking online dan simulasi pembayaran (Fase 6)

- Semua endpoint booking memerlukan autentikasi **dan** peran `visitor`/`admin`
  (middleware `role`), lalu diotorisasi ulang per objek oleh `TransactionPolicy`
  yang hanya menerima transaksi `source=online`. `cashier` dan `gate_staff`
  ditolak `403` walau sudah login.
- **Hanya wisatawan yang boleh membuat dan membayar booking.** `createBooking`
  dan `simulateBookingPayment` menolak `admin`; admin hanya membaca
  (`viewBooking` mencakup admin).
- **Total tidak dipercaya dari browser.** `client_total_amount` hanya
  informasional; backend menghitung ulang total dari tarif aktif dan menyimpan
  snapshot tarif.
- **Simulasi pembayaran bukan gateway sungguhan.** Status akhir ditentukan
  backend dari parameter `outcome`; klien tidak dapat mengirim nominal atau
  status. Server menerbitkan referensi acak (`SIM-…`) saat booking dibuat dan
  memverifikasinya dengan perbandingan waktu-tetap (`hash_equals`); referensi
  yang tidak cocok dijawab `422`.
- **Pembayaran sukses bersifat final**: simulasi ulang dijawab `409`, dicek di
  dalam transaksi database dengan row lock. Kegagalan meninggalkan baris
  pembayaran yang sama sehingga wisatawan dapat mencoba lagi tanpa membuat
  pembayaran ganda (`payments.transaction_id` unik).
- **Tiket hanya diterbitkan setelah pembayaran berhasil** (`issued`); sebelum
  lunas, respons `tickets` kosong. Cetak hanya diizinkan setelah `paid` (`422`
  bila belum lunas).
- Otorisasi objek memakai `403` alih-alih `404` agar tidak membocorkan
  keberadaan booking milik pengguna lain.
- NIK tetap terenkripsi; respons, halaman, URL, barcode, log, dan metadata
  `audit_logs` hanya memuat `masked_nik`.
- Pencatatan pada `audit_logs` (tanpa NIK): `booking.created`,
  `booking.payment_simulated_success`, `booking.payment_simulated_failed`,
  `booking.tickets_printed`, dan `booking.tickets_reprinted`.
- Pemeriksaan tambahan: `tests/Feature/BookingTest.php`.

## Barcode dan check-in gerbang (Fase 7)

- Endpoint gerbang memerlukan autentikasi **dan** peran `gate_staff`/`admin`
  (middleware `role`), lalu diotorisasi ulang `TransactionPolicy` lewat ability
  `checkInGate`. `visitor` dan `cashier` ditolak `403` walau sudah login.
- **Body check-in hanya memuat `barcode_token`.** Transaksi, status pembayaran,
  jumlah wisatawan, dan petugas divalidasi server dari database dan sesi; klien
  tidak dapat mengirim `transaction_id`, nominal, jumlah hadir, atau status
  pembayaran.
- Barcode adalah `transactions.barcode_token`: string acak 40 karakter (≈238
  bit), unik, dan **tanpa data pribadi**. NIK tidak pernah masuk barcode, URL,
  log, respons, atau metadata `audit_logs`.
- Token tidak dianggap rahasia autentikasi; ia hanya penanda grup. Namun
  endpoint check-in tetap dibatasi rate limit (`throttle:gate-checkin`,
  120/menit per petugas + IP) sebagai pertahanan berlapis terhadap percobaan
  menebak token.
- **Validasi berlapis:** pembayaran harus `success`, status harus `paid`,
  tanggal kunjungan harus sama dengan hari ini (zona `VISIT_TIMEZONE`, default
  `Asia/Jakarta`), dan jumlah pengunjung harus konsisten dengan data transaksi.
  Barcode tak dikenal dijawab `404` **tanpa** membocorkan detail transaksi.
- **Anti check-in ganda:** transaksi dikunci dengan `lockForUpdate` (MySQL/InnoDB)
  dan unique `transaction_checkins.transaction_id` menjamin tepat satu catatan
  check-in meski dipindai bersamaan. Pemindaian ulang dijawab `409` tanpa
  membuat catatan baru.
- **Atomik dan tanpa efek samping finansial:** membuat catatan check-in, menandai
  tiket `used`, dan mengubah status menjadi `checked_in` terjadi dalam satu
  transaksi database; `checked_in` diset hanya setelah catatan tersimpan.
  Check-in **tidak pernah** mengubah nominal pembayaran atau menambah pendapatan.
- Respons check-in hanya memuat kode transaksi, sumber, status, tanggal
  kunjungan, jumlah hadir, waktu, dan nama petugas — tanpa NIK maupun
  `barcode_token`.
- Pencatatan keberhasilan pada `audit_logs`: `gate.checked_in` (tanpa token/NIK).
- Pemeriksaan tambahan: `tests/Feature/GateCheckinTest.php`.

## CORS

- `config/cors.php` hanya mengizinkan origin development yang tercantum pada
  `CORS_ALLOWED_ORIGINS` (default `http://localhost:3000`,
  `http://127.0.0.1:3000`), dengan metode dan header terbatas.
- Karena autentikasi memakai Bearer token (bukan cookie lintas situs),
  `supports_credentials` dibiarkan `false`.
