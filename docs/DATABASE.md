# Skema Database

Database: MySQL 8 (`utf8mb4`). Seluruh tabel memakai primary key `id`, timestamps,
foreign key, index, dan unique constraint sesuai kebutuhan.

## Peran dan enum aplikasi

Nilai enum disimpan sebagai string dan dipetakan ke PHP enum di `app/Enums`:

- `Role`: `visitor`, `admin`, `cashier`, `gate_staff`
- `TransactionSource`: `online`, `counter`
- `TransactionStatus`: `pending`, `paid`, `checked_in`, `cancelled`
- `PaymentStatus`: `pending`, `success`, `failed`
- `PaymentMethod`: `cash`, `simulation`
- `TicketStatus`: `issued`, `printed`, `used`, `void`
- `FacilityEntitlementStatus`: `granted`, `redeemed`, `void`

## Tabel inti

### `users`
`name`, `email` (unik), `password` (hash), `role`, `phone`, `email_verified_at`.

### `tariffs`
Tarif non-kendaraan yang dikelola admin (mis. tarif wisatawan).
`code` (unik, mis. `visitor`), `name`, `unit_tariff`, `active`.

### `vehicle_types`
`code` (unik: `motorcycle`, `car`, `bus_truck`), `name`, `unit_tariff`, `active`.

### `transactions`
| Kolom | Catatan |
| --- | --- |
| `transaction_code` | unik, format `TRX-YYYYMMDD-XXXXXX` |
| `barcode_token` | unik, token acak — tidak memuat data pribadi |
| `user_id` | nullable, pemilik transaksi online (`nullOnDelete`) |
| `cashier_user_id` | nullable, petugas loket (`nullOnDelete`) |
| `source` | `online` / `counter` |
| `visit_date` | tanggal kunjungan (index) |
| `visitor_count` | jumlah wisatawan |
| `visitor_unit_tariff` | **snapshot** tarif per orang |
| `visitor_total` | subtotal wisatawan |
| `vehicle_total` | subtotal kendaraan |
| `total_amount` | total transaksi |
| `status` | `pending` / `paid` / `checked_in` / `cancelled` |
| `redemption_token` | **nullable unik**, token acak `RDM-…` untuk transaksi `online` — terpisah dari `barcode_token` gerbang |
| `redeemed_at` | **nullable**, kapan tiket fisik ditukarkan di loket; `null` berarti *Belum Ditukarkan* |
| `redeemed_by_user_id` | **nullable**, petugas loket yang menukarkan (`nullOnDelete`) |

Snapshot tarif disimpan agar perubahan tarif tidak mengubah transaksi historis.

Status penukaran sengaja **bukan** nilai `transactions.status` baru: ia cukup
diturunkan dari `redeemed_at`, sehingga laporan, alur pembayaran, dan alur
check-in gerbang tidak ikut berubah. Transaksi `source=counter` selalu
`redemption_token = NULL` — hanya booking online yang bisa ditukarkan lewat QR.

### `visitors`
`transaction_id` (cascade), `full_name`, `nik` (terenkripsi — kolom `text`).
Satu baris untuk setiap anggota rombongan.

### `tickets`
`transaction_id` (cascade), `visitor_id` (**unik**, cascade), `ticket_code` (unik),
`status`, `printed_at`. Satu tiket per wisatawan; kode dibuat otomatis dengan
format `TKT-YYYYMMDD-XXXXXXXX` (acak, tanpa data pribadi). Pencetakan ulang tidak
membuat tiket baru dan dicatat pada `audit_logs`. Saat check-in gerbang berhasil,
seluruh tiket transaksi ditandai `used`. Kode tiket individual adalah kunci meja
fasilitas, tetapi keputusan klaim tetap dihitung backend.

### `facilities`
Katalog fasilitas generik: `code` (unik), `name`, `is_auto_granted`, `active`,
timestamps. `is_auto_granted` menandai fasilitas yang diberikan otomatis setelah
pembayaran berhasil, sehingga fasilitas baru cukup ditambahkan sebagai baris
baru tanpa mengubah kode transaksi. Indeks `(active, is_auto_granted)` dipakai
saat mencari katalog yang akan diberikan. Seeder awal: `FREE_TEA` /
**Minuman Gratis**.

### `ticket_facility_entitlements`
Satu hak fasilitas per tiket dan fasilitas: `ticket_id` (cascade),
`facility_id` (restrict), `status` (`granted`/`redeemed`/`void`), `granted_at`,
`redeemed_at`, `redeemed_by_user_id` (nullOnDelete), `voided_at`,
`voided_by_user_id` (nullOnDelete), timestamps.

- **Unique `(ticket_id, facility_id)`** menjamin satu tiket tidak pernah punya
  dua hak untuk fasilitas yang sama; pemberian ulang memakai `firstOrCreate`.
- Definisi "masih tersedia" adalah `status = 'granted' AND redeemed_at IS NULL`.
  Pembaruan klaim memakai kondisi itu (`WHERE`) sehingga dua permintaan paralel
  hanya menghasilkan satu klaim.
- `redeemed_at`/`redeemed_by_user_id` adalah riwayat klaim nyata dan tidak
  dihapus saat pembatalan; hanya hak yang belum diklaim yang diubah menjadi
  `void`. Indeks `(facility_id, status)` dan `(status, redeemed_at)` mendukung
  rekap dan pencarian hak tersedia.

### `transaction_vehicles`
`transaction_id` (cascade), `vehicle_type_id` (restrict), `quantity`,
`unit_tariff` (snapshot), `subtotal`. **Unique `(transaction_id, vehicle_type_id)`**
mencegah kendaraan sejenis tercatat ganda dalam satu transaksi.

### `payments`
`transaction_id` (**unik**, cascade), `method`, `amount`, `status`,
`received_by_user_id` (nullable, `nullOnDelete` — petugas loket yang menerima
uang), `reference`, `paid_at`. Unique `transaction_id` menjamin satu transaksi
hanya memiliki satu catatan pembayaran sehingga pembayaran berhasil ganda tidak
mungkin terjadi.

- Untuk pembayaran loket (`method=cash`), `reference` kosong.
- Untuk booking online (`method=simulation`), **`reference` diisi referensi
  simulasi** yang diterbitkan server (`SIM-…`) dan wajib dikirim klien saat
  simulasi pembayaran. Sukses bersifat final; kegagalan memakai baris yang sama
  agar wisatawan dapat mencoba lagi.

### Alur booking online
Booking online **tidak membuat tiket** saat pembuatan. Hanya setelah simulasi
pembayaran `success` (yang mengisi `payments.paid_at` dan mengubah
`transactions.status` menjadi `paid`) barulah satu baris `tickets` dibuat per
`visitors`. Karena itu `tickets` kosong selama transaksi masih `pending`.

### `transaction_checkins`
`transaction_id` (**unik**, cascade), `validated_by` (nullable, `nullOnDelete`),
`checked_in_at`, `visitor_count_checked_in`. Unique `transaction_id` memastikan
satu transaksi hanya memiliki satu catatan check-in (dilindungi dari pemindaian
bersamaan).

### Alur check-in gerbang
Token check-in gerbang adalah `transactions.barcode_token` (opaque, unik, 40
karakter acak, tanpa data pribadi) dan mewakili satu transaksi/rombongan.
Pratinjau gelang memakai `tickets.ticket_code` sebagai barcode identitas
individual; kode itu juga dipakai meja fasilitas, tetapi bukan token check-in.
Saat token check-in dipindai, server:

1. mengunci baris transaksi berdasarkan `barcode_token` (`lockForUpdate`);
2. memverifikasi pembayaran `success` dan status `paid`;
3. memverifikasi tanggal kunjungan sama dengan hari ini pada zona
   `config('visit.timezone')` (`VISIT_TIMEZONE`, default `Asia/Jakarta`);
4. membuat **satu** baris `transaction_checkins`, menandai seluruh tiket `used`,
   lalu mengubah `transactions.status` menjadi `checked_in`.

Semuanya dalam satu transaksi database, sehingga kegagalan tidak meninggalkan
status atau catatan check-in yang tidak konsisten. Pemeriksaan ganda dijaga oleh
row lock (MySQL/InnoDB) dan unique `transaction_checkins.transaction_id`.
Check-in tidak mengubah nominal pembayaran.

### Alur hak fasilitas per tiket

1. Katalog fasilitas diisi `FacilitySeeder` (atau baris baru di `facilities`).
2. Saat pembayaran berhasil — simulasi booking online **atau** konfirmasi tunai
   loket — `FacilityEntitlementService` membuat satu baris
   `ticket_facility_entitlements` per tiket non-`void` untuk setiap fasilitas
   aktif `is_auto_granted`. Pembuatan memakai `firstOrCreate` dan unique
   `(ticket_id, facility_id)`, jadi aman diulang.
3. Klaim loket mencari tiket dari `tickets.ticket_code`, lalu memeriksa
   pembayaran `success`, transaksi tidak `cancelled`, `visit_date` hari ini pada
   `config('visit.timezone')`, dan keberadaan baris `transaction_checkins`.
   Hak harus masih `granted` dan `redeemed_at IS NULL`.
4. Klaim mengunci tiket/transaksi/pembayaran/hak, memperbarui secara bersyarat,
   lalu menulis audit `counter_facility.redeemed`. Klaim tidak membuat check-in.
5. Pembatalan transaksi (`transactions.status → cancelled`) memanggil
   `voidForTransaction()`: hak yang belum diklaim menjadi `void`; hak yang sudah
   diklaim dipertahankan sebagai riwayat.
6. Transaksi lunas lama dapat diisi manual lewat
   `php artisan facilities:backfill` (idempoten, mendukung `--dry-run` dan
   `--force` untuk production). Tidak berjalan otomatis pada migration/seeder.

### `audit_logs`
`user_id` (nullable), `action`, `entity_type`, `entity_id`, `metadata` (JSON).
Digunakan untuk mencatat perubahan tarif, tindakan administratif, dan pencetakan
ulang tiket. **Tidak boleh** memuat password, token autentikasi, atau NIK mentah.

## Indeks untuk laporan (Fase 8)

Dashboard & laporan hanya menambah indeks — tidak ada tabel atau kolom baru:

- `transactions.created_at` — menyaring jumlah transaksi berdasarkan waktu
  transaksi dibuat.
- `payments (status, paid_at)` — rekap pendapatan pembayaran `success`.
- `facilities (active, is_auto_granted)` — mencari katalog yang diberikan
  otomatis setelah pembayaran.
- `ticket_facility_entitlements (facility_id, status)` dan
  `(status, redeemed_at)` — rekap klaim dan pencarian hak yang masih tersedia.
- Unique `ticket_facility_entitlements (ticket_id, facility_id)` — mencegah hak
  ganda dan membuat pemberian ulang idempoten.

Indeks lain yang sudah ada dan terpakai: `transactions.visit_date`,
`transactions.status`, `transactions (visit_date, status)`, dan `payments.status`.

Penyaringan `visit_date` memakai interval setengah terbuka
`>= date_from AND < date_to + 1 hari` (bukan `BETWEEN` dua tanggal). Alasannya:
kolom bertipe `date` ditulis Eloquent sebagai `Y-m-d H:i:s` pada SQLite dan
dipotong menjadi `Y-m-d` oleh MySQL, sehingga `BETWEEN` gagal di SQLite.
Interval setengah terbuka memberi hasil identik di kedua driver dan tetap
memakai indeks (tanpa fungsi pada kolom).

## Alur relasi

```
users ──< transactions >── vehicle_types
              │                   │
              │                   └──< transaction_vehicles
              ├──< visitors ──1 tickets ──< ticket_facility_entitlements >── facilities
              ├──1 payments
              └──1 transaction_checkins
```
