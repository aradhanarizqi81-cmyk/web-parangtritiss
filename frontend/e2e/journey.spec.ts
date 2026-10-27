import { test, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { BASE_URL, authStatePath, type RoleKey } from "./env";
import { screenshotPath } from "./support";

/**
 * Alur bisnis end-to-end pada database lokal:
 * booking → simulasi bayar → penukaran di loket → check-in gerbang → cetak ulang.
 *
 * Menegaskan aturan yang tidak boleh berubah: token penukaran berbeda dari
 * barcode gerbang, penukaran tidak membuat check-in, dan cetak ulang tidak
 * menggandakan tiket/check-in.
 */

test.describe.configure({ mode: "serial" });

let bookingId = "";
let redemptionToken = "";
let gateToken = "";

async function openRole(
  browser: Browser,
  role: RoleKey,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: authStatePath(role),
  });
  const page = await context.newPage();
  return { context, page };
}

function localToday(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

test("visitor membuat booking dan menyelesaikan simulasi pembayaran", async ({
  browser,
}) => {
  const { context, page } = await openRole(browser, "visitor");

  try {
    await page.goto("/booking");
    await expect(
      page.getByRole("heading", { name: /booking tiket online/i }),
    ).toBeVisible({ timeout: 30_000 });

    await page.locator("#visit_date").fill(localToday());
    await page.locator("#visitor-0-name").fill("Budiyanto QA");
    await page.locator("#visitor-0-nik").fill("3404010101900001");

    await page.getByRole("button", { name: /buat booking/i }).click();
    await page.waitForURL(/\/booking\/\d+$/, { timeout: 40_000 });

    bookingId = new URL(page.url()).pathname.split("/").pop() ?? "";
    expect(bookingId).toMatch(/^\d+$/);

    // Sebelum lunas, kode penukaran tidak boleh tampil.
    await expect(
      page.getByRole("heading", { name: /kode penukaran loket/i }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: /bayar sekarang/i }).click();

    await expect(
      page.getByRole("heading", { name: /kode penukaran loket/i }),
    ).toBeVisible({ timeout: 40_000 });

    const qr = page.locator("[data-qr-value]").first();
    await expect(qr).toBeVisible();
    redemptionToken = (await qr.getAttribute("data-qr-value")) ?? "";

    expect(redemptionToken).toMatch(/^RDM-[A-Z0-9]{24}$/);
    // The same value is printed below the QR, so the code can be typed too.
    await expect(page.getByText(redemptionToken, { exact: true })).toBeVisible();

    // The gate barcode is a different credential. It belongs to the booking,
    // not to the wristband, so it is read from the same BFF the page uses.
    const detail = await page.request.get(`/api/bookings/${bookingId}`);
    expect(detail.ok()).toBeTruthy();
    const payload = (await detail.json()) as {
      data?: { barcode_token?: string };
    };
    gateToken = payload.data?.barcode_token ?? "";

    expect(gateToken).not.toBe("");
    expect(gateToken).not.toBe(redemptionToken);

    await page.screenshot({
      path: screenshotPath("journey", "booking-paid", "1280x800", "screen"),
      fullPage: true,
      caret: "initial",
    });
  } finally {
    await context.close();
  }
});

test("cashier menukar booking: gelang hanya muncul setelah konfirmasi", async ({
  browser,
}) => {
  expect(redemptionToken, "token penukaran dari langkah sebelumnya").not.toBe("");

  const { context, page } = await openRole(browser, "cashier");

  try {
    await page.goto("/counter/penukaran");
    await expect(
      page.getByRole("heading", { name: /penukaran tiket fisik/i }),
    ).toBeVisible({ timeout: 30_000 });

    // Assert the scanned value travels unchanged to the BFF.
    const sentTokens: string[] = [];
    page.on("request", (request) => {
      if (
        request.method() !== "POST" ||
        !request.url().includes("/api/counter/redemptions/")
      ) {
        return;
      }

      const body = request.postDataJSON() as {
        redemption_token?: string;
      } | null;

      if (body?.redemption_token) sentTokens.push(body.redemption_token);
    });

    await page.locator("#redemption_token").fill(redemptionToken);
    await page.getByRole("button", { name: /periksa kode/i }).click();

    await expect(
      page.getByRole("heading", { name: /ringkasan pesanan/i }),
    ).toBeVisible({ timeout: 30_000 });

    // P1-1: gelang belum boleh ada di DOM sebelum penukaran dicatat.
    await expect(page.locator("article.wristband")).toHaveCount(0);

    await page.getByRole("button", { name: /konfirmasi penukaran/i }).click();

    await expect(page.locator("article.wristband")).toHaveCount(1, {
      timeout: 30_000,
    });

    expect(sentTokens).toContain(redemptionToken);

    // The wristband encodes the stable individual ticket code, never the
    // redemption or gate credential.
    const wristbandBarcode = page
      .locator('article.wristband [aria-label^="Barcode kode tiket individual "]')
      .first();
    await expect(wristbandBarcode).toBeVisible();
    const ticketCode = ((await wristbandBarcode.getAttribute("aria-label")) ?? "")
      .replace("Barcode kode tiket individual ", "")
      .trim();

    expect(ticketCode).toMatch(/^TKT-\d{8}-[A-Z0-9]{8}$/);
    expect(ticketCode).not.toBe(redemptionToken);
    expect(ticketCode).not.toBe(gateToken);

    // Kode penukaran dan barcode gerbang WAJIB berbeda.
    expect(gateToken).not.toBe("");
    expect(gateToken).not.toBe(redemptionToken);
    expect(gateToken.startsWith("RDM-")).toBeFalsy();

    await page.screenshot({
      path: screenshotPath("journey", "redemption-redeemed", "1280x800", "screen"),
      fullPage: true,
      caret: "initial",
    });
  } finally {
    await context.close();
  }
});

test("gate: scan pertama berhasil, scan kedua ditolak (bukti penukaran tidak auto check-in)", async ({
  browser,
}) => {
  expect(gateToken, "barcode gerbang dari langkah penukaran").not.toBe("");

  const { context, page } = await openRole(browser, "gate");

  try {
    await page.goto("/gate");
    await expect(
      page.getByRole("heading", { name: /validasi tiket/i }),
    ).toBeVisible({ timeout: 30_000 });

    await page.locator("#barcode_token").fill(gateToken);
    await page.locator("#barcode_token").press("Enter");

    await expect(
      page.getByRole("heading", { name: /check-in berhasil/i }),
    ).toBeVisible({ timeout: 30_000 });

    await page.screenshot({
      path: screenshotPath("journey", "gate-success", "1280x800", "screen"),
      fullPage: true,
      caret: "initial",
    });

    await page.locator("#barcode_token").fill(gateToken);
    await page.locator("#barcode_token").press("Enter");

    await expect(
      page.getByRole("heading", { name: /tiket sudah pernah check-in/i }),
    ).toBeVisible({ timeout: 30_000 });
  } finally {
    await context.close();
  }
});

test("cashier cetak ulang tidak menggandakan tiket/check-in", async ({
  browser,
}) => {
  expect(redemptionToken).not.toBe("");

  const { context, page } = await openRole(browser, "cashier");

  try {
    await page.goto("/counter/penukaran");
    await page.locator("#redemption_token").fill(redemptionToken);
    await page.getByRole("button", { name: /periksa kode/i }).click();

    await expect(page.locator("article.wristband")).toHaveCount(1, {
      timeout: 30_000,
    });

    // window.print() dinetralkan agar tidak membuka dialog cetak saat QA.
    await page.evaluate(() => {
      window.print = () => undefined;
    });

    const printButton = page.getByRole("button", { name: /cetak/i }).first();
    await expect(printButton).toBeVisible();
    await printButton.click();

    // Masih tepat satu gelang: cetak ulang tidak menambah tiket.
    await expect(page.locator("article.wristband")).toHaveCount(1, {
      timeout: 30_000,
    });

    // Bukti tambahan: cetak ulang tidak mengubah status check-in gerbang.
    const gate = await openRole(browser, "gate");

    try {
      await gate.page.goto("/gate");
      await gate.page.locator("#barcode_token").fill(gateToken);
      await gate.page.locator("#barcode_token").press("Enter");

      await expect(
        gate.page.getByRole("heading", { name: /tiket sudah pernah check-in/i }),
      ).toBeVisible({ timeout: 30_000 });
    } finally {
      await gate.context.close();
    }
  } finally {
    await context.close();
  }
});
