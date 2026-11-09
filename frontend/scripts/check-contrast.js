#!/usr/bin/env node

/**
 * Skrip pengecekan rasio kontras WCAG 2.1
 * Menghitung rasio kontras antara teks dan latar menggunakan rumus:
 * (L1 + 0.05) / (L2 + 0.05) di mana L1 > L2
 * 
 * Persyaratan WCAG AA:
 * - Teks normal: minimal 4.5:1
 * - Teks besar (18pt/24px atau 14pt/18.66px bold): minimal 3:1
 */

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : null;
}

function linearize(color) {
  return color <= 0.03928 
    ? color / 12.92 
    : Math.pow((color + 0.055) / 1.055, 2.4);
}

function luminance(r, g, b) {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  
  if (!rgb1 || !rgb2) return null;
  
  const l1 = luminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = luminance(rgb2.r, rgb2.g, rgb2.b);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// Token warna dari globals.css
const tokens = {
  // Primitif: teal
  'teal-950': '#082932',
  'teal-900': '#0f3f4f',
  'teal-700': '#1b5e6f',
  
  // Netral
  'ink': '#17414f',         // heading
  'ink-muted': '#54636a',   // body di atas putih
  'sand-500': '#cfe9ec',    // teks pada warna gelap
  
  // Status
  'success': '#15803d',
  'warning': '#b45309',
  'danger': '#b91c1c',
  'info': '#0369a1',
  
  // Background
  'white': '#ffffff',
  'bg-app (mid)': '#d8eeea',
  'bg-auth (mid)': '#1b5e6f',
};

console.log('═'.repeat(70));
console.log('LAPORAN RASIO KONTRAS TOKEN TEKS/LATAR (WCAG 2.1)');
console.log('═'.repeat(70));
console.log('');
console.log('Persyaratan WCAG AA:');
console.log('  • Teks normal (< 18pt / < 14pt bold): minimal 4.5:1');
console.log('  • Teks besar (≥ 18pt / ≥ 14pt bold): minimal 3:1');
console.log('');
console.log('─'.repeat(70));
console.log('PASANGAN TEKS/LATAR YANG DIUJI:');
console.log('─'.repeat(70));
console.log('');

const checks = [
  // Teks normal di atas putih
  { teks: 'body (ink-muted)', latar: 'white', teks_hex: tokens['ink-muted'], latar_hex: tokens['white'], ukuran: 'normal' },
  { teks: 'heading (ink)', latar: 'white', teks_hex: tokens['ink'], latar_hex: tokens['white'], ukuran: 'besar' },
  
  // Teks di atas bg-app (gradient light)
  { teks: 'body di bg-app', latar: 'bg-app (mid)', teks_hex: tokens['ink-muted'], latar_hex: tokens['bg-app (mid)'], ukuran: 'normal' },
  { teks: 'heading di bg-app', latar: 'bg-app (mid)', teks_hex: tokens['ink'], latar_hex: tokens['bg-app (mid)'], ukuran: 'besar' },
  
  // Teks di atas permukaan gelap (surface-dark)
  { teks: 'heading di surface-dark', latar: 'teal-900', teks_hex: tokens['white'], latar_hex: tokens['teal-900'], ukuran: 'besar' },
  { teks: 'body di surface-dark', latar: 'teal-900', teks_hex: 'rgba(255,255,255,0.78)', latar_hex: tokens['teal-900'], ukuran: 'normal' },
  { teks: 'label di surface-dark', latar: 'teal-900', teks_hex: 'rgba(255,255,255,0.70)', latar_hex: tokens['teal-900'], ukuran: 'normal' },
  
  // Badge dan elemen kecil di atas gelap
  { teks: 'badge 04 di permukaan gelap', latar: 'rgba(255,255,255,0.12)', teks_hex: '#ffffff', latar_hex: 'rgba(255,255,255,0.12)', ukuran: 'normal' },
  
  // Teks putih di atas warna brand
  { teks: 'teks putih di teal-900', latar: 'teal-900', teks_hex: tokens['white'], latar_hex: tokens['teal-900'], ukuran: 'normal' },
  { teks: 'teks putih di teal-700', latar: 'teal-700', teks_hex: tokens['white'], latar_hex: tokens['teal-700'], ukuran: 'normal' },
  
  // Tombol dan aksi
  { teks: 'teks tombol (putih) di teal-900', latar: 'teal-900', teks_hex: tokens['white'], latar_hex: tokens['teal-900'], ukuran: 'besar' },
  
  // Placeholder
  { teks: 'placeholder (muted) di putih', latar: 'white', teks_hex: tokens['ink-muted'], latar_hex: tokens['white'], ukuran: 'normal' },
];

let passed = 0;
let failed = 0;

for (const check of checks) {
  // Konversi rgba ke nilai garis besar untuk perhitungan
  let bgRgb;
  if (check.latar_hex.startsWith('rgba')) {
    // Gunakan nilai threshold untuk komputasi aproksimasi
    const match = check.latar_hex.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    if (match) {
      const r = parseInt(match[1]) / 255;
      const g = parseInt(match[2]) / 255;
      const b = parseInt(match[3]) / 255;
      const a = parseFloat(match[4]);
      // Blend dengan hitam sebagai dasar
      bgRgb = {
        r: r * a,
        g: g * a,
        b: b * a
      };
      // Luminance aproksimasi
      const lum = 0.2126 * linearize(bgRgb.r) + 0.7152 * linearize(bgRgb.g) + 0.0722 * linearize(bgRgb.b);
      bgRgb._luminance = lum;
    } else {
      bgRgb = null;
    }
  } else {
    bgRgb = hexToRgb(check.latar_hex);
  }
  
  let textRgb;
  if (check.teks_hex.startsWith('rgba')) {
    const match = check.teks_hex.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    if (match) {
      const r = parseInt(match[1]) / 255;
      const g = parseInt(match[2]) / 255;
      const b = parseInt(match[3]) / 255;
      const a = parseFloat(match[4]);
      textRgb = {
        r: r * a + 1 * (1 - a),  // Blend dengan putih
        g: g * a + 1 * (1 - a),
        b: b * a + 1 * (1 - a)
      };
    } else {
      textRgb = null;
    }
  } else {
    textRgb = hexToRgb(check.teks_hex);
  }
  
  let ratio;
  if (textRgb && bgRgb) {
    const lText = luminance(textRgb.r, textRgb.g, textRgb.b);
    const lBg = bgRgb._luminance || luminance(bgRgb.r, bgRgb.g, bgRgb.b);
    const lighter = Math.max(lText, lBg);
    const darker = Math.min(lText + (lBg === lText ? 0.0001 : 0), lBg + (lText === lBg ? 0.0001 : 0));
    ratio = (lighter + 0.05) / (darker + 0.05);
  } else {
    ratio = null;
  }
  
  const threshold = check.ukuran === 'besar' ? 3.0 : 4.5;
  const status = ratio !== null && ratio >= threshold ? '✅ LULUS' : '❌ GAGAL';
  
  if (ratio !== null && ratio >= threshold) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`${status}  ${check.teks}`);
  console.log(`       Latar: ${check.latar}`);
  if (ratio !== null) {
    const thresholdStr = check.ukuran === 'besar' ? '3.0:1' : '4.5:1';
    console.log(`       Rasio: ${ratio.toFixed(2)}:1  (syarat: ${thresholdStr})`);
  } else {
    console.log(`       Rasio: tidak dapat dihitung`);
  }
  console.log('');
}

console.log('─'.repeat(70));
console.log('RINGKASAN:');
console.log('─'.repeat(70));
console.log(`  Total pemeriksaan: ${passed + failed}`);
console.log(`  ✅ Lulus: ${passed}`);
console.log(`  ❌ Gagal: ${failed}`);
console.log('');
if (failed === 0) {
  console.log('  🎉 SEMUA PASANGAN TEKS/LATAR MEMENUHI PERSYARATAN WCAG AA!');
} else {
  console.log('  ⚠️  Beberapa pasangan tidak memenuhi persyaratan. Periksa kembali.');
}
console.log('');
console.log('═'.repeat(70));
