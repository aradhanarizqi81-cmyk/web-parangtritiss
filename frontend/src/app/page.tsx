import Image from "next/image";
import Link from "next/link";
import { PlacesCoverflow, type Place } from "@/components/places-coverflow";
import ScrollToTop from "@/components/scroll-to-top";

/*
 * Foto dari Unsplash, domain sudah diizinkan di next.config.ts. Semua gambar
 * adalah ilustrasi suasana pesisir, bukan dokumentasi resmi Parangtritis.
 */
const photos = {
  hero: "https://images.unsplash.com/photo-1505228395891-9a51e7e86bf6?auto=format&fit=crop&w=2400&q=85",
  aboutOcean:
    "https://i.pinimg.com/736x/06/92/24/06922415448d885017e8a8b429ac274f.jpg",
  aboutCove:
    "https://i.pinimg.com/1200x/d9/f8/c6/d9f8c63419a5c563d451bb4782c3b4c1.jpg",
  parangtritis:
    "https://i.pinimg.com/736x/06/92/24/06922415448d885017e8a8b429ac274f.jpg",
  gumukPasir:
    "https://i.pinimg.com/1200x/97/46/4d/97464d6cc8d43e1a6876c8f76e429dab.jpg",
  parangkusumo:
    "https://i.pinimg.com/1200x/14/71/39/147139ae7106b2894206f977017d80f8.jpg",
  experience:
    "https://i.pinimg.com/736x/7d/a5/ac/7da5ac079b677038af8d36e83ba01da8.jpg",
  experienceSmall:
    "https://i.pinimg.com/736x/8e/fb/eb/8efbebd83d1edf154e219443b1560ca4.jpg",
};

/*
 * Video hero looping (file lokal di public/videos).
 * Letakkan file video asli di public/videos/pesisir.mp4.
 * TODO: ganti dengan file video asli pesisir Parangtritis.
 */
const videoHero = "/videos/From Klickpin.com- 12 Classy.mp4";

/*
 * Foto 3:4 di public/places masih ilustrasi Unsplash.
 * TODO: ganti foto asli tiap destinasi di public/places/<slug>.jpg.
 */
const places: Place[] = [
  {
    slug: "kukup",
    name: "Kukup",
    subtitle: "Lihat detail",
    image: "https://i.pinimg.com/736x/ea/ca/e1/eacae144affa3e89cfeace66ce05d357.jpg",
    alt: "Ilustrasi suasana Pantai Kukup",
  },
  {
    slug: "baron",
    name: "Baron",
    subtitle: "Lihat detail",
    image: "https://i.pinimg.com/1200x/72/f5/5b/72f55b95dd0a71a7f85c7d91fba57712.jpg",
    alt: "Ilustrasi suasana Pantai Baron",
  },
  {
    slug: "Glagah",
    name: "Glagah",
    subtitle: "Lihat detail",
    image: "https://i.pinimg.com/736x/f1/1a/22/f11a229e735562dc59c10b36c958176b.jpg",
    alt: "Ilustrasi suasana Pantai Glagah",
  },
  {
    slug: "parangtritis",
    name: "Parangtritis",
    subtitle: "Lihat detail",
    image: "https://i.pinimg.com/736x/06/92/24/06922415448d885017e8a8b429ac274f.jpg",
    alt: "Ilustrasi suasana Pantai Parangtritis",
  },
  {
    slug: "indrayanti",
    name: "Indrayanti",
    subtitle: "Lihat detail",
    image: "https://i.pinimg.com/736x/72/44/8d/72448d37cd9dc4d95c0abeef22480231.jpg",
    alt: "Ilustrasi suasana Pantai Indrayanti",
  },
  {
    slug: "gumuk-pasir-parangkusumo",
    name: "Gumuk Pasir Parangkusumo",
    subtitle: "Lihat detail",
    image: "/places/gumuk-pasir-parangkusumo.jpg",
    alt: "Ilustrasi gumuk pasir di Parangkusumo",
  },
  {
    slug: "parangkusumo",
    name: "Parangkusumo",
    subtitle: "Lihat detail",
    image: "/places/parangkusumo.jpg",
    alt: "Ilustrasi suasana Pantai Parangkusumo",
  },
];

/*
 * Angka statistik memakai data yang memang ada di sistem: tiga destinasi yang
 * ditampilkan, rentang pemesanan 30 hari, dan empat jenis tarif aktif.
 */
const stats = [
  { value: "3", label: "Destinasi utama" },
  { value: "30", label: "Hari rentang pemesanan" },
  { value: "4", label: "Jenis tarif" },
];

const socials = [
  {
    label: "Facebook",
    path: "M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v7h3v-7h3l1-3h-4v-2c0-.6.4-1 1-1z",
  },
  {
    label: "Instagram",
    path: "M7.6 4h8.8A3.6 3.6 0 0 1 20 7.6v8.8a3.6 3.6 0 0 1-3.6 3.6H7.6A3.6 3.6 0 0 1 4 16.4V7.6A3.6 3.6 0 0 1 7.6 4zm0 1.7c-1 0-1.9.8-1.9 1.9v8.8c0 1 .8 1.9 1.9 1.9h8.8c1 0 1.9-.8 1.9-1.9V7.6c0-1-.8-1.9-1.9-1.9H7.6zM12 8.4a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2zm0 1.7a1.9 1.9 0 1 0 0 3.8 1.9 1.9 0 0 0 0-3.8zm4.5-2.6a.95.95 0 1 1 0 1.9.95.95 0 0 1 0-1.9z",
  },
  {
    label: "Twitter",
    path: "M20 6.6c-.6.3-1.3.5-2 .6.7-.4 1.3-1.1 1.5-1.9-.7.4-1.4.7-2.2.9a3.4 3.4 0 0 0-5.8 3.1A9.6 9.6 0 0 1 4 5.6a3.4 3.4 0 0 0 1 4.5c-.5 0-1-.1-1.5-.4 0 1.6 1.1 3 2.7 3.3-.5.1-1 .2-1.5.1a3.4 3.4 0 0 0 3.2 2.4A6.8 6.8 0 0 1 3 17a9.5 9.5 0 0 0 14.7-8c.7-.5 1.3-1.1 1.8-1.9z",
  },
];

export default function HomePage() {
  return (
    <div className="bg-white text-foreground">
      {/* HERO: foto aerial penuh dengan overlay gradien untuk readability navbar */}
      <section
        id="home"
        className="relative isolate flex min-h-[580px] flex-col justify-between overflow-hidden bg-teal-900 px-5 pb-10 pt-32 sm:min-h-[90vh] sm:px-8 sm:pb-14 sm:pt-36 lg:px-16"
      >

        {/* Overlay gradien agar teks navbar terbaca di atas pasir dan buih */}
        <div
          className="absolute inset-0 bottom-0 left-0 right-0 h-24"
          style={{background: "linear-gradient(to bottom, rgba(8,32,41,0.45) 0%, rgba(8,32,41,0) 38%)"}}
        />

        {/* Video background hero, loop otomatis. Ganti src dengan video asli. */}
        <video
          className="absolute inset-0 -z-20 h-full w-full object-cover"
          src={videoHero}
          poster={photos.hero}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-teal-950/45"
        />

        <div className="mx-auto w-full max-w-[1280px]">
          <p className="text-[13px] font-normal tracking-[0.04em] text-white/85">
            Temukan tempatmu
          </p>

          <h1 className="mt-4 max-w-[620px] text-[36px] font-light leading-[1.15] text-white sm:text-[46px] lg:text-[56px]">
            Jelajahi
            <br />
            Pantai <span className="font-bold">Terindah</span>
            <br />
            di Parangtritis
          </h1>

          <Link
            href="#discover"
            className="mt-8 inline-flex items-center justify-center rounded-none bg-teal-900 px-[22px] py-[10px] text-[13px] font-medium text-white transition-colors hover:bg-teal-700"
          >
            Jelajahi
          </Link>
        </div>

        <div className="mx-auto mt-14 flex w-full max-w-[1280px] items-end justify-between gap-6">
          <ul className="flex items-center gap-4">
            {socials.map((social) => (
              <li key={social.label}>
                <a
                  href="#"
                  aria-label={social.label}
                  className="inline-flex size-9 items-center justify-center border border-white/35 text-white transition-colors hover:border-white hover:bg-white/10"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d={social.path} />
                  </svg>
                </a>
              </li>
            ))}
          </ul>

          <Link
            href="#discover"
            className="flex min-h-[110px] w-[230px] max-w-[62%] shrink-0 items-center gap-3 bg-teal-900/85 p-3 transition-colors hover:bg-teal-900"
          >
            <span className="relative block size-14 shrink-0 overflow-hidden">
              <Image
                src={photos.gumukPasir}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
              />
            </span>
            <span className="min-w-0 text-white">
              <span className="block text-[13px] font-medium leading-snug">
                3 tempat terbaik untuk dikunjungi
              </span>
              <span className="mt-1 block text-[11px] text-white/80">
                Selengkapnya +
              </span>
            </span>
          </Link>
        </div>
      </section>

      {/* SECTION 2: informasi destinasi dan dua foto bertingkat. */}
      <section
        id="about"
        className="scroll-mt-24 bg-white px-5 py-20 sm:px-8 lg:px-16 lg:py-28"
      >
        <div className="mx-auto grid max-w-[1280px] items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <h2 className="max-w-[15ch] text-[26px] font-medium leading-[1.3] text-teal-900 sm:text-[28px]">
              Informasi Lebih Lanjut Tentang Pantai Terbaik
            </h2>
            <p className="mt-5 max-w-[46ch] text-[15px] leading-[1.9] text-muted">
              Pantai Parangtritis menghadirkan bentang pesisir di Kabupaten
              Bantul yang menjadi bagian dari daya tarik wisata Yogyakarta.
              Lanskap laut, garis pantai, dan suasana terbuka menjadikannya
              destinasi untuk menikmati perjalanan dengan cara yang berbeda.
            </p>
            <p className="mt-4 max-w-[46ch] text-[15px] leading-[1.9] text-muted">
              Kenali informasi kunjungan, tarif, dan alur pendaftaran sebelum
              berangkat agar rencana perjalanan lebih siap.
            </p>
            <Link
              href="/booking"
              className="mt-8 inline-flex items-center justify-center rounded-none bg-teal-900 px-[22px] py-[10px] text-[13px] font-medium text-white transition-colors hover:bg-teal-700"
            >
              Reservasi kunjungan
            </Link>
          </div>

          <div className="grid grid-cols-[0.88fr_1.12fr] items-start gap-4 sm:gap-6">
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-soft">
              <Image
                src={photos.aboutOcean}
                alt="Ilustrasi ombak laut dari permukaan"
                fill
                sizes="(min-width: 1024px) 240px, 42vw"
                className="object-cover"
              />
            </div>
            <div className="relative mt-10 aspect-[3/4] w-full overflow-hidden bg-surface-soft lg:mt-[40px]">
              <Image
                src={photos.aboutCove}
                alt="Ilustrasi teluk berair toska"
                fill
                sizes="(min-width: 1024px) 300px, 52vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: carousel coverflow 3D destinasi pesisir. */}
      <section id="discover" className="cf-section scroll-mt-24 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-16">
          <h2 className="mx-auto max-w-[26ch] text-center text-[26px] font-medium leading-[1.35] text-[#17414f] sm:text-[32px]">
            Jelajahi Tempat Paling Menarik di Pesisir Selatan
          </h2>

          <div className="mt-12">
            <PlacesCoverflow places={places} />
          </div>

          <p className="mt-5 text-center text-[11px] leading-6 text-muted">
            Foto merupakan ilustrasi pesisir dari Unsplash, bukan dokumentasi
            resmi destinasi.
          </p>
        </div>
      </section>

      {/* SECTION 4: statistik sejajar dan dua foto yang saling menimpa. */}
      <section
        id="places"
        className="scroll-mt-24 bg-white px-5 pb-24 pt-6 sm:px-8 lg:px-16 lg:pb-32"
      >
        <div className="mx-auto max-w-[1280px]">
          <h2 className="mx-auto max-w-[24ch] text-center text-[26px] font-medium leading-[1.35] text-teal-900 sm:text-[32px]">
            Dengan Pengalaman Kami, Kami Siap Melayani Anda
          </h2>

          <dl className="mx-auto mt-10 flex max-w-[760px] flex-col items-center justify-center gap-8 text-center sm:flex-row sm:gap-16 lg:gap-24">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dd className="text-[22px] font-bold leading-none text-teal-900">
                  {stat.value}
                </dd>
                <dt className="mt-2 text-[12px] text-muted">{stat.label}</dt>
              </div>
            ))}
          </dl>

          <div className="relative mx-auto mt-14 max-w-[1080px]">
            <div className="relative aspect-[16/9] w-[82%] overflow-hidden bg-surface-soft">
              <Image
                src={photos.experience}
                alt="Ilustrasi laut saat matahari terbenam"
                fill
                sizes="(min-width: 1024px) 900px, 82vw"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-8 right-0 aspect-[4/3] w-[42%] overflow-hidden border-4 border-white bg-surface-soft sm:-bottom-10">
              <Image
                src={photos.experienceSmall}
                alt="Ilustrasi peselancar di ombak"
                fill
                sizes="(min-width: 1024px) 440px, 42vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <ScrollToTop />
    </div>
  );
}
