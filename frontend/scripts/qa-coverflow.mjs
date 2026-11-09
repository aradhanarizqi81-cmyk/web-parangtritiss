import { chromium } from "playwright";

const BASE_URL = process.env.QA_BASE_URL ?? "http://localhost:3000";
const results = [];
let failures = 0;

function check(label, ok, detail) {
  if (!ok) failures += 1;
  results.push({ label, ok, detail });
}

async function snapshot(page) {
  return page.evaluate(() => {
    const cf = document.querySelector(".cf");
    const cards = [...document.querySelectorAll(".cf-card")];
    const activeIndex = cards.findIndex(
      (card) => card.getAttribute("data-active") === "true",
    );
    const active = cards[activeIndex];
    const cfRect = cf.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const neighbor = cards[activeIndex + 1] ?? cards[activeIndex - 1];
    const heading = document.querySelector("#discover h2");
    const headingStyle = getComputedStyle(heading);
    const headingHeight = heading.getBoundingClientRect().height;
    const lineHeight = parseFloat(headingStyle.lineHeight);
    const cfStyle = getComputedStyle(cf);
    const sectionStyle = getComputedStyle(document.querySelector(".cf-section"));
    return {
      totalCards: cards.length,
      activeIndex,
      cardCenterX: activeRect.left + activeRect.width / 2,
      cfCenterX: cfRect.left + cfRect.width / 2,
      centerDiff: Math.abs(
        activeRect.left + activeRect.width / 2 - (cfRect.left + cfRect.width / 2),
      ),
      activeWidth: activeRect.width,
      neighborTransform: neighbor ? getComputedStyle(neighbor).transform : "none",
      visibleCards: cards.filter(
        (card) => card.getAttribute("data-hidden") === "false",
      ).length,
      hiddenCards: cards.filter(
        (card) => card.getAttribute("data-hidden") === "true",
      ).length,
      perspective: cfStyle.perspective,
      cfOverflowX: cfStyle.overflowX,
      cfTransformStyle: cfStyle.transformStyle,
      cfFilter: cfStyle.filter,
      cfOpacity: cfStyle.opacity,
      sectionOverflowX: sectionStyle.overflowX,
      imagesLoaded: cards.every((card) => {
        const image = card.querySelector("img");
        return image && image.complete && image.naturalWidth > 0;
      }),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      headingColor: headingStyle.color,
      headingLines: lineHeight ? Math.round(headingHeight / lineHeight) : 0,
    };
  });
}

async function loadPage(browser, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await page.locator("#discover").scrollIntoViewIfNeeded();
  await page.waitForSelector('.cf-card[data-active="true"]', { timeout: 30_000 });
  await page.waitForFunction(
    () => {
      const cards = [...document.querySelectorAll(".cf-card")];
      return cards.length > 0 && cards.every((card) => card.querySelector("img"));
    },
    null,
    { timeout: 30_000 },
  );
  await page
    .waitForFunction(
      () => {
        const cards = [...document.querySelectorAll(".cf-card")];
        return cards.every((card) =>
          Object.keys(card).some((key) => key.startsWith("__reactFiber$")),
        );
      },
      null,
      { timeout: 30_000 },
    )
    .catch(() => {});
  if (width < 768) {
    await page
      .waitForFunction(
        () =>
          document.querySelectorAll('.cf-card[data-hidden="true"]').length > 0,
        null,
        { timeout: 10_000 },
      )
      .catch(() => {});
  }
  await page.waitForTimeout(300);
  return page;
}

async function measureViewport(browser, width, height, label) {
  const page = await loadPage(browser, width, height);
  await page.screenshot({
    path: `C:/Users/aradh/AppData/Local/Temp/opencode/coverflow-${label}.png`,
    fullPage: false,
  });

  const initial = await snapshot(page);
  results.push({ label: `${label}: initial snapshot`, ok: true, detail: initial });

  check(
    `${label}: pusat card aktif = pusat .cf (<= 2px)`,
    initial.centerDiff <= 2,
    `${initial.centerDiff.toFixed(2)}px`,
  );

  const expectedWidth = width >= 768 ? 300 : width * 0.54;
  check(
    `${label}: lebar card aktif sesuai target`,
    Math.abs(initial.activeWidth - expectedWidth) <= 2,
    `${initial.activeWidth.toFixed(2)}px (target ${expectedWidth.toFixed(2)}px)`,
  );

  check(
    `${label}: transform card tetangga matrix3d`,
    initial.neighborTransform.includes("matrix3d") &&
      initial.neighborTransform !== "none",
    initial.neighborTransform.slice(0, 90),
  );

  if (width >= 768) {
    check(
      `${label}: card non-hidden = min(total, 7)`,
      initial.visibleCards === Math.min(initial.totalCards, 7),
      `${initial.visibleCards} / ${Math.min(initial.totalCards, 7)} (total ${initial.totalCards})`,
    );
  }

  check(
    `${label}: perspective bukan none`,
    initial.perspective !== "none",
    initial.perspective,
  );

  check(
    `${label}: tidak ada scroll horizontal halaman`,
    initial.scrollWidth <= initial.innerWidth,
    `scrollWidth ${initial.scrollWidth} <= innerWidth ${initial.innerWidth}`,
  );

  check(
    `${label}: .cf tidak memakai overflow hidden`,
    initial.cfOverflowX !== "hidden",
    `.cf overflow-x: ${initial.cfOverflowX}`,
  );

  check(
    `${label}: .cf bebas preserve-3d/filter/opacity < 1`,
    initial.cfTransformStyle !== "preserve-3d" &&
      initial.cfFilter === "none" &&
      initial.cfOpacity === "1",
    `transform-style ${initial.cfTransformStyle}, filter ${initial.cfFilter}, opacity ${initial.cfOpacity}`,
  );

  check(
    `${label}: section memakai overflow-x clip`,
    initial.sectionOverflowX === "clip",
    `.cf-section overflow-x: ${initial.sectionOverflowX}`,
  );

  check(
    `${label}: semua foto card termuat`,
    initial.imagesLoaded,
    `imagesLoaded: ${initial.imagesLoaded}`,
  );

  check(
    `${label}: heading 2 baris, tengah, #17414f`,
    initial.headingLines === 2 && initial.headingColor === "rgb(23, 65, 79)",
    `${initial.headingLines} baris, ${initial.headingColor}`,
  );

  const next = page.getByRole("button", { name: "Berikutnya" });
  const beforeNext = initial.activeIndex;
  await next.click();
  await page.waitForFunction(
    (previous) =>
      [...document.querySelectorAll(".cf-card")].findIndex(
        (card) => card.getAttribute("data-active") === "true",
      ) === previous + 1,
    beforeNext,
    { timeout: 5_000 },
  );
  await page.waitForTimeout(800);
  const afterNext = await snapshot(page);
  check(
    `${label}: tombol Berikutnya menambah indeks 1`,
    afterNext.activeIndex === beforeNext + 1,
    `${beforeNext} -> ${afterNext.activeIndex}`,
  );
  check(
    `${label}: pusat card setelah Berikutnya tetap di tengah`,
    afterNext.centerDiff <= 2,
    `${afterNext.centerDiff.toFixed(2)}px`,
  );

  const sideIndex = afterNext.activeIndex + 1;
  await page.locator(".cf-card").nth(sideIndex).click();
  await page.waitForFunction(
    (target) =>
      [...document.querySelectorAll(".cf-card")].findIndex(
        (card) => card.getAttribute("data-active") === "true",
      ) === target,
    sideIndex,
    { timeout: 5_000 },
  );
  await page.waitForTimeout(800);
  const afterSideClick = await snapshot(page);
  check(
    `${label}: klik card samping menjadikannya aktif`,
    afterSideClick.activeIndex === sideIndex,
    `target ${sideIndex}, aktif ${afterSideClick.activeIndex}`,
  );
  check(
    `${label}: pusat card setelah klik samping tetap di tengah`,
    afterSideClick.centerDiff <= 2,
    `${afterSideClick.centerDiff.toFixed(2)}px`,
  );

  await page.close();
}

const browser = await chromium.launch();
try {
  await measureViewport(browser, 1280, 800, "desktop");
  await measureViewport(browser, 375, 800, "mobile");

  const reduced = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  await reduced.emulateMedia({ reducedMotion: "reduce" });
  await reduced.goto(BASE_URL, { waitUntil: "domcontentloaded" });
  await reduced.waitForSelector('.cf-card[data-active="true"]', {
    timeout: 30_000,
  });
  const durations = await reduced.evaluate(() => {
    const active = document.querySelector('.cf-card[data-active="true"]');
    return {
      card: getComputedStyle(active).transitionDuration,
      cap: getComputedStyle(active.querySelector(".cf-cap")).transitionDuration,
    };
  });
  check(
    "reduced motion: transition-duration card = 0s",
    durations.card === "0s",
    `card ${durations.card}, caption ${durations.cap}`,
  );
  await reduced.close();
} finally {
  await browser.close();
}

console.log(JSON.stringify({ results, failures }, null, 2));
process.exitCode = failures > 0 ? 1 : 0;
