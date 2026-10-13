# Frontend (Next.js)

Frontend berada di `frontend/` dan berkomunikasi dengan REST API Laravel
(`/api/v1`). Cakupan saat ini: **integrasi autentikasi** (registrasi, login,
profil, logout), **alur loket** (buat transaksi, konfirmasi tunai, tiket, cetak),
**booking online** dengan **simulasi pembayaran** akademik, **validasi gerbang**
(barcode + check-in), serta **dashboard & laporan admin**.

## Stack dan struktur

| Item | Nilai |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4 (`@tailwindcss/turbopack`) |
| Bahasa | TypeScript |
| Package manager | npm (`package-lock.json`) |
| Testing | Vitest (unit), `next build`, ESLint, `tsc --noEmit` |

```
frontend/
  src/
    app/
      api/auth/{register,login,logout,me}/route.ts   # BFF route handler (auth)
      api/counter/tariffs/route.ts                    # BFF: tarif aktif
      api/counter/transactions/route.ts               # BFF: buat transaksi
      api/counter/transactions/[id]/route.ts          # BFF: detail
      api/counter/transactions/[id]/confirm-payment/route.ts
      api/counter/transactions/[id]/print/route.ts
      api/booking/tariffs/route.ts                    # BFF: tarif booking
      api/bookings/route.ts                           # BFF: daftar + buat booking
      api/bookings/[id]/route.ts                      # BFF: detail booking
      api/bookings/[id]/simulate-payment/route.ts     # BFF: simulasi pembayaran
      api/bookings/[id]/print/route.ts                # BFF: catat cetak tiket
      api/gate/check-in/route.ts                      # BFF: validasi gerbang
      api/admin/reports/{visits,transactions,
        vehicles,identities}/export/route.ts          # BFF: unduh CSV laporan
      login/page.tsx                                  # form login (client)
      register/page.tsx                               # form registrasi (client)
      profile/page.tsx                                # profil (server, perlu sesi)
      admin/layout.tsx                                # gerbang admin + sub-navigasi
      admin/page.tsx                                  # dashboard ringkasan (server)
      admin/laporan/kunjungan/page.tsx                # laporan kunjungan (server)
      admin/laporan/transaksi/page.tsx                # laporan transaksi (server)
      admin/laporan/kendaraan/page.tsx                # laporan kendaraan (server)
      admin/laporan/identitas/page.tsx                # laporan identitas (server)
      counter/page.tsx                                # loket (server) + counter-workspace.tsx
      counter/transactions/[id]/page.tsx              # detail (server) + transaction-actions.tsx
      counter/transactions/[id]/print/page.tsx        # halaman cetak tiket
      booking/page.tsx                                # form booking (server) + booking-form.tsx
      booking/history/page.tsx                        # riwayat booking (server)
      booking/[id]/page.tsx                           # detail (server) + payment-simulation.tsx
      booking/[id]/print/page.tsx                     # halaman cetak tiket booking
      gate/page.tsx                                   # gerbang (server) + gate-checkin-form.tsx
      layout.tsx page.tsx globals.css
    components/       site-header.tsx, logout-button.tsx, field.tsx, barcode-svg.tsx
    components/counter/  status-badge.tsx, ticket-card.tsx, print-button.tsx
    components/admin/    admin-nav.tsx, report-filter.tsx, pagination.tsx,
                         export-link.tsx, ui.tsx
    lib/
      api/            config.ts, types.ts, errors.ts, server.ts, client.ts, origin.ts, bff.ts, download.ts
      auth/           session.ts, guard.ts, roles.ts
      pricing/        tariffs.ts (+ tariffs.test.ts)   # tarif + estimasi + formatRupiah
      barcode/        code128.ts (+ code128.test.ts)   # encoder Code128-B (SVG)
      counter/        types.ts, server.ts
      booking/        types.ts, server.ts, status.ts (+ status.test.ts)
      gate/           types.ts, status.ts (+ status.test.ts)
      reports/        types.ts, period.ts (+ period.test.ts), format.ts, server.ts
    proxy.ts          # optimistic auth gate (Next 16 Proxy / middleware)
  .env.example
```

> `lib/pricing/` adalah modul bersama: tipe katalog tarif, `estimateCost()`, dan
> `formatRupiah()` dipakai baik oleh formulir loket maupun formulir booking.

## Variabel lingkungan

Salin `frontend/.env.example` menjadi `frontend/.env.local` bila perlu menyesuaikan.

| Variabel | Default | Sisi | Keterangan |
| --- | --- | --- | --- |
| `API_BASE_URL` | `http://127.0.0.1:8000` | server | Base URL Laravel. **Tanpa** prefix `NEXT_PUBLIC_`. |
| `SESSION_COOKIE_NAME` | `parangtritis_token` | server | Nama cookie HttpOnly penyimpan token. |
| `SESSION_COOKIE_SECURE` | ikut `NODE_ENV` | server | Paksa flag `Secure`. Isi `false` hanya saat menguji `next start` di atas HTTP lokal. |

`API_BASE_URL` sengaja tidak memakai prefix `NEXT_PUBLIC_` karena browser tidak
pernah memanggil Laravel secara langsung dan tidak boleh mengetahui token.
`.env.local` diabaikan Git; `.env.example` tidak memuat rahasia.

## Keputusan penyimpanan token

**Token Sanctum disimpan pada cookie HttpOnly dan hanya ditangani kode server
(BFF), bukan di `localStorage`.**

Model ancaman singkat:

- Token Sanctum tidak memiliki masa kedaluwarsa default. Token yang dicuri
  memberi akses penuh ke akun sampai dicabut.
- `localStorage`/`sessionStorage` dapat dibaca JavaScript mana pun yang berjalan
  di halaman. Satu celah XSS (termasuk dari dependensi) cukup untuk
  mengeksfiltrasi token.
- Menaruh token di cookie saja tidak cukup: jika JavaScript masih dapat
  membacanya, atau jika token dikirim bolak-balik ke browser, risikonya sama.

Karena itu semua penanganan token berada di server Next.js:

1. Route handler `src/app/api/auth/*` memanggil Laravel, menerima token, lalu
   menyimpannya lewat `cookies().set(...)` sebagai **HttpOnly**, `SameSite=Lax`,
   `Secure` (mengikuti `SESSION_COOKIE_SECURE`, default aktif di produksi), dengan
   `maxAge` 8 jam.
2. Token **tidak pernah** dikembalikan ke browser: respons BFF hanya memuat data
   pengguna, bukan token.
3. Server component (`profile/page.tsx`, `site-header.tsx`) membaca cookie dan
   memanggil Laravel dengan header `Authorization: Bearer` dari sisi server.
4. Client component memanggil route handler Next.js (same-origin) lewat
   `apiRequest()`; cookie terkirim otomatis oleh browser, token tetap tidak
   terlihat oleh JavaScript.
5. Token tidak masuk ke log, URL, atau variabel `NEXT_PUBLIC_`.

Karena cookie terkirim otomatis, route handler yang mengubah state memakai
pemeriksaan origin sederhana (`isSameOrigin`) untuk menolak permintaan lintas
situs (403).

Pada produksi, aplikasi ini wajib dijalankan di belakang HTTPS agar flag `Secure`
efektif. Jika nanti frontend dipisah dari server BFF, pertahankan pola BFF
tersebut alih-alih mengekspos token ke browser.

## Alur permintaan

```
Browser ──(same-origin, cookie HttpOnly)──▶ Next.js route handler / server component
                                                   │  Authorization: Bearer <token>
                                                   ▼
                                             Laravel /api/v1
```

CORS Laravel tetap dikonfigurasi (`config/cors.php`) untuk origin development
yang diizinkan, tetapi jalur utama aplikasi tidak memerlukannya karena browser
berbicara dengan server Next.js, bukan langsung ke Laravel.

## Penanganan error

`lib/api/errors.ts` memetakan status menjadi `ApiError` dengan `kind` konsisten:

| Status | `kind` | Perilaku UI |
| --- | --- | --- |
| 422 | `validation` | Pesan per field dari `errors` backend |
| 401 | `unauthorized` | Sesi tidak valid → diarahkan ke `/login` |
| 403 | `forbidden` | Pesan "tidak memiliki hak akses" |
| 404 | `not_found` | Pesan data tidak ditemukan |
| 5xx | `server` | Pesan gangguan server |
| jaringan gagal | `network` | Pesan "tidak dapat menghubungi server" |

## Tampilan berbasis peran

Peran hanya memengaruhi tampilan (label peran, tautan "Dasbor", "Loket",
"Gerbang", catatan menu). **Seluruh otorisasi tetap ditegakkan di backend**;
menyembunyikan elemen UI bukan kontrol keamanan. `canUseDashboard()`,
`canUseCounter()`, `canUseBooking()`, dan `canUseGate()` di
`lib/auth/roles.ts` hanya gerbang tampilan; backend tetap menolak peran lain
lewat middleware `role:...` + policy.

## Alur loket (Fase 5)

Semua permintaan tetap lewat pola BFF: browser memanggil route handler Next.js
same-origin, server Next.js menyisipkan `Authorization: Bearer` dari cookie
HttpOnly. Route handler yang mengubah data memakai `forwardToLaravel()`
(`lib/api/bff.ts`) yang juga menolak permintaan lintas situs.

1. `/counter` (kasir/admin) memuat tarif aktif dari `GET /api/counter/tariffs`,
   mengisi identitas tiap pengunjung (nama + NIK 16 angka) dan jumlah kendaraan.
2. `lib/pricing/tariffs.ts` menghitung **estimasi** biaya di browser. Angka ini
   hanya untuk tampilan; backend menghitung ulang total dari tarif database saat
   `POST /api/counter/transactions`.
3. Halaman detail `/counter/transactions/[id]` menampilkan status, pembayaran,
   pengunjung (NIK tersamarkan), kendaraan, dan tiket individual.
4. Tombol "Konfirmasi pembayaran tunai" memanggil
   `POST .../confirm-payment`. Konfirmasi ganda dijawab backend `409`.
5. Tombol "Cetak tiket" memanggil `POST .../print` (mencatat `printed_at`) lalu
   membuka `/counter/transactions/[id]/print`, halaman ramah-cetak yang
   menyembunyikan header/footer dengan varian `print:hidden` Tailwind dan
   menyediakan tombol `window.print()`. Halaman cetak **tidak** mengklaim tiket
   tercetak fisik — pencetakan bergantung pada printer dan browser.

Detail kontrak endpoint ada di [`docs/API.md`](API.md).

## Alur booking online (Fase 6)

Booking online hanya untuk **wisatawan**; `admin` masuk sebagai pembaca
(read-only) lewat halaman riwayat. Gerbang tampilan `canUseBooking()` di
`lib/auth/roles.ts` bukan kontrol keamanan — backend tetap menolak peran lain
lewat middleware `role:visitor,admin` + policy.

1. `/booking` (wisatawan) memuat tarif dari `GET /api/booking/tariffs`
   (`lib/pricing/tariffs.ts`), lalu `booking-form.tsx` mengumpulkan tanggal
   kunjungan (hari ini s/d +30 hari), pengunjung (nama + NIK 16 angka), dan
   jumlah kendaraan. Angka total di layar hanya estimasi.
2. `POST /api/bookings` membuat booking `source=online` **milik pengguna yang
   login**, dengan satu pembayaran `pending` dan **referensi simulasi** dari
   server. Response `201` diikuti pengalihan ke halaman detail.
3. `/booking/[id]` menampilkan ringkasan, pengunjung (NIK tersamarkan),
   kendaraan, pembayaran, dan tiket. `payment-simulation.tsx` muncul hanya untuk
   pemilik selama status masih `pending`; `admin` tidak dapat membayar atau
   mencetak atas nama wisatawan.
4. Simulasi mengirim `{ outcome, reference }` ke
   `POST /api/bookings/[id]/simulate-payment`. Backend memvalidasi kepemilikan,
   status, dan referensi; `success` menerbitkan tiket, `failure` membiarkan
   transaksi `pending` agar bisa dicoba lagi. Percobaan ulang setelah sukses
   dijawab `409`.
5. Setelah `paid`, tombol "Cetak tiket" memanggil `POST /api/bookings/[id]/print`
   (mencatat `printed_at` + audit) lalu membuka `/booking/[id]/print`, halaman
   ramah-cetak yang memakai ulang `TicketCard`. Halaman cetak **tidak** mengklaim
   tiket tercetak fisik.
6. `/booking/history` menampilkan maksimal 50 booking terbaru (milik sendiri
   untuk wisatawan, seluruh booking online untuk admin).

Simulasi pembayaran adalah **akademik**, bukan gateway sungguhan; lihat
[`docs/SECURITY.md`](SECURITY.md).

## Alur gerbang (Fase 7)

Halaman `/gate` hanya untuk `gate_staff` dan `admin`; `visitor`, `cashier`, dan
anonim ditolak. `canUseGate()` hanya gerbang tampilan — backend menolak peran
lain lewat middleware `role:gate_staff,admin` + policy.

1. Halaman cetak tiket (`/counter/transactions/[id]/print` dan
   `/booking/[id]/print`) merender **barcode Code128-B** dari `barcode_token`
   transaksi lewat `components/barcode-svg.tsx` dan `lib/barcode/code128.ts`.
   Token ditampilkan juga sebagai teks agar bisa diketik manual bila perlu.
2. `gate-checkin-form.tsx` menyediakan satu kolom teks yang siap menerima
   **pemindai barcode USB** (bertindak seperti keyboard dan menekan Enter),
   sehingga submit berjalan otomatis. Tersedia juga tombol "Validasi" untuk
   input manual.
3. Form memanggil `POST /api/gate/check-in` (BFF) dengan **hanya**
   `barcode_token`. Token tidak pernah disimpan di `localStorage`/
   `sessionStorage`, tidak dimasukkan ke URL, dan dibersihkan setiap kali
   percobaan selesai; fokus otomatis kembali ke kolom.
4. Hasil ditampilkan jelas lewat `gateTone()` di `lib/gate/status.ts`: berhasil
   (hijau, menampilkan kode transaksi, sumber, **jumlah hadir**, tanggal, waktu,
   petugas), sudah pernah check-in (kuning, `409`), atau ditolak (merah) dengan
   alasan aman dari backend. Backend tetap sumber kebenaran status.

Kontrak endpoint lengkap ada di [`docs/API.md`](API.md).

## Alur dashboard & laporan (Fase 8)

Seluruh area `/admin` hanya untuk **administrator**. `app/admin/layout.tsx`
melakukan gerbang tampilan sekali (`getCurrentUser()` + `canUseDashboard()`),
lalu setiap halaman memuat datanya sendiri. Backend tetap sumber kebenaran:
middleware `role:admin` + policy menolak peran lain dengan `403`.

1. Halaman adalah **server component** (`instant = false`) yang memanggil Laravel
   langsung lewat `lib/reports/server.ts` memakai cookie HttpOnly — sama seperti
   halaman loket/booking, tanpa route handler JSON tambahan.
2. Filter (rentang tanggal, sumber, status, status pembayaran, kunjungan, dasar
   tanggal, baris per halaman) diubah lewat `components/admin/report-filter.tsx`
   (client) yang mendorong nilainya ke URL; halaman me-render ulang di server.
   Rentang default awal bulan berjalan s/d hari ini pada zona `Asia/Jakarta`
   (`lib/reports/period.ts`) dan selalu dikirim eksplisit ke backend.
3. **Seluruh angka berasal dari backend.** Halaman hanya menampilkan
   `summary`/`meta`/`data` yang diterima; tidak ada penjumlahan atau perhitungan
   status di browser. Basis metrik ditampilkan pada kartu ("Basis: tanggal
   kunjungan", "Pembayaran berhasil (waktu bayar)") agar transaksi tidak
   tertukar dengan wisatawan maupun pendaftar dengan pengunjung hadir.
4. Paginasi server-side memakai `meta` dari backend; `components/admin/pagination.tsx`
   menyusun tautan halaman sambil mempertahankan filter.
5. Tombol **Unduh CSV** menunjuk ke route handler BFF
   `/api/admin/reports/{laporan}/export`. `lib/api/download.ts`
   (`forwardDownload()`) menyisipkan `Authorization: Bearer` dari cookie,
   meneruskan filter, dan mengalirkan berkas beserta header `Content-Type`/
   `Content-Disposition` dari Laravel. Token tetap tidak terlihat browser.
6. Laporan identitas **hanya** menampilkan `masked_nik`; NIK mentah tidak pernah
   dikirim ke browser, termasuk pada ekspor CSV.

Kontrak endpoint lengkap ada di [`docs/API.md`](API.md).

## Menjalankan

Laravel (terminal 1) dan Next.js (terminal 2):

```bash
# terminal 1 — root repo
php artisan serve --host=127.0.0.1 --port=8000

# terminal 2 — frontend
cd frontend
npm install
npm run dev            # http://localhost:3000
```

Override env untuk uji produksi lokal di atas HTTP:

```bash
# terminal 2 (Windows)
$env:SESSION_COOKIE_SECURE="false"; npm run start -- -p 3000
```

## Pemeriksaan

```bash
cd frontend
npm run lint
npm run typecheck
npm run test        # Vitest
npm run build
```

## Belum termasuk cakupan

Pembatalan booking, pengelolaan pengguna, dan ekspor berkas selain CSV
(PDF/Excel) tidak dibuat pada fase ini. Pembayaran memakai simulasi akademik,
bukan gateway sungguhan. Pemindai barcode memakai perangkat USB keyboard-wedge
standar; tidak ada dukungan kamera/QR khusus. Laporan identitas hanya
menyediakan NIK tersamarkan — tidak ada mekanisme membuka NIK penuh.
