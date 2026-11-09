import { chromium } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const BASE = process.env.QA_BASE_URL ?? "http://localhost:3000";
const LABEL = process.env.QA_LABEL ?? "baseline";
const OUT = process.env.QA_SHOTS ?? "C:/Users/aradh/AppData/Local/Temp/opencode/audit";
fs.mkdirSync(OUT, { recursive: true });

const roles = [
  {
    name: "admin",
    email: "admin@parangtritis.test",
    loginPath: "/staff/login",
    pages: ["/admin", "/admin/laporan/kunjungan"],
  },
  {
    name: "cashier",
    email: "cashier@parangtritis.test",
    loginPath: "/staff/login",
    pages: ["/counter", "/counter/fasilitas", "/counter/penukaran"],
  },
  {
    name: "gate",
    email: "gate@parangtritis.test",
    loginPath: "/staff/login",
    pages: ["/gate"],
  },
  {
    name: "visitor",
    email: "visitor@parangtritis.test",
    loginPath: "/login",
    pages: ["/profile", "/booking"],
  },
];

const viewports = [
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 900 },
];

const browser = await chromium.launch();
const report = [];

async function login(page, role) {
  await page.goto(BASE + role.loginPath, { waitUntil: "networkidle", timeout: 90000 });
  await page.fill("#email", role.email);
  await page.fill("#password", "password");
  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState("networkidle");
}

async function measure(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const headers = Array.from(document.querySelectorAll("header"));
    const siteHeader = headers.find((el) => el.querySelector(".site-nav")) ?? null;
    const portalHeader = headers.find((el) => !el.querySelector(".site-nav")) ?? null;
    const firstSection = document.querySelector("main section, main > div");
    const navLinks = document.querySelectorAll(".site-nav-links a");
    const visibleNav = Array.from(navLinks).filter((el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== "none" && rect.width > 0 && rect.height > 0;
    });
    const toggle = document.querySelector(".site-nav-menu-toggle");
    const toggleStyle = toggle ? getComputedStyle(toggle) : null;
    const bgApp = document.querySelector(".bg-app");
    const costHeading = Array.from(document.querySelectorAll("h2")).find(
      (el) => el.textContent?.trim() === "Ringkasan biaya",
    );
    const costDescription = costHeading?.parentElement?.querySelector("p");

    function describe(el) {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        height: Math.round(rect.height),
        position: style.position,
        color: style.color,
        background: style.backgroundColor,
        display: style.display,
      };
    }

    return {
      path: location.pathname + location.hash,
      title: document.title,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflow: doc.scrollWidth - doc.clientWidth,
      siteHeader: describe(siteHeader),
      portalHeader: describe(portalHeader),
      firstSectionTop: firstSection
        ? Math.round(firstSection.getBoundingClientRect().top)
        : null,
      firstSectionTag: firstSection?.tagName ?? null,
      visibleDesktopLinks: visibleNav.map((el) => el.textContent?.trim()),
      mobileToggleVisible:
        toggleStyle !== null &&
        toggleStyle.display !== "none" &&
        (toggle?.getBoundingClientRect().width ?? 0) > 0,
      bodyPaddingTop: getComputedStyle(document.body).paddingTop,
      bgAppImage: bgApp ? getComputedStyle(bgApp).backgroundImage : null,
      costHeading: costHeading
        ? {
            color: getComputedStyle(costHeading).color,
            fontSize: getComputedStyle(costHeading).fontSize,
            descriptionColor: costDescription
              ? getComputedStyle(costDescription).color
              : null,
          }
        : null,
    };
  });
}

for (const role of roles) {
  const context = await browser.newContext({ viewport: viewports[2] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  try {
    await login(page, role);
  } catch (error) {
    report.push({ role: role.name, loginError: error.message, errors });
    await context.close();
    continue;
  }

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const url of role.pages) {
      try {
        await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 90000 });
        await page.waitForTimeout(350);
        const data = await measure(page);
        report.push({ role: role.name, vp: vp.name, ...data, errors: [] });
        await page.screenshot({
          path: path.join(OUT, `${LABEL}-${role.name}${url.replace(/\//g, "_")}-${vp.name}.png`),
          fullPage: false,
        });
      } catch (error) {
        report.push({ role: role.name, vp: vp.name, url, pageError: error.message });
      }
    }
  }

  if (errors.length) report.push({ role: role.name, pageErrors: errors });
  await context.close();
}

// Public pages, logged out.
const publicContext = await browser.newContext({ viewport: viewports[2] });
const publicPage = await publicContext.newPage();
for (const vp of viewports) {
  await publicPage.setViewportSize({ width: vp.width, height: vp.height });
  for (const url of ["/", "/#places", "/login", "/staff/login"]) {
    await publicPage.goto(BASE + url, { waitUntil: "networkidle", timeout: 90000 });
    await publicPage.waitForTimeout(400);
    const data = await measure(publicPage);
    report.push({ role: "public", vp: vp.name, ...data, errors: [] });
    await publicPage.screenshot({
      path: path.join(OUT, `${LABEL}-public${url.replace(/[\/#]/g, "_")}-${vp.name}.png`),
      fullPage: false,
    });
  }
}
await publicContext.close();

// Logged-in navbar: profil dropdown anchored to the avatar, no guest actions.
{
  const context = await browser.newContext({ viewport: viewports[2] });
  const page = await context.newPage();
  try {
    await login(page, roles[0]);
    await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(400);

    const guestActions = await page
      .locator('.site-nav-actions a[href="/login"], .site-nav-actions a[href="/register"]')
      .count();
    const accountButton = page.getByRole("button", { name: /Menu akun/i });
    await accountButton.click();
    const menu = page.locator("#site-header-profile-menu");
    await menu.waitFor({ state: "visible", timeout: 5000 });

    const dropdown = await page.evaluate(() => {
      const button = document.querySelector(".site-nav-menu-btn");
      const panel = document.querySelector("#site-header-profile-menu");
      const nav = document.querySelector(".site-nav");
      const b = button?.getBoundingClientRect();
      const p = panel?.getBoundingClientRect();
      const n = nav?.getBoundingClientRect();
      return {
        button: b ? { right: Math.round(b.right), bottom: Math.round(b.bottom) } : null,
        panel: p
          ? {
              left: Math.round(p.left),
              right: Math.round(p.right),
              top: Math.round(p.top),
              bottom: Math.round(p.bottom),
              inViewport: p.left >= 0 && p.right <= innerWidth,
            }
          : null,
        navBottom: n ? Math.round(n.bottom) : null,
        anchorGap: p && b ? Math.round(p.top - b.bottom) : null,
      };
    });

    report.push({
      role: "admin",
      check: "profile-dropdown",
      guestActions,
      dropdown,
      menuText: (await menu.textContent())?.replace(/\s+/g, " ").trim(),
    });

    await page.screenshot({
      path: path.join(OUT, `${LABEL}-admin-dropdown-1440.png`),
      fullPage: false,
    });

    // Mobile drawer menu should show exactly one navigation entry point.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(300);
    const toggleVisible = await page
      .locator(".site-nav-menu-toggle")
      .isVisible();
    const desktopLinksVisible = await page.locator(".site-nav-links").isVisible();
    await page.locator(".site-nav-menu-toggle").click();
    const drawer = page.locator("#site-header-drawer");
    await drawer.waitFor({ state: "visible", timeout: 5000 });
    report.push({
      role: "admin",
      check: "mobile-nav",
      toggleVisible,
      desktopLinksVisible,
      drawerText: (await drawer.textContent())?.replace(/\s+/g, " ").trim(),
    });
    await page.screenshot({
      path: path.join(OUT, `${LABEL}-admin-drawer-390.png`),
      fullPage: false,
    });
  } catch (error) {
    report.push({ role: "admin", check: "navbar", error: error.message });
  }
  await context.close();
}

await browser.close();
fs.writeFileSync(path.join(OUT, `${LABEL}-report.json`), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
