import Link from "next/link";
import { buttonClasses } from "./button";
import PageHeader from "./page-header";

/*
 * Gerbang UI untuk peran yang tidak berhak. Sebelumnya blok yang sama ditulis
 * ulang di dua belas halaman dengan ukuran judul dan jarak yang berbeda-beda,
 * dan sebagian halaman menjadi jalan buntu tanpa tautan keluar. Satu komponen
 * menjaga pesan, hierarki, dan langkah berikutnya tetap sama.
 */
export default function AccessDenied({
  description,
  backHref = "/profile",
  backLabel = "Kembali ke profil",
}: {
  description: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <section className="mx-auto max-w-2xl px-4 py-12">
      <PageHeader
        eyebrow="Akses terbatas"
        title="Akses ditolak"
        description={description}
      />
      <Link
        href={backHref}
        className={buttonClasses({
          variant: "secondary",
          size: "md",
          className: "mt-6",
        })}
      >
        {backLabel}
      </Link>
    </section>
  );
}
