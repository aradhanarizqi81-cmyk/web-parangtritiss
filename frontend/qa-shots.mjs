import { chromium } from "@playwright/test";
import path from "node:path";

const BASE = "http://localhost:3000";
const OUT = process.env.QA_SHOTS ?? "C:/Users/aradh/AppData/Local/Temp/opencode/shots";
const targets = [
  { name: "landing-1280", path: "/", width: 1280, height: 900, full: true },
  { name: "landing-390", path: "/", width: 390, height: 844, full: false },
  { name: "login-1280", path: "/login", width: 1280, height: 900, full: false },
  { name: "login-390", path: "/login", width: 390, height: 844, full: true },
  { name: "register-390", path: "/register", width: 390, height: 844, full: true },
  { name: "staff-login-1280", path: "/staff/login", width: 1280, height: 900, full: false },
  { name: "staff-login-390", path: "/staff/login", width: 390, height: 844, full: true },
];

const browser = await chromium.launch();
for (const t of targets) {
  const context = await browser.newContext({ viewport: { width: t.width, height: t.height } });
  const page = await context.newPage();
  await page.goto(BASE + t.path, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, `${t.name}.png`), fullPage: t.full, caret: "initial" });
  await context.close();
}
await browser.close();
console.log("done");
