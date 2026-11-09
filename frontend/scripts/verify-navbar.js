const { chromium } = require('playwright');

async function verifyNavbar() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  console.log('═'.repeat(70));
  console.log('VERIFIKASI NAVBAR (Playwright Measurements)');
  console.log('═'.repeat(70));
  console.log('');

  // Test 1: Desktop viewport (1280x800) - Halaman Beranda "/"
  console.log('─'.repeat(70));
  console.log('TEST 1: Desktop viewport (1280x800) - Halaman Beranda "/"');
  console.log('─'.repeat(70));

  const page1 = await context.newPage();
  await page1.setViewportSize({ width: 1280, height: 800 });
  await page1.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

  // Tunggu navbar dimuat
  await page1.waitForSelector('.site-nav-wrap', { timeout: 5000 }).catch(() => {});
  await page1.waitForTimeout(500);

  const desktopResults = await measureNavbar(page1);
  console.log('');
  printMeasurements('Desktop', desktopResults);

  // Scroll ke bawah 300px
  await page1.evaluate(() => window.scrollTo(0, 300));
  await page1.waitForTimeout(300);

  const desktopScrolledResults = await measureNavbar(page1);
  console.log('');
  console.log('─'.repeat(70));
  console.log('SETELAH SCROLL 300px KEBAWASAN:');
  console.log('─'.repeat(70));
  printMeasurements('Desktop (scrolled)', desktopScrolledResults);

  console.log('');

  // Test 2: Mobile viewport (375x800) - Halaman Beranda "/"
  console.log('─'.repeat(70));
  console.log('TEST 2: Mobile viewport (375x800) - Halaman Beranda "/"');
  console.log('─'.repeat(70));

  const page2 = await context.newPage();
  await page2.setViewportSize({ width: 375, height: 800 });
  await page2.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

  await page2.waitForSelector('.site-nav-wrap', { timeout: 5000 }).catch(() => {});
  await page2.waitForTimeout(500);

  const mobileResults = await measureNavbar(page2);
  console.log('');
  printMeasurements('Mobile', mobileResults);

  await browser.close();

  console.log('');
  console.log('═'.repeat(70));
  console.log('RINGKASAN VERIFIKASI');
  console.log('═'.repeat(70));
  console.log('');
  console.log('HASIL YANG DIHARAPKAN:');
  console.log('  • wrap position: fixed ✓');
  console.log('  • nav height: 64px (56px mobile) ✓');
  console.log('  • nav width: ≤ 1200px ✓');
  console.log('  • backdrop-filter: blur(...) ✓');
  console.log('  • hero top: 0 ✓');
  console.log('  • warna teks: putih (transparent) / teal-900 (solid) ✓');
  console.log('');
}

async function measureNavbar(page) {
  const wrap = await page.$('.site-nav-wrap');
  const nav = await page.$('.site-nav');
  const logo = await page.$('.site-nav-logo');
  const hero = await page.$('#home'); // Hero section

  const wrapBounds = wrap ? await wrap.boundingBox() : null;
  const navBounds = nav ? await nav.boundingBox() : null;
  const logoBounds = logo ? await logo.boundingBox() : null;
  const heroBounds = hero ? await hero.boundingBox() : null;

  // Computed styles - FULL
  const wrapStyles = wrap ? await wrap.evaluate(el => {
    const cs = getComputedStyle(el);
    return {
      position: cs.position,
      top: cs.top,
      left: cs.left,
      right: cs.right,
      zIndex: cs.zIndex,
      paddingInline: cs.paddingInline,
    };
  }) : null;

  const navStyles = nav ? await nav.evaluate(el => {
    const cs = getComputedStyle(el);
    return {
      position: cs.position,
      display: cs.display,
      flexDirection: cs.flexDirection,
      flexWrap: cs.flexWrap,
      alignItems: cs.alignItems,
      justifyContent: cs.justifyContent,
      gap: cs.gap,
      height: cs.height,
      width: cs.width,
      minHeight: cs.minHeight,
      maxHeight: cs.maxHeight,
      paddingTop: cs.paddingTop,
      paddingRight: cs.paddingRight,
      paddingBottom: cs.paddingBottom,
      paddingLeft: cs.paddingLeft,
      paddingInline: cs.paddingInline,
      marginTop: cs.marginTop,
      marginRight: cs.marginRight,
      marginBottom: cs.marginBottom,
      marginLeft: cs.marginLeft,
      marginInline: cs.marginInline,
      borderRadius: cs.borderRadius,
      border: cs.border,
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      backdropFilter: cs.backdropFilter,
      webkitBackdropFilter: cs.webkitBackdropFilter || cs.backdropFilter,
      boxShadow: cs.boxShadow,
      overflow: cs.overflow,
      pointerEvents: cs.pointerEvents,
      boxSizing: cs.boxSizing,
    };
  }) : null;

  const logoStyles = logo ? await logo.evaluate(el => {
    const cs = getComputedStyle(el);
    return {
      color: cs.color,
      fontSize: cs.fontSize,
    };
  }) : null;

  // Get data-variant and data-scrolled attributes
  const navAttrs = nav ? await nav.evaluate(el => {
    return {
      variant: el.getAttribute('data-variant') || 'none',
      scrolled: el.getAttribute('data-scrolled') || 'false',
    };
  }) : null;

  return {
    wrap: wrapBounds ? {
      x: wrapBounds.x,
      y: wrapBounds.y,
      width: wrapBounds.width,
      height: wrapBounds.height,
      styles: wrapStyles,
    } : null,
    nav: navBounds ? {
      x: navBounds.x,
      y: navBounds.y,
      width: navBounds.width,
      height: navBounds.height,
      styles: navStyles,
      attrs: navAttrs,
    } : null,
    logo: logoBounds ? {
      x: logoBounds.x,
      y: logoBounds.y,
      width: logoBounds.width,
      height: logoBounds.height,
      styles: logoStyles,
    } : null,
    hero: heroBounds ? {
      x: heroBounds.x,
      y: heroBounds.y,
      width: heroBounds.width,
      height: heroBounds.height,
    } : null,
  };
}

function printMeasurements(label, results) {
  console.log('');
  console.log(`[${label}]`);
  console.log('─'.repeat(40));

  if (results.wrap) {
    console.log(`site-nav-wrap:`);
    console.log(`  Position: ${results.wrap.styles.position}`);
    console.log(`  Top: ${results.wrap.styles.top}`);
    console.log(`  Left: ${results.wrap.styles.left}`);
    console.log(`  Right: ${results.wrap.styles.right}`);
    console.log(`  Z-Index: ${results.wrap.styles.zIndex}`);
    console.log(`  BBox: x=${results.wrap.x.toFixed(1)}, y=${results.wrap.y.toFixed(1)}, ` +
      `w=${results.wrap.width.toFixed(1)}, h=${results.wrap.height.toFixed(1)}`);
  }

  if (results.nav) {
    console.log(`site-nav (capsule):`);
    console.log(`  BBox: x=${results.nav.x.toFixed(1)}, y=${results.nav.y.toFixed(1)}, ` +
      `w=${results.nav.width.toFixed(1)}, h=${results.nav.height.toFixed(1)}`);
    console.log(`  ── Computed CSS ──────────────────────`);
    console.log(`  display: ${results.nav.styles.display}`);
    console.log(`  flex-direction: ${results.nav.styles.flexDirection}`);
    console.log(`  flex-wrap: ${results.nav.styles.flexWrap}`);
    console.log(`  align-items: ${results.nav.styles.alignItems}`);
    console.log(`  justify-content: ${results.nav.styles.justifyContent}`);
    console.log(`  gap: ${results.nav.styles.gap}`);
    console.log(`  position: ${results.nav.styles.position}`);
    console.log(`  height: ${results.nav.styles.height}`);
    console.log(`  width: ${results.nav.styles.width}`);
    console.log(`  min-height: ${results.nav.styles.minHeight}`);
    console.log(`  max-height: ${results.nav.styles.maxHeight}`);
    console.log(`  padding: ${results.nav.styles.paddingTop} ${results.nav.styles.paddingRight} ${results.nav.styles.paddingBottom} ${results.nav.styles.paddingLeft}`);
    console.log(`  padding-inline: ${results.nav.styles.paddingInline}`);
    console.log(`  margin: ${results.nav.styles.marginTop} ${results.nav.styles.marginRight} ${results.nav.styles.marginBottom} ${results.nav.styles.marginLeft}`);
    console.log(`  margin-inline: ${results.nav.styles.marginInline}`);
    console.log(`  border-radius: ${results.nav.styles.borderRadius}`);
    console.log(`  border: ${results.nav.styles.border}`);
    console.log(`  background-color: ${results.nav.styles.backgroundColor}`);
    console.log(`  color: ${results.nav.styles.color}`);
    console.log(`  backdrop-filter: ${results.nav.styles.backdropFilter}`);
    console.log(`  -webkit-backdrop-filter: ${results.nav.styles.webkitBackdropFilter}`);
    console.log(`  box-shadow: ${results.nav.styles.boxShadow}`);
    console.log(`  overflow: ${results.nav.styles.overflow}`);
    console.log(`  pointer-events: ${results.nav.styles.pointerEvents}`);
    console.log(`  box-sizing: ${results.nav.styles.boxSizing}`);
    console.log(`  ── Attributes ─────────────────────────`);
    console.log(`  data-variant: ${results.nav.attrs?.variant || 'none'}`);
    console.log(`  data-scrolled: ${results.nav.attrs?.scrolled || 'false'}`);
    console.log(`  Height: ${results.nav.styles.height} (expected: 64px desktop / 56px mobile)`);
    console.log(`  Width: ${results.nav.styles.width} (expected: ≤ 1200px)`);
  }

  if (results.logo) {
    console.log(`Logo teks:`);
    console.log(`  BBox: x=${results.logo.x.toFixed(1)}, y=${results.logo.y.toFixed(1)}, ` +
      `w=${results.logo.width.toFixed(1)}, h=${results.logo.height.toFixed(1)}`);
    console.log(`  Color: ${results.logo.styles.color} (expected: #fff transparent / #17414f solid)`);
    console.log(`  Font-size: ${results.logo.styles.fontSize}`);
  }

  if (results.hero) {
    console.log(`Hero section:`);
    console.log(`  Top: ${results.hero.y.toFixed(1)}px (expected: 0 atau negatif karena navbar fixed)`);
  }

  console.log('');
}

verifyNavbar().catch(console.error);
