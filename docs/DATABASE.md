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

Snapshot tarif disimpan agar perubahan tarif tidak mengubah transaksi historis.

### `visitors`
`transaction_id` (cascade), `full_name`, `nik` (terenkripsi — kolom `text`).
Satu baris untuk setiap anggota rombongan.

### `tickets`
`transaction_id` (cascade), `visitor_id` (**unik**, cascade), `ticket_code` (unik),
`status`, `printed_at`. Satu tiket per wisatawan; kode dibuat otomatis dengan
format `TKT-YYYYMMDD-XXXXXXXX` (acak, tanpa data pribadi). Pencetakan ulang tidak
membuat tiket baru dan dicatat pada `audit_logs`.

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

### `transaction_checkins`
`transaction_id` (**unik**, cascade), `validated_by` (nullable, `nullOnDelete`),
`checked_in_at`, `visitor_count_checked_in`. Unique `transaction_id` memastikan
satu transaksi hanya memiliki satu catatan check-in (dilindungi dari pemindaian bersamaan).

### `audit_logs`
`user_id` (nullable), `action`, `entity_type`, `entity_id`, `metadata` (JSON).
Digunakan untuk mencatat perubahan tarif, tindakan administratif, dan pencetakan
ulang tiket. **Tidak boleh** memuat password, token autentikasi, atau NIK mentah.

## Alur relasi

```
users ──< transactions >── vehicle_types
              │                   │
              │                   └──< transaction_vehicles
              ├──< visitors ──1 tickets
              ├──1 payments
              └──1 transaction_checkins
```
