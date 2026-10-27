"use client";

/**
 * Tombol pemicu dialog cetak browser. Pencatatan aksi cetak dilakukan backend
 * lewat endpoint /print; komponen ini tidak mengubah data apa pun.
 */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center justify-center rounded-full bg-ocean px-5 py-2 font-semibold text-ivory transition-colors hover:bg-ocean-dark"
    >
      Cetak sekarang
    </button>
  );
}
