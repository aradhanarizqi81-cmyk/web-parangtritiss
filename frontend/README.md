# Frontend — Pantai Parangtritis

Aplikasi Next.js untuk Sistem Tiket & Kunjungan Pantai Parangtritis. Fase ini
mencakup integrasi autentikasi: registrasi, login, profil, dan logout.

## Menjalankan

Backend Laravel harus berjalan di `http://127.0.0.1:8000`.

```bash
npm install
copy .env.example .env.local     # Linux/macOS: cp .env.example .env.local
npm run dev                      # http://localhost:3000
```

## Skrip

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm run start` | Build dan jalankan produksi |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest (unit) |

## Arsitektur singkat

Browser tidak pernah memegang token Sanctum. Route handler `src/app/api/auth/*`
bertindak sebagai BFF: browser memanggilnya (same-origin), lalu sisi server
memanggil Laravel dengan Bearer token dan menyimpannya pada cookie HttpOnly.
Detail lengkap, termasuk keputusan keamanan token, ada di
[`../docs/FRONTEND.md`](../docs/FRONTEND.md).
