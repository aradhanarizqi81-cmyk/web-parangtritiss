# Frontend (Next.js)

Frontend berada di `frontend/` dan berkomunikasi dengan REST API Laravel
(`/api/v1`). Pada fase ini ruang lingkupnya **hanya integrasi autentikasi**:
registrasi, login, profil, dan logout.

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
      api/auth/{register,login,logout,me}/route.ts   # BFF route handler
      login/page.tsx                                 # form login (client)
      register/page.tsx                              # form registrasi (client)
      profile/page.tsx                               # profil (server, perlu sesi)
      layout.tsx page.tsx globals.css
    components/       site-header.tsx, logout-button.tsx, field.tsx
    lib/
      api/            config.ts, types.ts, errors.ts, server.ts, client.ts, origin.ts
      auth/           session.ts, guard.ts, roles.ts
    proxy.ts          # optimistic auth gate (Next 16 Proxy / middleware)
  .env.example
```

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

Peran hanya memengaruhi tampilan (label peran, catatan menu operasional).
**Seluruh otorisasi tetap ditegakkan di backend**; menyembunyikan elemen UI
bukan kontrol keamanan.

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

Booking, pembayaran, tiket, check-in, dashboard bisnis, dan pengelolaan
pengguna tidak dibuat pada fase ini.
