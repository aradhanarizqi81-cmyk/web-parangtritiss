# Dokumentasi API

Base URL: `/api/v1`

Autentikasi: **Sanctum personal access token** dengan header
`Authorization: Bearer <token>`. Token diterbitkan hanya oleh endpoint
`register` dan `login`.

## Format respons

Sukses:

```json
{ "message": "Opsional.", "data": { } }
```

Validasi gagal (HTTP 422):

```json
{ "message": "The email field is required.", "errors": { "email": ["..."] } }
```

Tidak terautentikasi (HTTP 401): `{ "message": "Unauthenticated." }`
Tidak berhak (HTTP 403): `{ "message": "..." }`

## Endpoint autentikasi

### `POST /api/v1/auth/register`
Registrasi wisatawan. Peran selalu dipaksa `visitor`; nilai `role` pada body diabaikan.

| Field | Tipe | Wajib | Catatan |
| --- | --- | --- | --- |
| `name` | string | ya | maks 255 |
| `email` | string | ya | unik, dinormalisasi lowercase |
| `password` | string | ya | min 8, harus sama dengan `password_confirmation` |
| `password_confirmation` | string | ya | |
| `phone` | string | tidak | maks 32 |
| `device_name` | string | tidak | nama token, default `api` |

Respons `201`:

```json
{
  "message": "Registrasi berhasil.",
  "data": { "id": 5, "name": "...", "email": "...", "role": "visitor", "phone": null, "created_at": "..." },
  "token": "<plaintext-token>",
  "token_type": "Bearer"
}
```

### `POST /api/v1/auth/login`
Login dengan kredensial. Dibatasi 5 percobaan gagal per kombinasi email + IP
(kemudian HTTP 422 dengan pesan throttle).

| Field | Tipe | Wajib |
| --- | --- | --- |
| `email` | string | ya |
| `password` | string | ya |
| `device_name` | string | tidak |

Respons `200`: sama seperti registrasi.

### `GET /api/v1/auth/me` — perlu autentikasi
Mengembalikan profil pengguna terautentikasi. Tidak pernah memuat password,
remember token, atau token tersimpan.

### `POST /api/v1/auth/logout` — perlu autentikasi
Mencabut **hanya token yang dipakai** pada request ini. Respons `200`
`{ "message": "Logout berhasil." }`.

## Endpoint transaksi

### `GET /api/v1/transactions/{id}` — perlu autentikasi
Menampilkan satu transaksi. Otorisasi ditegakkan `TransactionPolicy`
(bukan hanya middleware peran):

- `admin` — semua transaksi.
- `visitor` — hanya transaksi miliknya sendiri.
- `cashier`, `gate_staff` — ditolak (403); akan memakai endpoint operasional
  pada fase berikutnya.

Respons tidak menyertakan identitas wisatawan/NIK.

## Endpoint loket (counter)

Semua endpoint di bawah ini memerlukan `auth:sanctum` **dan** middleware
`role:cashier,admin`, lalu diotorisasi ulang oleh `TransactionPolicy` yang hanya
mengizinkan transaksi `source=counter`. `gate_staff` dan `visitor` selalu
mendapat `403` meskipun sudah login.

### `GET /api/v1/counter/tariffs`
Tarif aktif untuk formulir loket (read-only).

Respons `200`:

```json
{
  "data": {
    "visitor_tariff": { "code": "visitor", "name": "Wisatawan", "unit_tariff": 15000 },
    "vehicle_types": [
      { "id": 1, "code": "motorcycle", "name": "Motor", "unit_tariff": 2000 }
    ]
  }
}
```

### `POST /api/v1/counter/transactions`
Membuat transaksi loket beserta pengunjung, tiket individual, baris kendaraan,
dan pembayaran tunai berstatus `pending`. **Backend menghitung ulang seluruh
total dari tarif aktif di database**; `client_total_amount` hanya informasional
dan diabaikan.

| Field | Tipe | Wajib | Catatan |
| --- | --- | --- | --- |
| `visit_date` | date | ya | hari ini s/d +30 hari |
| `visitors` | array | ya | 1–500 baris |
| `visitors[].full_name` | string | ya | maks 255 |
| `visitors[].nik` | string | ya | tepat 16 angka |
| `vehicles` | array | tidak | maks 20 baris |
| `vehicles[].vehicle_type_id` | int | ya | jenis harus **aktif**, tidak boleh duplikat |
| `vehicles[].quantity` | int | ya | 1–65535 |
| `client_total_amount` | int | tidak | diabaikan untuk perhitungan |

Respons `201` memuat `message` dan `data` (bentuk sama seperti detail di bawah).
Validasi gagal menghasilkan `422` dan **tidak meninggalkan data parsial**: seluruh
penyimpanan berada dalam satu transaksi database.

### `GET /api/v1/counter/transactions/{id}`
Detail transaksi loket: kode, `barcode_token` (barcode grup untuk gerbang),
status, tarif snapshot, kasir, `visitors` (**hanya `masked_nik`**), `vehicles`,
`payment`, dan `tickets`. `404` bila tidak ada; `403` bila bukan transaksi
`counter`. Semua kasir dapat melihat transaksi loket (kebijakan loket
bersama/serah-terima shift).

### `POST /api/v1/counter/transactions/{id}/confirm-payment`
Menandai uang tunai benar-benar diterima: `payment.status` `pending → success`,
`paid_at` diisi, `received_by_user_id` diisi, dan `transactions.status`
`pending → paid`. Dijalankan dalam transaksi database dengan row lock, sehingga
percobaan konfirmasi kedua dijawab **`409`** tanpa membuat pembayaran baru.

### `POST /api/v1/counter/transactions/{id}/print`
Mencatat pencetakan atau pencetakan ulang tiket: mengisi `tickets.printed_at` dan
`status printed` **tanpa** menambah tiket atau transaksi baru. `422` bila transaksi
belum berstatus `paid`. Pencetakan ulang dibedakan di `audit_logs`
(`counter_transaction.tickets_reprinted`). Detail transaksi loket menyertakan
`barcode_token` untuk check-in gerbang. Pratinjau gelang mencetak Code128 dari
`tickets[].ticket_code` sebagai identitas individual.

## Endpoint penukaran (counter redemption)

Penukaran tiket fisik (gelang) untuk **booking online** yang sudah lunas. Semua
endpoint di bawah ini memerlukan `auth:sanctum` **dan** `role:cashier,admin`,
diotorisasi lewat `TransactionPolicy::lookupRedemption` /
`confirmRedemption` / `printRedemption`, serta dibatasi rate limiter
`counter-redemption` (120/menit per petugas + IP).

**Klien tidak pernah mengirim `transaction_id`**: booking selalu ditemukan dari
kode penukaran, dan kode tersebut tidak pernah dikirim lewat URL/`query`.
Ketiga endpoint menerima body `{ "redemption_token": "RDM-…" }` dan membalikkan
`404` bila kode tidak dikenal atau bukan transaksi `source=online`.

### `POST /api/v1/counter/redemptions/lookup`
Pratinjau read-only. **Tidak mengubah status apa pun** dan tidak menulis audit —
memindai atau membuka pratinjau tidak pernah menandai booking ditukarkan.

Respons `200` berisi ringkasan pesanan (pemilik, tanggal kunjungan, jumlah
pengunjung, jumlah kendaraan, jumlah tiket, status pembayaran), `visitors`
(hanya `masked_nik`), `barcode_token` (token check-in gerbang),
dan blok `redemption` berisi `status`, `status_label`, `can_redeem`,
`can_reprint`, serta `block_reason` — `200` + alasan, bukan error, supaya petugas
tetap bisa membaca booking yang belum lunas.

### `POST /api/v1/counter/redemptions/confirm`
Satu-satunya aksi yang menandai booking ditukarkan (`redeemed_at`,
`redeemed_by_user_id`, audit `counter_redemption.completed`). Dijalankan dalam
transaksi database dengan `lockForUpdate` **dan** pembaruan bersyarat
`WHERE redeemed_at IS NULL`, sehingga dua permintaan bersamaan tetap
menghasilkan **satu** penukaran.

- `422` bila pembayaran belum sukses atau tiket belum diterbitkan;
- `409` bila sudah pernah ditukarkan (stempel waktu penukaran pertama tetap);
- `404` bila kode tidak dikenal.

Tidak membuat check-in gerbang, tidak mengubah `barcode_token`, dan tidak
menambah `TransactionStatus` baru.

### `POST /api/v1/counter/redemptions/print`
Mencatat pencetakan (atau pencetakan ulang) gelang untuk booking yang **sudah
ditukarkan**: hanya `tickets.printed_at` (nilai pertama dipertahankan) dan status
`printed` yang diperbarui. Idempoten — tidak membuat tiket baru, tidak
menggandakan penukaran, tidak membuat check-in. Audit
`counter_redemption.tickets_printed` atau
`counter_redemption.tickets_reprinted`. `422` bila belum lunas, belum
ditukarkan, atau tiket belum diterbitkan.

`redemption_token` tidak pernah dicerminkan kembali pada respons loket; pada
`GET /api/v1/bookings/{id}` ia hanya disertakan **setelah pembayaran sukses**
untuk pemilik booking (dan admin), sehingga QR/barcode penukaran tidak pernah
tampil sebelum booking lunas. NIK mentah tidak pernah ikut dalam respons
mana pun.

## Endpoint klaim fasilitas (counter facility)

Hak fasilitas melekat pada **tiket individual**, bukan pada transaksi/rombongan.
Setelah pembayaran benar-benar berhasil, backend otomatis membuat satu baris
`ticket_facility_entitlements` untuk setiap tiket yang tidak `void` dan setiap
fasilitas aktif bertanda `is_auto_granted`. Fasilitas awal berasal dari
`FacilitySeeder` (`FREE_TEA`, nama **Minuman Gratis**); fasilitas baru cukup
ditambahkan sebagai baris katalog baru tanpa mengubah alur transaksi.

Semua endpoint di bawah memerlukan `auth:sanctum` **dan** `role:cashier,admin`,
diotorisasi lewat `TransactionPolicy::lookupFacility` / `claimFacility`, serta
dibatasi rate limiter `counter-facility` (120/menit per petugas + IP).
`visitor` dan `gate_staff` selalu `403`.

**Klien tidak pernah mengirim `transaction_id`, `entitlement_id`, atau status.**
Tiket selalu ditemukan dari `ticket_code` individual pada gelang
(`TKT-YYYYMMDD-XXXXXXXX`). `barcode_token` gerbang dan `redemption_token`
online **bukan** kunci yang sah dan ditolak validasi. Kode tidak pernah dikirim
lewat URL/`query`.

### `POST /api/v1/counter/facilities/lookup`

Body: `{ "ticket_code": "TKT-…" }`.

Pratinjau read-only; **tidak mengubah status apa pun** dan tidak menulis audit.
Respons `200` berisi tiket (`ticket_code`, status), `visitor` (hanya
`masked_nik`), ringkasan `transaction` + `payment` + `checkin`, dan array
`facilities`. Setiap fasilitas memuat `entitlement_id`, `code`, `name`,
`status` (`granted`/`redeemed`/`void`), `granted_at`, `redeemed_at`,
`redeemed_by`, `voided_at`, `can_claim`, dan `block_reason`. `can_claim` dan
`block_reason` dihitung backend; `200` + alasan lebih informatif daripada error
untuk tiket yang belum memenuhi syarat. `404` bila kode tiket tidak dikenal.

### `POST /api/v1/counter/facilities/claim`

Body: `{ "ticket_code": "TKT-…", "facility_code": "FREE_TEA" }`.

Satu-satunya aksi yang menulis: `status → redeemed`, `redeemed_at`,
`redeemed_by_user_id`, dan audit `counter_facility.redeemed` (kode transaksi +
kode/nama fasilitas, tanpa token/NIK). Dijalankan dalam transaksi database
dengan `lockForUpdate` pada tiket, transaksi, pembayaran, dan hak, lalu
pembaruan bersyarat `WHERE status = 'granted' AND redeemed_at IS NULL`; dua
permintaan paralel menghasilkan **satu** klaim dan yang kalah dijawab `409`.

Syarat yang ditegakkan backend:

1. fasilitas dikenal dan `active`;
2. transaksi tidak `cancelled`;
3. pembayaran benar-benar `success` (bukan hanya status tiket);
4. tiket memiliki hak untuk fasilitas tersebut dan belum `void`;
5. hak belum pernah diklaim;
6. `visit_date` sama dengan hari ini pada `config('visit.timezone')`;
7. baris `transaction_checkins` benar-benar ada.

Pemetaan error: `404` kode tiket/fasilitas tidak dikenal; `422` belum lunas,
dibatalkan, belum check-in, bukan tanggal kunjungan, fasilitas nonaktif, hak
`void`, atau hak tidak ada; `409` sudah diklaim atau kalah balapan.
Klaim **tidak** membuat atau mengubah check-in, status transaksi, maupun
`barcode_token`.

### Backfill manual (bukan endpoint)

`php artisan facilities:backfill [--dry-run] [--from=Y-m-d] [--to=Y-m-d]
[--facility=CODE] [--chunk=500] [--force]`

Mengisi hak untuk transaksi lunas sebelum fitur ini ada. Idempoten (aman
dijalankan berulang), mendukung `--dry-run` yang hanya menghitung, dan menolak
berjalan di production tanpa `--force`. Tidak pernah dipanggil otomatis oleh
migration/seeder. Jalankan `php artisan db:seed --class=FacilitySeeder` lebih
dulu agar katalog fasilitas tersedia.

## Endpoint booking online

Semua endpoint di bawah memerlukan `auth:sanctum` **dan** middleware
`role:visitor,admin`, lalu diotorisasi ulang `TransactionPolicy` yang hanya
menerima transaksi `source=online`. `cashier` dan `gate_staff` selalu `403`.
Hanya **wisatawan** yang boleh membuat dan membayar booking; `admin` hanya
membaca (read-only).

### `GET /api/v1/booking/tariffs`
Tarif aktif untuk formulir booking (read-only). Bentuk respons identik dengan
`GET /counter/tariffs`.

### `POST /api/v1/bookings`
Membuat booking online beserta pengunjung, baris kendaraan, tiket individual,
dan **satu** pembayaran berstatus `pending`. Booking dimiliki pengguna yang
login (`user_id`) dengan `source=online`.

- Backend menghitung ulang seluruh total dari tarif aktif di database;
  `client_total_amount` hanya informasional dan diabaikan.
- Server menerbitkan **referensi simulasi** (`payments.reference`, format
  `SIM-…`) yang dipakai pada langkah simulasi pembayaran.
- Tiket dibuat dalam keadaan belum tercetak dan baru diterbitkan (`issued`) saat
  pembayaran berhasil.

| Field | Tipe | Wajib | Catatan |
| --- | --- | --- | --- |
| `visit_date` | date | ya | hari ini s/d +30 hari |
| `visitors` | array | ya | 1–500 baris |
| `visitors[].full_name` | string | ya | maks 255 |
| `visitors[].nik` | string | ya | tepat 16 angka |
| `vehicles` | array | tidak | maks 20 baris |
| `vehicles[].vehicle_type_id` | int | ya | jenis harus **aktif**, tidak boleh duplikat |
| `vehicles[].quantity` | int | ya | 1–65535 |
| `client_total_amount` | int | tidak | diabaikan untuk perhitungan |

Respons `201` memuat `message` dan `data` (bentuk sama seperti detail).
Validasi gagal `422` dan seluruh penyimpanan dibatalkan (satu transaksi database).

### `GET /api/v1/bookings`
Daftar booking. Wisatawan hanya melihat miliknya; `admin` melihat seluruh
booking `online`. Maksimal **50** terbaru, **tanpa paginasi**. Hanya memuat
ringkasan (kode, status, tanggal kunjungan, jumlah wisatawan, total, status
pembayaran) — tanpa identitas, kendaraan, atau tiket.

### `GET /api/v1/bookings/{id}`
Detail booking `online`. `403` bila bukan pemilik (dan bukan admin); `404` bila
tidak ada atau bukan transaksi `online`. Memuat `barcode_token` (token
check-in gerbang), `visitors` (**hanya `masked_nik`**), `vehicles`, `payment`
(termasuk `simulation_reference`), dan `tickets` (kosong sebelum lunas).

### `POST /api/v1/bookings/{id}/simulate-payment`
Simulasi pembayaran akademik (bukan gateway sungguhan). **Hanya pemilik.** Body
wajib `outcome` (`success`/`failure`) dan `reference` (referensi simulasi yang
diterbitkan server saat booking dibuat).

- `success` → `payment.status` `pending → success`, `paid_at` diisi,
  `transactions.status` `pending → paid`, dan tiket diterbitkan (`issued`).
- `failure` → `payment.status` `pending → failed`; transaksi tetap `pending` dan
  **tidak** menerbitkan tiket. Wisatawan dapat mencoba lagi pada baris
  pembayaran yang sama (referensi tetap).
- Nilai `amount`/`status` dari klien **diabaikan**; status akhir ditentukan
  backend. Referensi yang tidak cocok dijawab `422`.
- Percobaan simulasi setelah pembayaran berhasil dijawab **`409`** (sukses
  bersifat final). Dijalankan dalam transaksi database dengan row lock.

### `POST /api/v1/bookings/{id}/print`
Mencatat pencetakan/pencetakan ulang tiket booking: mengisi `tickets.printed_at`
dan status `printed` tanpa membuat tiket baru. Diizinkan pemilik atau admin,
hanya setelah `paid` (`422` bila belum lunas). Pencetakan ulang dibedakan di
`audit_logs` (`booking.tickets_reprinted`). Detail booking menyertakan
`barcode_token` untuk check-in gerbang; pratinjau gelang memakai Code128 dari
`tickets[].ticket_code`. Kode tiket individual itu juga menjadi kunci meja
fasilitas, tetapi bukan bukti hak: backend tetap memeriksa pembayaran, check-in,
tanggal kunjungan, dan status hak sebelum mengizinkan klaim.

## Endpoint gerbang (gate)

Semua endpoint di bawah memerlukan `auth:sanctum` **dan** middleware
`role:gate_staff,admin`, lalu diotorisasi ulang `TransactionPolicy` lewat
ability `checkInGate`. `visitor` dan `cashier` selalu `403`; anonim `401`.
Endpoint check-in juga dibatasi rate limit (`throttle:gate-checkin`, 120/menit
per petugas + IP).

### `POST /api/v1/gate/check-in`
Memvalidasi barcode grup dan mencatat kedatangan seluruh rombongan satu
transaksi. **Body hanya memuat token**; transaksi, status pembayaran, jumlah
wisatawan, dan petugas divalidasi server dari database dan sesi.

| Field | Tipe | Wajib | Catatan |
| --- | --- | --- | --- |
| `barcode_token` | string | ya | token `transactions.barcode_token` (spasi tepi dipangkas) |

Transaksi diambil dengan **row lock** berdasarkan `barcode_token`; permintaan
bersamaan diserialisasi dan unique `transaction_checkins.transaction_id` menjadi
jaring pengaman terakhir. Urutan validasi:

1. Token tidak dikenal → **`404`** tanpa membocorkan detail transaksi apa pun.
2. Pembayaran tidak ada atau belum `success` → **`422`**.
3. Transaksi sudah `checked_in` → **`409`** (tidak membuat catatan baru).
4. Transaksi belum `paid` (mis. `pending`/`cancelled`) → **`422`**.
5. Tanggal check-in bukan hari kunjungan (zona `VISIT_TIMEZONE`, default
   `Asia/Jakarta`) → **`422`**.
6. Jumlah pengunjung transaksi tidak konsisten → **`422`**.
7. Sukses → membuat **tepat satu** baris `transaction_checkins`
   (`validated_by` = petugas, `visitor_count_checked_in` = jumlah pengunjung),
   menandai seluruh tiket `used`, dan mengubah `transactions.status` menjadi
   `checked_in`. Seluruhnya dalam satu transaksi database; `checked_in` hanya
   diset setelah catatan check-in tersimpan.

Respons sukses `201` (tanpa NIK maupun `barcode_token`):

```json
{
  "message": "Check-in berhasil dicatat.",
  "data": {
    "transaction_code": "TRX-20261013-AB12CD",
    "source": "online",
    "source_label": "Daring",
    "status": "checked_in",
    "status_label": "Sudah Check-in",
    "visit_date": "2026-10-13",
    "visitor_count": 3,
    "checked_in_at": "2026-10-13T02:11:05+00:00",
    "validated_by": { "id": 4, "name": "Petugas Gerbang" }
  }
}
```

Check-in **tidak pernah** mengubah nominal pembayaran atau menambah pendapatan.
Aksi sukses dicatat di `audit_logs` sebagai `gate.checked_in` tanpa token/NIK.

## Endpoint admin (dashboard & laporan)

Semua endpoint di bawah memerlukan `auth:sanctum` **dan** middleware
`role:admin`, lalu diotorisasi ulang `TransactionPolicy` (`viewDashboard`,
`viewReports`, `viewIdentityReport`). `visitor`, `cashier`, `gate_staff` selalu
`403`; anonim `401`.

**Seluruh angka dihitung backend dari database** menggunakan query agregat;
klien tidak pernah mengirim atau menjumlahkan total, status, atau hitungan. Tiap
metrik memakai basis tanggal yang eksplisit:

| Metrik | Basis |
| --- | --- |
| Jumlah transaksi & sebaran sumber/status | `transactions.created_at` |
| Wisatawan terdaftar & pengunjung hadir | `transactions.visit_date` |
| Kendaraan | `transactions.visit_date` (snapshot `transaction_vehicles`) |
| Pendapatan | `payments.paid_at`, **hanya** `payments.status = success` |

Konsekuensinya transaksi **tidak** disamakan dengan wisatawan, dan wisatawan
terdaftar **tidak** disamakan dengan pengunjung yang benar-benar hadir
(`transaction_checkins`).

### Parameter bersama

| Parameter | Tipe | Default | Catatan |
| --- | --- | --- | --- |
| `date_from` | date | awal bulan berjalan | zona `VISIT_TIMEZONE` |
| `date_to` | date | hari ini | harus `>= date_from`; rentang maks **366 hari** |
| `source` | enum | — | `online`/`counter` |
| `status` | enum | — | `pending`/`paid`/`checked_in`/`cancelled` |
| `payment_status` | enum | — | `pending`/`success`/`failed` |
| `checked_in` | bool | — | `true`/`false` (laporan kunjungan) |
| `date_basis` | enum | `created_at` | `created_at`/`visit_date`/`paid_at` (laporan transaksi) |
| `page` | int | 1 | paginasi server-side |
| `per_page` | int | 25 | maks **100** |

Periode default dihitung dalam `Asia/Jakarta` (config `visit.timezone`).
Pelanggaran rentang/per_page dijawab `422`.

### `GET /api/v1/admin/dashboard`
Ringkasan operasional untuk satu periode (bukan laporan per baris).

```json
{
  "data": {
    "period": { "date_from": "2026-10-01", "date_to": "2026-10-14", "timezone": "Asia/Jakarta" },
    "transactions": { "total": 12, "by_source": { "online": 7, "counter": 5 }, "by_status": { "pending": 2, "paid": 6, "checked_in": 4, "cancelled": 0 }, "basis": "created_at" },
    "visitors": { "registered": 30, "checked_in": 18, "checked_in_transactions": 5, "basis": "visit_date" },
    "revenue": { "total": 480000, "currency": "IDR", "by_source": { "online": 300000, "counter": 180000 }, "basis": "paid_at" },
    "vehicles": [ { "code": "motorcycle", "name": "Motor", "quantity": 8 } ]
  }
}
```

### `GET /api/v1/admin/reports/visits`
Satu baris per transaksi pada `visit_date`, dengan jumlah **terdaftar** dan
jumlah **hadir** dipisah. Respons memuat `summary` (`transactions`,
`registered_visitors`, `checked_in_visitors`) dan `meta` paginasi.

### `GET /api/v1/admin/reports/transactions`
Satu baris per transaksi. Memuat `transaction_date`, `visit_date`, status
pembayaran, dan `summary.revenue` (`total`, `basis` = `paid_at`). `date_basis`
memilih kolom yang dipakai menyaring rentang.

### `GET /api/v1/admin/reports/vehicles`
Rekap per jenis kendaraan. Semua jenis tetap muncul (bernilai nol bila kosong),
beserta `summary` (`quantity`, `subtotal`). Tidak berpaginasi (jumlah jenis
tetap).

### `GET /api/v1/admin/reports/identities`
Baris identitas wisatawan. **Hanya `masked_nik`** (mis. `3201********1234`);
NIK mentah tidak pernah dikembalikan. Ability `viewIdentityReport` dipisahkan
karena ini satu-satunya laporan yang menyentuh data pribadi.

### `GET /api/v1/admin/reports/{laporan}/export`
Mengunduh CSV (`Content-Type: text/csv`, `Content-Disposition: attachment`)
dengan filter yang sama, **tanpa paginasi**. Jumlah baris dibatasi
`config('report.max_export_rows')` (default **10.000**); melebihi batas dijawab
`422`. Ekspor identitas juga hanya memuat NIK tersamarkan.

## Matriks akses

| Endpoint | visitor | cashier | gate_staff | admin | anonim |
| --- | --- | --- | --- | --- | --- |
| `POST /auth/register` | — | — | — | — | ✅ |
| `POST /auth/login` | — | — | — | — | ✅ |
| `GET /auth/me` | ✅ | ✅ | ✅ | ✅ | ⛔ 401 |
| `POST /auth/logout` | ✅ | ✅ | ✅ | ✅ | ⛔ 401 |
| `GET /transactions/{id}` | ✅ milik sendiri | ⛔ 403 | ⛔ 403 | ✅ semua | ⛔ 401 |
| `GET /counter/tariffs` | ⛔ 403 | ✅ | ⛔ 403 | ✅ | ⛔ 401 |
| `POST /counter/transactions` | ⛔ 403 | ✅ | ⛔ 403 | ✅ | ⛔ 401 |
| `GET /counter/transactions/{id}` | ⛔ 403 | ✅ semua loket | ⛔ 403 | ✅ | ⛔ 401 |
| `POST /counter/transactions/{id}/confirm-payment` | ⛔ 403 | ✅ | ⛔ 403 | ✅ | ⛔ 401 |
| `POST /counter/transactions/{id}/print` | ⛔ 403 | ✅ | ⛔ 403 | ✅ | ⛔ 401 |
| `POST /counter/redemptions/lookup` | ⛔ 403 | ✅ | ⛔ 403 | ✅ | ⛔ 401 |
| `POST /counter/redemptions/confirm` | ⛔ 403 | ✅ | ⛔ 403 | ✅ | ⛔ 401 |
| `POST /counter/redemptions/print` | ⛔ 403 | ✅ | ⛔ 403 | ✅ | ⛔ 401 |
| `POST /counter/facilities/lookup` | ⛔ 403 | ✅ | ⛔ 403 | ✅ | ⛔ 401 |
| `POST /counter/facilities/claim` | ⛔ 403 | ✅ | ⛔ 403 | ✅ | ⛔ 401 |
| `GET /booking/tariffs` | ✅ | ⛔ 403 | ⛔ 403 | ✅ | ⛔ 401 |
| `POST /bookings` | ✅ | ⛔ 403 | ⛔ 403 | ⛔ 403 | ⛔ 401 |
| `GET /bookings` | ✅ milik sendiri | ⛔ 403 | ⛔ 403 | ✅ semua online | ⛔ 401 |
| `GET /bookings/{id}` | ✅ milik sendiri | ⛔ 403 | ⛔ 403 | ✅ online | ⛔ 401 |
| `POST /bookings/{id}/simulate-payment` | ✅ milik sendiri | ⛔ 403 | ⛔ 403 | ⛔ 403 | ⛔ 401 |
| `POST /bookings/{id}/print` | ✅ milik sendiri | ⛔ 403 | ⛔ 403 | ✅ online | ⛔ 401 |
| `POST /gate/check-in` | ⛔ 403 | ⛔ 403 | ✅ | ✅ | ⛔ 401 |
| `GET /admin/dashboard` | ⛔ 403 | ⛔ 403 | ⛔ 403 | ✅ | ⛔ 401 |
| `GET /admin/reports/*` | ⛔ 403 | ⛔ 403 | ⛔ 403 | ✅ | ⛔ 401 |
| `GET /admin/reports/*/export` | ⛔ 403 | ⛔ 403 | ⛔ 403 | ✅ | ⛔ 401 |

## CORS

`config/cors.php` membatasi akses lintas origin ke origin development pada
variabel `CORS_ALLOWED_ORIGINS` (default `http://localhost:3000` dan
`http://127.0.0.1:3000`). Metode yang diizinkan `GET`, `POST`, `OPTIONS`; header
yang diizinkan `Content-Type`, `Accept`, `Authorization`, `X-Requested-With`.

Frontend Next.js memakai pola BFF: browser memanggil route handler Next.js
(same-origin) dan server Next.js yang memanggil API ini, sehingga token tidak
pernah dikirim ke browser. Lihat [`docs/FRONTEND.md`](FRONTEND.md).

## Belum termasuk cakupan

- Reset password dan verifikasi email **belum diimplementasikan**.
- Pembayaran memakai **simulasi akademik**, bukan gateway sungguhan.
- Pembatalan booking belum memiliki endpoint khusus. Bila status transaksi
  diubah menjadi `cancelled`, model `Transaction` otomatis membatalkan hak
  fasilitas yang belum diklaim; hak yang sudah diklaim dipertahankan sebagai
  riwayat. Pengelolaan pengguna dan laporan berkas (PDF/Excel) dikerjakan pada
  fase berikutnya.
- Laporan identitas hanya menyediakan mekanisme **NIK tersamarkan**; mekanisme
  membuka NIK penuh tidak dibangun.
