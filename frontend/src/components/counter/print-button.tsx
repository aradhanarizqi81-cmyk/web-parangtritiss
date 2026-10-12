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
      className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800"
    >
      Cetak sekarang
    </button>
  );
}
