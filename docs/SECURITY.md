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

## Kontrol akses (diterapkan pada fase autentikasi)

- Otorisasi ditegakkan di backend; menyembunyikan tombol di frontend tidak dianggap cukup.
- Wisatawan tidak dapat membaca atau mengubah transaksi milik pengguna lain.
- Fungsi `cashier`, `gate_staff`, dan `admin` dibatasi sesuai tanggung jawabnya.
