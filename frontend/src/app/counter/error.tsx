"use client";

import RouteError from "@/components/route-error";

export default function Error({ retry }: { retry: () => void }) {
  return (
    <RouteError
      retry={retry}
      title="Halaman loket bermasalah"
      description="Data transaksi loket gagal dimuat. Coba muat ulang."
      homeHref="/counter"
      homeLabel="Ke loket"
    />
  );
}
