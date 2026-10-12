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

## Matriks akses

| Endpoint | visitor | cashier | gate_staff | admin | anonim |
| --- | --- | --- | --- | --- | --- |
| `POST /auth/register` | — | — | — | — | ✅ |
| `POST /auth/login` | — | — | — | — | ✅ |
| `GET /auth/me` | ✅ | ✅ | ✅ | ✅ | ⛔ 401 |
| `POST /auth/logout` | ✅ | ✅ | ✅ | ✅ | ⛔ 401 |
| `GET /transactions/{id}` | ✅ milik sendiri | ⛔ 403 | ⛔ 403 | ✅ semua | ⛔ 401 |

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
- Booking online, simulasi pembayaran, transaksi loket, tiket, check-in,
  dashboard, dan laporan dikerjakan pada fase berikutnya.
