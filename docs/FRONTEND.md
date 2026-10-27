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
      api/counter/redemptions/{lookup,confirm,print}/route.ts  # BFF: penukaran
      api/counter/facilities/{lookup,claim}/route.ts  # BFF: klaim fasilitas
      api/booking/tariffs/route.ts                    # BFF: tarif booking
      api/bookings/route.ts                           # BFF: daftar + buat booking
      api/bookings/[id]/route.ts                      # BFF: detail booking
      api/bookings/[id]/simulate-payment/route.ts     # BFF: simulasi pembayaran
      api/bookings/[id]/print/route.ts                # BFF: catat cetak tiket
      api/gate/check-in/route.ts                      # BFF: validasi gerbang
      api/admin/reports/{visits,transactions,
        vehicles,identities}/export/route.ts          # BFF: unduh CSV laporan
      login/page.tsx                                  # form login wisatawan (client)
      staff/login/page.tsx                            # portal operasional (server) + staff-login-form.tsx
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
      counter/penukaran/page.tsx                      # meja penukaran + redemption-workspace.tsx
      counter/fasilitas/page.tsx                      # meja fasilitas + facility-workspace.tsx
      booking/page.tsx                                # form booking (server) + booking-form.tsx
      booking/history/page.tsx                        # riwayat booking (server)
      booking/[id]/page.tsx                           # detail (server) + payment-simulation.tsx
      booking/[id]/print/page.tsx                     # halaman cetak tiket booking
      booking/[id]/print-tickets-action.tsx           # tombol catat cetak tiket
      gate/page.tsx                                   # gerbang (server) + gate-checkin-form.tsx
      layout.tsx page.tsx globals.css print.css
    components/       site-header.tsx, logout-button.tsx, field.tsx, barcode-svg.tsx
    components/counter/  status-badge.tsx, wristband-card.tsx, ticket-card.tsx,
                         print-button.tsx
    components/admin/    admin-nav.tsx, report-filter.tsx, pagination.tsx,
                         export-link.tsx, ui.tsx
    lib/
      api/            config.ts, types.ts, errors.ts, server.ts, client.ts, origin.ts, bff.ts, download.ts
      auth/           session.ts, guard.ts, roles.ts
      pricing/        tariffs.ts (+ tariffs.test.ts)   # tarif + estimasi + formatRupiah
      barcode/        code128.ts (+ code128.test.ts)   # encoder Code128-B (SVG)
      counter/        types.ts, server.ts, redemption.ts (+ redemption.test.ts),
                      facility.ts (+ facility.test.ts)
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

## Dua portal masuk

Ada dua pintu masuk yang memakai **satu sistem autentikasi yang sama**
(`POST /api/v1/auth/login` lewat BFF `POST /api/auth/login`), bukan dua
mekanisme sesi:

| Portal | Rute | Untuk | Setelah masuk |
| --- | --- | --- | --- |
| Wisatawan | `/login` | `visitor` | `/profile` (tetap seperti semula) |
| Operasional | `/staff/login` | `admin`, `cashier`, `gate_staff` | sesuai peran (lihat pemetaan di bawah) |

`staffDestination()` di `lib/auth/roles.ts` memetakan role ke tujuan pasca-login
portal operasional: `admin` → `/admin`, `cashier` → `/counter`,
`gate_staff` → `/gate`, dan `visitor` → `null` (ditolak).

Aturan pemisahan portal:

1. **Role selalu berasal dari backend.** Form hanya mengirim `email` dan
   `password`; tidak ada field `role` yang dikirim, dan tidak ada role yang
   dibaca dari input pengguna. Tujuan pengalihan dihitung dari `role` pada
   respons login (atau `/auth/me`) yang sudah diverifikasi Laravel.
2. **Tidak ada parameter pengalihan.** `/staff/login` tidak menerima `?next=`
   atau URL tujuan dari pengguna, sehingga tidak ada open redirect. `?next=`
   yang disisipkan manual diabaikan.
3. **Wisatawan ditolak dari portal operasional.** Bila kredensial yang
   dimasukkan milik akun `visitor`, sesi yang sudah dibuat **dicabut kembali**
   lewat `POST /api/auth/logout`, pesan penolakan ditampilkan, dan pengguna
   diarahkan memakai portal wisatawan. Wisatawan yang sudah masuk dan membuka
   `/staff/login` melihat panel "Portal khusus pegawai" beserta tautan ke area
   wisatawan dan tombol keluar.
4. **Pegawai yang sudah masuk tidak melihat formulir.** Server component
   `/staff/login` memanggil `getCurrentUser()`; bila role-nya pegawai, pengguna
   langsung dialihkan ke halaman kerjanya, sehingga tidak ada lingkaran redirect
   antara portal dan halaman tujuan.
5. **Pemisahan portal hanya lapisan tampilan.** Backend tetap sumber kebenaran:
   middleware `auth:sanctum` + `role:...` dan `TransactionPolicy` tidak berubah,
   dan mengetik URL halaman terproteksi langsung tetap divalidasi ulang di
   server (proxy hanya gerbang optimistis berbasis keberadaan cookie).

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

## Cetak gelang (desain & CSS cetak)

Hasil cetak ketiga jalur (loket, penukaran, pratinjau booking) memakai satu
komponen: `components/counter/wristband-card.tsx`. Komposisinya mengikuti
gambar referensi **"Tiket Gelang Pantai Parangtritis"**: pita datar sangat
memanjang (rasio ±8,4:1) yang terbagi enam zona — tab kunci berpasak,
panel brand hijau laut (judul *Pantai Parangtritis* dominan + `YOGYAKARTA`,
ikon pesisir dan ombak toska di tepi bawah), panel ivory berisi label
*Tiket Individual*, kode tiket dan Code128 dari `ticket_code`, panel ivory
tanggal kunjungan, panel ivory berpola ombak toska, dan tab kunci berlubang di
ujung kanan. Semua tab/perekat menyatu sebagai bentuk gelang — bukan strip
dekoratif terpisah. Gaya struktur, warna, dan tipografi
terpusat di `app/print.css` (lewat custom property `--wb-*`); pemisah antar
zona berupa garis putus-putus.

- **Satu gelang per tiket.** `tickets.map(...)` — booking dengan beberapa
  pengunjung menghasilkan beberapa gelang; kode tiket individual tampil di
  setiap gelang dan barcode mengodekan kode tiket individual yang stabil saat
  dicetak ulang. Barcode gelang ini adalah identitas tiket dan kunci input meja
  fasilitas; ia bukan bukti hak, karena backend tetap memeriksa pembayaran,
  check-in, tanggal, dan status hak.
  `redemption_token` tetap khusus QR pengambilan gelang di loket dan
  `barcode_token` tetap khusus check-in gerbang; keduanya tidak dicetak di
  gelang ini. NIK (mentah maupun tersamar) tidak ikut tercetak — hanya nama
  pengunjung ringkas di panel tanggal.
- **Aturan cetak** terpusat di `app/print.css` (diimpor `layout.tsx`):
  `@page { size: auto; margin: 8mm }`, tinggi minimum gelang lewat custom
  property `--wristband-print-height` (24mm), `break-inside: avoid` per
  gelang, dan `print-color-adjust: exact` agar warna panel ikut tercetak.
  Lebar zona memakai **flex-grow proporsional** (bukan ukuran absolut),
  sehingga proporsi referensi tetap terjaga berapa pun lebar media; ukuran
  teks cetak memakai satuan pt/mm.
  Di layar, pita berukuran minimal 640px dan pembungkusnya
  (`.wristband-scroll`) dapat digulir horizontal di layar sempit agar layout
  tidak pernah terpotong.
- **Backend fasilitas tersedia; cetak fisik belum diverifikasi.** Hak fasilitas
  melekat pada tiket individual dan diklaim lewat `/counter/fasilitas` (lihat
  *Alur klaim fasilitas*). Code128 pada gelang tetap identitas tiket, bukan
  bukti klaim. Ukuran media printer juga belum
  dikonfigurasi; `@page` masih `size: auto`. Setelah ukuran roll pasti
  diketahui, cukup ganti blok `@page` dan `--wristband-print-height` di
  `print.css` — petunjuk lengkap ada di komentar kepala file tersebut.
  Barcode SVG menggambar latar putih dan bar hitam sendiri, sehingga tetap
  terlihat bila browser membuang background.


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
5. Setelah `paid`, tombol "Lihat Pratinjau Tiket" membuka
   `/booking/[id]/print`, halaman pratinjau yang memakai `WristbandCard`
   (desain gelang memanjang — lihat *Cetak gelang* di bawah — kode
   penukaran tidak menggantikan barcode gerbang). Pencatatan cetak (`POST /api/bookings/[id]/print`) baru
   terjadi saat tombol **Cetak Tiket** di halaman itu ditekan; bila pencatatan
   gagal, dialog cetak tidak dibuka. Halaman cetak **tidak** mengklaim tiket
   tercetak fisik.
6. **Kode penukaran loket.** Setelah pembayaran sukses, `/booking/[id]` juga
   menampilkan banner *Pembayaran berhasil* serta kartu **Kode penukaran
   loket** berisi barcode Code128 (`components/barcode-svg.tsx`) beserta status
   **Belum Ditukarkan** / **Sudah Ditukarkan**. `canShowRedemptionCode()` di
   `lib/booking/status.ts` hanyalah gerbang tampilan: backend sendiri menahan
   `redemption.token` sampai pembayaran sukses, mengisi nilainya dengan `RDM-`
   + 24 karakter acak (bukan angka transaksi), dan tidak pernah
   mengembalikannya kepada selain pemilik booking atau admin.
7. `/booking/history` menampilkan maksimal 50 booking terbaru (milik sendiri
   untuk wisatawan, seluruh booking online untuk admin).

Simulasi pembayaran adalah **akademik**, bukan gateway sungguhan; lihat
[`docs/SECURITY.md`](SECURITY.md).

## Alur gerbang (Fase 7)

Halaman `/gate` hanya untuk `gate_staff` dan `admin`; `visitor`, `cashier`, dan
anonim ditolak. `canUseGate()` hanya gerbang tampilan — backend menolak peran
lain lewat middleware `role:gate_staff,admin` + policy.

1. Gelang di halaman cetak (`/counter/transactions/[id]/print` dan
   `/booking/[id]/print`) menampilkan Code128-B dari `tickets[].ticket_code`
   sebagai identitas tiket individual. Token check-in gerbang tetap
   `transactions.barcode_token` dan alur check-in tidak menggunakan kode
   tiket atau `redemption_token`.
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
   halaman loket/booking, tanpa route handler JSON tambahan. Tiap halaman
   memanggil `await io()` (`next/cache`) sebelum rentang default dihitung, agar
   `new Date()` di `lib/reports/period.ts` dibaca saat request dan bukan saat
   prerender Cache Components, lalu mendeklarasikan `instant = false` di level
   halaman supaya validasi instant navigation tidak menganggap blokir itu cacat.
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

## Alur penukaran tiket fisik

Halaman `/counter/penukaran` hanya untuk `cashier` dan `admin`; `visitor`,
`gate_staff`, dan anonim ditolak proxy, gerbang UI `canUseCounter()`, lalu
middleware `role:cashier,admin` + policy di backend.

1. **Pindai atau ketik.** Kolom `redemption_token` siap menerima pemindai
   barcode USB (mengetik seperti keyboard lalu menekan Enter), disertai tombol
   validasi untuk input manual. Kode tidak pernah dimasukkan ke URL — hanya ke
   body POST same-origin, sehingga tidak tercatat di riwayat browser maupun log
   akses. Kolom dikosongkan dan difokuskan lagi tiap kali selesai.
2. **Pratinjau read-only.** Submit memanggil `POST /api/counter/redemptions/lookup`
   (BFF) lalu menampilkan ringkasan pesanan: pemilik, tanggal kunjungan, jumlah
   pengunjung, jumlah kendaraan, jumlah tiket, dan status pembayaran — semuanya
   dari `RedemptionResource`, tanpa `simulation_reference` dan hanya dengan
   `masked_nik`. Membuka pratinjau **tidak** mengubah status apa pun.
3. **Konfirmasi terpisah.** Tombol "Konfirmasi Penukaran" hanya muncul bila
   `can_redeem` dan memanggil `POST .../confirm`. Kegagalan backend ditampilkan
   apa adanya (belum lunas `422`, sudah ditukarkan `409`, kode tak dikenal
   `404`) lewat pesan galat `ApiError`, sementara `redemptionTone()` di
   `lib/counter/redemption.ts` hanya menentukan warna kartu status.
   Keputusan tetap di backend (row lock + pembaruan bersyarat
   `WHERE redeemed_at IS NULL`), jadi tombol yang dinonaktifkan bukan kontrol.
4. **Cetak gelang.** Setelah `redeemed`, gelang dirender **inline** memakai
   `components/counter/wristband-card.tsx` — satu gelang per tiket, berisi
   identitas Pantai Parangtritis + ornamen ombak, tanggal kunjungan, kode
   tiket, nama pengunjung, dan barcode identitas tiket individual. Kode itu
   menjadi kunci input meja fasilitas (lihat *Alur klaim fasilitas*).
   Tombolnya `wristbandButtonLabel()`: "Cetak Gelang" lalu "Cetak Ulang
   Gelang". Tombol memanggil `POST .../print` (mencatat `printed_at` + audit)
   **baru** kemudian `window.print()`; karena gelang sudah berada di DOM sebelum
   itu, dialog cetak selalu memuat gelang yang benar. Seluruh elemen lain memakai
   varian `print:hidden`.
5. **Cetak ulang aman.** Pencetakan ulang tidak membuat tiket baru, tidak
   menggandakan penukaran, dan tidak membuat check-in; stempel waktu cetak
   pertama dipertahankan dan hanya audit `_tickets_reprinted` yang ditambahkan.
6. "Penukaran baru" mereset kolom dan mengembalikan fokus ke input untuk
   pengunjung berikutnya.

Kontrak endpoint lengkap ada di [`docs/API.md`](API.md).

## Alur klaim fasilitas

Halaman `/counter/fasilitas` hanya untuk `cashier` dan `admin`; `visitor`,
`gate_staff`, dan anonim ditolak proxy, gerbang UI `canUseCounter()`, lalu
middleware `role:cashier,admin` + policy di backend. Tautan masuk tersedia dari
`/counter`.

1. **Pindai kode tiket individual.** Kolom `ticket_code` menerima pemindai
   barcode USB atau input manual (`TKT-YYYYMMDD-XXXXXXXX`). Kode tidak pernah
   masuk ke URL; hanya ke body POST same-origin. Kode tiket berbeda dari
   `redemption_token` (penukaran online) dan `barcode_token` (gerbang).
2. **Pratinjau read-only.** Submit memanggil
   `POST /api/counter/facilities/lookup` (BFF) dan menampilkan ringkasan tiket:
   nama + `masked_nik` pengunjung, kode transaksi, tanggal kunjungan,
   pembayaran, dan status check-in gerbang. Membuka pratinjau **tidak**
   mengklaim fasilitas dan tidak menulis audit.
3. **Daftar hak fasilitas.** Setiap hak menampilkan nama/kode, status
   (`Tersedia`/`Sudah Diklaim`/`Dibatalkan`), waktu diberikan/diklaim, dan
   `block_reason` dari backend (belum lunas, belum check-in, bukan tanggal
   kunjungan, transaksi dibatalkan, fasilitas nonaktif, atau hak tidak ada).
   `lib/counter/facility.ts` hanya menentukan nada tampilan
   (`facilityTone()`) dan label tombol; keputusan tetap di backend.
4. **Klaim terpisah.** Tombol `Klaim <nama fasilitas>` hanya muncul bila
   `can_claim` dan memanggil `POST .../claim`. `422`/`409` ditampilkan apa
   adanya, lalu pratinjau diambil ulang agar tombol tidak tetap aktif untuk aksi
   yang mustahil (mis. sudah diklaim petugas lain). Klaim tidak membuat atau
   mengubah check-in, status transaksi, maupun barcode gerbang.
5. **Satu kali per tiket.** Setelah berhasil, status berubah menjadi
   `Sudah Diklaim` dan tombol klaim hilang. Membuka ulang tiket yang sama
   menampilkan riwayat klaim, bukan aksi baru.
6. "Tiket baru" mereset kolom dan mengembalikan fokus ke input.

Hak dibuat otomatis hanya setelah pembayaran benar-benar berhasil (booking
online maupun konfirmasi tunai loket). Katalog awal berasal dari
`php artisan db:seed --class=FacilitySeeder`; transaksi lunas lama dapat diisi
dengan `php artisan facilities:backfill` (manual, idempoten, mendukung
`--dry-run`).

Spesifikasi browser ada di `frontend/e2e/facilities.spec.ts` dan memerlukan
database QA yang sudah di-seed `FacilitySeeder`.

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

Pembatalan booking belum memiliki endpoint khusus; bila status transaksi diubah
menjadi `cancelled`, hak fasilitas yang belum diklaim otomatis dibatalkan dan
yang sudah diklaim dipertahankan. Pengelolaan pengguna dan ekspor berkas selain
CSV (PDF/Excel) tidak dibuat pada fase ini. Pembayaran memakai simulasi
akademik, bukan gateway sungguhan. Pemindai barcode memakai perangkat USB
keyboard-wedge standar; tidak ada dukungan kamera/QR khusus. Laporan identitas
hanya menyediakan NIK tersamarkan — tidak ada mekanisme membuka NIK penuh.
