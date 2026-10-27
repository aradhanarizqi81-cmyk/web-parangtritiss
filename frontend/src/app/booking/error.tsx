"use client";

import RouteError from "@/components/route-error";

export default function Error({ retry }: { retry: () => void }) {
  return (
    <RouteError
      retry={retry}
      title="Halaman booking bermasalah"
      description="Data booking gagal dimuat. Coba muat ulang."
      homeHref="/booking"
      homeLabel="Ke booking"
    />
  );
}
