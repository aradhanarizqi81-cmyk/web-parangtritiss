"use client";

import { buttonClasses } from "@/components/ui/button";

/**
 * Tombol pemicu dialog cetak browser. Pencatatan aksi cetak dilakukan backend
 * lewat endpoint /print; komponen ini tidak mengubah data apa pun.
 */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={buttonClasses({ size: "md" })}
    >
      Cetak sekarang
    </button>
  );
}
