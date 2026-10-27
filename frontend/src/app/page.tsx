
import Link from "next/link";

const photos = {
  hero: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=2200&q=85",
  coast: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?auto=format&fit=crop&w=1200&q=85",
  sunset: "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1200&q=85",
  beach: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85",
  waves: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=85",
};

const facilities = [
  {
    number: "01",
    title: "Akses informasi",
    description:
      "Kenali informasi kunjungan dan persiapkan perjalanan sebelum berangkat.",
    icon: "01",
  },
  {
    number: "02",
    title: "Pendaftaran online",
    description:
      "Masukkan tanggal kunjungan, data rombongan, dan kendaraan melalui satu alur.",
    icon: "02",
  },
  {
    number: "03",
    title: "Tiket digital",
    description:
      "Akses bukti transaksi dan barcode setelah pembayaran berhasil sesuai alur sistem.",
    icon: "03",
  },
];

const gallery = [
  {
    title: "Garis cakrawala",
    category: "Lanskap pesisir",
    image: photos.coast,
    className: "md:col-span-2 md:row-span-2 min-h-[320px] md:min-h-[540px]",
  },
  {
    title: "Warna senja",
    category: "Suasana pantai",
    image: photos.sunset,
    className: "min-h-[250px]",
  },
  {
    title: "Laut dan pasir",
    category: "Inspirasi perjalanan",
    image: photos.beach,
    className: "min-h-[250px]",
  },
];

const tariffs = [
  { name: "Tiket pengunjung", detail: "Per orang", price: "Rp15.000" },
  { name: "Sepeda motor", detail: "Per kendaraan", price: "Rp2.000" },
  { name: "Mobil", detail: "Per kendaraan", price: "Rp5.000" },
  { name: "Bus / truk", detail: "Per kendaraan", price: "Rp10.000" },
];

const visitNotes = [
  {
    number: "01",
    title: "Rencanakan tanggal",
    description:
      "Tentukan tanggal kunjungan dan pastikan informasi yang dimasukkan sesuai rencana perjalanan.",
  },
  {
    number: "02",
    title: "Siapkan data pengunjung",
    description:
      "Siapkan identitas setiap pengunjung serta informasi kendaraan sebelum mengisi pendaftaran.",
  },
  {
    number: "03",
    title: "Simpan bukti transaksi",
    description:
      "Setelah pembayaran berhasil, simpan bukti transaksi dan barcode untuk proses pemeriksaan tiket.",
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#78816d] sm:text-xs">
      {children}
    </p>
  );
}

export default function HomePage() {
  return (
    <main className="overflow-hidden bg-[#faf8f2] text-[#193d38]">
      {/* HERO */}
      <section className="relative isolate flex min-h-[650px] items-end bg-[#173c38] sm:min-h-[740px] lg:min-h-[790px]">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-cover bg-center"
          style={{ backgroundImage: `url("${photos.hero}")` }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-[#102d29]/90 via-[#102d29]/55 to-[#102d29]/10"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-[#102d29]/65 via-transparent to-[#102d29]/10"
        />

        <div className="mx-auto w-full max-w-[1440px] px-6 pb-16 pt-36 sm:px-10 sm:pb-20 lg:px-16 lg:pb-24">
          <div className="max-w-4xl">
            <div className="mb-7 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.24em] text-[#e9d8b8]">
              <span className="h-px w-10 bg-[#e9d8b8]" />
              Bantul · Yogyakarta · Indonesia
            </div>

            <h1 className="max-w-4xl text-5xl font-medium leading-[1.04] tracking-[-0.045em] text-white sm:text-7xl lg:text-[92px]">
              Keindahan pesisir,
              <br />
              <span className="font-serif italic font-normal text-[#e9d8b8]">
                ruang untuk menjelajah.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-sm leading-7 text-white/80 sm:text-base sm:leading-8">
              Kenali Pantai Parangtritis, temukan informasi kunjungan, dan
              persiapkan perjalananmu ke pesisir selatan Yogyakarta.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/booking"
                className="inline-flex min-h-12 items-center justify-center gap-5 rounded-full bg-[#e9d8b8] px-6 py-3 text-sm font-semibold text-[#193d38] transition hover:bg-white"
              >
                Daftar kunjungan <span aria-hidden="true">↗</span>
              </Link>
              <Link
                href="#gallery"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/45 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Jelajahi galeri
              </Link>
            </div>
          </div>

          <div className="mt-16 flex flex-col gap-4 border-t border-white/25 pt-5 text-xs text-white/70 sm:flex-row sm:items-center sm:justify-between">
            <p>DESTINASI PESISIR SELATAN</p>
            <a href="#about" className="w-fit hover:text-white">
              Gulir untuk menjelajahi ↓
            </a>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section
        id="about"
        className="scroll-mt-24 px-6 py-20 sm:px-10 sm:py-28 lg:px-16 lg:py-32"
      >
        <div className="mx-auto grid max-w-[1280px] gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div>
            <Eyebrow>Tentang destinasi</Eyebrow>
            <h2 className="mt-6 text-4xl font-medium leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">
              Bertemu laut di selatan Yogyakarta.
            </h2>
          </div>

          <div className="lg:pt-9">
            <p className="text-base leading-8 text-[#5b6b62] sm:text-lg sm:leading-9">
              Pantai Parangtritis menghadirkan bentang pesisir yang menjadi
              bagian dari daya tarik wisata Kabupaten Bantul. Lanskap laut,
              garis pantai, dan suasana terbuka menjadikannya destinasi untuk
              menikmati perjalanan dengan cara yang berbeda.
            </p>
            <p className="mt-5 text-sm leading-7 text-[#78816d]">
              Mulai dari mengenali informasi destinasi hingga mempersiapkan
              pendaftaran, semua dirancang agar rencana kunjungan terasa lebih
              praktis.
            </p>
            <Link
              href="/booking"
              className="mt-8 inline-flex items-center gap-4 border-b border-[#193d38]/40 pb-2 text-sm font-semibold transition hover:border-[#193d38]"
            >
              Persiapkan kunjungan <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-16 max-w-[1280px] sm:mt-20">
          <div
            role="img"
            aria-label="Pemandangan laut dan ombak sebagai ilustrasi destinasi pesisir"
            className="min-h-[280px] bg-cover bg-center sm:min-h-[440px] lg:min-h-[560px]"
            style={{ backgroundImage: `url("${photos.waves}")` }}
          />
          <div className="mt-4 flex flex-col gap-2 text-xs text-[#78816d] sm:flex-row sm:items-center sm:justify-between">
            <span>MENIKMATI LANSKAP PESISIR</span>
            <span>Foto ilustrasi · Bukan dokumentasi resmi destinasi</span>
          </div>
        </div>
      </section>

      {/* VISITOR EXPERIENCE */}
      <section
        id="services"
        className="scroll-mt-24 bg-[#f0ece2] px-6 py-20 sm:px-10 sm:py-28 lg:px-16"
      >
        <div className="mx-auto max-w-[1280px]">
          <Eyebrow>Panduan pengunjung</Eyebrow>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.65fr] lg:items-end">
            <h2 className="max-w-3xl text-4xl font-medium leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Perjalanan yang baik dimulai dari persiapan.
            </h2>
            <p className="max-w-lg text-sm leading-7 text-[#5b6b62] sm:text-base">
              Temukan informasi penting dan pahami langkah pendaftaran
              sebelum berangkat menuju destinasi.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {facilities.map((item) => (
              <article
                key={item.number}
                className="flex min-h-[250px] flex-col border-t border-[#c8c5b8] py-7 sm:min-h-[280px]"
              >
                <span className="text-xs tracking-[0.2em] text-[#8a8b78]">
                  {item.number}
                </span>
                <h3 className="mt-10 text-2xl font-medium tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-4 max-w-sm text-sm leading-7 text-[#657168]">
                  {item.description}
                </p>
                <div className="mt-auto pt-7 text-lg text-[#78816d]">
                  ↗
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section
        id="gallery"
        className="scroll-mt-24 px-6 py-20 sm:px-10 sm:py-28 lg:px-16"
      >
        <div className="mx-auto max-w-[1280px]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow>Galeri visual</Eyebrow>
              <h2 className="mt-5 text-4xl font-medium tracking-tight sm:text-5xl lg:text-6xl">
                Cerita dari pesisir.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-[#657168]">
              Sepotong inspirasi visual untuk membayangkan suasana perjalanan
              ke tepi laut.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {gallery.map((item) => (
              <article
                key={item.title}
                className={`group relative isolate overflow-hidden bg-[#d8d5c8] ${item.className}`}
              >
                <div
                  aria-hidden="true"
                  className="absolute inset-0 -z-20 bg-cover bg-center transition duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url("${item.image}")` }}
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-gradient-to-t from-[#102d29]/80 via-transparent to-transparent"
                />
                <div className="flex h-full flex-col justify-end p-6 text-white sm:p-7">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#e9d8b8]">
                    {item.category}
                  </p>
                  <h3 className="mt-3 text-2xl font-medium sm:text-3xl">
                    {item.title}
                  </h3>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-4 text-xs leading-6 text-[#78816d]">
            Catatan: foto merupakan ilustrasi pesisir dari Unsplash dan belum
            diverifikasi sebagai foto Pantai Parangtritis. Galeri dokumentasi
            resmi dapat menggantikan foto ini setelah aset tersedia.
          </p>
        </div>
      </section>

      {/* VISITOR INFORMATION */}
      <section
        id="news"
        className="scroll-mt-24 bg-[#193d38] px-6 py-20 text-white sm:px-10 sm:py-28 lg:px-16"
      >
        <div className="mx-auto max-w-[1280px]">
          <Eyebrow>Informasi kunjungan</Eyebrow>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.7fr] lg:items-end">
            <h2 className="max-w-3xl text-4xl font-medium leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Hal-hal kecil yang membuat perjalanan lebih siap.
            </h2>
            <p className="text-sm leading-7 text-white/70 sm:text-base">
              Ikuti langkah persiapan berikut sebelum menyelesaikan
              pendaftaran kunjungan.
            </p>
          </div>

          <div className="mt-12 divide-y divide-white/20 border-y border-white/20">
            {visitNotes.map((item) => (
              <article
                key={item.number}
                className="grid gap-4 py-7 sm:grid-cols-[70px_0.8fr_1.2fr] sm:items-start sm:gap-8 sm:py-9"
              >
                <span className="text-xs tracking-[0.2em] text-[#e9d8b8]">
                  {item.number}
                </span>
                <h3 className="text-xl font-medium">{item.title}</h3>
                <p className="max-w-xl text-sm leading-7 text-white/70">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TARIFF */}
      <section
        id="pricelist"
        className="scroll-mt-24 px-6 py-20 sm:px-10 sm:py-28 lg:px-16"
      >
        <div className="mx-auto max-w-[1280px]">
          <Eyebrow>Informasi tarif</Eyebrow>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.7fr] lg:items-end">
            <h2 className="max-w-3xl text-4xl font-medium leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Persiapkan anggaran perjalanan.
            </h2>
            <p className="text-sm leading-7 text-[#657168] sm:text-base">
              Berikut tarif referensi yang digunakan pada prototype. Nilai
              ini belum diverifikasi sebagai tarif resmi dan perlu dicocokkan
              dengan konfigurasi tarif aktif sebelum digunakan untuk transaksi.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tariffs.map((item, index) => (
              <article
                key={item.name}
                className={`flex min-h-[190px] flex-col border p-5 sm:p-6 ${
                  index === 0
                    ? "border-[#193d38] bg-[#193d38] text-white"
                    : "border-[#dedbd0] bg-white/40 text-[#193d38]"
                }`}
              >
                <span
                  className={`text-[10px] uppercase tracking-[0.2em] ${
                    index === 0 ? "text-[#e9d8b8]" : "text-[#78816d]"
                  }`}
                >
                  {item.detail}
                </span>
                <h3 className="mt-5 text-lg font-medium">{item.name}</h3>
                <p className="mt-auto pt-7 text-2xl font-semibold tracking-tight sm:text-3xl">
                  {item.price}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-4 border-t border-[#dedbd0] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-xs leading-6 text-[#78816d]">
              Harga di atas adalah referensi prototype, bukan penetapan tarif
              resmi. Periksa kembali ringkasan biaya saat pendaftaran.
            </p>
            <Link
              href="/booking"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-4 rounded-full bg-[#193d38] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#28564d]"
            >
              Lanjut ke pendaftaran <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section
        id="contact"
        className="relative isolate overflow-hidden bg-[#e9d8b8] px-6 py-20 sm:px-10 sm:py-24 lg:px-16"
      >
        <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <Eyebrow>Saatnya merencanakan</Eyebrow>
            <h2 className="mt-5 max-w-3xl text-4xl font-medium leading-tight tracking-tight sm:text-5xl lg:text-7xl">
              Temukan perjalananmu di pesisir selatan.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#53645d] sm:text-base">
              Siapkan informasi pengunjung dan kendaraan, lalu lanjutkan
              pendaftaran melalui sistem kunjungan.
            </p>
          </div>
          <Link
            href="/booking"
            className="inline-flex min-h-12 w-fit items-center justify-center gap-5 rounded-full bg-[#193d38] px-7 py-4 text-sm font-semibold text-white transition hover:bg-[#28564d]"
          >
            Daftar kunjungan <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
