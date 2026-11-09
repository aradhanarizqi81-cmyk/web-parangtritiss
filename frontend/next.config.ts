import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Foto landing memakai Unsplash dan Pinterest. next/image butuh pola host
  // eksplisit; tanpa ini gambar gagal dioptimalkan dan halaman menampilkan
  // galat "Invalid src prop". Semua host di bawah memakai HTTPS.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.pinimg.com",
        pathname: "/**",
      },
    ],
  },
  // Akses dev dari perangkat lain di LAN. Wildcard karena IP DHCP sering
  // berubah; tanpa ini Next memblokir aset dev dan halaman tidak ter-hidrasi.
  allowedDevOrigins: ["192.168.1.*"],
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
