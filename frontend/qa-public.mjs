import { chromium } from "@playwright/test";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const PAGES = ["/", "/login", "/register", "/staff/login"];
const VIEWPORTS = [
  { name: "360x800", width: 360, height: 800 },
  { name: "375x812", width: 375, height: 812 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "1280x800", width: 1280, height: 800 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1920x1080", width: 1920, height: 1080 },
];

const browser = await chromium.launch();
const results = [];

for (const path of PAGES) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(e.message));

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    try {
      await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 60000 });
    } catch (error) {
      results.push({ path, vp: vp.name, error: error.message });
      continue;
    }

    const data = await page.evaluate(() => {
      const doc = document.documentElement;
      const offenders = [];
      if (doc.scrollWidth > doc.clientWidth + 1) {
        for (const el of Array.from(document.body.querySelectorAll("*"))) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.right > doc.clientWidth + 1) {
            offenders.push(
              `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""} right=${Math.round(r.right)}`,
            );
          }
          if (offenders.length >= 4) break;
        }
      }
      const header = document.querySelector("body > header");
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        overflow: doc.scrollWidth - doc.clientWidth,
        offenders,
        headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
        title: document.title,
      };
    });

    results.push({ path, vp: vp.name, ...data });
  }

  if (consoleErrors.length) {
    results.push({ path, pageErrors: consoleErrors });
  }
  await context.close();
}

await browser.close();

for (const row of results) {
  if (row.pageErrors) {
    console.log(`PAGEERROR ${row.path}: ${row.pageErrors.join(" | ")}`);
    continue;
  }
  if (row.error) {
    console.log(`ERROR ${row.path} ${row.vp}: ${row.error}`);
    continue;
  }
  const bad = row.overflow > 1;
  console.log(
    `${bad ? "FAIL" : "ok  "} ${row.path.padEnd(14)} ${row.vp.padEnd(10)} overflow=${row.overflow}px header=${row.headerHeight ?? "-"} ${row.offenders.join("; ")}`,
  );
}
