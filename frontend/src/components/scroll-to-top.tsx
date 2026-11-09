"use client";

/**
 * Tombol kembali ke atas. Dibuat kecil dan kotak sesuai referensi, dan
 * ditempatkan di sisi kanan supaya tidak menutupi isi tengah halaman.
 */
export default function ScrollToTop() {
  return (
    <button
      type="button"
      aria-label="Kembali ke atas"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-4 z-40 inline-flex size-10 items-center justify-center rounded-none bg-teal-900 text-white transition-colors hover:bg-teal-700 sm:right-6"
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
