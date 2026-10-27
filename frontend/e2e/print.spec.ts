import { test, expect, type Page } from "@playwright/test";
import { authStatePath } from "./env";
import {
  measureOverflow,
  recordMatrixRows,
  screenshotPath,
  type MatrixRow,
} from "./support";

/**
 * Media cetak dipisahkan dari media layar. Halaman cetak (gelang/tiket) diuji
 * dengan `emulateMedia` pada dua viewport perwakilan. Angka overflow media
 * cetak dicatat apa adanya (tidak digagalkan) karena lebar halaman cetak
 * bergantung pada pengaturan printer; hanya media layar yang diwajibkan bebas
 * overflow horizontal.
 */

const SCREEN_VIEWPORTS = [
  { name: "390x844", width: 390, height: 844 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "1280x800", width: 1280, height: 800 },
];

async function checkPrintPage(page: Page, path: string, group: string) {
  const rows: MatrixRow[] = [];

  for (const viewport of SCREEN_VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const media of ["screen", "print"] as const) {
      await page.emulateMedia({ media });
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(700);

      const overflow = await measureOverflow(page);
      const wristbands = page.locator(".wristband");

      await expect(wristbands.first()).toBeVisible();

      for (const wristband of await wristbands.all()) {
        await expect(wristband.locator(".wristband-brand-title")).toBeVisible();
        await expect(wristband.locator(".wristband-code-value")).toBeVisible();
        await expect(wristband.locator(".ticket-barcode-svg")).toBeVisible();
        await expect(wristband.locator(".wristband-date-value")).toBeVisible();
        await expect(
          wristband.locator(".wristband-date-greeting"),
        ).toBeVisible();

        const clipping = await wristband.evaluate((element) => ({
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
        }));

        expect(
          clipping.scrollHeight,
          `${group} memotong isi gelang pada ${media} ${viewport.name}`,
        ).toBeLessThanOrEqual(clipping.clientHeight + 1);

        if (media === "print") {
          const breakInside = await wristband.evaluate(
            (element) => getComputedStyle(element).breakInside,
          );
          expect(breakInside).toBe("avoid");
        }
      }

      if (media === "print") {
        await expect(page.locator("body > header")).toBeHidden();
      }

      rows.push({
        group,
        page: `${media}-media`,
        path,
        viewport: viewport.name,
        overflowPx: overflow.overflowPx,
        offenders: overflow.offenders,
        consoleErrors: [],
        pageErrors: [],
        failedRequests: [],
        status: media === "screen" && overflow.overflowPx > 1 ? "FAIL" : "PASS",
      });

      await page
        .screenshot({
          path: screenshotPath(group, media, viewport.name, media),
          fullPage: true,
          caret: "initial",
        })
        .catch(() => undefined);

      if (media === "screen") {
        expect(
          overflow.overflowPx,
          `${group} layar ${viewport.name} overflow ${overflow.overflowPx}px: ${overflow.offenders.join(", ")}`,
        ).toBeLessThanOrEqual(1);
      }
    }
  }

  recordMatrixRows(group, rows);
}

test.describe("Halaman cetak booking (visitor)", () => {
  test.use({ storageState: authStatePath("visitor") });

  test("pratinjau tiket booking", async ({ page }) => {
    await checkPrintPage(page, "/booking/13/print", "print-booking");
  });
});

test.describe("Halaman cetak transaksi loket (cashier)", () => {
  test.use({ storageState: authStatePath("cashier") });

  test("pratinjau tiket transaksi loket", async ({ page }) => {
    await checkPrintPage(page, "/counter/transactions/21/print", "print-counter");
  });
});
