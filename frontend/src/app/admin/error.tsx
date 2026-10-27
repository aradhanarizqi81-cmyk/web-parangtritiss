"use client";

import RouteError from "@/components/route-error";

export default function Error({ retry }: { retry: () => void }) {
  return (
    <RouteError
      retry={retry}
      title="Dasbor admin bermasalah"
      description="Halaman admin gagal dimuat. Coba muat ulang, atau kembali ke dasbor."
      homeHref="/admin"
      homeLabel="Ke dasbor"
    />
  );
}
