"use client";

import RouteError from "@/components/route-error";

export default function Error({ retry }: { retry: () => void }) {
  return (
    <RouteError
      retry={retry}
      title="Halaman gerbang bermasalah"
      description="Data check-in gagal dimuat. Coba muat ulang."
      homeHref="/gate"
      homeLabel="Ke gerbang"
    />
  );
}
